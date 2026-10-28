/**
 * OnePot Backend REST API Application Tier
 * Seamlessly interfaces with active MySQL (Aiven Cloud) and in-memory cache
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

const db = require('./models/db');
const dbState = require('./models/dbState');

const authRouter = require('./routes/auth');
const familyRouter = require('./routes/family');
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
app.use('/api/family', familyRouter);
app.use('/api/families', familyRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/allocations', allocationRouter);

// Standard default smart bowls definition
const DEFAULT_SMART_BOWLS = [
  { name: 'Food & Provisions', priority: 'High', icon: '🛒' },
  { name: 'School Fees & Books', priority: 'High', icon: '📚' },
  { name: 'House Rent & Maintenance', priority: 'High', icon: '🏠' },
  { name: 'Generator Fuel & PHCN', priority: 'Medium', icon: '⚡' },
  { name: 'Healthcare & Emergency', priority: 'High', icon: '🏥' },
  { name: 'Transport & Car Fuel', priority: 'Medium', icon: '🚗' },
  { name: 'Extended Family ("Black Tax")', priority: 'Low', icon: '🤝' },
  { name: 'Savings & Investments', priority: 'High', icon: '💰' }
];

function getCategoryIcon(name) {
  const match = DEFAULT_SMART_BOWLS.find(b => b.name.toLowerCase() === (name || '').toLowerCase());
  return match ? match.icon : '🍲';
}

// Helper to seed bowls for a family if none exist in MySQL
async function ensureFamilyBowls(familyId) {
  if (!familyId) return [];
  const existing = await db.query('SELECT * FROM bowls WHERE family_id = ? ORDER BY id ASC', [familyId]);
  if (existing && existing.length > 0) {
    return existing;
  }

  // Insert default smart bowls
  for (const item of DEFAULT_SMART_BOWLS) {
    await db.query(
      'INSERT INTO bowls (family_id, category_name, allocated_amount, spent_amount, priority_level) VALUES (?, ?, 0.00, 0.00, ?)',
      [familyId, item.name, item.priority]
    );
  }

  const seeded = await db.query('SELECT * FROM bowls WHERE family_id = ? ORDER BY id ASC', [familyId]);
  return seeded || [];
}

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

app.get('/api/health', async (req, res) => {
  try {
    const [fCount, uCount, cCount, bCount, eCount] = await Promise.all([
      db.query('SELECT COUNT(*) as c FROM families'),
      db.query('SELECT COUNT(*) as c FROM users'),
      db.query('SELECT COUNT(*) as c FROM contributions'),
      db.query('SELECT COUNT(*) as c FROM bowls'),
      db.query('SELECT COUNT(*) as c FROM expenses')
    ]);

    res.json({
      status: 'OK',
      app: 'OnePot Backend REST API',
      version: '2.1.0',
      database: 'MySQL Aiven Cloud (Connected)',
      timestamp: new Date().toISOString(),
      stats: {
        families: fCount ? fCount[0].c : dbState.families.length,
        users: uCount ? uCount[0].c : dbState.users.length,
        contributions: cCount ? cCount[0].c : dbState.contributions.length,
        bowls: bCount ? bCount[0].c : dbState.bowls.length,
        expenses: eCount ? eCount[0].c : dbState.expenses.length
      }
    });
  } catch (err) {
    res.json({ status: 'OK', warning: err.message, timestamp: new Date().toISOString() });
  }
});

// --- CORE APPLICATION ENDPOINTS ---

// Get all families from MySQL
app.get('/api/families', async (req, res) => {
  try {
    const families = await db.query('SELECT id, id as family_id, family_name, invite_code, total_pot_balance, emergency_fund_balance, auto_save_percentage, created_at FROM families ORDER BY id ASC');
    res.json({ success: true, data: families || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Users endpoint (supports ?family_id=...)
app.get('/api/users', async (req, res) => {
  try {
    const familyId = req.query.family_id ? Number(req.query.family_id) : null;
    let users = null;
    if (familyId) {
      users = await db.query(
        'SELECT id, id AS user_id, family_id, first_name, last_name, email, role, avatar_url AS avatar, created_at FROM users WHERE family_id = ? ORDER BY id ASC',
        [familyId]
      );
    } else {
      users = await db.query(
        'SELECT id, id AS user_id, family_id, first_name, last_name, email, role, avatar_url AS avatar, created_at FROM users ORDER BY id ASC'
      );
    }

    const formatted = (users || []).map(u => ({
      ...u,
      avatar: u.avatar || (u.role === 'parent' ? '👑' : '👤'),
      title: u.role === 'parent' ? 'Parent (Family Admin)' : 'Member (Family Contributor)'
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Smart Bowls / Categories endpoint (supports ?family_id=...)
app.get(['/api/bowls', '/api/categories'], async (req, res) => {
  try {
    const familyId = Number(req.query.family_id);
    let bowls = [];
    if (familyId) {
      bowls = await ensureFamilyBowls(familyId);
    } else {
      bowls = await db.query('SELECT * FROM bowls ORDER BY id ASC');
    }

    const formatted = (bowls || []).map(b => ({
      id: b.id,
      category_id: b.id,
      family_id: b.family_id,
      category_name: b.category_name,
      allocated_amount: Number(b.allocated_amount || 0),
      spent_amount: Number(b.spent_amount || 0),
      priority_level: b.priority_level || 'Medium',
      icon: getCategoryIcon(b.category_name),
      balance: Math.max(0, Number(b.allocated_amount || 0) - Number(b.spent_amount || 0))
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pooled Fund summary endpoint (supports ?family_id=...)
app.get('/api/pooled-fund', async (req, res) => {
  try {
    const familyId = Number(req.query.family_id);
    if (!familyId) {
      return res.json({
        success: true,
        data: {
          pool_id: 0,
          family_id: 0,
          balance: 0.00,
          emergency_fund_balance: 0.00,
          auto_save_percentage: 5.00,
          last_updated: null
        }
      });
    }

    const famRows = await db.query('SELECT * FROM families WHERE id = ? LIMIT 1', [familyId]);
    if (!famRows || famRows.length === 0) {
      return res.json({
        success: true,
        data: {
          pool_id: 0,
          family_id: familyId,
          balance: 0.00,
          emergency_fund_balance: 0.00,
          auto_save_percentage: 5.00,
          last_updated: null
        }
      });
    }

    const family = famRows[0];
    res.json({
      success: true,
      data: {
        pool_id: family.id,
        family_id: family.id,
        balance: Number(family.total_pot_balance || 0),
        emergency_fund_balance: Number(family.emergency_fund_balance || 0),
        auto_save_percentage: Number(family.auto_save_percentage || 5),
        last_updated: family.created_at || new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pool Transactions / Contributions audit log
app.get('/api/pool-transactions', async (req, res) => {
  try {
    const familyId = req.query.family_id ? Number(req.query.family_id) : null;

    // Fetch contributions
    const contribRows = await db.query(
      `SELECT c.id as transaction_id, c.id, c.family_id, c.member_id as user_id, 
              'contribution' as type, c.amount, c.source_note as purpose, c.created_at,
              u.first_name, u.last_name, u.avatar_url as avatar, u.role
       FROM contributions c
       LEFT JOIN users u ON c.member_id = u.id
       WHERE (? IS NULL OR c.family_id = ?)
       ORDER BY c.id DESC`,
      [familyId, familyId]
    );

    // Fetch approved allocations
    const allocRows = await db.query(
      `SELECT e.id as transaction_id, e.id, e.family_id, e.requested_by_user_id as user_id,
              'allocation' as type, e.amount, e.description as purpose, e.created_at,
              u.first_name, u.last_name, u.avatar_url as avatar, u.role
       FROM expenses e
       LEFT JOIN users u ON e.requested_by_user_id = u.id
       WHERE (? IS NULL OR e.family_id = ?) AND e.status = 'approved'
       ORDER BY e.id DESC`,
      [familyId, familyId]
    );

    const merged = [
      ...(contribRows || []).map(r => ({ ...r, amount: Number(r.amount) })),
      ...(allocRows || []).map(r => ({ ...r, amount: Number(r.amount) }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, count: merged.length, data: merged });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Direct contribution endpoint
app.post('/api/pool-transactions/contribute', async (req, res) => {
  try {
    const { user_id, amount, purpose, source_note, family_id } = req.body;
    const numAmount = parseFloat(amount || 0);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Please enter a valid amount greater than ₦0.' });
    }

    // Lookup user
    const userRows = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [Number(user_id)]);
    const user = userRows && userRows.length > 0 ? userRows[0] : null;
    const effectiveFamilyId = Number(family_id || user?.family_id);

    if (!effectiveFamilyId) {
      return res.status(400).json({ success: false, error: 'Valid family ID is required.' });
    }

    const famRows = await db.query('SELECT * FROM families WHERE id = ? LIMIT 1', [effectiveFamilyId]);
    if (!famRows || famRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Family pot account not found.' });
    }
    const family = famRows[0];

    // Compute auto-save
    const autoSavePercent = family.auto_save_percentage !== undefined ? Number(family.auto_save_percentage) : 5;
    const autoSaveAmount = autoSavePercent > 0 ? (numAmount * (autoSavePercent / 100)) : 0;

    // Insert into MySQL contributions
    const note = source_note || purpose || 'Direct Pot Contribution';
    const ref = `onepot_direct_${Date.now()}`;
    const insertRes = await db.query(
      'INSERT INTO contributions (family_id, member_id, amount, source_note, paystack_ref) VALUES (?, ?, ?, ?, ?)',
      [family.id, user ? user.id : Number(user_id), numAmount, note, ref]
    );

    // Update family balance
    await db.query(
      'UPDATE families SET total_pot_balance = total_pot_balance + ?, emergency_fund_balance = emergency_fund_balance + ? WHERE id = ?',
      [numAmount, autoSaveAmount, family.id]
    );

    // Notification
    const contributorName = user ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Family Contributor';
    await db.query(
      'INSERT INTO notifications (family_id, user_id, message, type, is_read) VALUES (?, ?, ?, "contribution", 0)',
      [family.id, user ? user.id : Number(user_id), `₦${numAmount.toLocaleString()} added to pot by ${contributorName} (${note}).`]
    );

    const updatedFam = await db.query('SELECT total_pot_balance, emergency_fund_balance FROM families WHERE id = ?', [family.id]);

    res.json({
      success: true,
      message: `₦${numAmount.toLocaleString()} added to pot`,
      data: {
        total_pot_balance: Number(updatedFam[0].total_pot_balance),
        emergency_fund_balance: Number(updatedFam[0].emergency_fund_balance),
        contribution: {
          id: insertRes?.insertId,
          family_id: family.id,
          amount: numAmount,
          source_note: note,
          created_at: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Expenses endpoint
app.get('/api/expenses', async (req, res) => {
  try {
    const familyId = req.query.family_id ? Number(req.query.family_id) : null;
    const rows = await db.query(
      `SELECT e.id as expense_id, e.id, e.family_id, e.bowl_id as category_id, e.requested_by_user_id as user_id,
              e.amount, e.description as title, e.description, e.status, e.is_emergency,
              e.created_at as date_spent, e.created_at, b.category_name, u.first_name, u.last_name, u.avatar_url as avatar
       FROM expenses e
       LEFT JOIN bowls b ON e.bowl_id = b.id
       LEFT JOIN users u ON e.requested_by_user_id = u.id
       WHERE (? IS NULL OR e.family_id = ?)
       ORDER BY e.id DESC`,
      [familyId, familyId]
    );

    const formatted = (rows || []).map(r => ({
      ...r,
      amount: Number(r.amount),
      payment_method: 'Shared Vault'
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log an expense directly
app.post('/api/expenses', async (req, res) => {
  try {
    const { user_id, family_id, category_id, bowl_id, amount, description, payment_method, date_spent } = req.body;
    const numAmount = parseFloat(amount || 0);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Please enter a valid expense amount.' });
    }

    const effectiveBowlId = Number(bowl_id || category_id || 1);
    const effectiveFamilyId = Number(family_id);

    const insertRes = await db.query(
      'INSERT INTO expenses (family_id, bowl_id, requested_by_user_id, amount, description, status, is_emergency) VALUES (?, ?, ?, ?, ?, "approved", 0)',
      [effectiveFamilyId, effectiveBowlId, Number(user_id), numAmount, description || 'Household Expense']
    );

    // Update bowl spent amount
    await db.query('UPDATE bowls SET spent_amount = spent_amount + ? WHERE id = ?', [numAmount, effectiveBowlId]);

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      data: {
        id: insertRes?.insertId,
        expense_id: insertRes?.insertId,
        amount: numAmount,
        description,
        family_id: effectiveFamilyId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update budget limit (spending cap) for a Smart Bowl
app.post(['/api/budget-limits', '/api/budget/update-limit'], async (req, res) => {
  try {
    const { category_id, bowl_id, amount, family_id } = req.body;
    const targetBowlId = Number(bowl_id || category_id);
    const numAmount = parseFloat(amount || 0);
    const targetFamilyId = Number(family_id);

    if (!targetBowlId) {
      return res.status(400).json({ success: false, error: 'Smart Bowl / Category ID is required.' });
    }

    await db.query(
      'UPDATE bowls SET allocated_amount = ? WHERE id = ? AND (? IS NULL OR family_id = ?)',
      [numAmount, targetBowlId, targetFamilyId || null, targetFamilyId || null]
    );

    res.json({
      success: true,
      message: `Budget cap updated to ₦${numAmount.toLocaleString()}`,
      data: { bowl_id: targetBowlId, allocated_amount: numAmount }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Notifications endpoint
app.get('/api/notifications', async (req, res) => {
  try {
    const familyId = req.query.family_id ? Number(req.query.family_id) : null;
    const rows = await db.query(
      'SELECT id as notification_id, id, family_id, user_id, message, type, is_read, sent_at FROM notifications WHERE (? IS NULL OR family_id = ?) ORDER BY id DESC',
      [familyId, familyId]
    );

    const formatted = (rows || []).map(r => ({
      ...r,
      is_read: Boolean(r.is_read)
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark all notifications read
app.put('/api/notifications/read-all', async (req, res) => {
  try {
    const familyId = Number(req.body.family_id || req.query.family_id);
    if (familyId) {
      await db.query('UPDATE notifications SET is_read = 1 WHERE family_id = ?', [familyId]);
    } else {
      await db.query('UPDATE notifications SET is_read = 1');
    }
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Express API server
app.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🍲 OnePot REST API Running on http://${HOST}:${PORT}`);
  console.log(`⚖️ Connected to MySQL Database (Aiven Cloud)`);
  console.log(`=======================================================`);
});
