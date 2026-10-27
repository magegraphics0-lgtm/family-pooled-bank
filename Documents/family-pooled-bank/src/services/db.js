/**
 * Database Service for Pooled Bank & Family Financial Planner
 * Implements Tables 3.1 - 3.9 from Chapter 3 System Design
 */

const STORAGE_KEY = 'family_pooled_bank_db_v3';

// Initial Database State with Isolated Member Accounts (Spotify Family Model)
const initialDatabase = {
  family: [
    {
      family_id: 1,
      family_name: 'The Okafor Household',
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
      first_name: 'Tobi',
      last_name: 'Okafor',
      email: 'child@onepot.app',
      password: 'ChildPassword123!',
      role: 'child',
      avatar: '🧑‍🎓',
      title: 'Child (Restricted)'
    }
  ],
  categories: [
    { category_id: 1, family_id: 1, category_name: 'Food & Provisions', icon: '🛒' },
    { category_id: 2, family_id: 1, category_name: 'School Fees & Books', icon: '🎓' },
    { category_id: 3, family_id: 1, category_name: 'House Rent & Maintenance', icon: '🏠' },
    { category_id: 4, family_id: 1, category_name: 'Generator Fuel & PHCN', icon: '⚡' },
    { category_id: 5, family_id: 1, category_name: 'Healthcare & Emergency', icon: '🏥' },
    { category_id: 6, family_id: 1, category_name: 'Transport & Car Fuel', icon: '🚗' },
    { category_id: 7, family_id: 1, category_name: 'Extended Family ("Black Tax")', icon: '🤝' },
    { category_id: 8, family_id: 1, category_name: 'Savings & Investments', icon: '💰' }
  ],
  budgetLimits: [
    { limit_id: 1, family_id: 1, category_id: 1, amount: 50000, period: 'Monthly' },
    { limit_id: 2, family_id: 1, category_id: 2, amount: 25000, period: 'Monthly' },
    { limit_id: 3, family_id: 1, category_id: 5, amount: 30000, period: 'Monthly' }
  ],
  pooledFund: {
    pool_id: 1,
    family_id: 1,
    balance: 825000.00,
    last_updated: new Date().toISOString()
  },
  pooledFunds: [
    {
      pool_id: 1,
      family_id: 1,
      balance: 825000.00,
      last_updated: new Date().toISOString()
    }
  ],
  poolTransactions: [
    {
      transaction_id: 1,
      family_id: 1,
      user_id: 1,
      type: 'contribution',
      amount: 250000,
      purpose: 'Demo seed contribution',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    }
  ],
  incomes: [
    {
      income_id: 1,
      family_id: 1,
      user_id: 1,
      title: 'Demo Salary',
      source: 'Primary Employment',
      amount: 200000,
      date_received: new Date().toISOString().split('T')[0],
      notes: 'Seed income for demo account'
    }
  ],
  expenses: [
    {
      expense_id: 1,
      family_id: 1,
      user_id: 1,
      title: 'Demo Grocery Run',
      description: 'Demo Grocery Run',
      category_id: 1,
      amount: 12500,
      payment_method: 'Bank Transfer',
      date_spent: new Date().toISOString().split('T')[0],
      notes: 'Sample household expense'
    }
  ],
  notifications: [
    {
      notification_id: 1,
      family_id: 1,
      user_id: 1,
      message: 'Demo account is ready to use.',
      type: 'info',
      sent_at: new Date().toISOString(),
      read: false
    }
  ],
  depositAccounts: [
    {
      account_id: 1,
      family_id: 1,
      user_id: 1,
      bank_name: 'Access Bank',
      account_number: '0123456789',
      account_name: 'Demo Family Savings',
      account_type: 'savings',
      is_primary: true,
      created_at: new Date().toISOString()
    }
  ],
  allocationRequests: []
};

class LocalDatabase {
  constructor() {
    this.purgeOldDemoCache();
    this.data = this.loadData();
  }

  purgeOldDemoCache() {
    try {
      localStorage.removeItem('family_pooled_bank_db_v1');
    } catch {
      // ignore
    }
  }

  loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.allocationRequests) parsed.allocationRequests = [];
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load from LocalStorage, falling back to seed database', e);
    }
    this.saveData(initialDatabase);
    return JSON.parse(JSON.stringify(initialDatabase));
  }

  saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data || this.data));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }

  resetToDefault() {
    this.data = JSON.parse(JSON.stringify(initialDatabase));
    this.saveData(this.data);
    return this.data;
  }

  // --- BACKEND REST API SYNC HELPERS ---
  async syncToBackend(endpoint, method = 'POST', bodyData = {}) {
    try {
      const response = await fetch(`http://localhost:5000/api/${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      return await response.json();
    } catch (err) {
      console.warn(`[Backend API Offline/Fallback] Could not reach http://localhost:5000/api/${endpoint}:`, err.message);
      return null;
    }
  }

  // --- AUTHENTICATION & SESSION METHODS ---

  getFamilies() {
    return this.data.family || [];
  }

  getFamilyById(familyId) {
    return (this.data.family || []).find(f => f.family_id === Number(familyId));
  }

  getCurrentSession() {
    try {
      const sessionStr = localStorage.getItem('family_bank_auth_session');
      if (sessionStr) {
        return JSON.parse(sessionStr);
      }
    } catch (e) {
      console.warn('Failed to parse auth session:', e);
    }
    return null;
  }

  setCurrentSession(user, family) {
    try {
      localStorage.setItem('family_bank_auth_session', JSON.stringify({ user, family, loginAt: new Date().toISOString() }));
    } catch (e) {
      console.error('Failed to save auth session:', e);
    }
  }

  clearSession() {
    try {
      localStorage.removeItem('family_bank_auth_session');
    } catch (e) {
      console.error('Failed to clear session:', e);
    }
  }

  async requestPasswordReset(email) {
    if (!email) {
      return { success: true, message: 'If an account exists for this email address, you will receive password reset instructions shortly.' };
    }
    const cleanEmail = email.trim().toLowerCase();

    // Trigger backend Nodemailer endpoint
    this.syncToBackend('auth/forgot-password', 'POST', { email: cleanEmail });

    // Local DB mock fallback record
    const user = this.data.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (user) {
      const resetOtp = String(Math.floor(100000 + Math.random() * 900000));
      user.reset_otp = resetOtp;
      user.reset_expires = Date.now() + 15 * 60 * 1000;
      this.saveData();
    }

    // Always silently return uniform success to prevent email enumeration
    return {
      success: true,
      message: 'If an account exists for this email address, you will receive password reset instructions shortly.'
    };
  }

  loginUser({ email, password, userId }) {
    let user = null;
    if (userId) {
      user = this.data.users.find(u => u.user_id === Number(userId));
    } else if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      user = this.data.users.find(u => 
        u.email.toLowerCase() === normalizedEmail ||
        (normalizedEmail === 'demo@familybank.com' && u.email === 'parent@onepot.app') ||
        (normalizedEmail === 'emeka@onepot.app' && u.email === 'parent@onepot.app') ||
        (normalizedEmail === 'child@familybank.com' && u.email === 'child@onepot.app') ||
        (normalizedEmail === 'tobi@onepot.app' && u.email === 'child@onepot.app')
      );
    }

    if (!user) {
      throw new Error('No user account found matching this email address.');
    }

    const isValidPassword = 
      (user.password && password === user.password) ||
      (user.email === 'parent@onepot.app' && (password === 'ParentPassword123!' || password === 'demo1234')) ||
      (user.email === 'child@onepot.app' && (password === 'ChildPassword123!' || password === 'demo1234'));

    if (!isValidPassword) {
      throw new Error('Incorrect password. Please check your password and try again.');
    }

    const family = (this.data.family || []).find(f => f.family_id === user.family_id) || { family_id: user.family_id, family_name: 'Household' };

    this.setCurrentSession(user, family);
    this.syncToBackend('auth/login', 'POST', { email, password, user_id: userId });

    return { user, family };
  }

  registerFamily({ familyName, firstName, lastName, email, password, role, avatar }) {
    if (!familyName || !firstName || !email) {
      throw new Error('Family name, First name, and Email are required.');
    }

    if (!password) {
      throw new Error('Password is required.');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const existing = this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    if (!this.data.family) this.data.family = [];

    const newFamilyId = this.data.family.length > 0 ? Math.max(...this.data.family.map(f => f.family_id)) + 1 : 1;
    const newFamily = {
      family_id: newFamilyId,
      family_name: familyName,
      created_at: new Date().toISOString().split('T')[0]
    };
    this.data.family.push(newFamily);

    const newUserId = this.data.users.length > 0 ? Math.max(...this.data.users.map(u => u.user_id)) + 1 : 1;
    const newUser = {
      user_id: newUserId,
      family_id: newFamilyId,
      first_name: firstName,
      last_name: lastName || '',
      email,
      password: password,
      role: role || 'parent',
      avatar: avatar || '👑',
      title: role === 'child' ? 'Child (Member)' : 'Parent (Family Admin)'
    };
    this.data.users.push(newUser);

    // Create pooled fund vault entry if missing
    if (!this.data.pooledFunds) {
      this.data.pooledFunds = this.data.pooledFund ? [this.data.pooledFund] : [];
    }
    const newPool = {
      pool_id: this.data.pooledFunds.length + 1,
      family_id: newFamilyId,
      balance: 0.00,
      last_updated: new Date().toISOString()
    };
    this.data.pooledFunds.push(newPool);

    this.saveData();
    this.setCurrentSession(newUser, newFamily);
    this.syncToBackend('auth/register-family', 'POST', { family_name: familyName, first_name: firstName, last_name: lastName, email, password, role, avatar });

    return { user: newUser, family: newFamily };
  }

  joinFamily({ familyId, firstName, lastName, email, password, role, avatar }) {
    const targetFamily = (this.data.family || []).find(f => f.family_id === Number(familyId));
    if (!targetFamily) {
      throw new Error(`Family Account #${familyId} does not exist.`);
    }

    if (!password) {
      throw new Error('Password is required.');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const existing = this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const newUserId = this.data.users.length > 0 ? Math.max(...this.data.users.map(u => u.user_id)) + 1 : 1;
    const newUser = {
      user_id: newUserId,
      family_id: Number(familyId),
      first_name: firstName,
      last_name: lastName || '',
      email,
      password: password,
      role: role || 'child',
      avatar: avatar || '🧑‍💼',
      title: role === 'parent' ? 'Parent (Co-Manager)' : 'Child (Contributor)'
    };
    this.data.users.push(newUser);

    this.saveData();
    this.setCurrentSession(newUser, targetFamily);
    this.syncToBackend('auth/join-family', 'POST', { family_id: familyId, first_name: firstName, last_name: lastName, email, password, role, avatar });

    return { user: newUser, family: targetFamily };
  }

  // --- QUERY METHODS ---

  getUsers(familyId) {
    if (familyId) {
      return this.data.users.filter(u => u.family_id === Number(familyId));
    }
    return this.data.users;
  }

  getUserById(id) {
    return this.data.users.find(u => u.user_id === Number(id));
  }

  getCategories() {
    return this.data.categories;
  }

  getBudgetLimits(familyId) {
    if (familyId) {
      const limits = this.data.budgetLimits.filter(b => b.family_id === Number(familyId));
      if (limits.length > 0) return limits;
    }
    return this.data.budgetLimits;
  }

  getPooledFund(familyId) {
    const fid = Number(familyId) || 1;
    if (!this.data.pooledFunds) {
      this.data.pooledFunds = this.data.pooledFund ? [this.data.pooledFund] : [];
    }
    let fund = this.data.pooledFunds.find(p => p.family_id === fid);
    if (!fund) {
      if (this.data.pooledFund && this.data.pooledFund.family_id === fid) {
        fund = this.data.pooledFund;
      } else {
        fund = {
          pool_id: this.data.pooledFunds.length + 1,
          family_id: fid,
          balance: 0.00,
          last_updated: new Date().toISOString()
        };
        this.data.pooledFunds.push(fund);
        this.saveData();
      }
    }
    return fund;
  }

  getDepositAccounts(familyId) {
    if (!this.data.depositAccounts) this.data.depositAccounts = [];
    if (familyId) {
      return this.data.depositAccounts.filter(a => a.family_id === Number(familyId));
    }
    return this.data.depositAccounts;
  }

  addDepositAccount({ familyId, userId, bankName, accountNumber, accountName, accountType }) {
    if (!this.data.depositAccounts) this.data.depositAccounts = [];
    const newId = this.data.depositAccounts.length > 0 ? Math.max(...this.data.depositAccounts.map(a => a.account_id)) + 1 : 1;
    const account = {
      account_id: newId,
      family_id: Number(familyId) || 1,
      user_id: Number(userId) || 1,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      account_type: accountType || 'savings',
      is_primary: this.data.depositAccounts.length === 0,
      created_at: new Date().toISOString()
    };
    this.data.depositAccounts.push(account);
    this.saveData();
    this.syncToBackend('deposit-accounts', 'POST', {
      family_id: familyId,
      user_id: userId,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      account_type: accountType
    });
    return account;
  }

  deleteDepositAccount(accountId) {
    if (!this.data.depositAccounts) this.data.depositAccounts = [];
    this.data.depositAccounts = this.data.depositAccounts.filter(a => a.account_id !== Number(accountId));
    this.saveData();
    this.syncToBackend(`deposit-accounts/${accountId}`, 'DELETE', {});
  }

  getPoolTransactions(familyId) {
    const list = familyId 
      ? this.data.poolTransactions.filter(t => t.family_id === Number(familyId))
      : this.data.poolTransactions;
    return [...list].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
  }

  getIncomes(familyId) {
    const list = familyId
      ? this.data.incomes.filter(i => i.family_id === Number(familyId))
      : this.data.incomes;
    return [...list].sort((a, b) => new Date(b.date_received) - new Date(a.date_received));
  }

  getExpenses(familyId) {
    const list = familyId
      ? this.data.expenses.filter(e => e.family_id === Number(familyId))
      : this.data.expenses;
    return [...list].sort((a, b) => new Date(b.date_spent) - new Date(a.date_spent));
  }

  getNotifications(familyId) {
    const list = familyId
      ? this.data.notifications.filter(n => n.family_id === Number(familyId))
      : this.data.notifications;
    return [...list].sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
  }

  // --- MUTATION METHODS WITH BACKEND REST SYNC ---

  addIncome(incomeData) {
    const user = this.getUserById(incomeData.user_id);
    const newId = this.data.incomes.length > 0 ? Math.max(...this.data.incomes.map(i => i.income_id)) + 1 : 1;
    const record = {
      income_id: newId,
      family_id: incomeData.family_id || (user ? user.family_id : 1),
      ...incomeData,
      amount: parseFloat(incomeData.amount)
    };
    this.data.incomes.push(record);
    this.saveData();
    this.syncToBackend('incomes', 'POST', record);
    return record;
  }

  addExpense(expenseData) {
    const user = this.getUserById(expenseData.user_id);
    const newId = this.data.expenses.length > 0 ? Math.max(...this.data.expenses.map(e => e.expense_id)) + 1 : 1;
    const record = {
      expense_id: newId,
      family_id: expenseData.family_id || (user ? user.family_id : 1),
      ...expenseData,
      amount: parseFloat(expenseData.amount)
    };
    this.data.expenses.push(record);
    this.saveData();
    this.syncToBackend('expenses', 'POST', record);
    return record;
  }

  updateBudgetLimit(categoryId, amount, familyId = 1) {
    const fid = Number(familyId) || 1;
    const limitObj = this.data.budgetLimits.find(b => b.category_id === Number(categoryId) && (b.family_id === fid || !b.family_id));
    if (limitObj) {
      limitObj.amount = parseFloat(amount);
      limitObj.family_id = fid;
    } else {
      const newId = this.data.budgetLimits.length + 1;
      this.data.budgetLimits.push({
        limit_id: newId,
        family_id: fid,
        category_id: Number(categoryId),
        amount: parseFloat(amount),
        period: 'Monthly'
      });
    }
    this.saveData();
    this.syncToBackend('budget-limits', 'POST', { category_id: categoryId, amount, family_id: fid });
  }

  contributeToPool(userId, amount, purpose, familyId) {
    const user = this.getUserById(userId);
    const fid = Number(familyId || user?.family_id || 1);
    const numAmount = parseFloat(amount);
    const pool = this.getPooledFund(fid);
    pool.balance += numAmount;
    pool.last_updated = new Date().toISOString();

    if (fid === 1 && this.data.pooledFund) {
      this.data.pooledFund.balance = pool.balance;
      this.data.pooledFund.last_updated = pool.last_updated;
    }

    const newTxId = this.data.poolTransactions.length + 1;
    const tx = {
      transaction_id: newTxId,
      family_id: fid,
      user_id: Number(userId),
      type: 'contribution',
      amount: numAmount,
      purpose: purpose || 'Pooled Family Contribution',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    this.data.poolTransactions.push(tx);
    this.saveData();
    this.syncToBackend('pool-transactions/contribute', 'POST', { user_id: userId, amount, purpose, family_id: fid });
    return tx;
  }

  allocateFromPool(userId, amount, purpose, familyId) {
    const user = this.getUserById(userId);
    const fid = Number(familyId || user?.family_id || 1);
    const numAmount = parseFloat(amount);
    const pool = this.getPooledFund(fid);

    if (pool.balance < numAmount) {
      throw new Error(`Insufficient pooled funds! Current balance is ₦${pool.balance.toLocaleString()}`);
    }
    pool.balance -= numAmount;
    pool.last_updated = new Date().toISOString();

    if (fid === 1 && this.data.pooledFund) {
      this.data.pooledFund.balance = pool.balance;
      this.data.pooledFund.last_updated = pool.last_updated;
    }

    const newTxId = this.data.poolTransactions.length + 1;
    const tx = {
      transaction_id: newTxId,
      family_id: fid,
      user_id: Number(userId),
      type: 'allocation',
      amount: numAmount,
      purpose: purpose || 'Family Household Allocation',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    this.data.poolTransactions.push(tx);
    this.saveData();
    this.syncToBackend('pool-transactions/allocate', 'POST', { user_id: userId, amount, purpose, family_id: fid });
    return tx;
  }

  addNotification(notificationData) {
    const newId = this.data.notifications.length + 1;
    const notif = {
      notification_id: newId,
      family_id: notificationData.family_id || (notificationData.user_id ? this.getUserById(notificationData.user_id)?.family_id : 1) || 1,
      sent_at: new Date().toISOString(),
      is_read: false,
      ...notificationData
    };
    this.data.notifications.push(notif);
    this.saveData();
    this.syncToBackend('notifications', 'POST', notif);
    return notif;
  }

  markAllNotificationsRead() {
    this.data.notifications.forEach(n => n.is_read = true);
    this.saveData();
    this.syncToBackend('notifications/read-all', 'PUT', {});
  }

  // --- SMART BOWL ALLOCATION & CHILD REQUEST APPROVAL WORKFLOW ---

  getAllocationRequests(familyId) {
    if (!this.data.allocationRequests) this.data.allocationRequests = [];
    if (familyId) {
      return this.data.allocationRequests.filter(r => r.family_id === Number(familyId));
    }
    return this.data.allocationRequests;
  }

  requestAllocation({ familyId, childId, bowlId, amount, description }) {
    if (!this.data.allocationRequests) this.data.allocationRequests = [];
    const child = this.getUserById(childId) || { user_id: childId, first_name: 'Child', last_name: 'Contributor', role: 'child' };
    const fid = Number(familyId || child.family_id || 1);
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      throw new Error('Please enter a valid allocation amount (₦).');
    }

    const categories = this.getCategories();
    const bowl = categories.find(c => c.category_id === Number(bowlId)) || { category_id: bowlId, category_name: 'Smart Bowl' };
    const bowlName = bowl.category_name;
    const childName = `${child.first_name || ''} ${child.last_name || ''}`.trim() || 'Child';

    const newId = this.data.allocationRequests.length > 0
      ? Math.max(...this.data.allocationRequests.map(r => r.id || r.request_id || 0)) + 1
      : 1;

    const request = {
      id: newId,
      request_id: newId,
      family_id: fid,
      child_id: Number(childId),
      child_name: childName,
      bowl_id: Number(bowlId),
      bowl_name: bowlName,
      amount: numAmount,
      description: description || `Allocation for ${bowlName}`,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    this.data.allocationRequests.push(request);

    // Route real-time notification alert to Parent accounts
    const parents = this.getUsers(fid).filter(u => u.role === 'parent');
    const parentRecipients = parents.length > 0 ? parents : [{ user_id: 1 }];

    const notifMessage = `${childName} requested allocation of ₦${numAmount.toLocaleString()} for ${bowlName}`;

    parentRecipients.forEach(p => {
      const notifId = this.data.notifications.length + 1;
      this.data.notifications.unshift({
        id: notifId,
        notification_id: notifId,
        family_id: fid,
        user_id: p.user_id,
        type: 'allocation_request',
        message: notifMessage,
        amount: numAmount,
        request_id: newId,
        child_id: Number(childId),
        child_name: childName,
        bowl_id: Number(bowlId),
        bowl_name: bowlName,
        description: description || '',
        status: 'pending',
        is_read: false,
        sent_at: new Date().toISOString()
      });
    });

    this.saveData();
    this.syncToBackend('allocations/request', 'POST', {
      family_id: fid,
      child_id: childId,
      bowl_id: bowlId,
      amount: numAmount,
      description
    });

    return request;
  }

  approveAllocation(requestId, approvedByUserId) {
    if (!this.data.allocationRequests) this.data.allocationRequests = [];
    const approver = this.getUserById(approvedByUserId);
    if (approver && approver.role !== 'parent') {
      throw new Error('Access Denied: Only Parent Managers can approve allocations.');
    }

    const request = this.data.allocationRequests.find(r => r.id === Number(requestId) || r.request_id === Number(requestId));
    if (!request) {
      throw new Error('Allocation request not found.');
    }

    request.status = 'approved';
    request.decided_at = new Date().toISOString();
    request.decision_by_user_id = Number(approvedByUserId || 1);

    // Deduct from shared pool
    const pool = this.getPooledFund(request.family_id);
    pool.balance = Math.max(0, (pool.balance || 0) - request.amount);
    pool.last_updated = new Date().toISOString();

    if (request.family_id === 1 && this.data.pooledFund) {
      this.data.pooledFund.balance = pool.balance;
      this.data.pooledFund.last_updated = pool.last_updated;
    }

    // Deduct / update appropriate Smart Bowl balance
    const category = this.data.categories.find(c => c.category_id === request.bowl_id);
    const bowlName = category ? category.category_name : request.bowl_name;

    // Record in expenses
    const newExpId = this.data.expenses.length > 0 ? Math.max(...this.data.expenses.map(e => e.expense_id)) + 1 : 1;
    this.data.expenses.push({
      expense_id: newExpId,
      family_id: request.family_id,
      user_id: request.child_id,
      category_id: request.bowl_id,
      amount: request.amount,
      title: `[Approved Allocation] ${bowlName}`,
      description: request.description || `Approved allocation for ${bowlName}`,
      payment_method: 'Shared Vault',
      date_spent: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      status: 'approved',
      request_id: request.id
    });

    // Update parent notification card status
    this.data.notifications.forEach(n => {
      if (n.request_id === request.id) {
        n.status = 'approved';
        n.is_read = true;
      }
    });

    // Notify the child
    const childNotifId = this.data.notifications.length + 1;
    this.data.notifications.unshift({
      id: childNotifId,
      notification_id: childNotifId,
      family_id: request.family_id,
      user_id: request.child_id,
      type: 'allocation_approved',
      message: `Your allocation request of ₦${Number(request.amount).toLocaleString()} for ${bowlName} has been approved.`,
      request_id: request.id,
      amount: request.amount,
      bowl_name: bowlName,
      status: 'approved',
      is_read: false,
      sent_at: new Date().toISOString()
    });

    this.saveData();
    this.syncToBackend(`allocations/${request.id}/approve`, 'POST', {
      user_id: approvedByUserId,
      approved_by_user_id: approvedByUserId
    });

    return request;
  }

  rejectAllocation(requestId, rejectedByUserId) {
    if (!this.data.allocationRequests) this.data.allocationRequests = [];
    const rejector = this.getUserById(rejectedByUserId);
    if (rejector && rejector.role !== 'parent') {
      throw new Error('Access Denied: Only Parent Managers can reject allocations.');
    }

    const request = this.data.allocationRequests.find(r => r.id === Number(requestId) || r.request_id === Number(requestId));
    if (!request) {
      throw new Error('Allocation request not found.');
    }

    request.status = 'rejected';
    request.decided_at = new Date().toISOString();
    request.decision_by_user_id = Number(rejectedByUserId || 1);

    // Update parent notification card status
    this.data.notifications.forEach(n => {
      if (n.request_id === request.id) {
        n.status = 'rejected';
        n.is_read = true;
      }
    });

    // Notify the child
    const childNotifId = this.data.notifications.length + 1;
    this.data.notifications.unshift({
      id: childNotifId,
      notification_id: childNotifId,
      family_id: request.family_id,
      user_id: request.child_id,
      type: 'allocation_rejected',
      message: `Your allocation request of ₦${Number(request.amount).toLocaleString()} for ${request.bowl_name} was rejected.`,
      request_id: request.id,
      amount: request.amount,
      bowl_name: request.bowl_name,
      status: 'rejected',
      is_read: false,
      sent_at: new Date().toISOString()
    });

    this.saveData();
    this.syncToBackend(`allocations/${request.id}/reject`, 'POST', {
      user_id: rejectedByUserId,
      rejected_by_user_id: rejectedByUserId
    });

    return request;
  }
}

export const db = new LocalDatabase();

