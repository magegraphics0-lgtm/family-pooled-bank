const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

/**
 * Paystack Contribution Routes
 * Base: /api/payments
 */

// Initialize a contribution transaction via Paystack
router.post('/initialize-contribution', paymentController.initializeContribution);

// Verify completed Paystack transaction reference and credit family pot
router.post('/verify-contribution', paymentController.verifyContribution);

// List transactions for a family
router.get('/transactions/:family_id', paymentController.getTransactionsByFamily);

// List verified contributions for a family
router.get('/contributions/:family_id', paymentController.getContributionsByFamily);

module.exports = router;
