const express = require('express');
const app = express();
const axios = require('axios');
const pug = require('pug');
const url = require('url');
const qs = require('querystring');
const crypto = require('crypto');
const mysql = require('mysql');
const {
    saveUserToDatabase,
    getUserFromDatabase,
    saveCommentToDatabase,
    getCommentsFromDatabase,
    saveRatingToDatabase,
    getRatingFromDatabase
} = require('./database');
const sys = require('./system');

const client_id = 'uR0FsbWPkbkFc2AFaUwy';
const client_secret = 'PUq6k8Cvip';

// 쿠키 파싱 함수
const parseCookies = (cookie = '') => cookie
    .split(';')
    .map(v => v.split('='))
    .reduce((acc, [k, v]) => {
        acc[k.trim()] = decodeURIComponent(v);
        return acc;
    }, {});

const session = {}; // 세션 데이터를 저장할 객체
const users = {}; // 사용자 데이터를 저장할 객체
var onSearch; // 검색어를 저장할 변수
var user_ID; // 사용자 ID를 저장할 변수
app.set('view engine', 'pug');

const connection = mysql.createConnection({
    host: 'localhost', // 데이터베이스 호스트
    user: 'root', // 데이터베이스 사용자 이름
    password: 'Mysql123!@#', // 데이터베이스 비밀번호
    database: 'nodejs_shoppingmall' // 데이터베이스 이름
});
connection.connect(); // 데이터베이스 연결

// 메인 페이지
app.get('/main', function (req, res) {
    console.log("IP: " + req.ip + " / 접속");
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

// 검색 페이지
app.get('/search', function (req, res) {
    onSearch = req.query.query; // 검색어를 저장
    const api_url = 'https://openapi.naver.com/v1/search/shop.json?query=' +
        encodeURI(onSearch) + '&display=50';
    const options = {
        url: api_url,
        headers: {
            'X-Naver-Client-Id': client_id,
            'X-Naver-Client-Secret': client_secret
        }
    };

    axios
        .get(api_url, options)
        .then(async (response) => {
            const data = response.data;
            const items = data.items;
            const results = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const price = item.lprice;
                const category = item.category1;
                const name = item.title;
                const link = item.link;
                const image = item.image;
                const mallName = item.mallName;

                // 댓글 가져오기
                const comment = await new Promise((resolve, reject) => {
                    getCommentsFromDatabase(name)
                        .then(resolve)
                        .catch(reject);
                });

                // 별점 가져오기
                const get_raiting = await new Promise((resolve, reject) => {
                    getRatingFromDatabase(name)
                        .then(resolve)
                        .catch(reject);
                });

                const comments = comment.map((c) => c.comment);
                const commenters = comment.map((c) => c.commenter);
                const created_ats = comment.map((c) => c.created_at);
                const raiting = await get_raiting;
                results[i] = {
                    name,
                    category,
                    price,
                    link,
                    image,
                    mallName,
                    comments,
                    commenters,
                    created_ats,
                    raiting,
                };

                //DB에 상품 정보 저장
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
            let sortedResults;

            if (select === 'expensive')
                sortedResults = sys.DESCarr(results);
            else if (select === 'cheap')
                sortedResults = sys.ASCarr(results);
            else
                sortedResults = results;

            res.render('result', {
                results: sortedResults,
                productname: onSearch
            });
            console.log("IP: " + req.ip + " / 검색어: " + onSearch);
        })
        .catch((error) => {
            console.error('Error occurred while getting items:', error);
            res.status(500).send('Error occurred while getting items:');
        });
});

// 회원 가입 처리
app.post('/register', (req, res) => {
    const body = [];
    req
        .on('data', (chunk) => {
            body.push(chunk);
        })
        .on('end', () => {
            const data = Buffer.concat(body).toString();
            const {username, password} = qs.parse(data);

            getUserFromDatabase(username) // 이 함수를 통해 user 객체를 반환받음
                .then((user) => {
                    if (user.length > 0) { // So, user 객체를 반환 받았을 때, 값이 들어있다면 데이터베이스에 값이 존재
                        res.send(          // alert 창 출력
                            "<script>alert('이미 존재하는 사용자 이름입니다.'); window.location.href='/';</script>"
                        );
                        return;
                    }

                    // 비밀번호 암호화 후 회원 정보 저장
                    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
                    const newUser = {
                        username,
                        password: hashedPassword
                    };

                    // 만약 아무 이상이 없다면 회원가입 완료 처리 (데이터베이스로 해당 신규 user 적재)
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

// 댓글 추가 처리
app.get('/search/comment', (req, res) => {
    const item = req.query.itemName; // 상품 이름을 파라미터로 받음
    const comment = req.query.comment; // 클라이언트에서 전송된 댓글 내용
    const commenter = user_ID;

    saveCommentToDatabase(item, comment, commenter); // 데이터베이스에 댓글 저장하는 함수 호출

    const redirectURL = '/search?query=' + encodeURIComponent(onSearch);
    res.redirect(redirectURL);
});

// 평점 추가 처리
app.get('/search/rating', (req, res) => {
    const item = req.query.itemName; // 상품 이름을 파라미터로 받음
    const rating = req.query.rating; // 클라이언트에서 전송된 평점

    saveRatingToDatabase(item, rating); // 데이터베이스에 평점 저장하는 함수 호출

    const redirectURL = '/search?query=' + encodeURIComponent(onSearch);
    res.redirect(redirectURL);
});

// 로그인 처리
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

            // 회원 정보 저장
            const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

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

// 진입 페이지 처리
app.get('/', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies.session;
    const sessionData = session[sessionId];

    res.render('entry');
});

// 로그인 페이지 처리
app.get('/login', (req, res) => {
    res.render('login');
});

// 회원 가입 페이지 처리
app.get('/register', (req, res) => {
    res.render('register');
});

// 서버실행
app.listen(3000, '192.168.234.50', function () {
    console.log('http://192.168.234.50:3000/ app listening on port 3000!');
});