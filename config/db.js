const mysql = require('mysql2/promise');
module.exports = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root@1234',
  database: 'adsmn'
});
