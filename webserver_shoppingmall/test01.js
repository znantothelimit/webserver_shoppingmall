const express = require('express');
const app = express();
const axios = require('axios');
const pug = require('pug');
const url = require('url');
const qs = require('querystring');
const crypto = require('crypto');
const mysql = require('mysql');

const client_id = 'uR0FsbWPkbkFc2AFaUwy';
const client_secret = 'PUq6k8Cvip';

const parseCookies = (cookie = '') =>
  cookie
    .split(';')
    .map(v => v.split('='))
    .reduce((acc, [k, v]) => {
      acc[k.trim()] = decodeURIComponent(v);
      return acc;
    }, {});

const session = {};
const users = {};

app.set('view engine', 'pug');

const connection = mysql.createConnection({
  host: 'localhost', // centos 서버 아이피
  user: 'root', // oracle12
  password: 'Mysql123!@#', // Mysql123!@#
  database: 'nodejs_shoppingmall' // nodejs_shoppingmall
});
connection.connect();

app.get('/main', function(req, res) {
  console.log("IP : " + req.ip + "/ 접속");
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.session;
  const sessionData = session[sessionId];

  if (!sessionData) {
    res.redirect('/'); // 세션 데이터가 없으면 로그인 페이지로 리디렉션
    return;
  }

  res.render('main', { title: 'Main' , username: sessionData.username});
});

app.get('/search', function (req, res) {
    var api_url = 'https://openapi.naver.com/v1/search/shop.json?query=' + encodeURI(req.query.query) + '&display=50';
    var options = {
      url: api_url,
      headers: { 'X-Naver-Client-Id': client_id, 'X-Naver-Client-Secret': client_secret }
    };
    
    axios.get(api_url, {
      headers: {
        'X-Naver-Client-Id': client_id,
        'X-Naver-Client-Secret': client_secret
      }
    })
    .then((response) => {
      const data = response.data;
      const items = data.items;
      var results = [];
      /* 반복문 내에서 가격, 상품명, 카테고리 등의 특성을 변수에 저장 */
      for (var i = 0; i < items.length; i++) {
        results[i] = [];
        var item = items[i];
        var price = item.lprice;
        // 추가 var formattedPrice = price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원"; // Format the price with "원" symbol
        var category = item.category1;
        var name = item.title;
        /* 추가 상품링크, 이미지 , 판매처 */
        var link = item.link;
        var image = item.image;
        var mallName = item.mallName;
        //여기에 댓글 코멘트 추가해야함
  
        results[i] = { name, category, price, link, image, mallName };

        // 변수 값을 MySQL 데이터베이스에 저장
        const query = `INSERT INTO items (price, category, name, link, image, mallName) VALUES (?, ?, ?, ?, ?, ?)`;
        const values = [price, category, name, link, image, mallName];
        
        connection.query(query, values, (error, results) => {
          if (error) throw error;
          console.log('Item saved successfully');
        });
      }
      default_results = results;
      const select = req.query;

      const query = 'SELECT * FROM itmes';
      if (select === 'expensive') {
        query += ' ORDER BY price DESC';
      } else if (select === 'cheap') {
        query += ' ORDER BY price ASC';
      }

      connection.query(query, (err, results) => {
        // 이하 코드는 이전 코드와 동일
        if (err) {
          console.error('Error executing query: ' + err.stack);
          res.status(500).send('Error executing query');
          return;
        }
        if(select === 'default'){
          results = default_results;
        }
        res.render('result', { results:results, productname : req.query.query});
        console.log("IP : " + req.ip + " / 검색어 : " + req.query.query); // 콘솔 출력 추가
      });
      connection.end();
    })
    .catch((error) => {
      console.error('Error occurred while getting items:', error);
      res.status(500).send('Error occurred while getting items:');
      connection.end();
    });
  });

app.post('/register', (req, res) => {
    const body = [];
    req.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      const data = Buffer.concat(body).toString();
      const { username, password } = qs.parse(data);
  
      // 사용자 이름이 이미 존재하는지 확인
      if (users[username]) {
        res.send("<script>alert('이미 존재하는 사용자 이름입니다.'); window.location.href='/';</script>");
      } else {
        // 회원 정보 저장
        users[username] = {
          username,
          password,
        };
        res.send("<script>alert('회원 가입이 완료되었습니다.'); window.location.href='/';</script>");
      }
    });
  });
  
  // 댓글 추가를 위한 POST 요청 핸들러
  app.post('/comment', (req, res) => {
    const item = req.params.item; // 상품 이름을 파라미터로 받음
    const comment = req.body.comment; // 클라이언트에서 전송된 댓글 내용
    const query = req.body.query; // 클라이언트에서 전송된 검색어
    
    // 댓글을 데이터베이스 또는 다른 저장소에 추가
    saveCommentToDatabase(item, comment); // 데이터베이스에 댓글 저장하는 함수 호출
    
    // 새로 추가된 댓글을 포함한 전체 댓글 목록을 조회
    const comments = retrieveCommentsFromDatabase(item); // 데이터베이스에서 댓글 조회하는 함수 호출
    
    // 댓글 목록을 클라이언트로 전송
    const redirectURL = '/search?query=' + encodeURIComponent(query);
    res.redirect(redirectURL);
  });

app.post('/login', (req, res) => {
  const body = [];
  req.on('data', (chunk) => {
    body.push(chunk);
  }).on('end', () => {
    const data = Buffer.concat(body).toString();
    const { username, password } = qs.parse(data);

    // 로그인 실패 처리
    if (!users[username] || users[username].password !== password) {
        res.send("<script>alert('로그인 실패'); window.location.href='/login';</script>");
        return;
      }

    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10);
    const uniqueInt = Date.now();
    session[uniqueInt] = {
      username,
      expires,
    };

    // 세션 정보를 쿠키에 저장
    res.cookie('session', uniqueInt, {
      expires: expires,
      httpOnly: true,
      path: '/'
    });

    res.redirect('/main');
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
