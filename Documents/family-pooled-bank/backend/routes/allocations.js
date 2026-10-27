const express = require('express');
const router = express.Router();
const allocationController = require('../controllers/allocationController');

/**
 * Smart Bowl Fund Allocation & Child Request Approval Routes
 * Base: /api/allocations
 */

// List all allocations and history
router.get('/', allocationController.getAllocations);

// List pending/staged allocation requests
router.get('/requests', allocationController.getAllocationRequests);

// Child creates a pending fund allocation request
router.post('/request', allocationController.createAllocationRequest);

// Parent approves child allocation request (support both POST and PUT)
router.post('/:id/approve', allocationController.approveAllocation);
router.put('/:id/approve', allocationController.approveAllocation);

// Parent rejects child allocation request (support both POST and PUT)
router.post('/:id/reject', allocationController.rejectAllocation);
router.put('/:id/reject', allocationController.rejectAllocation);

// Parent direct allocation
router.post('/direct', allocationController.directAllocate);

module.exports = router;
