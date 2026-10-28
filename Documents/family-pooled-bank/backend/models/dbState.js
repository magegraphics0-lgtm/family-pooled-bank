/**
 * OnePot In-Memory Data Store (Closed-Loop Mock Ledger Cache)
 * Mirrors active MySQL schema entities with clean initial state
 */

const dbState = {
  families: [],
  users: [],
  family_members: [],
  contributions: [],
  paystack_transactions: [],
  bowls: [],
  expenses: [],
  approvals: [],
  goals: [],
  notifications: [],
  allocation_requests: []
};

module.exports = dbState;
