// db.js
// One shared MySQL connection pool, configured entirely from environment
// variables so nothing secret is committed to git. See .env.example.

const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Most managed MySQL providers (Aiven, PlanetScale, etc.) require SSL.
  // Set DB_SSL=true in your .env / host dashboard when that's the case.
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false,
});

module.exports = pool;
