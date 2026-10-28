/**
 * MySQL Database Connection & Query Helper for OnePot Backend
 * Seamlessly interfaces with active MySQL while maintaining in-memory dbState fallback.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (pool) return pool;

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      pool = mysql.createPool(dbUrl);
      return pool;
    } catch (err) {
      console.warn('[DB WARNING] Could not create pool from DATABASE_URL:', err.message);
    }
  }

  if (process.env.DB_HOST) {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      return pool;
    } catch (err) {
      console.warn('[DB WARNING] Could not create pool from DB_HOST:', err.message);
    }
  }

  return null;
}

async function query(sql, params = []) {
  const p = getPool();
  if (!p) return null;
  try {
    const [results] = await p.query(sql, params);
    return results;
  } catch (error) {
    console.warn('[DB QUERY ERROR]', error.message);
    return null;
  }
}

module.exports = {
  getPool,
  query
};
