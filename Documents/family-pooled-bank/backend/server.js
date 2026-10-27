/**
 * OnePot Backend REST API Application Tier
 * Supports In-Memory Mock Ledger, MySQL Schema Mirroring,
 * Nodemailer Asynchronous SMTP Notifications, and Paystack Sandbox Integration
 *
 * Closed-loop mock banking ledger for academic demonstration.
 * Real fund movement is simulated via Paystack sandbox API and Mono API integration guidelines.
 */

const path = require('path');
// Load environment variables strictly from .env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const dbState = require('./models/dbState');

const authRouter = require('./routes/auth');
const paymentsRouter = require('./routes/payments');
const allocationRouter = require('./routes/allocations');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true
}));
app.use(express.json());

// --- MODULAR ROUTERS ---
app.use('/api/auth', authRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/allocations', allocationRouter);

// --- ROOT & HEALTH DIAGNOSTIC ROUTES ---

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>OnePot REST API</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090d16; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
          .card { background: #0f172a; padding: 2.5rem; border-radius: 20px; border: 1px solid #1e293b; max-width: 520px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          h1 { color: #10b981; font-size: 1.75rem; margin-bottom: 0.25rem; }
          .tagline { color: #94a3b8; font-size: 0.95rem; margin-bottom: 1.5rem; font-style: italic; }
          .disclaimer { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 12px; font-size: 0.8rem; color: #a7f3d0; margin-bottom: 1.5rem; line-height: 1.4; text-align: left; }
          .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: 600; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.85rem; }
          .btn { display: inline-block; margin-top: 1.5rem; background: #059669; color: white; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 600; transition: background 0.2s; }
          .btn:hover { background: #047857; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🍲 OnePot REST API</h1>
          <div class="tagline">"One family, one pot = No stories"</div>
          <div class="disclaimer">
            ⚖️ <strong>Academic Demo Disclaimer:</strong> Closed-loop mock banking ledger for academic demonstration. Real fund movement is simulated via Paystack sandbox API and Mono API integration guidelines.
          </div>
          <div class="badge">● Server Status: ONLINE (Port ${PORT})</div>
          <br/>
          <a class="btn" href="${process.env.APP_URL || 'http://localhost:5173'}" target="_self">Launch OnePot Web App (Port 5173) &rarr;</a>
        </div>
      </body>
    </html>
  `);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'OnePot Backend REST API',
    version: '2.0.0',
    disclaimer: 'Closed-loop mock banking ledger for academic demonstration. Real fund movement is simulated via Paystack sandbox API and Mono API integration guidelines.',
    timestamp: new Date().toISOString(),
    stats: {
      families: dbState.families.length,
      users: dbState.users.length,
      contributions: dbState.contributions.length,
      bowls: dbState.bowls.length,
      expenses: dbState.expenses.length
    }
  });
});

// --- CORE APPLICATION ENDPOINTS ---

// Get all families
app.get('/api/families', (req, res) => {
  res.json({ success: true, data: dbState.families });
});

// Users endpoint
app.get('/api/users', (req, res) => {
  res.json({ success: true, data: dbState.users });
});

// Smart Bowls (Budgets) endpoint
app.get('/api/bowls', (req, res) => {
  res.json({ success: true, data: dbState.bowls });
});
app.get('/api/categories', (req, res) => {
  res.json({ success: true, data: dbState.bowls });
});

// Pooled Fund summary endpoint
app.get('/api/pooled-fund', (req, res) => {
  const family = dbState.families[0];
  res.json({
    success: true,
    data: {
      pool_id: 1,
      family_id: family?.family_id || 1,
      balance: family?.total_pot_balance || 0,
      emergency_fund_balance: family?.emergency_fund_balance || 0,
      auto_save_percentage: family?.auto_save_percentage || 5,
      last_updated: new Date().toISOString()
    }
  });
});

// Pool Transactions / Contributions audit log
app.get('/api/pool-transactions', (req, res) => {
  res.json({ success: true, data: dbState.contributions });
});

// Direct contribution endpoint (synchronous mock fallback for backward compatibility)
app.post('/api/pool-transactions/contribute', (req, res) => {
  const { user_id, amount, purpose, source_note } = req.body;
  const numAmount = parseFloat(amount || 0);

  const family = dbState.families[0];
  const user = dbState.users.find(u => u.user_id === Number(user_id)) || dbState.users[0];

  family.total_pot_balance = (family.total_pot_balance || 0) + numAmount;
  const autoSaveAmount = numAmount * ((family.auto_save_percentage || 5) / 100);
  family.emergency_fund_balance = (family.emergency_fund_balance || 0) + autoSaveAmount;

  const newContribution = {
    id: dbState.contributions.length + 1,
    family_id: family.family_id,
    member_id: user.user_id,
    amount: numAmount,
    source_note: source_note || purpose || 'Direct Pot Contribution',
    paystack_ref: `onepot_mock_${Date.now()}`,
    created_at: new Date().toISOString()
  };
  dbState.contributions.push(newContribution);

  res.json({
    success: true,
    message: `₦${numAmount.toLocaleString()} added to pot`,
    data: {
      total_pot_balance: family.total_pot_balance,
      emergency_fund_balance: family.emergency_fund_balance,
      contribution: newContribution
    }
  });
});

// Expenses endpoint
app.get('/api/expenses', (req, res) => {
  res.json({ success: true, data: dbState.expenses });
});

// Notifications endpoint
app.get('/api/notifications', (req, res) => {
  res.json({ success: true, data: dbState.notifications });
});

// Start Express API server
app.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🍲 OnePot REST API Running on http://${HOST}:${PORT}`);
  console.log(`⚖️ Closed-loop mock banking ledger for academic demonstration.`);
  console.log(`=======================================================`);
});
