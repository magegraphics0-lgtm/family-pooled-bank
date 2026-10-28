-- ====================================================================
-- Database Schema for OnePot: Family Pooled Bank & Financial Planner
-- Chapter 3 Section 3.5 Database Design (Tables 3.1 - 3.9)
-- DBMS: MySQL (InnoDB, UTF-8 Unicode)
-- Closed-loop mock banking ledger for academic demonstration.
-- Real fund movement simulated via Paystack sandbox API and Mono API guidelines.
-- ====================================================================

CREATE DATABASE IF NOT EXISTS onepot_db;
USE onepot_db;

-- 1. families Table
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

-- 2. users Table (RBAC: Parent Admins vs Family Members)
CREATE TABLE IF NOT EXISTS users (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) DEFAULT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('parent', 'member') NOT NULL DEFAULT 'member',
    avatar_url VARCHAR(255) DEFAULT '👑',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add Foreign Key for families.created_by to users.id
ALTER TABLE families 
    ADD CONSTRAINT fk_families_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 3. family_members Table (Private Family Membership & Role Mapping)
CREATE TABLE IF NOT EXISTS family_members (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) NOT NULL,
    user_id INT(11) NOT NULL,
    role_in_family ENUM('head', 'spouse', 'child') NOT NULL DEFAULT 'child',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_family_user (family_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. contributions Table (Tracks contributions only, preserving income privacy)
CREATE TABLE IF NOT EXISTS contributions (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) NOT NULL,
    member_id INT(11) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    source_note VARCHAR(255) DEFAULT NULL,
    paystack_ref VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. paystack_transactions Table (Paystack Sandbox Payment Gateway Integration)
CREATE TABLE IF NOT EXISTS paystack_transactions (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) NOT NULL,
    member_id INT(11) NOT NULL,
    reference VARCHAR(100) NOT NULL UNIQUE,
    amount DECIMAL(12, 2) NOT NULL,
    status ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
    access_code VARCHAR(100) DEFAULT NULL,
    authorization_url TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. bowls Table (Smart Category Budgets with Caps & Priority Levels)
CREATE TABLE IF NOT EXISTS bowls (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    allocated_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    spent_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    priority_level ENUM('High', 'Medium', 'Low') NOT NULL DEFAULT 'Medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. expenses Table (Child requests staged as 'pending'; Parent auto-approved)
CREATE TABLE IF NOT EXISTS expenses (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) NOT NULL,
    bowl_id INT(11) NOT NULL,
    requested_by_user_id INT(11) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (bowl_id) REFERENCES bowls(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. approvals Table (Parent decision log for expenses and emergency borrowing)
CREATE TABLE IF NOT EXISTS approvals (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    expense_id INT(11) NOT NULL,
    approved_by_user_id INT(11) NOT NULL,
    status ENUM('approved', 'rejected') NOT NULL,
    decision_note TEXT DEFAULT NULL,
    decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. goals Table (Family Custom Targets & Savings Milestones)
CREATE TABLE IF NOT EXISTS goals (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) NOT NULL,
    created_by_user_id INT(11) NOT NULL,
    title VARCHAR(150) NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    current_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    image_url VARCHAR(255) DEFAULT NULL,
    status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. notifications Table (In-app and SMTP Email Notification Audit Log)
CREATE TABLE IF NOT EXISTS notifications (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    family_id INT(11) NOT NULL,
    user_id INT(11) DEFAULT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
