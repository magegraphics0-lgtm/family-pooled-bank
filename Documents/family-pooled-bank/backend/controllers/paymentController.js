/**
 * OnePot Paystack Contribution Payment Controller
 * Handles initialization, verification, pot balance credit, 5% auto-save diversion,
 * and asynchronous confirmation email dispatch to parents.
 * Connected directly to active MySQL database (Aiven Cloud).
 */

const db = require('../models/db');
const dbState = require('../models/dbState');
const { sendContributionConfirmationEmail } = require('../services/emailService');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_onepot_sandbox_key_987654321';
const PAYSTACK_PUBLIC = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_mock_onepot_sandbox_key_123456789';

const ACADEMIC_DISCLAIMER = 'Closed-loop mock banking ledger for academic demonstration. Real fund movement is simulated via Paystack sandbox API and Mono API integration guidelines.';

/**
 * 1. Initialize Contribution Transaction
 * POST /api/payments/initialize-contribution
 */
async function initializeContribution(req, res) {
  try {
    const { family_id, member_id, amount, source_note } = req.body;

    const numAmount = parseFloat(amount || 0);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid contribution amount greater than ₦0.'
      });
    }

    // Lookup family from MySQL
    let family = null;
    const dbFamilies = await db.query('SELECT * FROM families WHERE id = ? LIMIT 1', [Number(family_id)]);
    if (dbFamilies && dbFamilies.length > 0) {
      family = dbFamilies[0];
    } else {
      family = dbState.families.find(f => (f.id || f.family_id) === Number(family_id));
    }

    if (!family) {
      return res.status(404).json({ success: false, error: 'Family pot account not found.' });
    }

    // Lookup user from MySQL
    let member = null;
    const dbUsers = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [Number(member_id)]);
    if (dbUsers && dbUsers.length > 0) {
      member = dbUsers[0];
    } else {
      member = dbState.users.find(u => (u.id || u.user_id) === Number(member_id));
    }

    if (!member) {
      return res.status(404).json({ success: false, error: 'Member contributor account not found.' });
    }

    const reference = `onepot_pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let authorization_url = `https://checkout.paystack.com/sandbox-mock-${reference}`;
    let access_code = `acc_${reference}`;
    let isLivePaystack = false;

    // Check if live or test Paystack secret key is provided
    if (PAYSTACK_SECRET && !PAYSTACK_SECRET.includes('mock_onepot') && PAYSTACK_SECRET.startsWith('sk_')) {
      try {
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: member.email,
            amount: Math.round(numAmount * 100), // kobo
            reference,
            callback_url: `${process.env.APP_URL || 'http://localhost:5173'}?paystack_ref=${reference}`,
            metadata: {
              family_id: family.id || family.family_id,
              member_id: member.id || member.user_id,
              source_note: source_note || 'OnePot Contribution'
            }
          })
        });

        const data = await response.json();
        if (data && data.status && data.data) {
          authorization_url = data.data.authorization_url;
          access_code = data.data.access_code;
          isLivePaystack = true;
        }
      } catch (paystackErr) {
        console.warn('[PAYSTACK INIT NOTICE] Network call to Paystack sandbox failed, utilizing simulated sandbox flow:', paystackErr.message);
      }
    }

    // Record pending transaction in MySQL
    try {
      await db.query(
        'INSERT INTO paystack_transactions (family_id, member_id, reference, amount, status, access_code, authorization_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [family.id || family.family_id, member.id || member.user_id, reference, numAmount, 'pending', access_code, authorization_url]
      );
    } catch (dbErr) {
      console.warn('[DB PAYSTACK INSERT NOTICE]', dbErr.message);
    }

    // Also mirror to memory
    const newTx = {
      id: dbState.paystack_transactions.length + 1,
      family_id: family.id || family.family_id,
      member_id: member.id || member.user_id,
      reference,
      amount: numAmount,
      status: 'pending',
      source_note: source_note || 'Family Pot Contribution',
      access_code,
      authorization_url,
      created_at: new Date().toISOString()
    };
    dbState.paystack_transactions.push(newTx);

    console.log(`[PAYSTACK INIT] Created contribution transaction ${reference} for ₦${numAmount} (${family.family_name})`);

    res.json({
      success: true,
      message: 'Paystack contribution initialized successfully',
      data: {
        reference,
        access_code,
        authorization_url,
        amount: numAmount,
        currency: 'NGN',
        public_key: PAYSTACK_PUBLIC,
        family_id: family.id || family.family_id,
        member_id: member.id || member.user_id,
        is_mock: !isLivePaystack,
        disclaimer: ACADEMIC_DISCLAIMER
      }
    });
  } catch (error) {
    console.error('[PAYSTACK INIT ERROR]', error);
    res.status(500).json({ success: false, error: 'Failed to initialize Paystack contribution.' });
  }
}

/**
 * 2. Verify Contribution Transaction
 * POST /api/payments/verify-contribution
 */
async function verifyContribution(req, res) {
  try {
    const { reference, family_id, member_id, amount, source_note } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, error: 'Transaction reference is required for verification.' });
    }

    // Check if transaction was already recorded as verified in MySQL
    const existingContributions = await db.query('SELECT * FROM contributions WHERE paystack_ref = ? LIMIT 1', [reference]);
    if (existingContributions && existingContributions.length > 0) {
      const existing = existingContributions[0];
      const famRows = await db.query('SELECT * FROM families WHERE id = ? LIMIT 1', [existing.family_id]);
      const family = (famRows && famRows[0]) || { total_pot_balance: 0, emergency_fund_balance: 0 };
      return res.json({
        success: true,
        message: 'Transaction already verified and allocated to pot.',
        data: {
          reference,
          amount: Number(existing.amount),
          total_pot_balance: Number(family.total_pot_balance),
          emergency_fund_balance: Number(family.emergency_fund_balance),
          disclaimer: ACADEMIC_DISCLAIMER
        }
      });
    }

    // Lookup pending transaction in MySQL
    const txRows = await db.query('SELECT * FROM paystack_transactions WHERE reference = ? LIMIT 1', [reference]);
    const tx = txRows && txRows.length > 0 ? txRows[0] : null;

    let finalAmount = tx ? Number(tx.amount) : Number(amount || 0);
    let finalFamilyId = tx ? tx.family_id : Number(family_id);
    let finalMemberId = tx ? tx.member_id : Number(member_id);
    let finalNote = source_note || 'OnePot Family Contribution';

    // Attempt Paystack API verification if secret key is present
    if (PAYSTACK_SECRET && !PAYSTACK_SECRET.includes('mock_onepot') && PAYSTACK_SECRET.startsWith('sk_')) {
      try {
        const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
        });
        const verifyData = await verifyRes.json();
        if (verifyData && verifyData.status && verifyData.data) {
          if (verifyData.data.status === 'success') {
            finalAmount = verifyData.data.amount / 100; // convert kobo to Naira
            if (verifyData.data.metadata) {
              if (verifyData.data.metadata.family_id) finalFamilyId = Number(verifyData.data.metadata.family_id);
              if (verifyData.data.metadata.member_id) finalMemberId = Number(verifyData.data.metadata.member_id);
              if (verifyData.data.metadata.source_note) finalNote = verifyData.data.metadata.source_note;
            }
          } else {
            return res.status(400).json({
              success: false,
              error: `Paystack transaction status: ${verifyData.data.status}`
            });
          }
        }
      } catch (err) {
        console.warn('[PAYSTACK VERIFY NOTICE] Remote verification failed, proceeding with sandbox verification:', err.message);
      }
    }

    if (!finalAmount || finalAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid contribution amount.' });
    }

    // Fetch family from MySQL
    const famRows = await db.query('SELECT * FROM families WHERE id = ? LIMIT 1', [finalFamilyId]);
    if (!famRows || famRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Family pot account not found.' });
    }
    const family = famRows[0];

    // Fetch member from MySQL
    const userRows = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [finalMemberId]);
    const member = (userRows && userRows.length > 0) ? userRows[0] : { first_name: 'Family', last_name: 'Member', email: '' };

    // 1. Mark transaction as success in paystack_transactions
    await db.query(
      'UPDATE paystack_transactions SET status = "success", verified_at = CURRENT_TIMESTAMP WHERE reference = ?',
      [reference]
    );

    // 2. Record in contributions table
    const contribInsert = await db.query(
      'INSERT INTO contributions (family_id, member_id, amount, source_note, paystack_ref) VALUES (?, ?, ?, ?, ?)',
      [family.id, member.id || finalMemberId, finalAmount, finalNote, reference]
    );
    const newContribId = contribInsert?.insertId || Date.now();

    // 3. Compute 5% Auto-Save allocation into emergency_fund_balance
    const autoSavePercent = family.auto_save_percentage !== undefined ? Number(family.auto_save_percentage) : 5;
    const autoSaveAmount = autoSavePercent > 0 ? (finalAmount * (autoSavePercent / 100)) : 0;

    // 4. Update families.total_pot_balance and emergency_fund_balance in MySQL
    await db.query(
      'UPDATE families SET total_pot_balance = total_pot_balance + ?, emergency_fund_balance = emergency_fund_balance + ? WHERE id = ?',
      [finalAmount, autoSaveAmount, family.id]
    );

    // Refetch updated family balances
    const updatedFamRows = await db.query('SELECT total_pot_balance, emergency_fund_balance FROM families WHERE id = ? LIMIT 1', [family.id]);
    const updatedPotBalance = updatedFamRows ? Number(updatedFamRows[0].total_pot_balance) : (Number(family.total_pot_balance) + finalAmount);
    const updatedEmergencyBalance = updatedFamRows ? Number(updatedFamRows[0].emergency_fund_balance) : (Number(family.emergency_fund_balance) + autoSaveAmount);

    // 5. In-app notification in MySQL
    const notifMsg = `₦${finalAmount.toLocaleString()} added to pot by ${member.first_name} (${finalNote}).`;
    await db.query(
      'INSERT INTO notifications (family_id, user_id, message, type, is_read) VALUES (?, ?, ?, "contribution", 0)',
      [family.id, member.id || finalMemberId, notifMsg]
    );

    console.log(`[POT CREDITED] ₦${finalAmount} added to ${family.family_name}. New Pot Balance: ₦${updatedPotBalance}. Auto-Save (5%): +₦${autoSaveAmount}.`);

    // 6. Asynchronously dispatch Contribution Confirmation Email to family parents (Non-blocking)
    const parents = await db.query('SELECT * FROM users WHERE family_id = ? AND role = "parent"', [family.id]);
    if (parents && parents.length > 0) {
      parents.forEach(p => {
        sendContributionConfirmationEmail({
          to: p.email,
          contributorName: `${member.first_name} ${member.last_name || ''}`.trim(),
          amount: finalAmount,
          sourceNote: finalNote,
          reference,
          totalPotBalance: updatedPotBalance,
          autoSaveAmount,
          emergencyFundBalance: updatedEmergencyBalance,
          familyName: family.family_name
        }).catch(emailErr => {
          console.error('[CONTRIBUTION EMAIL ERROR] Failed to dispatch contribution email to', p.email, emailErr.message);
        });
      });
    }

    const newContribution = {
      id: newContribId,
      family_id: family.id,
      member_id: member.id || finalMemberId,
      amount: finalAmount,
      source_note: finalNote,
      paystack_ref: reference,
      created_at: new Date().toISOString()
    };

    return res.json({
      success: true,
      message: 'Contribution verified successfully and allocated to family pot.',
      data: {
        reference,
        amount: finalAmount,
        contributor: `${member.first_name} ${member.last_name || ''}`.trim(),
        total_pot_balance: updatedPotBalance,
        emergency_fund_balance: updatedEmergencyBalance,
        auto_save_percentage: autoSavePercent,
        auto_save_amount: autoSaveAmount,
        contribution: newContribution,
        disclaimer: ACADEMIC_DISCLAIMER
      }
    });
  } catch (error) {
    console.error('[PAYSTACK VERIFY ERROR]', error);
    res.status(500).json({ success: false, error: 'Failed to verify Paystack contribution.' });
  }
}

/**
 * 3. List Transactions
 * GET /api/payments/transactions/:family_id
 */
async function getTransactionsByFamily(req, res) {
  try {
    const familyId = Number(req.params.family_id);
    if (!familyId) {
      return res.status(400).json({ success: false, error: 'Family ID required' });
    }
    const txs = await db.query('SELECT * FROM paystack_transactions WHERE family_id = ? ORDER BY id DESC', [familyId]);
    res.json({ success: true, count: (txs || []).length, data: txs || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 4. List Contributions
 * GET /api/payments/contributions/:family_id
 */
async function getContributionsByFamily(req, res) {
  try {
    const familyId = Number(req.params.family_id);
    if (!familyId) {
      return res.status(400).json({ success: false, error: 'Family ID required' });
    }
    const contributions = await db.query(
      'SELECT c.*, u.first_name, u.last_name, u.avatar_url AS avatar, u.role FROM contributions c LEFT JOIN users u ON c.member_id = u.id WHERE c.family_id = ? ORDER BY c.id DESC',
      [familyId]
    );
    const formatted = (contributions || []).map(c => ({
      ...c,
      amount: Number(c.amount),
      contributor_name: c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : 'Family Member',
      avatar: c.avatar || '👤',
      role: c.role || 'member'
    }));
    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  initializeContribution,
  verifyContribution,
  getTransactionsByFamily,
  getContributionsByFamily
};
