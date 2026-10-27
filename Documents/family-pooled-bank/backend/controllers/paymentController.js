/**
 * OnePot Paystack Contribution Payment Controller
 * Handles initialization, verification, pot balance credit, 5% auto-save diversion,
 * and asynchronous confirmation email dispatch to parents.
 * Closed-loop mock banking ledger academic demonstration.
 */

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

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid contribution amount greater than ₦0.'
      });
    }

    const family = dbState.families.find(f => f.family_id === Number(family_id || 1));
    if (!family) {
      return res.status(404).json({ success: false, error: 'Family pot account not found.' });
    }

    const member = dbState.users.find(u => u.user_id === Number(member_id)) || dbState.users[0];
    const reference = `onepot_pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let authorization_url = `https://checkout.paystack.com/sandbox-mock-${reference}`;
    let access_code = `acc_${reference}`;
    let isLivePaystack = false;

    // Check if live or test Paystack secret key is provided (starts with sk_test_ or sk_live_ and not placeholder)
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
            amount: Math.round(Number(amount) * 100), // kobo
            reference,
            callback_url: `${process.env.APP_URL || 'http://localhost:5173'}?paystack_ref=${reference}`,
            metadata: {
              family_id: family.family_id,
              member_id: member.user_id,
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

    // Record pending transaction
    const newTx = {
      id: dbState.paystack_transactions.length + 1,
      family_id: family.family_id,
      member_id: member.user_id,
      reference,
      amount: Number(amount),
      status: 'pending',
      source_note: source_note || 'Family Pot Contribution',
      access_code,
      authorization_url,
      created_at: new Date().toISOString()
    };
    dbState.paystack_transactions.push(newTx);

    console.log(`[PAYSTACK INIT] Created contribution transaction ${reference} for ₦${amount} (${family.family_name})`);

    res.json({
      success: true,
      message: 'Paystack contribution initialized successfully',
      data: {
        reference,
        access_code,
        authorization_url,
        amount: Number(amount),
        currency: 'NGN',
        public_key: PAYSTACK_PUBLIC,
        family_id: family.family_id,
        member_id: member.user_id,
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

    // Check if transaction was already recorded as success
    const existingContribution = dbState.contributions.find(c => c.paystack_ref === reference);
    if (existingContribution) {
      const family = dbState.families.find(f => f.family_id === existingContribution.family_id) || dbState.families[0];
      return res.json({
        success: true,
        message: 'Transaction already verified and allocated to pot.',
        data: {
          reference,
          amount: existingContribution.amount,
          total_pot_balance: family.total_pot_balance,
          emergency_fund_balance: family.emergency_fund_balance,
          disclaimer: ACADEMIC_DISCLAIMER
        }
      });
    }

    // Lookup pending transaction or construct from request payload
    let tx = dbState.paystack_transactions.find(t => t.reference === reference);
    let finalAmount = tx ? tx.amount : Number(amount || 0);
    let finalFamilyId = tx ? tx.family_id : Number(family_id || 1);
    let finalMemberId = tx ? tx.member_id : Number(member_id || 1);
    let finalNote = tx ? tx.source_note : (source_note || 'OnePot Family Contribution');

    // Attempt Paystack API verification if secret key is present and live
    if (PAYSTACK_SECRET && !PAYSTACK_SECRET.includes('mock_onepot') && PAYSTACK_SECRET.startsWith('sk_')) {
      try {
        const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`
          }
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
      finalAmount = 25000; // default academic test fallback
    }

    const family = dbState.families.find(f => f.family_id === finalFamilyId) || dbState.families[0];
    const member = dbState.users.find(u => u.user_id === finalMemberId) || dbState.users[0];

    // 1. Mark transaction as success in paystack_transactions
    if (tx) {
      tx.status = 'success';
      tx.verified_at = new Date().toISOString();
    } else {
      dbState.paystack_transactions.push({
        id: dbState.paystack_transactions.length + 1,
        family_id: family.family_id,
        member_id: member.user_id,
        reference,
        amount: finalAmount,
        status: 'success',
        source_note: finalNote,
        created_at: new Date().toISOString(),
        verified_at: new Date().toISOString()
      });
    }

    // 2. Record in contributions table
    const newContribution = {
      id: dbState.contributions.length + 1,
      family_id: family.family_id,
      member_id: member.user_id,
      amount: finalAmount,
      source_note: finalNote,
      paystack_ref: reference,
      created_at: new Date().toISOString()
    };
    dbState.contributions.push(newContribution);

    // 3. Automatically update families.total_pot_balance
    family.total_pot_balance = (family.total_pot_balance || 0) + finalAmount;

    // 4. Trigger 5% Auto-Save allocation into emergency_fund_balance if enabled
    const autoSavePercent = family.auto_save_percentage !== undefined ? family.auto_save_percentage : 5;
    let autoSaveAmount = 0;
    if (autoSavePercent > 0) {
      autoSaveAmount = finalAmount * (autoSavePercent / 100);
      family.emergency_fund_balance = (family.emergency_fund_balance || 0) + autoSaveAmount;
    }

    // 5. In-app notification
    dbState.notifications.push({
      id: dbState.notifications.length + 1,
      notification_id: dbState.notifications.length + 1,
      family_id: family.family_id,
      user_id: member.user_id,
      message: `₦${finalAmount.toLocaleString()} added to pot by ${member.first_name} (${finalNote}).`,
      type: 'contribution',
      is_read: false,
      sent_at: new Date().toISOString()
    });

    console.log(`[POT CREDITED] ₦${finalAmount} added to ${family.family_name}. New Pot Balance: ₦${family.total_pot_balance}. Auto-Save (5%): +₦${autoSaveAmount}.`);

    // 6. Asynchronously dispatch Contribution Confirmation Email to family parents (Non-blocking)
    const parents = dbState.users.filter(u => u.family_id === family.family_id && u.role === 'parent');
    parents.forEach(p => {
      sendContributionConfirmationEmail({
        to: p.email,
        contributorName: `${member.first_name} ${member.last_name}`,
        amount: finalAmount,
        sourceNote: finalNote,
        reference,
        totalPotBalance: family.total_pot_balance,
        autoSaveAmount,
        emergencyFundBalance: family.emergency_fund_balance,
        familyName: family.family_name
      }).catch(emailErr => {
        console.error('[CONTRIBUTION EMAIL ERROR] Failed to dispatch contribution email to', p.email, emailErr.message);
      });
    });

    return res.json({
      success: true,
      message: 'Contribution verified successfully and allocated to family pot.',
      data: {
        reference,
        amount: finalAmount,
        contributor: `${member.first_name} ${member.last_name}`,
        total_pot_balance: family.total_pot_balance,
        emergency_fund_balance: family.emergency_fund_balance,
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
function getTransactionsByFamily(req, res) {
  const familyId = Number(req.params.family_id || 1);
  const txs = dbState.paystack_transactions.filter(t => t.family_id === familyId);
  res.json({ success: true, count: txs.length, data: txs });
}

/**
 * 4. List Contributions
 * GET /api/payments/contributions/:family_id
 */
function getContributionsByFamily(req, res) {
  const familyId = Number(req.params.family_id || 1);
  const contributions = dbState.contributions
    .filter(c => c.family_id === familyId)
    .map(c => {
      const member = dbState.users.find(u => u.user_id === c.member_id);
      return {
        ...c,
        contributor_name: member ? `${member.first_name} ${member.last_name}` : 'Family Member',
        avatar: member?.avatar || '👤',
        role: member?.role || 'child'
      };
    });
  res.json({ success: true, count: contributions.length, data: contributions });
}

module.exports = {
  initializeContribution,
  verifyContribution,
  getTransactionsByFamily,
  getContributionsByFamily
};
