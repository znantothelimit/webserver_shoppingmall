const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost', // centos 서버 아이피
    user: 'root', // oracle12
    password: 'Mysql123!@#', // Mysql123!@#
    database: 'nodejs_shoppingmall' // nodejs_shoppingmall
});

connection.connect();

// MySQL 데이터베이스에서 아이템을 검색하고 JavaScript 변수에 저장하는 함수
function getItemsFromDatabase() {
    return new Promise((resolve, reject) => {
      // 데이터베이스에서 아이템을 검색하기 위한 쿼리
      const query = `SELECT * FROM items`;
  
      // 쿼리 실행
      connection.query(query, (error, results, fields) => {
        if (error) {
          reject(error);
          return;
        }
  
        // 검색된 데이터를 JavaScript 변수에 저장
        const items = results.map((row) => {
          return {
            price: row.price,
            category: row.category,
            name: row.name,
            link: row.link,
            image: row.image,
            mallname: row.mallname,
          };
        });
  
        resolve(items);
      });
    });
}
  
// 아이템을 MySQL 데이터베이스에 저장하는 함수
function saveItemsToDatabase(items) {
    return new Promise((resolve, reject) => {
      // 아이템을 반복하여 MySQL 데이터베이스에 저장
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var price = item.lprice;
        // 추가 var formattedPrice = price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원"; // Format the price with "원" symbol
        var category = item.category1;
        var name = item.title;
        /* 추가 상품링크, 이미지 , 판매처 */
        var link = item.link;
        var image = item.image;
        var mallName = item.mallName;

        // 변수 값을 MySQL 데이터베이스에 저장
        const query = `INSERT INTO items (price, category, name, link, image, mallName) VALUES (?, ?, ?, ?, ?, ?)`;
        const values = [price, category, name, link, image, mallName];
        connection.query(query, values, (error, results) => {
          if (error) {
            reject(error);
            return;
          }
          console.log('Item saved successfully');
        });
      }
  
      resolve();
    });
}

function getUserFromDatabase(username) {
    return new Promise((resolve, reject) => {
      // 데이터베이스에서 아이템을 검색하기 위한 쿼리
      const query = `SELECT * FROM users WHERE username = ?`;
    
      // 쿼리 실행
      connection.query(query, [username], (error, results, fields) => {
        if (error) {
          reject(error);
          return;
        }
  
        // 검색된 데이터를 JavaScript 변수에 저장
        const user = results.map((row) => {
          return {
            username: row.username,
            nickname: row.nickname,
            comment: row.comment,
            created_at: row.created_at,
            passwd: row.passwd,
          };
        });
  
        resolve(user);
      });
    });
  }
  
  

function saveUserToDatabase(users) {
    return new Promise((resolve, reject) => {
        // 변수 값을 MySQL 데이터베이스에 저장
        const query = `INSERT INTO users (username, passwd) VALUES (?, ?)`;
        const values = [users.username, users.passwd];
        connection.query(query, values, (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          console.log('user saved successfully');
          resolve();
        });
    });
}

// MySQL 데이터베이스에서 아이템을 삭제하는 함수
function deleteItemsFromDatabase() {
    return new Promise((resolve, reject) => {
      // 삭제할 아이템의 조건을 지정하는 쿼리
      const query = `DELETE FROM items WHERE category = '사용자가 원하는 카테고리'`;
  
      // 쿼리 실행
      connection.query(query, (error, results) => {
        if (error) {
          reject(error);
          return;
        }
  
        // 삭제된 행의 개수 반환
        resolve(results.affectedRows);
      });
    });
}
  
module.exports = {
    getItemsFromDatabase,
    saveItemsToDatabase,
    deleteItemsFromDatabase,
    getUserFromDatabase,
    saveUserToDatabase,
};