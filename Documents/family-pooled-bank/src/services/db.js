/**
 * Database Service for Pooled Bank & Family Financial Planner
 * Interfaces dynamically with live REST API and Aiven MySQL Cloud database.
 */

const STORAGE_KEY = 'family_pooled_bank_db_v4';

// Clean initial empty state (strictly zero/empty)
const initialDatabase = {
  family: [],
  users: [],
  family_members: [],
  categories: [],
  budgetLimits: [],
  pooledFund: {
    pool_id: 0,
    family_id: 0,
    balance: 0.00,
    emergency_fund_balance: 0.00,
    auto_save_percentage: 5.00,
    last_updated: null
  },
  pooledFunds: [],
  poolTransactions: [],
  incomes: [],
  expenses: [],
  notifications: [],
  depositAccounts: [],
  allocationRequests: []
};

class LocalDatabase {
  constructor() {
    this.purgeOldDemoCache();
    this.data = this.loadData();
    this.backendUrl = 'http://localhost:5000/api';
  }

  purgeOldDemoCache() {
    try {
      localStorage.removeItem('family_pooled_bank_db_v1');
      localStorage.removeItem('family_pooled_bank_db_v2');
      localStorage.removeItem('family_pooled_bank_db_v3');
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
        if (!parsed.categories) parsed.categories = [];
        if (!parsed.budgetLimits) parsed.budgetLimits = [];
        if (!parsed.poolTransactions) parsed.poolTransactions = [];
        if (!parsed.expenses) parsed.expenses = [];
        if (!parsed.notifications) parsed.notifications = [];
        if (!parsed.pooledFunds) parsed.pooledFunds = [];
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load from LocalStorage, falling back to clean initial database', e);
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

  // --- LIVE BACKEND REST API SYNCHRONIZATION ---

  async syncToBackend(endpoint, method = 'POST', bodyData = {}) {
    try {
      const response = await fetch(`${this.backendUrl}/${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      return await response.json();
    } catch (err) {
      console.warn(`[Backend API Offline/Fallback] Could not reach ${this.backendUrl}/${endpoint}:`, err.message);
      return null;
    }
  }

  /**
   * Sync complete family financial state from live MySQL database
   */
  async syncFromBackend(familyId) {
    if (!familyId) return;
    const fid = Number(familyId);

    try {
      const [poolRes, txRes, bowlsRes, expRes, notifRes, usersRes, reqRes] = await Promise.all([
        fetch(`${this.backendUrl}/pooled-fund?family_id=${fid}`).catch(() => null),
        fetch(`${this.backendUrl}/pool-transactions?family_id=${fid}`).catch(() => null),
        fetch(`${this.backendUrl}/bowls?family_id=${fid}`).catch(() => null),
        fetch(`${this.backendUrl}/expenses?family_id=${fid}`).catch(() => null),
        fetch(`${this.backendUrl}/notifications?family_id=${fid}`).catch(() => null),
        fetch(`${this.backendUrl}/users?family_id=${fid}`).catch(() => null),
        fetch(`${this.backendUrl}/allocations/requests?family_id=${fid}`).catch(() => null)
      ]);

      if (poolRes && poolRes.ok) {
        const poolJson = await poolRes.json();
        if (poolJson.success && poolJson.data) {
          this.data.pooledFund = poolJson.data;
          const existingIdx = this.data.pooledFunds.findIndex(p => p.family_id === fid);
          if (existingIdx >= 0) {
            this.data.pooledFunds[existingIdx] = poolJson.data;
          } else {
            this.data.pooledFunds.push(poolJson.data);
          }
        }
      }

      if (txRes && txRes.ok) {
        const txJson = await txRes.json();
        if (txJson.success && Array.isArray(txJson.data)) {
          this.data.poolTransactions = txJson.data;
        }
      }

      if (bowlsRes && bowlsRes.ok) {
        const bowlsJson = await bowlsRes.json();
        if (bowJsonOk(bowlsJson)) {
          this.data.categories = bowlsJson.data;
          this.data.budgetLimits = bowlsJson.data.map(b => ({
            limit_id: b.id,
            family_id: fid,
            category_id: b.id,
            amount: Number(b.allocated_amount || 0),
            period: 'Monthly'
          }));
        }
      }

      if (expRes && expRes.ok) {
        const expJson = await expRes.json();
        if (expJson.success && Array.isArray(expJson.data)) {
          this.data.expenses = expJson.data;
        }
      }

      if (notifRes && notifRes.ok) {
        const notifJson = await notifRes.json();
        if (notifJson.success && Array.isArray(notifJson.data)) {
          this.data.notifications = notifJson.data;
        }
      }

      if (usersRes && usersRes.ok) {
        const usersJson = await usersRes.json();
        if (usersJson.success && Array.isArray(usersJson.data)) {
          this.data.users = usersJson.data;
        }
      }

      if (reqRes && reqRes.ok) {
        const reqJson = await reqRes.json();
        if (reqJson.success && Array.isArray(reqJson.data)) {
          this.data.allocationRequests = reqJson.data;
        }
      }

      this.saveData();
    } catch (err) {
      console.warn('[DB SYNC NOTICE] Remote backend sync partial or unavailable:', err.message);
    }
  }

  // --- AUTHENTICATION & SESSION METHODS ---

  getFamilies() {
    return this.data.family || [];
  }

  getFamilyById(familyId) {
    return (this.data.family || []).find(f => (f.family_id || f.id) === Number(familyId));
  }

  getCurrentSession() {
    try {
      const sessionStr = localStorage.getItem('family_bank_auth_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session?.user?.avatar === '🧑‍🎓') session.user.avatar = '👤';
        return session;
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
    this.syncToBackend('auth/forgot-password', 'POST', { email: cleanEmail });
    return {
      success: true,
      message: 'If an account exists for this email address, you will receive password reset instructions shortly.'
    };
  }

  async loginUser({ email, password, userId }) {
    // 1. Call backend /api/auth/login directly against live MySQL
    try {
      const res = await fetch(`${this.backendUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email?.trim(), password, user_id: userId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const user = data.user;
        const family = data.family;
        this.setCurrentSession(user, family);

        // Synchronize family into memory
        if (!this.data.family) this.data.family = [];
        const fIdx = this.data.family.findIndex(f => (f.id || f.family_id) === (family.id || family.family_id));
        if (fIdx >= 0) this.data.family[fIdx] = family;
        else this.data.family.push(family);

        // Synchronize user into memory
        if (!this.data.users) this.data.users = [];
        const uIdx = this.data.users.findIndex(u => (u.id || u.user_id) === (user.id || user.user_id));
        if (uIdx >= 0) this.data.users[uIdx] = user;
        else this.data.users.push(user);

        this.saveData();

        // Hydrate live financial records for this family
        await this.syncFromBackend(family.id || family.family_id);

        return { user, family };
      }
      if (!res.ok && data.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
      // Offline fallback check
      let user = null;
      if (userId) {
        user = this.data.users.find(u => (u.id || u.user_id) === Number(userId));
      } else if (email) {
        user = this.data.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
      }
      if (user) {
        const family = (this.data.family || []).find(f => (f.family_id || f.id) === user.family_id) || { id: user.family_id, family_id: user.family_id, family_name: 'Household' };
        this.setCurrentSession(user, family);
        return { user, family };
      }
      throw new Error(err.message || 'Unable to log in. Please check your credentials or connection.');
    }
  }

  async registerParent({ familyName, firstName, lastName, email, password, avatar }) {
    if (!familyName || !firstName || !email || !password) {
      throw new Error('Family name, First name, Email, and Password are required.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    try {
      const backendRes = await fetch(`${this.backendUrl}/auth/register-parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_name: familyName,
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          avatar
        })
      });
      const data = await backendRes.json();
      if (backendRes.ok && data.success) {
        if (!this.data.family) this.data.family = [];
        if (!this.data.users) this.data.users = [];
        this.data.family.push(data.family);
        this.data.users.push(data.user);
        this.saveData();
        this.setCurrentSession(data.user, data.family);
        await this.syncFromBackend(data.family.id || data.family.family_id);
        return { user: data.user, family: data.family, invite_code: data.invite_code };
      }
      if (!backendRes.ok && data.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      throw err;
    }
  }

  async registerMember({ inviteCode, firstName, lastName, email, password, roleInFamily, avatar }) {
    if (!inviteCode || !inviteCode.trim()) {
      throw new Error('A valid family invite code is required to register as a family member.');
    }
    if (!firstName || !email || !password) {
      throw new Error('First name, Email, and Password are required.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    try {
      const backendRes = await fetch(`${this.backendUrl}/auth/register-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_code: inviteCode.trim().toUpperCase(),
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          role_in_family: roleInFamily || 'child',
          avatar
        })
      });
      const data = await backendRes.json();
      if (backendRes.ok && data.success) {
        if (!this.data.users) this.data.users = [];
        this.data.users.push(data.user);
        this.saveData();
        this.setCurrentSession(data.user, data.family);
        await this.syncFromBackend(data.family.id || data.family.family_id);
        return { user: data.user, family: data.family };
      }
      if (!backendRes.ok && data.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      throw err;
    }
  }

  async verifyInviteCode(code) {
    if (!code || !code.trim()) {
      return { valid: false, error: 'A family invite code is required.' };
    }
    const cleanCode = code.trim().toUpperCase();

    try {
      const response = await fetch(`${this.backendUrl}/family/verify-invite/${encodeURIComponent(cleanCode)}`);
      const data = await response.json();
      if (response.ok && data.valid) {
        return {
          valid: true,
          family_name: data.family_name,
          family_id: data.family_id,
          invite_code: data.invite_code || cleanCode
        };
      }
      return {
        valid: false,
        error: data.error || 'Invalid or expired family invite code.'
      };
    } catch {
      return {
        valid: false,
        error: 'Unable to verify invite code. Please check your connection.'
      };
    }
  }

  // --- QUERY METHODS ---

  getUsers(familyId) {
    if (familyId) {
      return (this.data.users || []).filter(u => u.family_id === Number(familyId));
    }
    return this.data.users || [];
  }

  getUserById(id) {
    return (this.data.users || []).find(u => (u.id || u.user_id) === Number(id));
  }

  getCategories() {
    return this.data.categories || [];
  }

  getBudgetLimits(familyId) {
    if (familyId) {
      const limits = (this.data.budgetLimits || []).filter(b => b.family_id === Number(familyId));
      if (limits.length > 0) return limits;
    }
    return this.data.budgetLimits || [];
  }

  getPooledFund(familyId) {
    const fid = Number(familyId);
    if (!fid) {
      return { pool_id: 0, family_id: 0, balance: 0.00, emergency_fund_balance: 0.00, auto_save_percentage: 5, last_updated: null };
    }
    if (!this.data.pooledFunds) {
      this.data.pooledFunds = this.data.pooledFund ? [this.data.pooledFund] : [];
    }
    let fund = this.data.pooledFunds.find(p => (p.family_id || p.id) === fid);
    if (!fund) {
      if (this.data.pooledFund && (this.data.pooledFund.family_id === fid || this.data.pooledFund.id === fid)) {
        fund = this.data.pooledFund;
      } else {
        fund = {
          pool_id: fid,
          family_id: fid,
          balance: 0.00,
          emergency_fund_balance: 0.00,
          auto_save_percentage: 5,
          last_updated: null
        };
        this.data.pooledFunds.push(fund);
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
      family_id: Number(familyId),
      user_id: Number(userId),
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      account_type: accountType || 'savings',
      is_primary: this.data.depositAccounts.length === 0,
      created_at: new Date().toISOString()
    };
    this.data.depositAccounts.push(account);
    this.saveData();
    return account;
  }

  deleteDepositAccount(accountId) {
    if (!this.data.depositAccounts) this.data.depositAccounts = [];
    this.data.depositAccounts = this.data.depositAccounts.filter(a => a.account_id !== Number(accountId));
    this.saveData();
  }

  getPoolTransactions(familyId) {
    const list = familyId 
      ? (this.data.poolTransactions || []).filter(t => t.family_id === Number(familyId))
      : (this.data.poolTransactions || []);
    return [...list].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
  }

  getIncomes(familyId) {
    const list = familyId
      ? (this.data.incomes || []).filter(i => i.family_id === Number(familyId))
      : (this.data.incomes || []);
    return [...list].sort((a, b) => new Date(b.date_received) - new Date(a.date_received));
  }

  getExpenses(familyId) {
    const list = familyId
      ? (this.data.expenses || []).filter(e => e.family_id === Number(familyId))
      : (this.data.expenses || []);
    return [...list].sort((a, b) => new Date(b.date_spent || b.created_at) - new Date(a.date_spent || a.created_at));
  }

  getNotifications(familyId) {
    const list = familyId
      ? (this.data.notifications || []).filter(n => n.family_id === Number(familyId))
      : (this.data.notifications || []);
    return [...list].sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
  }

  // --- MUTATION METHODS WITH LIVE BACKEND REST SYNC ---

  addIncome(incomeData) {
    const user = this.getUserById(incomeData.user_id);
    const newId = (this.data.incomes || []).length > 0 ? Math.max(...this.data.incomes.map(i => i.income_id || 0)) + 1 : 1;
    const record = {
      income_id: newId,
      family_id: incomeData.family_id || (user ? user.family_id : 1),
      ...incomeData,
      amount: parseFloat(incomeData.amount)
    };
    if (!this.data.incomes) this.data.incomes = [];
    this.data.incomes.push(record);
    this.saveData();
    return record;
  }

  addExpense(expenseData) {
    const user = this.getUserById(expenseData.user_id);
    const fid = Number(expenseData.family_id || user?.family_id);
    const newId = (this.data.expenses || []).length > 0 ? Math.max(...this.data.expenses.map(e => e.expense_id || e.id || 0)) + 1 : 1;
    const record = {
      expense_id: newId,
      id: newId,
      family_id: fid,
      ...expenseData,
      amount: parseFloat(expenseData.amount)
    };
    if (!this.data.expenses) this.data.expenses = [];
    this.data.expenses.unshift(record);
    this.saveData();

    // Sync to backend MySQL
    this.syncToBackend('expenses', 'POST', {
      user_id: expenseData.user_id,
      family_id: fid,
      bowl_id: expenseData.category_id,
      category_id: expenseData.category_id,
      amount: expenseData.amount,
      description: expenseData.description,
      payment_method: expenseData.payment_method,
      date_spent: expenseData.date_spent
    }).then(() => this.syncFromBackend(fid));

    return record;
  }

  updateBudgetLimit(categoryId, amount, familyId) {
    const fid = Number(familyId);
    const limitObj = (this.data.budgetLimits || []).find(b => b.category_id === Number(categoryId) && b.family_id === fid);
    if (limitObj) {
      limitObj.amount = parseFloat(amount);
    } else {
      if (!this.data.budgetLimits) this.data.budgetLimits = [];
      this.data.budgetLimits.push({
        limit_id: Number(categoryId),
        family_id: fid,
        category_id: Number(categoryId),
        amount: parseFloat(amount),
        period: 'Monthly'
      });
    }

    // Also update category allocated amount in memory
    const cat = (this.data.categories || []).find(c => c.id === Number(categoryId) || c.category_id === Number(categoryId));
    if (cat) {
      cat.allocated_amount = parseFloat(amount);
    }

    this.saveData();

    // Sync to backend MySQL
    this.syncToBackend('budget-limits', 'POST', {
      category_id: categoryId,
      bowl_id: categoryId,
      amount,
      family_id: fid
    }).then(() => this.syncFromBackend(fid));
  }

  contributeToPool(userId, amount, purpose, familyId) {
    const user = this.getUserById(userId);
    const fid = Number(familyId || user?.family_id);
    const numAmount = parseFloat(amount);
    const pool = this.getPooledFund(fid);
    pool.balance = (pool.balance || 0) + numAmount;
    pool.last_updated = new Date().toISOString();

    const newTxId = (this.data.poolTransactions || []).length + 1;
    const tx = {
      transaction_id: newTxId,
      id: newTxId,
      family_id: fid,
      user_id: Number(userId),
      type: 'contribution',
      amount: numAmount,
      purpose: purpose || 'Pooled Family Contribution',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    if (!this.data.poolTransactions) this.data.poolTransactions = [];
    this.data.poolTransactions.unshift(tx);
    this.saveData();

    // Sync to backend MySQL
    this.syncToBackend('pool-transactions/contribute', 'POST', {
      user_id: userId,
      amount: numAmount,
      purpose,
      family_id: fid
    }).then(() => this.syncFromBackend(fid));

    return tx;
  }

  allocateFromPool(userId, amount, purpose, familyId) {
    const user = this.getUserById(userId);
    const fid = Number(familyId || user?.family_id);
    const numAmount = parseFloat(amount);
    const pool = this.getPooledFund(fid);

    if ((pool.balance || 0) < numAmount) {
      throw new Error(`Insufficient pooled funds! Current balance is ₦${(pool.balance || 0).toLocaleString()}`);
    }
    pool.balance -= numAmount;
    pool.last_updated = new Date().toISOString();

    const newTxId = (this.data.poolTransactions || []).length + 1;
    const tx = {
      transaction_id: newTxId,
      id: newTxId,
      family_id: fid,
      user_id: Number(userId),
      type: 'allocation',
      amount: numAmount,
      purpose: purpose || 'Family Household Allocation',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    if (!this.data.poolTransactions) this.data.poolTransactions = [];
    this.data.poolTransactions.unshift(tx);
    this.saveData();

    // Sync to backend MySQL
    this.syncToBackend('allocations/direct', 'POST', {
      user_id: userId,
      amount: numAmount,
      purpose,
      family_id: fid
    }).then(() => this.syncFromBackend(fid));

    return tx;
  }

  addNotification(notificationData) {
    const newId = (this.data.notifications || []).length + 1;
    const notif = {
      notification_id: newId,
      id: newId,
      family_id: notificationData.family_id || (notificationData.user_id ? this.getUserById(notificationData.user_id)?.family_id : 0),
      sent_at: new Date().toISOString(),
      is_read: false,
      ...notificationData
    };
    if (!this.data.notifications) this.data.notifications = [];
    this.data.notifications.unshift(notif);
    this.saveData();
    return notif;
  }

  markAllNotificationsRead(familyId) {
    (this.data.notifications || []).forEach(n => { n.is_read = true; });
    this.saveData();
    this.syncToBackend('notifications/read-all', 'PUT', { family_id: familyId });
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
    const fid = Number(familyId || child.family_id);
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      throw new Error('Please enter a valid allocation amount (₦).');
    }

    const categories = this.getCategories();
    const bowl = categories.find(c => c.category_id === Number(bowlId) || c.id === Number(bowlId)) || { category_id: bowlId, category_name: 'Smart Bowl' };
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
    this.data.allocationRequests.unshift(request);

    // Route real-time notification alert to Parent accounts
    const parents = this.getUsers(fid).filter(u => u.role === 'parent');
    const notifMessage = `${childName} requested allocation of ₦${numAmount.toLocaleString()} for ${bowlName}`;

    parents.forEach(p => {
      const notifId = (this.data.notifications || []).length + 1;
      this.data.notifications.unshift({
        id: notifId,
        notification_id: notifId,
        family_id: fid,
        user_id: p.user_id || p.id,
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

    // Call backend API
    this.syncToBackend('allocations/request', 'POST', {
      family_id: fid,
      child_id: childId,
      bowl_id: bowlId,
      amount: numAmount,
      description
    }).then(() => this.syncFromBackend(fid));

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
    request.decision_by_user_id = Number(approvedByUserId);

    // Deduct from shared pool
    const pool = this.getPooledFund(request.family_id);
    pool.balance = Math.max(0, (pool.balance || 0) - request.amount);
    pool.last_updated = new Date().toISOString();

    // Deduct / update appropriate Smart Bowl balance
    const category = (this.data.categories || []).find(c => c.category_id === request.bowl_id || c.id === request.bowl_id);
    const bowlName = category ? category.category_name : request.bowl_name;

    // Record in expenses
    const newExpId = (this.data.expenses || []).length > 0 ? Math.max(...this.data.expenses.map(e => e.expense_id || e.id || 0)) + 1 : 1;
    this.data.expenses.unshift({
      expense_id: newExpId,
      id: newExpId,
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
    (this.data.notifications || []).forEach(n => {
      if (n.request_id === request.id) {
        n.status = 'approved';
        n.is_read = true;
      }
    });

    // Notify the child
    const childNotifId = (this.data.notifications || []).length + 1;
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

    // Sync to backend MySQL
    this.syncToBackend(`allocations/${request.id}/approve`, 'POST', {
      user_id: approvedByUserId,
      approved_by_user_id: approvedByUserId
    }).then(() => this.syncFromBackend(request.family_id));

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
    request.decision_by_user_id = Number(rejectedByUserId);

    // Update parent notification card status
    (this.data.notifications || []).forEach(n => {
      if (n.request_id === request.id) {
        n.status = 'rejected';
        n.is_read = true;
      }
    });

    // Notify the child
    const childNotifId = (this.data.notifications || []).length + 1;
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

    // Sync to backend MySQL
    this.syncToBackend(`allocations/${request.id}/reject`, 'POST', {
      user_id: rejectedByUserId,
      rejected_by_user_id: rejectedByUserId
    }).then(() => this.syncFromBackend(request.family_id));

    return request;
  }
}

function bowJsonOk(bowlsJson) {
  return bowlsJson && bowlsJson.success && Array.isArray(bowlsJson.data);
}

export const db = new LocalDatabase();
