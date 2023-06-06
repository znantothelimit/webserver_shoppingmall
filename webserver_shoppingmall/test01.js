const express = require('express');
const app = express();
const axios = require('axios');
const pug = require('pug');
const url = require('url');
const qs = require('querystring');
const crypto = require('crypto');
const mysql = require('mysql');
const {saveItemsToDatabase, saveUserToDatabase, getUserFromDatabase, saveCommentToDatabase, getCommentsFromDatabase, saveRatingToDatabase, getRatingFromDatabase} = require(
    './database'
);
const sys = require('./system');
const client_id = 'uR0FsbWPkbkFc2AFaUwy';
const client_secret = 'PUq6k8Cvip';

const parseCookies = (cookie = '') => cookie
    .split(';')
    .map(v => v.split('='))
    .reduce((acc, [k, v]) => {
        acc[k.trim()] = decodeURIComponent(v);
        return acc;
    }, {});

const session = {};
const users = {};
var onSearch;
var user_ID;
app.set('view engine', 'pug');

const connection = mysql.createConnection({
    host: 'localhost', // centos 서버 아이피
    user: 'root', // oracle12
    password: 'root', // Mysql123!@#
    database: 'nodejs_shoppingmall' // nodejs_shoppingmall
});
connection.connect();

app.get('/main', function (req, res) {
    console.log("IP : " + req.ip + "/ 접속");
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.session;
    const sessionData = session[sessionId];

    if (!sessionData) {
        res.redirect('/'); // 세션 데이터가 없으면 로그인 페이지로 리디렉션
        return;
    }

    res.render('main', {
        title: 'Main',
        username: sessionData.username
    });
});
app.get('/search', function (req, res) {
    onSearch = req.query.query;
    var api_url = 'https://openapi.naver.com/v1/search/shop.json?query=' +
            encodeURI(onSearch) + '&display=50';
    var options = {
        url: api_url,
        headers: {
            'X-Naver-Client-Id': client_id,
            'X-Naver-Client-Secret': client_secret
        }
    };

    axios
        .get(api_url, {
            headers: {
                'X-Naver-Client-Id': client_id,
                'X-Naver-Client-Secret': client_secret
            }
        })
        .then((response) => {
            const data = response.data;
            const items = data.items;
            var results = [];

            for (var i = 0; i < items.length; i++) {
                results[i] = [];
                var item = items[i];
                var price = item.lprice;
                var category = item.category1;
                var name = item.title;
                var link = item.link;
                var image = item.image;
                var mallName = item.mallName;

                results[i] = {
                    name,
                    category,
                    price,
                    link,
                    image,
                    mallName
                };

                const query = `INSERT INTO items (price, category, name, link, image, mallName) VALUES (?, ?, ?, ?, ?, ?)`;
                const values = [
                    price,
                    category,
                    name,
                    link,
                    image,
                    mallName
                ];

                connection.query(query, values, (error, results) => {});
            }

            const select = req.query.select;
            const default_result = results;

            if (select == 'expensive') 
                results = sys.DESCarr(results);
            else if (select == 'cheap') 
                results = sys.ASCarr(results);
            else if (select == 'default') 
                results = default_result;
            else 
                results = default_result;
            
            res.render('result', {
                results: results,
                productname: onSearch
            });
            console.log("IP : " + req.ip + " / 검색어 : " + onSearch);

        })
        .catch((error) => {
            console.error('Error occurred while getting items:', error);
            res
                .status(500)
                .send('Error occurred while getting items:');
        });
});

app.post('/register', (req, res) => {
    const body = [];
    req
        .on('data', (chunk) => {
            body.push(chunk);
        })
        .on('end', () => {
            const data = Buffer
                .concat(body)
                .toString();
            const {username, password} = qs.parse(data);

            getUserFromDatabase(username)
                .then((user) => {
                    if (user.length > 0) {
                        res.send(
                            "<script>alert('이미 존재하는 사용자 이름입니다.'); window.location.href='/';</script>"
                        );
                        return;
                    }

                    // 회원 정보 저장
                    const hashedPassword = crypto
                        .createHash('sha256')
                        .update(password)
                        .digest('hex');
                    const newUser = {
                        username,
                        password: hashedPassword
                    };

                    saveUserToDatabase(newUser)
                        .then(() => {
                            res.send(
                                "<script>alert('회원 가입이 완료되었습니다.'); window.location.href='/';</script>"
                            );
                        })
                        .catch((error) => {
                            console.error(error);
                            res
                                .status(500)
                                .send('Internal Server Error');
                        });
                })
                .catch((error) => {
                    console.error(error);
                    res
                        .status(500)
                        .send('Internal Server Error');
                });
        });
});

// 댓글 추가
app.get('/search/comment', (req, res) => {
  const item = req.query.itemName; // 상품 이름을 파라미터로 받음
  const comment = req.query.comment; // 클라이언트에서 전송된 댓글 내용
  const commenter = user_ID;
  console.log(commenter);
  // 댓글을 데이터베이스 또는 다른 저장소에 추가
  saveCommentToDatabase(item, comment, commenter); // 데이터베이스에 댓글 저장하는 함수 호출

  // 새로 추가된 댓글을 포함한 전체 댓글 목록을 조회
  const comments = getCommentsFromDatabase(item); // 데이터베이스에서 댓글 조회하는 함수 호출

  // 댓글 목록을 클라이언트로 전송
  const redirectURL = '/search?query=' + encodeURIComponent(onSearch);
  res.redirect(redirectURL);
});

// 평점 추가
app.get('/search/rating', (req, res) => {
  const item = req.query.itemName; // 상품 이름을 파라미터로 받음
  const rating = req.query.rating; // 클라이언트에서 전송된 댓글 내용
  console.log(item);
  // 평점을을 데이터베이스 또는 다른 저장소에 추가
  saveRatingToDatabase(item, rating); // 데이터베이스에 댓글 저장하는 함수 호출

  // 새로 추가된 평점을 포함한 전체 댓글 목록을 조회
  const ratings = getRatingFromDatabase(item); // 데이터베이스에서 댓글 조회하는 함수 호출

  // 댓글 목록을 클라이언트로 전송
  const redirectURL = '/search?query=' + encodeURIComponent(onSearch);
  res.redirect(redirectURL);
});


app.post('/login', (req, res) => {
    const body = [];
    req
        .on('data', (chunk) => {
            body.push(chunk);
        })
        .on('end', () => {
            const data = Buffer
                .concat(body)
                .toString();
            const {username, password} = qs.parse(data);
            user_ID = username;
            console.log(user_ID);

            // 회원 정보 저장
            const hashedPassword = crypto
                .createHash('sha256')
                .update(password)
                .digest('hex');

            getUserFromDatabase(username)
                .then((user) => {
                    // 검색된 사용자 정보를 이용하여 작업 수행 로그인 실패 처리
                    if (user.length === 0 || hashedPassword !== user[0].passwd) {
                        res.send("<script>alert('로그인 실패'); window.location.href='/login';</script>");
                        return;
                    }

                    const expires = new Date();
                    expires.setMinutes(expires.getMinutes() + 10);
                    const uniqueInt = Date.now();
                    session[uniqueInt] = {
                        username,
                        expires
                    };

                    // 세션 정보를 쿠키에 저장
                    res.cookie('session', uniqueInt, {
                        expires: expires,
                        httpOnly: true,
                        path: '/'
                    });

                    res.redirect('/main');
                })
                .catch((error) => {
                    // 오류 처리
                    console.error(error);
                    res
                        .status(500)
                        .send('Internal Server Error');
                });
        });
});

app.get('/', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.session;
    const sessionData = session[sessionId];

    res.render('entry');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.listen(3000, '192.168.35.120', function () {
    console.log('http://192.168.35.120:3000/ app listening on port 3000!');
});