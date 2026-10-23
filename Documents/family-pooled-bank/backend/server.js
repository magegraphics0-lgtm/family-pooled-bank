/**
 * Node.js & Express.js Backend REST API
 * Section 3.4 Application Tier Implementation
 * Supports MySQL/In-Memory DB connection & Nodemailer SMTP Automated Email Dispatch
 */

const path = require('path');
// Load environment variables strictly from .env file
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config(); // also check current directory

const express = require('express');
const cors = require('cors');
const {
  sendEmail,
  sendWelcomeEmail,
  sendLoginAlertEmail
} = require('./emailService');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true
}));
app.use(express.json());

// Demo data seeded for first-run local development
const dbState = {
  family: [
    {
      family_id: 1,
      family_name: 'Demo Family',
      created_at: new Date().toISOString().split('T')[0]
    }
  ],
  users: [
    {
      user_id: 1,
      family_id: 1,
      first_name: 'Demo',
      last_name: 'Parent',
      email: 'demo@familybank.com',
      password: 'demo1234',
      role: 'parent',
      avatar: '👑',
      title: 'Parent (Family Admin)'
    },
    {
      user_id: 2,
      family_id: 1,
      first_name: 'Demo',
      last_name: 'Child',
      email: 'child@familybank.com',
      password: 'demo1234',
      role: 'child',
      avatar: '🧑‍🎓',
      title: 'Child (Contributor)'
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
  ]
};

// Nodemailer SMTP Transporter and responsive email templates are strictly loaded from .env in ./emailService


// --- REST API ENDPOINTS ---

// 0. Root Welcome & Server Status Route
app.get('/', (req, res) => {
  res.send(`
    <! climate-html>
    <html>
      <head>
        <title>NaijaFamily Pooled Bank REST API</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 16px; border: 1px solid #334155; max-width: 520px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          h1 { color: #10b981; font-size: 1.6rem; margin-bottom: 0.5rem; }
          p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
          .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: 600; padding: 0.35rem 0.85rem; border-radius: 9999px; margin-top: 1rem; font-size: 0.85rem; }
          .btn { display: inline-block; margin-top: 1.5rem; background: #3b82f6; color: white; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; }
          .btn:hover { background: #2563eb; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 NaijaFamily Pooled Bank REST API</h1>
          <p>This is the <strong>Backend Application Server</strong> running Node.js & Express. It handles data sync, REST endpoints, and Nodemailer SMTP email dispatch.</p>
          <div class="badge">● Server Status: ONLINE (Port 5000)</div>
          <br/>
          <a class="btn" href="http://localhost:5173" target="_self">Open Frontend Web Application (Port 5173) &rarr;</a>
        </div>
      </body>
    </html>
  `);
});

// 1. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'NaijaFamily Pooled Bank REST API',
    tier: 'Application Tier (Node.js/Express)',
    timestamp: new Date().toISOString(),
    stats: {
      families: dbState.family.length,
      users: dbState.users.length,
      expensesCount: dbState.expenses.length
    }
  });
});

// --- AUTHENTICATION & FAMILY ENDPOINTS ---

// Get all families
app.get('/api/families', (req, res) => {
  res.json({ success: true, data: dbState.family });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password, user_id } = req.body;

  let user = null;
  if (user_id) {
    user = dbState.users.find(u => u.user_id === Number(user_id));
  } else if (email) {
    user = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  if (!user) {
    return res.status(401).json({ success: false, error: 'User account not found. Please check your credentials or sign up.' });
  }

  if (user.password && password !== user.password) {
    return res.status(401).json({ success: false, error: 'Incorrect password. Please verify your password and try again.' });
  }

  const family = dbState.family.find(f => f.family_id === user.family_id) || { family_id: user.family_id, family_name: 'Household' };

  // Trigger Login Security Alert email asynchronously (non-blocking)
  sendLoginAlertEmail({
    to: user.email,
    firstName: user.first_name,
    familyName: family.family_name,
    role: user.title || user.role,
    loginTime: new Date(),
    ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip,
    userAgent: req.headers['user-agent']
  }).catch(err => {
    console.error('[AUTH LOGIN EMAIL ALERT ERROR] Failed to dispatch login alert:', err.message);
  });

  res.json({
    success: true,
    message: `Welcome back, ${user.first_name}!`,
    user,
    family
  });
});

// Register New Family Account endpoint
app.post('/api/auth/register-family', (req, res) => {
  const { family_name, first_name, last_name, email, password, role, avatar } = req.body;

  if (!family_name || !first_name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Family name, First name, Email, and Password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
  }

  const existingUser = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ success: false, error: 'An account with this email address already exists. Please log in.' });
  }

  // Create new Family
  const newFamilyId = dbState.family.length > 0 ? Math.max(...dbState.family.map(f => f.family_id)) + 1 : 1;
  const newFamily = {
    family_id: newFamilyId,
    family_name: family_name,
    created_at: new Date().toISOString().split('T')[0]
  };
  dbState.family.push(newFamily);

  // Create Admin User
  const newUserId = dbState.users.length > 0 ? Math.max(...dbState.users.map(u => u.user_id)) + 1 : 1;
  const newUser = {
    user_id: newUserId,
    family_id: newFamilyId,
    first_name,
    last_name: last_name || '',
    email,
    password: password,
    role: role || 'parent',
    avatar: avatar || '👑',
    title: role === 'child' ? 'Child (Member)' : 'Parent (Family Admin)'
  };
  dbState.users.push(newUser);

  // Trigger Welcome Email asynchronously (non-blocking)
  sendWelcomeEmail({
    to: newUser.email,
    firstName: newUser.first_name,
    familyName: newFamily.family_name,
    role: newUser.title || newUser.role,
    isJoin: false
  }).catch(err => {
    console.error('[AUTH REGISTER EMAIL ERROR] Failed to dispatch welcome email:', err.message);
  });

  res.json({
    success: true,
    message: `Family account "${family_name}" created successfully!`,
    user: newUser,
    family: newFamily
  });
});

// Join Existing Family endpoint
app.post('/api/auth/join-family', (req, res) => {
  const { family_id, first_name, last_name, email, password, role, avatar } = req.body;

  const targetFamily = dbState.family.find(f => f.family_id === Number(family_id));
  if (!targetFamily) {
    return res.status(404).json({ success: false, error: `Family Account ID #${family_id} not found.` });
  }

  if (!password) {
    return res.status(400).json({ success: false, error: 'Password is required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
  }

  const existingUser = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
  }

  const newUserId = dbState.users.length > 0 ? Math.max(...dbState.users.map(u => u.user_id)) + 1 : 1;
  const newUser = {
    user_id: newUserId,
    family_id: Number(family_id),
    first_name,
    last_name: last_name || targetFamily.family_name.split(' ')[1] || '',
    email,
    password: password,
    role: role || 'child',
    avatar: avatar || '🧑‍💼',
    title: role === 'parent' ? 'Parent (Co-Manager)' : 'Child (Contributor)'
  };
  dbState.users.push(newUser);

  // Trigger Welcome Email for joining family member asynchronously (non-blocking)
  sendWelcomeEmail({
    to: newUser.email,
    firstName: newUser.first_name,
    familyName: targetFamily.family_name,
    role: newUser.title || newUser.role,
    isJoin: true
  }).catch(err => {
    console.error('[AUTH JOIN EMAIL ERROR] Failed to dispatch welcome email to joining member:', err.message);
  });

  res.json({
    success: true,
    message: `Joined ${targetFamily.family_name} successfully!`,
    user: newUser,
    family: targetFamily
  });
});

// 2. Users endpoint
app.get('/api/users', (req, res) => {
  res.json({ success: true, data: dbState.users });
});

// 3. Categories endpoint
app.get('/api/categories', (req, res) => {
  res.json({ success: true, data: dbState.categories });
});

// 4. Budget limits endpoints
app.get('/api/budget-limits', (req, res) => {
  res.json({ success: true, data: dbState.budgetLimits });
});

app.post('/api/budget-limits', (req, res) => {
  const { category_id, amount } = req.body;
  const limitObj = dbState.budgetLimits.find(b => b.category_id === Number(category_id));
  if (limitObj) {
    limitObj.amount = parseFloat(amount);
  } else {
    const newId = dbState.budgetLimits.length + 1;
    dbState.budgetLimits.push({
      limit_id: newId,
      family_id: 1,
      category_id: Number(category_id),
      amount: parseFloat(amount),
      period: 'Monthly'
    });
  }
  res.json({ success: true, message: 'Budget limit updated', data: dbState.budgetLimits });
});

// 5. Pooled Fund endpoints
app.get('/api/pooled-fund', (req, res) => {
  res.json({ success: true, data: dbState.pooledFund });
});

// 5b. Deposit Accounts endpoints
app.get('/api/deposit-accounts', (req, res) => {
  const { family_id } = req.query;
  const accounts = family_id
    ? dbState.depositAccounts.filter(a => a.family_id === Number(family_id))
    : dbState.depositAccounts;
  res.json({ success: true, data: accounts });
});

app.post('/api/deposit-accounts', (req, res) => {
  const { family_id, user_id, bank_name, account_number, account_name, account_type } = req.body;

  if (!bank_name || !account_number || !account_name) {
    return res.status(400).json({ success: false, error: 'Bank Name, Account Number, and Account Name are required.' });
  }

  const newAccount = {
    account_id: dbState.depositAccounts.length > 0 ? Math.max(...dbState.depositAccounts.map(a => a.account_id)) + 1 : 1,
    family_id: Number(family_id) || 1,
    user_id: Number(user_id) || 1,
    bank_name,
    account_number,
    account_name,
    account_type: account_type || 'savings',
    is_primary: dbState.depositAccounts.length === 0,
    created_at: new Date().toISOString()
  };

  dbState.depositAccounts.push(newAccount);
  res.json({ success: true, message: 'Deposit bank account linked successfully!', data: newAccount });
});

app.delete('/api/deposit-accounts/:id', (req, res) => {
  const { id } = req.params;
  dbState.depositAccounts = dbState.depositAccounts.filter(a => a.account_id !== Number(id));
  res.json({ success: true, message: 'Deposit account unlinked.' });
});

app.get('/api/pool-transactions', (req, res) => {
  res.json({ success: true, data: dbState.poolTransactions });
});

app.post('/api/pool-transactions/contribute', (req, res) => {
  const { user_id, amount, purpose } = req.body;
  const numAmount = parseFloat(amount);

  dbState.pooledFund.balance += numAmount;
  dbState.pooledFund.last_updated = new Date().toISOString();

  const newTx = {
    transaction_id: dbState.poolTransactions.length + 1,
    family_id: 1,
    user_id: Number(user_id),
    type: 'contribution',
    amount: numAmount,
    purpose: purpose || 'Pooled Contribution',
    date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };

  dbState.poolTransactions.push(newTx);
  res.json({ success: true, transaction: newTx, pool: dbState.pooledFund });
});

app.post('/api/pool-transactions/allocate', (req, res) => {
  const { user_id, amount, purpose } = req.body;
  const numAmount = parseFloat(amount);

  if (dbState.pooledFund.balance < numAmount) {
    return res.status(400).json({ success: false, error: `Insufficient pool balance: ₦${dbState.pooledFund.balance.toLocaleString()}` });
  }

  dbState.pooledFund.balance -= numAmount;
  dbState.pooledFund.last_updated = new Date().toISOString();

  const newTx = {
    transaction_id: dbState.poolTransactions.length + 1,
    family_id: 1,
    user_id: Number(user_id),
    type: 'allocation',
    amount: numAmount,
    purpose: purpose || 'Pool Allocation',
    date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };

  dbState.poolTransactions.push(newTx);
  res.json({ success: true, transaction: newTx, pool: dbState.pooledFund });
});

// 6. Incomes endpoints
app.get('/api/incomes', (req, res) => {
  const { family_id } = req.query;
  const list = family_id ? dbState.incomes.filter(i => i.family_id === Number(family_id)) : dbState.incomes;
  res.json({ success: true, data: list });
});

app.post('/api/incomes', (req, res) => {
  const newIncome = {
    income_id: dbState.incomes.length + 1,
    family_id: Number(req.body.family_id) || 1,
    ...req.body,
    amount: parseFloat(req.body.amount)
  };
  dbState.incomes.push(newIncome);
  res.json({ success: true, data: newIncome });
});

// 7. Expenses endpoints
app.get('/api/expenses', (req, res) => {
  const { family_id } = req.query;
  const list = family_id ? dbState.expenses.filter(e => e.family_id === Number(family_id)) : dbState.expenses;
  res.json({ success: true, data: list });
});

app.post('/api/expenses', (req, res) => {
  const newExpense = {
    expense_id: dbState.expenses.length + 1,
    family_id: Number(req.body.family_id) || 1,
    ...req.body,
    amount: parseFloat(req.body.amount)
  };
  dbState.expenses.push(newExpense);
  res.json({ success: true, data: newExpense });
});

// 8. Notifications endpoints
app.get('/api/notifications', (req, res) => {
  res.json({ success: true, data: dbState.notifications });
});

app.post('/api/notifications', (req, res) => {
  const newNotif = {
    notification_id: dbState.notifications.length + 1,
    family_id: 1,
    sent_at: new Date().toISOString(),
    is_read: false,
    ...req.body
  };
  dbState.notifications.push(newNotif);
  res.json({ success: true, data: newNotif });
});

app.put('/api/notifications/read-all', (req, res) => {
  dbState.notifications.forEach(n => n.is_read = true);
  res.json({ success: true, message: 'All notifications marked as read' });
});

// 9. Send Automated Email via SMTP endpoint
app.post('/api/notifications/send-email', async (req, res) => {
  const { to, subject, html, text } = req.body;

  try {
    const result = await sendEmail({
      to: to || 'family-members@okafor.org.ng',
      subject: subject || 'NaijaFamily Pooled Bank Notification',
      text,
      html
    });

    res.json({
      success: true,
      message: 'SMTP Email notification dispatched successfully',
      dispatchLog: {
        to: result.recipient,
        subject: result.subject,
        timestamp: new Date().toISOString(),
        simulated: result.simulated,
        messageId: result.messageId
      }
    });
  } catch (error) {
    console.error('SMTP Send Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Direct Email Verification & Diagnostics endpoint
app.post('/api/auth/test-email', async (req, res) => {
  const { type = 'welcome', email, firstName, familyName } = req.body;
  const targetEmail = email || 'test@familybank.com';
  const targetName = firstName || 'Demo User';
  const targetFamily = familyName || 'Demo Family';

  try {
    let result;
    if (type === 'login') {
      result = await sendLoginAlertEmail({
        to: targetEmail,
        firstName: targetName,
        familyName: targetFamily,
        role: 'Parent (Family Admin)',
        loginTime: new Date(),
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip,
        userAgent: req.headers['user-agent']
      });
    } else {
      result = await sendWelcomeEmail({
        to: targetEmail,
        firstName: targetName,
        familyName: targetFamily,
        role: 'Parent (Family Admin)',
        isJoin: false
      });
    }

    res.json({
      success: true,
      message: `Test ${type} email dispatched successfully`,
      result
    });
  } catch (error) {
    console.error('Test Email Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Express API server
app.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🚀 NaijaFamily Pooled Bank REST API Running on http://${HOST}:${PORT}`);
  console.log(`=======================================================`);
});

