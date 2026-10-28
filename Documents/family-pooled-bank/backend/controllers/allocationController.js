/**
 * OnePot Fund Allocation Controller (Parent vs. Child RBAC & Approval Workflow)
 * Chapter 3 RBAC Design:
 * - Parent: Full authorization to allocate pooled funds directly to Smart Bowls.
 * - Child: Restricted. Cannot allocate funds directly; can only submit Allocation Requests.
 * - Parent Approval Feed: Pending child requests trigger notifications to Parents with inline Accept/Reject.
 * - Approval Execution: Deducts from pooled bank, deducts/updates Smart Bowl balance, updates request status, and notifies Child.
 * Connected directly to active MySQL database (Aiven Cloud).
 */

const db = require('../models/db');
const dbState = require('../models/dbState');
const { sendEmail } = require('../services/emailService');

/**
 * 1. Submit Allocation Request (Child Contributor Workflow)
 * POST /api/allocations/request
 */
async function createAllocationRequest(req, res) {
  try {
    const { family_id, child_id, user_id, bowl_id, category_id, amount, description } = req.body;
    const effectiveChildId = Number(child_id || user_id);
    const effectiveBowlId = Number(bowl_id || category_id);
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please specify a valid allocation amount in Naira (₦) greater than 0.'
      });
    }

    if (!effectiveBowlId) {
      return res.status(400).json({
        success: false,
        error: 'Please select a Smart Bowl destination for this allocation.'
      });
    }

    // Resolve Child User from MySQL
    let child = null;
    const dbChildUsers = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [effectiveChildId]);
    if (dbChildUsers && dbChildUsers.length > 0) {
      child = dbChildUsers[0];
    } else {
      child = dbState.users.find(u => (u.id || u.user_id) === effectiveChildId);
    }

    if (!child) {
      return res.status(404).json({ success: false, error: 'Child user account not found.' });
    }

    const effectiveFamilyId = Number(family_id || child.family_id);

    // Resolve Smart Bowl from MySQL
    let bowl = null;
    const dbBowls = await db.query('SELECT * FROM bowls WHERE id = ? LIMIT 1', [effectiveBowlId]);
    if (dbBowls && dbBowls.length > 0) {
      bowl = dbBowls[0];
    } else {
      bowl = dbState.bowls.find(b => b.id === effectiveBowlId);
    }

    const bowlName = bowl ? bowl.category_name : 'Smart Bowl';
    const childFullName = `${child.first_name || ''} ${child.last_name || ''}`.trim() || 'Child Member';

    // 1. Stage in expenses table as pending (Chapter 3 schema Table 3.6)
    const expenseInsert = await db.query(
      'INSERT INTO expenses (family_id, bowl_id, requested_by_user_id, amount, description, status, is_emergency) VALUES (?, ?, ?, ?, ?, "pending", 0)',
      [effectiveFamilyId, effectiveBowlId, child.id || effectiveChildId, numAmount, description || `Allocation for ${bowlName}`]
    );
    const requestId = expenseInsert?.insertId || Date.now();

    const notifMessage = `${childFullName} requested allocation of ₦${numAmount.toLocaleString()} for ${bowlName}`;

    // 2. Query parents for real-time notification alert routed to Parent accounts
    const parents = await db.query('SELECT * FROM users WHERE family_id = ? AND role = "parent"', [effectiveFamilyId]);
    if (parents && parents.length > 0) {
      for (const parent of parents) {
        await db.query(
          'INSERT INTO notifications (family_id, user_id, message, type, is_read) VALUES (?, ?, ?, "allocation_request", 0)',
          [effectiveFamilyId, parent.id, notifMessage]
        );
      }

      // 3. Asynchronously notify parent via SMTP if configured
      try {
        const parentEmails = parents.map(p => p.email).filter(Boolean);
        if (parentEmails.length > 0) {
          sendEmail({
            to: parentEmails.join(', '),
            subject: `🔔 New Fund Allocation Request: ${childFullName} (₦${numAmount.toLocaleString()})`,
            text: `${notifMessage}\nReason: ${description || 'N/A'}\nPlease log into OnePot to Accept or Reject this request.`,
            html: `<p><strong>${notifMessage}</strong></p><p>Reason: ${description || 'N/A'}</p><p>Please log in to your OnePot Parent Dashboard to Accept or Reject.</p>`
          }).catch(e => console.warn('[SMTP ALLOCATION NOTICE]', e.message));
        }
      } catch {
        // non-blocking
      }
    }

    const newRequest = {
      id: requestId,
      request_id: requestId,
      family_id: effectiveFamilyId,
      child_id: child.id || effectiveChildId,
      child_name: childFullName,
      bowl_id: effectiveBowlId,
      bowl_name: bowlName,
      amount: numAmount,
      description: description || `Allocation for ${bowlName}`,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      message: `Allocation request of ₦${numAmount.toLocaleString()} for ${bowlName} submitted for parent approval.`,
      data: newRequest
    });
  } catch (error) {
    console.error('Error creating allocation request:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 2. Approve Child Allocation Request (Parent Only)
 * POST /api/allocations/:id/approve
 */
async function approveAllocation(req, res) {
  try {
    const requestId = Number(req.params.id);
    const { user_id, approved_by_user_id } = req.body;
    const parentUserId = Number(approved_by_user_id || user_id);

    if (!parentUserId) {
      return res.status(400).json({ success: false, error: 'Parent approver user ID is required.' });
    }

    // RBAC Permission Check: Confirm Approver is Parent from MySQL
    const approvers = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [parentUserId]);
    const approver = approvers && approvers.length > 0 ? approvers[0] : null;
    if (!approver || approver.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Only Parent Managers are authorized to approve fund allocations.'
      });
    }

    // Find the request/expense in MySQL
    const expenses = await db.query('SELECT * FROM expenses WHERE id = ? LIMIT 1', [requestId]);
    if (!expenses || expenses.length === 0) {
      return res.status(404).json({ success: false, error: 'Allocation request not found.' });
    }
    const request = expenses[0];

    if (request.status === 'approved') {
      return res.json({ success: true, message: 'This allocation request is already approved.', data: request });
    }

    const requestAmount = Number(request.amount);

    // Verify family pot balance in MySQL
    const famRows = await db.query('SELECT * FROM families WHERE id = ? LIMIT 1', [request.family_id]);
    if (!famRows || famRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Family pot account not found.' });
    }
    const family = famRows[0];
    const currentPotBalance = Number(family.total_pot_balance || 0);

    if (currentPotBalance < requestAmount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient funds in family pot! Available balance is ₦${currentPotBalance.toLocaleString()}, but request is ₦${requestAmount.toLocaleString()}`
      });
    }

    // 1. Update Request Status in expenses
    await db.query('UPDATE expenses SET status = "approved" WHERE id = ?', [requestId]);

    // 2. Deduct from shared family pot balance
    await db.query('UPDATE families SET total_pot_balance = total_pot_balance - ? WHERE id = ?', [requestAmount, family.id]);

    // 3. Update appropriate Smart Bowl balance
    await db.query('UPDATE bowls SET spent_amount = spent_amount + ? WHERE id = ?', [requestAmount, request.bowl_id]);

    // 4. Record in ledger approvals table
    await db.query(
      'INSERT INTO approvals (expense_id, approved_by_user_id, status, decision_note, decided_at) VALUES (?, ?, "approved", ?, NOW())',
      [requestId, parentUserId, `Approved allocation of ₦${requestAmount.toLocaleString()}`]
    );

    // 5. Route real-time notification alert to Child
    const childUsers = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [request.requested_by_user_id]);
    const childUser = childUsers && childUsers.length > 0 ? childUsers[0] : null;
    const approverName = `${approver.first_name} ${approver.last_name || ''}`.trim() || 'Parent Admin';
    const childMessage = `Your allocation request of ₦${requestAmount.toLocaleString()} has been approved by ${approverName}.`;

    await db.query(
      'INSERT INTO notifications (family_id, user_id, message, type, is_read) VALUES (?, ?, ?, "allocation_approved", 0)',
      [request.family_id, request.requested_by_user_id, childMessage]
    );

    // Async SMTP notification to child
    if (childUser?.email) {
      sendEmail({
        to: childUser.email,
        subject: `✅ Allocation Approved: ₦${requestAmount.toLocaleString()}`,
        text: childMessage,
        html: `<p><strong>${childMessage}</strong></p><p>Funds have been allocated from the Family Pot.</p>`
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Allocation request of ₦${requestAmount.toLocaleString()} approved successfully.`,
      data: {
        id: requestId,
        status: 'approved',
        total_pot_balance: Math.max(0, currentPotBalance - requestAmount)
      }
    });
  } catch (error) {
    console.error('Error approving allocation:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 3. Reject Child Allocation Request (Parent Only)
 * POST /api/allocations/:id/reject
 */
async function rejectAllocation(req, res) {
  try {
    const requestId = Number(req.params.id);
    const { user_id, rejected_by_user_id, reason } = req.body;
    const parentUserId = Number(rejected_by_user_id || user_id);

    if (!parentUserId) {
      return res.status(400).json({ success: false, error: 'Parent approver user ID is required.' });
    }

    // RBAC Permission Check: Confirm Approver is Parent from MySQL
    const approvers = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [parentUserId]);
    const approver = approvers && approvers.length > 0 ? approvers[0] : null;
    if (!approver || approver.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Only Parent Managers are authorized to reject fund allocations.'
      });
    }

    // Find the request/expense in MySQL
    const expenses = await db.query('SELECT * FROM expenses WHERE id = ? LIMIT 1', [requestId]);
    if (!expenses || expenses.length === 0) {
      return res.status(404).json({ success: false, error: 'Allocation request not found.' });
    }
    const request = expenses[0];

    // Update status to rejected
    await db.query('UPDATE expenses SET status = "rejected" WHERE id = ?', [requestId]);

    // Record in ledger approvals table
    await db.query(
      'INSERT INTO approvals (expense_id, approved_by_user_id, status, decision_note, decided_at) VALUES (?, ?, "rejected", ?, NOW())',
      [requestId, parentUserId, reason || `Allocation request of ₦${Number(request.amount).toLocaleString()} declined.`]
    );

    // Route real-time notification alert to Child
    const approverName = `${approver.first_name} ${approver.last_name || ''}`.trim() || 'Parent Admin';
    const childMessage = `Your allocation request of ₦${Number(request.amount).toLocaleString()} was declined by ${approverName}.`;

    await db.query(
      'INSERT INTO notifications (family_id, user_id, message, type, is_read) VALUES (?, ?, ?, "allocation_rejected", 0)',
      [request.family_id, request.requested_by_user_id, childMessage]
    );

    return res.json({
      success: true,
      message: `Allocation request of ₦${Number(request.amount).toLocaleString()} rejected.`,
      data: { id: requestId, status: 'rejected' }
    });
  } catch (error) {
    console.error('Error rejecting allocation:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 4. Direct Allocation Execution (Parent Role View)
 * POST /api/allocations/direct
 */
async function directAllocate(req, res) {
  try {
    const { user_id, bowl_id, amount, purpose, family_id } = req.body;
    const parentUserId = Number(user_id);
    const numAmount = parseFloat(amount);

    if (!parentUserId) {
      return res.status(400).json({ success: false, error: 'Parent user ID required.' });
    }

    const approvers = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [parentUserId]);
    const user = approvers && approvers.length > 0 ? approvers[0] : null;

    if (!user || user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Only Parent Managers are permitted to allocate funds directly.'
      });
    }

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Please enter a valid allocation amount (₦).' });
    }

    const effectiveFamilyId = Number(family_id || user.family_id);
    const famRows = await db.query('SELECT * FROM families WHERE id = ? LIMIT 1', [effectiveFamilyId]);
    if (!famRows || famRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Family not found.' });
    }
    const family = famRows[0];
    const totalPot = Number(family.total_pot_balance || 0);

    if (totalPot < numAmount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient funds in family pot! Available balance is ₦${totalPot.toLocaleString()}`
      });
    }

    // Deduct pot balance
    await db.query('UPDATE families SET total_pot_balance = total_pot_balance - ? WHERE id = ?', [numAmount, effectiveFamilyId]);

    // Update bowl spent amount
    if (bowl_id) {
      await db.query('UPDATE bowls SET spent_amount = spent_amount + ? WHERE id = ?', [numAmount, Number(bowl_id)]);
    }

    // Add approved expense record
    const expInsert = await db.query(
      'INSERT INTO expenses (family_id, bowl_id, requested_by_user_id, amount, description, status, is_emergency) VALUES (?, ?, ?, ?, ?, "approved", 0)',
      [effectiveFamilyId, Number(bowl_id || 1), user.id, numAmount, purpose || 'Parent Direct Allocation']
    );
    const expenseId = expInsert?.insertId || Date.now();

    // Record in approvals
    await db.query(
      'INSERT INTO approvals (expense_id, approved_by_user_id, status, decision_note, decided_at) VALUES (?, ?, "approved", ?, NOW())',
      [expenseId, user.id, purpose || 'Direct Parent Allocation']
    );

    return res.json({
      success: true,
      message: `₦${numAmount.toLocaleString()} allocated successfully from Family Pot.`,
      data: {
        total_pot_balance: totalPot - numAmount,
        expense: {
          id: expenseId,
          family_id: effectiveFamilyId,
          amount: numAmount,
          description: purpose || 'Parent Direct Allocation',
          status: 'approved'
        }
      }
    });
  } catch (error) {
    console.error('Error during direct allocation:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 5. Get Allocation Requests
 * GET /api/allocations/requests
 */
async function getAllocationRequests(req, res) {
  try {
    const familyId = Number(req.query.family_id);
    if (!familyId) {
      return res.json({ success: true, data: [] });
    }
    const requests = await db.query(
      'SELECT e.id, e.id AS request_id, e.family_id, e.requested_by_user_id AS child_id, e.amount, e.description, e.status, e.created_at, b.category_name AS bowl_name, u.first_name, u.last_name, CONCAT(u.first_name, " ", u.last_name) AS child_name FROM expenses e LEFT JOIN bowls b ON e.bowl_id = b.id LEFT JOIN users u ON e.requested_by_user_id = u.id WHERE e.family_id = ? AND e.status = "pending" ORDER BY e.id DESC',
      [familyId]
    );
    return res.json({ success: true, data: requests || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 6. Get All Allocations & Expenses
 * GET /api/allocations
 */
async function getAllocations(req, res) {
  try {
    const familyId = Number(req.query.family_id);
    if (!familyId) {
      return res.json({ success: true, data: { requests: [], expenses: [] } });
    }
    const requests = await db.query(
      'SELECT e.*, b.category_name AS bowl_name FROM expenses e LEFT JOIN bowls b ON e.bowl_id = b.id WHERE e.family_id = ? AND e.status = "pending" ORDER BY e.id DESC',
      [familyId]
    );
    const expenses = await db.query(
      'SELECT e.*, b.category_name AS bowl_name FROM expenses e LEFT JOIN bowls b ON e.bowl_id = b.id WHERE e.family_id = ? ORDER BY e.id DESC',
      [familyId]
    );
    return res.json({
      success: true,
      data: {
        requests: requests || [],
        expenses: expenses || []
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  createAllocationRequest,
  approveAllocation,
  rejectAllocation,
  directAllocate,
  getAllocationRequests,
  getAllocations
};
