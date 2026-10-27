const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * Authentication & Family Membership Routes
 * Base: /api/auth
 */

// User login endpoint (dispatches async login security email alert)
router.post('/login', authController.login);

// Register new family account & admin (dispatches async welcome email with invite code)
router.post('/register-family', authController.registerFamily);

// Join existing family pot via invite code (dispatches async welcome email)
router.post('/join-family', authController.joinFamily);

// Request password reset email / OTP (dispatches async reset email, handles errors silently)
router.post('/forgot-password', authController.forgotPassword);

module.exports = router;
