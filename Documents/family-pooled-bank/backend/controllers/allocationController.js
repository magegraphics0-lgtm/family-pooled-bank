/**
 * OnePot Fund Allocation Controller (Parent vs. Child RBAC & Approval Workflow)
 * 
 * Chapter 3 RBAC Design:
 * - Parent: Full authorization to allocate pooled funds directly to Smart Bowls.
 * - Child: Restricted. Cannot allocate funds directly; can only submit Allocation Requests.
 * - Parent Approval Feed: Pending child requests trigger notifications to Parents with inline Accept/Reject.
 * - Approval Execution: Deducts from pooled bank, deducts/updates Smart Bowl balance, updates request status, and notifies Child.
 */

const dbState = require('../models/dbState');
const { sendEmail } = require('../services/emailService');

if (!dbState.allocation_requests) {
  dbState.allocation_requests = [];
}

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

    // Resolve Child User
    const child = dbState.users.find(u => u.user_id === effectiveChildId) || {
      user_id: effectiveChildId,
      first_name: 'Child',
      last_name: 'Contributor',
      role: 'child'
    };

    // Resolve Family
    const effectiveFamilyId = Number(family_id || child.family_id || 1);

    // Resolve Smart Bowl
    const bowl = dbState.bowls.find(b => b.id === effectiveBowlId) || {
      id: effectiveBowlId,
      category_name: 'Smart Bowl',
      allocated_amount: 0,
      spent_amount: 0
    };

    const requestId = dbState.allocation_requests.length + 1;
    const childFullName = `${child.first_name || ''} ${child.last_name || ''}`.trim() || 'Child Member';

    // 1. Stage pending allocation request
    const newRequest = {
      id: requestId,
      request_id: requestId,
      family_id: effectiveFamilyId,
      child_id: child.user_id,
      child_name: childFullName,
      bowl_id: bowl.id,
      bowl_name: bowl.category_name,
      amount: numAmount,
      description: description || `Allocation for ${bowl.category_name}`,
      status: 'pending',
      created_at: new Date().toISOString(),
      decided_at: null,
      decision_by_user_id: null
    };
    dbState.allocation_requests.push(newRequest);

    // 2. Also stage in expenses table as pending (mirrors Table 3.6 in schema.sql)
    const stagedExpense = {
      id: dbState.expenses.length + 1,
      expense_id: dbState.expenses.length + 1,
      family_id: effectiveFamilyId,
      bowl_id: bowl.id,
      requested_by_user_id: child.user_id,
      user_id: child.user_id,
      amount: numAmount,
      description: description || `Allocation request for ${bowl.category_name}`,
      status: 'pending',
      is_emergency: false,
      date_spent: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      request_id: requestId
    };
    dbState.expenses.push(stagedExpense);

    // 3. Generate real-time notification alert routed to Parent accounts
    const parents = dbState.users.filter(u => u.family_id === effectiveFamilyId && u.role === 'parent');
    const parentRecipients = parents.length > 0 ? parents : [dbState.users[0]];

    const notifMessage = `${childFullName} requested allocation of ₦${numAmount.toLocaleString()} for ${bowl.category_name}`;

    parentRecipients.forEach(parent => {
      const notifId = dbState.notifications.length + 1;
      dbState.notifications.push({
        id: notifId,
        notification_id: notifId,
        family_id: effectiveFamilyId,
        user_id: parent.user_id,
        type: 'allocation_request',
        message: notifMessage,
        amount: numAmount,
        request_id: requestId,
        child_id: child.user_id,
        child_name: childFullName,
        bowl_id: bowl.id,
        bowl_name: bowl.category_name,
        description: description || '',
        status: 'pending',
        is_read: false,
        sent_at: new Date().toISOString()
      });
    });

    // 4. Asynchronously notify parent via SMTP if configured
    try {
      const parentEmails = parentRecipients.map(p => p.email).filter(Boolean);
      if (parentEmails.length > 0) {
        sendEmail({
          to: parentEmails.join(', '),
          subject: `🔔 New Fund Allocation Request: ${childFullName} (₦${numAmount.toLocaleString()})`,
          text: `${notifMessage}\nReason: ${description || 'N/A'}\nPlease log into OnePot to Accept or Reject this request.`,
          html: `<p><strong>${notifMessage}</strong></p><p>Reason: ${description || 'N/A'}</p><p>Please log in to your OnePot Parent Dashboard to Accept or Reject.</p>`
        }).catch(e => console.warn('[SMTP ALLOCATION NOTICE] SMTP email dispatch note:', e.message));
      }
    } catch {
      // SMTP non-blocking
    }

    return res.status(201).json({
      success: true,
      message: `Allocation request of ₦${numAmount.toLocaleString()} for ${bowl.category_name} submitted for parent approval.`,
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
    const parentUserId = Number(approved_by_user_id || user_id || 1);

    // RBAC Permission Check: Confirm Approver is Parent
    const approver = dbState.users.find(u => u.user_id === parentUserId);
    if (approver && approver.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Only Parent Managers are authorized to approve fund allocations.'
      });
    }

    // Find the request
    let request = dbState.allocation_requests.find(r => r.id === requestId || r.request_id === requestId);
    if (!request) {
      // Fallback: check if id matched notification_id with request_id
      const notif = dbState.notifications.find(n => n.id === requestId || n.notification_id === requestId);
      if (notif && notif.request_id) {
        request = dbState.allocation_requests.find(r => r.id === notif.request_id);
      }
    }

    if (!request) {
      return res.status(404).json({ success: false, error: 'Allocation request not found.' });
    }

    if (request.status === 'approved') {
      return res.json({ success: true, message: 'This allocation request is already approved.', data: request });
    }

    // Update Request Status
    request.status = 'approved';
    request.decided_at = new Date().toISOString();
    request.decision_by_user_id = parentUserId;

    // Deduct / update appropriate Smart Bowl balance
    const bowl = dbState.bowls.find(b => b.id === Number(request.bowl_id));
    if (bowl) {
      bowl.spent_amount = (bowl.spent_amount || 0) + Number(request.amount);
      if (bowl.balance !== undefined) {
        bowl.balance = Math.max(0, bowl.balance - Number(request.amount));
      }
    }

    // Deduct from shared family pot balance
    const family = dbState.families.find(f => f.family_id === Number(request.family_id)) || dbState.families[0];
    if (family) {
      family.total_pot_balance = Math.max(0, (family.total_pot_balance || 0) - Number(request.amount));
    }

    // Update staged expense if present, or add new approved expense
    const stagedExpense = dbState.expenses.find(e => e.request_id === request.id);
    if (stagedExpense) {
      stagedExpense.status = 'approved';
    } else {
      dbState.expenses.push({
        id: dbState.expenses.length + 1,
        expense_id: dbState.expenses.length + 1,
        family_id: request.family_id,
        bowl_id: request.bowl_id,
        requested_by_user_id: request.child_id,
        user_id: request.child_id,
        amount: request.amount,
        description: `Approved Allocation: ${request.description || request.bowl_name}`,
        status: 'approved',
        is_emergency: false,
        date_spent: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      });
    }

    // Record in ledger approvals table
    dbState.approvals.push({
      id: dbState.approvals.length + 1,
      expense_id: stagedExpense ? stagedExpense.id : dbState.expenses.length,
      approved_by_user_id: parentUserId,
      status: 'approved',
      decision_note: `Approved allocation of ₦${Number(request.amount).toLocaleString()} for ${request.bowl_name}`,
      decided_at: new Date().toISOString()
    });

    // Update all matching parent notifications to 'approved'
    dbState.notifications.forEach(n => {
      if (n.request_id === request.id) {
        n.status = 'approved';
        n.is_read = true;
      }
    });

    // Route real-time notification alert to Child
    const childUser = dbState.users.find(u => u.user_id === Number(request.child_id));
    const childNotifId = dbState.notifications.length + 1;
    const approverName = approver ? `${approver.first_name} ${approver.last_name}` : 'Parent Admin';
    const childMessage = `Your allocation request of ₦${Number(request.amount).toLocaleString()} for ${request.bowl_name} has been approved by ${approverName}.`;

    dbState.notifications.push({
      id: childNotifId,
      notification_id: childNotifId,
      family_id: request.family_id,
      user_id: request.child_id,
      type: 'allocation_approved',
      message: childMessage,
      request_id: request.id,
      amount: request.amount,
      bowl_name: request.bowl_name,
      status: 'approved',
      is_read: false,
      sent_at: new Date().toISOString()
    });

    // Async SMTP notification to child
    if (childUser?.email) {
      sendEmail({
        to: childUser.email,
        subject: `✅ Allocation Approved: ₦${Number(request.amount).toLocaleString()} for ${request.bowl_name}`,
        text: childMessage,
        html: `<p><strong>${childMessage}</strong></p><p>Funds have been allocated to the <strong>${request.bowl_name}</strong> Smart Bowl.</p>`
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Allocation request of ₦${Number(request.amount).toLocaleString()} approved successfully.`,
      data: {
        request,
        total_pot_balance: family?.total_pot_balance,
        bowl
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
    const parentUserId = Number(rejected_by_user_id || user_id || 1);

    // RBAC Permission Check: Confirm Approver is Parent
    const rejector = dbState.users.find(u => u.user_id === parentUserId);
    if (rejector && rejector.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Only Parent Managers are authorized to reject fund allocations.'
      });
    }

    // Find the request
    let request = dbState.allocation_requests.find(r => r.id === requestId || r.request_id === requestId);
    if (!request) {
      const notif = dbState.notifications.find(n => n.id === requestId || n.notification_id === requestId);
      if (notif && notif.request_id) {
        request = dbState.allocation_requests.find(r => r.id === notif.request_id);
      }
    }

    if (!request) {
      return res.status(404).json({ success: false, error: 'Allocation request not found.' });
    }

    request.status = 'rejected';
    request.decided_at = new Date().toISOString();
    request.decision_by_user_id = parentUserId;

    // Update staged expense if present
    const stagedExpense = dbState.expenses.find(e => e.request_id === request.id);
    if (stagedExpense) {
      stagedExpense.status = 'rejected';
    }

    // Record rejection in approvals ledger
    dbState.approvals.push({
      id: dbState.approvals.length + 1,
      expense_id: stagedExpense ? stagedExpense.id : null,
      approved_by_user_id: parentUserId,
      status: 'rejected',
      decision_note: reason || `Allocation request of ₦${Number(request.amount).toLocaleString()} declined.`,
      decided_at: new Date().toISOString()
    });

    // Update all matching parent notifications to 'rejected'
    dbState.notifications.forEach(n => {
      if (n.request_id === request.id) {
        n.status = 'rejected';
        n.is_read = true;
      }
    });

    // Route real-time notification alert to Child
    const childUser = dbState.users.find(u => u.user_id === Number(request.child_id));
    const childNotifId = dbState.notifications.length + 1;
    const rejectorName = rejector ? `${rejector.first_name} ${rejector.last_name}` : 'Parent Admin';
    const childMessage = `Your allocation request of ₦${Number(request.amount).toLocaleString()} for ${request.bowl_name} was declined by ${rejectorName}.`;

    dbState.notifications.push({
      id: childNotifId,
      notification_id: childNotifId,
      family_id: request.family_id,
      user_id: request.child_id,
      type: 'allocation_rejected',
      message: childMessage,
      request_id: request.id,
      amount: request.amount,
      bowl_name: request.bowl_name,
      status: 'rejected',
      is_read: false,
      sent_at: new Date().toISOString()
    });

    // Async SMTP notification to child
    if (childUser?.email) {
      sendEmail({
        to: childUser.email,
        subject: `❌ Allocation Declined: ₦${Number(request.amount).toLocaleString()} for ${request.bowl_name}`,
        text: childMessage,
        html: `<p><strong>${childMessage}</strong></p><p>Please consult your family parent managers for details.</p>`
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Allocation request of ₦${Number(request.amount).toLocaleString()} rejected.`,
      data: request
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
    const parentUserId = Number(user_id || 1);
    const numAmount = parseFloat(amount);

    const user = dbState.users.find(u => u.user_id === parentUserId);
    if (!user || user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Only Parent Managers are permitted to allocate funds directly.'
      });
    }

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Please enter a valid allocation amount (₦).' });
    }

    const effectiveFamilyId = Number(family_id || user.family_id || 1);
    const family = dbState.families.find(f => f.family_id === effectiveFamilyId) || dbState.families[0];

    if ((family.total_pot_balance || 0) < numAmount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient funds in family pot! Available balance is ₦${(family.total_pot_balance || 0).toLocaleString()}`
      });
    }

    // Deduct pot balance
    family.total_pot_balance -= numAmount;

    // Update bowl
    const bowl = dbState.bowls.find(b => b.id === Number(bowl_id));
    if (bowl) {
      bowl.spent_amount = (bowl.spent_amount || 0) + numAmount;
    }

    // Add expense record
    const newExpense = {
      id: dbState.expenses.length + 1,
      expense_id: dbState.expenses.length + 1,
      family_id: effectiveFamilyId,
      bowl_id: bowl?.id || 1,
      requested_by_user_id: user.user_id,
      user_id: user.user_id,
      amount: numAmount,
      description: purpose || `Parent Allocation for ${bowl?.category_name || 'Household'}`,
      status: 'approved',
      is_emergency: false,
      date_spent: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    dbState.expenses.push(newExpense);

    return res.json({
      success: true,
      message: `₦${numAmount.toLocaleString()} allocated successfully from Family Pot.`,
      data: {
        total_pot_balance: family.total_pot_balance,
        expense: newExpense
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
function getAllocationRequests(req, res) {
  const familyId = Number(req.query.family_id || 1);
  const requests = (dbState.allocation_requests || []).filter(r => r.family_id === familyId);
  return res.json({ success: true, data: requests });
}

/**
 * 6. Get All Allocations
 * GET /api/allocations
 */
function getAllocations(req, res) {
  const familyId = Number(req.query.family_id || 1);
  const requests = (dbState.allocation_requests || []).filter(r => r.family_id === familyId);
  return res.json({
    success: true,
    data: {
      requests,
      expenses: (dbState.expenses || []).filter(e => e.family_id === familyId)
    }
  });
}

module.exports = {
  createAllocationRequest,
  approveAllocation,
  rejectAllocation,
  directAllocate,
  getAllocationRequests,
  getAllocations
};
