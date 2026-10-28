const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * Authentication & Private Family Membership Routes
 * Base: /api/auth
 */

// User login endpoint (dispatches async login security email alert)
router.post('/login', authController.login);

// Current session endpoint
router.get('/me', authController.getMe);

// Parent Registration (Hashes password, role = 'parent', generates FAM-XXXXXX invite code, creates family, adds to family_members as 'head', dispatches welcome email)
router.post('/register-parent', authController.registerParent);

// Member Registration (Validates invite_code, role = 'member', links to family_members, dispatches welcome email)
router.post('/register-member', authController.registerMember);

// Backward-compatibility aliases
router.post('/register-family', authController.registerParent);
router.post('/join-family', authController.registerMember);

// Request password reset email / OTP
router.post('/forgot-password', authController.forgotPassword);

module.exports = router;
