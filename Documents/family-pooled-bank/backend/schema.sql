-- ====================================================================
-- Database Schema for Web-Based Pooled Bank & Family Financial Planner
-- Chapter 3 Section 3.5 Database Design (Tables 3.1 - 3.9)
-- DBMS: MySQL
-- ====================================================================

CREATE DATABASE IF NOT EXISTS family_pooled_bank_db;
USE family_pooled_bank_db;

-- Table 3.2: family_table
CREATE TABLE IF NOT EXISTS family_table (
    family_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_name VARCHAR(100) NOT NULL,
    created_at DATE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 3.1: user_table
CREATE TABLE IF NOT EXISTS user_table (
    user_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) DEFAULT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('parent', 'child') NOT NULL DEFAULT 'parent',
    FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 3.3: category_table
CREATE TABLE IF NOT EXISTS category_table (
    category_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 3.4: income_table
CREATE TABLE IF NOT EXISTS income_table (
    income_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT(11) NOT NULL,
    family_id INT(11) NOT NULL,
    source VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date_received DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user_table(user_id) ON DELETE CASCADE,
    FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 3.5: expense_table
CREATE TABLE IF NOT EXISTS expense_table (
    expense_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT(11) NOT NULL,
    family_id INT(11) NOT NULL,
    category_id INT(11) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(255) NOT NULL,
    date_spent DATE NOT NULL,
    description TEXT DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES user_table(user_id) ON DELETE CASCADE,
    FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES category_table(category_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 3.6: budgetlimit_table
CREATE TABLE IF NOT EXISTS budgetlimit_table (
    limit_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) NOT NULL,
    category_id INT(11) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    period VARCHAR(50) NOT NULL DEFAULT 'Monthly',
    FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES category_table(category_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 3.7: notification_table
CREATE TABLE IF NOT EXISTS notification_table (
    notification_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) NOT NULL,
    user_id INT(11) DEFAULT NULL,
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    sent_at DATETIME NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 3.8: pooledfund_table
CREATE TABLE IF NOT EXISTS pooledfund_table (
    pool_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) NOT NULL,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    last_updated DATETIME NOT NULL,
    FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 3.9: pooltransactions_table
CREATE TABLE IF NOT EXISTS pooltransactions_table (
    transaction_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) NOT NULL,
    user_id INT(11) DEFAULT NULL,
    type ENUM('contribution', 'allocation') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    purpose TEXT DEFAULT NULL,
    date DATE NOT NULL,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user_table(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 3.10: deposit_account_table
CREATE TABLE IF NOT EXISTS deposit_account_table (
    account_id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) NOT NULL,
    user_id INT(11) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type ENUM('savings', 'current', 'domiciliary') NOT NULL DEFAULT 'savings',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (family_id) REFERENCES family_table(family_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user_table(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

