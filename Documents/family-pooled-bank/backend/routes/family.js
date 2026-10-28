const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');

/**
 * Family & Invite Verification Routes
 * Base: /api/family
 */

// Verify family invite code
router.get('/verify-invite/:code', familyController.verifyInvite);

// Get specific family details
router.get('/:id', familyController.getFamily);

module.exports = router;
