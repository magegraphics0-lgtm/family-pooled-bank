/**
 * Migration Script for Private Family Invite System
 * Applies schema updates to the active MySQL database.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const mysql = require('mysql2/promise');

async function runMigration() {
  const connectionUrl = process.env.DATABASE_URL;
  if (!connectionUrl) {
    console.warn('DATABASE_URL not set in environment. Skipping active DB migration.');
    return;
  }

  console.log('Connecting to active MySQL database...');
  const conn = await mysql.createConnection(connectionUrl);

  try {
    console.log('Executing database migrations...');

    // 1. Create or ensure `families` table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS families (
        id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        family_name VARCHAR(100) NOT NULL,
        invite_code VARCHAR(12) NOT NULL UNIQUE,
        created_by INT(11) DEFAULT NULL,
        total_pot_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        emergency_fund_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        auto_save_percentage DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✔ Table `families` checked/created.');

    // 2. Create or ensure `users` table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        family_id INT(11) DEFAULT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('parent', 'member') NOT NULL DEFAULT 'member',
        avatar_url VARCHAR(255) DEFAULT '👑',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✔ Table `users` checked/created.');

    // 3. Ensure columns in `users`
    try {
      await conn.query(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('parent', 'member') NOT NULL DEFAULT 'member'
      `);
      console.log('✔ Column `users.role` updated to ENUM(\'parent\', \'member\').');
    } catch (e) {
      console.log('Notice on users.role:', e.message);
    }

    // 4. Create or ensure `family_members` table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS family_members (
        id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        family_id INT(11) NOT NULL,
        user_id INT(11) NOT NULL,
        role_in_family ENUM('head', 'spouse', 'child') NOT NULL DEFAULT 'child',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_family_id (family_id),
        INDEX idx_user_id (user_id),
        UNIQUE KEY uq_family_user (family_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✔ Table `family_members` checked/created.');

    // 5. Seed default Okafor family and parent if empty
    const [existingFamilies] = await conn.query('SELECT * FROM families LIMIT 1');
    if (existingFamilies.length === 0) {
      const [userRes] = await conn.query(`
        INSERT INTO users (first_name, last_name, email, password_hash, role)
        VALUES ('Emeka', 'Okafor', 'parent@onepot.app', '$2a$10$demoHashedPasswordOkaforParentAdmin123', 'parent')
        ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)
      `);
      const userId = userRes.insertId || 1;

      const [famRes] = await conn.query(`
        INSERT INTO families (family_name, invite_code, created_by, total_pot_balance, emergency_fund_balance)
        VALUES ('The Okafor Household', 'FAM-OKAFOR', ?, 825000.00, 150000.00)
      `, [userId]);
      const familyId = famRes.insertId;

      await conn.query(`UPDATE users SET family_id = ? WHERE id = ?`, [familyId, userId]);

      await conn.query(`
        INSERT IGNORE INTO family_members (family_id, user_id, role_in_family)
        VALUES (?, ?, 'head')
      `, [familyId, userId]);

      console.log('✔ Seeded initial family "The Okafor Household" (Invite: FAM-OKAFOR).');
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  } finally {
    await conn.end();
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
