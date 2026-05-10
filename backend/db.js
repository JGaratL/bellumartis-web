const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "localhost",
  user: "bellumartis_user",
  password: "MiP@ss123!",
  database: "bellumartis",
});

module.exports = pool.promise();