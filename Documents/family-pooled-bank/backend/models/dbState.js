/**
 * OnePot In-Memory Data Store (Closed-Loop Mock Ledger)
 * Mirrors MySQL schema entities for local execution & academic demo
 */

const dbState = {
  families: [
    {
      family_id: 1,
      family_name: 'The Okafor Household',
      invite_code: 'POT-OKAFOR-2026',
      total_pot_balance: 825000.00,
      emergency_fund_balance: 150000.00,
      auto_save_percentage: 5,
      created_at: new Date().toISOString().split('T')[0]
    }
  ],
  users: [
    {
      user_id: 1,
      family_id: 1,
      first_name: 'Emeka',
      last_name: 'Okafor',
      email: 'parent@onepot.app',
      password: 'ParentPassword123!',
      role: 'parent',
      avatar: '👑',
      title: 'Parent (Family Admin)'
    },
    {
      user_id: 2,
      family_id: 1,
      first_name: 'Chidinma',
      last_name: 'Okafor',
      email: 'chidinma@onepot.app',
      password: 'ParentPassword123!',
      role: 'parent',
      avatar: '🛡️',
      title: 'Parent (Co-Manager)'
    },
    {
      user_id: 3,
      family_id: 1,
      first_name: 'Tobi',
      last_name: 'Okafor',
      email: 'child@onepot.app',
      password: 'ChildPassword123!',
      role: 'child',
      avatar: '🧑‍🎓',
      title: 'Child (Restricted)'
    }
  ],
  contributions: [
    {
      id: 1,
      family_id: 1,
      member_id: 1,
      amount: 450000.00,
      source_note: 'Monthly Salary Contribution',
      paystack_ref: 'onepot_ref_seed_001',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      family_id: 1,
      member_id: 2,
      amount: 325000.00,
      source_note: 'Business Profits Share',
      paystack_ref: 'onepot_ref_seed_002',
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      family_id: 1,
      member_id: 3,
      amount: 50000.00,
      source_note: 'Internship Stipend Contribution',
      paystack_ref: 'onepot_ref_seed_003',
      created_at: new Date().toISOString()
    }
  ],
  paystack_transactions: [
    {
      id: 1,
      family_id: 1,
      member_id: 3,
      reference: 'onepot_ref_seed_003',
      amount: 50000.00,
      status: 'success',
      access_code: 'acc_demo_003',
      authorization_url: 'https://checkout.paystack.com/demo_003',
      created_at: new Date().toISOString(),
      verified_at: new Date().toISOString()
    }
  ],
  bowls: [
    { id: 1, family_id: 1, category_name: 'House Rent', allocated_amount: 250000.00, spent_amount: 200000.00, priority_level: 'High' },
    { id: 2, family_id: 1, category_name: 'Food & Groceries', allocated_amount: 250000.00, spent_amount: 150000.00, priority_level: 'High' },
    { id: 3, family_id: 1, category_name: 'School Fees', allocated_amount: 150000.00, spent_amount: 80000.00, priority_level: 'High' },
    { id: 4, family_id: 1, category_name: 'Utilities & Power', allocated_amount: 75000.00, spent_amount: 45000.00, priority_level: 'Medium' },
    { id: 5, family_id: 1, category_name: 'Family Travel', allocated_amount: 100000.00, spent_amount: 20000.00, priority_level: 'Low' }
  ],
  expenses: [
    {
      id: 1,
      expense_id: 1,
      family_id: 1,
      bowl_id: 2,
      requested_by_user_id: 1,
      user_id: 1,
      amount: 35000.00,
      description: 'Supermarket bulk grocery run',
      status: 'approved',
      is_emergency: false,
      date_spent: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      expense_id: 2,
      family_id: 1,
      bowl_id: 3,
      requested_by_user_id: 3,
      user_id: 3,
      amount: 15000.00,
      description: 'Semester textbooks and stationery',
      status: 'pending',
      is_emergency: false,
      date_spent: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    }
  ],
  approvals: [
    {
      id: 1,
      expense_id: 1,
      approved_by_user_id: 1,
      status: 'approved',
      decision_note: 'Auto-approved parent household expense',
      decided_at: new Date().toISOString()
    }
  ],
  goals: [
    {
      id: 1,
      family_id: 1,
      created_by_user_id: 1,
      title: 'Annual House Rent Fund',
      target_amount: 2000000.00,
      current_amount: 1200000.00,
      image_url: '',
      status: 'active'
    },
    {
      id: 2,
      family_id: 1,
      created_by_user_id: 2,
      title: 'Solar Inverter Backup',
      target_amount: 850000.00,
      current_amount: 600000.00,
      image_url: '',
      status: 'active'
    }
  ],
  notifications: [
    {
      id: 1,
      notification_id: 1,
      family_id: 1,
      user_id: 1,
      message: 'OnePot initialized. Ready for family contributions and smart bowl budgeting.',
      type: 'info',
      is_read: false,
      sent_at: new Date().toISOString()
    }
  ],
  allocation_requests: []
};

// Aliases for backward compatibility with existing components
dbState.family = dbState.families;
dbState.categories = dbState.bowls;
dbState.poolTransactions = dbState.contributions;
dbState.budgetLimits = dbState.bowls.map((b, idx) => ({
  limit_id: idx + 1,
  family_id: b.family_id,
  category_id: b.id,
  amount: b.allocated_amount,
  period: 'Monthly'
}));
dbState.pooledFund = {
  pool_id: 1,
  family_id: 1,
  get balance() {
    return dbState.families[0]?.total_pot_balance || 0;
  },
  last_updated: new Date().toISOString()
};

module.exports = dbState;
