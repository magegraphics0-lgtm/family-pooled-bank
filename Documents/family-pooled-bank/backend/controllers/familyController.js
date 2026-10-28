/**
 * OnePot Family Controller
 * Handles family invite code verification and family details.
 * Queries active MySQL database directly.
 */

const dbState = require('../models/dbState');
const db = require('../models/db');

/**
 * Verify Family Invite Code
 * GET /api/family/verify-invite/:code
 * Returns { valid: true, family_name, family_id, invite_code } or 404 error
 */
async function verifyInvite(req, res) {
  try {
    const rawCode = req.params.code;
    if (!rawCode || !rawCode.trim()) {
      return res.status(404).json({
        valid: false,
        error: 'Invite code is required.'
      });
    }

    const code = rawCode.trim().toUpperCase();

    // 1. Query active MySQL database first
    const rows = await db.query(
      'SELECT id, family_name, invite_code FROM families WHERE UPPER(invite_code) = ? LIMIT 1',
      [code]
    );

    let family = rows && rows.length > 0 ? rows[0] : null;

    // 2. Fallback check memory if DB offline
    if (!family) {
      family = dbState.families.find(f => 
        f.invite_code && f.invite_code.toUpperCase() === code
      );
    }

    if (!family) {
      return res.status(404).json({
        valid: false,
        error: 'Invalid or expired family invite code. Please request a new invite link from your household head.'
      });
    }

    return res.json({
      valid: true,
      family_name: family.family_name,
      family_id: family.id || family.family_id,
      invite_code: family.invite_code
    });
  } catch (error) {
    console.error('[VERIFY INVITE ERROR]', error);
    return res.status(500).json({
      valid: false,
      error: 'Internal server error verifying invite code.'
    });
  }
}

/**
 * Get Family Details
 * GET /api/family/:id
 */
async function getFamily(req, res) {
  try {
    const familyId = Number(req.params.id);
    if (!familyId) {
      return res.status(400).json({ success: false, error: 'Family ID is required.' });
    }

    const rows = await db.query('SELECT * FROM families WHERE id = ? LIMIT 1', [familyId]);
    let family = rows && rows.length > 0 ? rows[0] : null;

    if (!family) {
      family = dbState.families.find(f => (f.id || f.family_id) === familyId);
    }

    if (!family) {
      return res.status(404).json({ success: false, error: 'Family not found.' });
    }

    return res.json({ success: true, data: family });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  verifyInvite,
  getFamily
};
