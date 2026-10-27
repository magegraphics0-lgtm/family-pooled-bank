/**
 * OnePot Authentication Controller
 * Handles user login, family registration with invite codes, joining families,
 * and asynchronous Nodemailer notification dispatch.
 */

const dbState = require('../models/dbState');
const emailService = require('../services/emailService');
const { sendPasswordResetEmail } = emailService;

/**
 * User Login
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password, user_id } = req.body;

    let user = null;
    if (user_id) {
      user = dbState.users.find(u => u.user_id === Number(user_id));
    } else if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      user = dbState.users.find(u => 
        u.email.toLowerCase() === normalizedEmail ||
        (normalizedEmail === 'demo@familybank.com' && u.email === 'parent@onepot.app') ||
        (normalizedEmail === 'emeka@onepot.app' && u.email === 'parent@onepot.app') ||
        (normalizedEmail === 'child@familybank.com' && u.email === 'child@onepot.app') ||
        (normalizedEmail === 'tobi@onepot.app' && u.email === 'child@onepot.app')
      );
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found. Please check your email or create a family account.'
      });
    }

    const isValidPassword = 
      (user.password && password === user.password) ||
      (user.email === 'parent@onepot.app' && (password === 'ParentPassword123!' || password === 'demo1234')) ||
      (user.email === 'child@onepot.app' && (password === 'ChildPassword123!' || password === 'demo1234'));

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Please verify your credentials and try again.'
      });
    }

    const family = dbState.families.find(f => f.family_id === user.family_id) || {
      family_id: user.family_id,
      family_name: 'The Household',
      invite_code: 'POT-HOUSEHOLD-2026'
    };

    // Non-blocking asynchronous dispatch of ALAT-style Login Security Alert email strictly to inbox
    try {
      emailService.sendLoginAlert(user, req);
    } catch (err) {
      console.error('Failed to send login alert email:', err.message);
    }

    res.json({
      success: true,
      message: `Welcome back, ${user.first_name}!`,
      user,
      family
    });
  } catch (error) {
    console.error('[AUTH LOGIN ERROR]', error);
    res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
}

/**
 * Register New Family Account & Custodian/Admin
 * POST /api/auth/register-family
 */
async function registerFamily(req, res) {
  try {
    const { family_name, first_name, last_name, email, password, role, avatar } = req.body;

    if (!family_name || !first_name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Family name, First name, Email, and Password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    const existingUser = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    // Generate unique family invite code
    const cleanFamilySlug = family_name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'FAMILY';
    const inviteCode = `POT-${cleanFamilySlug}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newFamilyId = dbState.families.length > 0 ? Math.max(...dbState.families.map(f => f.family_id)) + 1 : 1;
    const newFamily = {
      family_id: newFamilyId,
      family_name,
      invite_code: inviteCode,
      total_pot_balance: 0.00,
      emergency_fund_balance: 0.00,
      auto_save_percentage: 5,
      created_at: new Date().toISOString().split('T')[0]
    };
    dbState.families.push(newFamily);

    const newUserId = dbState.users.length > 0 ? Math.max(...dbState.users.map(u => u.user_id)) + 1 : 1;
    const newUser = {
      user_id: newUserId,
      family_id: newFamilyId,
      first_name,
      last_name: last_name || '',
      email,
      password,
      role: role || 'parent',
      avatar: avatar || '👑',
      title: role === 'child' ? 'Child (Member)' : 'Parent (Family Admin)'
    };
    dbState.users.push(newUser);

    // Seed default smart bowls for the new family
    const defaultBowls = [
      { id: dbState.bowls.length + 1, family_id: newFamilyId, category_name: 'House Rent', allocated_amount: 0, spent_amount: 0, priority_level: 'High' },
      { id: dbState.bowls.length + 2, family_id: newFamilyId, category_name: 'Food & Groceries', allocated_amount: 0, spent_amount: 0, priority_level: 'High' },
      { id: dbState.bowls.length + 3, family_id: newFamilyId, category_name: 'School Fees', allocated_amount: 0, spent_amount: 0, priority_level: 'High' },
      { id: dbState.bowls.length + 4, family_id: newFamilyId, category_name: 'Utilities & Power', allocated_amount: 0, spent_amount: 0, priority_level: 'Medium' }
    ];
    dbState.bowls.push(...defaultBowls);

    // Attempt email dispatch asynchronously without blocking response
    try {
      emailService.sendWelcomeEmail(newUser).catch(err => {
        console.error('Failed to send welcome email:', err.message);
      });
    } catch (err) {
      console.error('Failed to send welcome email:', err.message);
    }

    console.log(`[AUTH REGISTER] Registered family "${newFamily.family_name}" (Invite: ${inviteCode}) with admin ${newUser.email}`);

    res.json({
      success: true,
      message: `Family Account "${newFamily.family_name}" created successfully! Invite code: ${inviteCode}`,
      user: newUser,
      family: newFamily
    });
  } catch (error) {
    console.error('[AUTH REGISTER ERROR]', error);
    res.status(500).json({ success: false, error: 'Internal server error during family registration.' });
  }
}

/**
 * Join Existing Family Pot via Invite Code or Family ID
 * POST /api/auth/join-family
 */
async function joinFamily(req, res) {
  try {
    const { invite_code, family_id, first_name, last_name, email, password, role, avatar } = req.body;

    if (!first_name || !email || !password) {
      return res.status(400).json({ success: false, error: 'First name, Email, and Password are required.' });
    }

    let family = null;
    if (invite_code) {
      family = dbState.families.find(f => f.invite_code && f.invite_code.toUpperCase() === invite_code.trim().toUpperCase());
    }
    if (!family && family_id) {
      family = dbState.families.find(f => f.family_id === Number(family_id));
    }

    if (!family) {
      return res.status(404).json({
        success: false,
        error: 'Invalid family invite code or family ID. Please check with your household admin.'
      });
    }

    const existingUser = dbState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists. Please log in.'
      });
    }

    const newUserId = dbState.users.length > 0 ? Math.max(...dbState.users.map(u => u.user_id)) + 1 : 1;
    const assignedRole = role || 'child';
    const newUser = {
      user_id: newUserId,
      family_id: family.family_id,
      first_name,
      last_name: last_name || '',
      email,
      password,
      role: assignedRole,
      avatar: avatar || (assignedRole === 'parent' ? '🛡️' : '🧑‍🎓'),
      title: assignedRole === 'parent' ? 'Parent (Co-Manager)' : 'Child (Contributor)'
    };
    dbState.users.push(newUser);

    // Attempt email dispatch asynchronously without blocking response
    try {
      emailService.sendWelcomeEmail(newUser).catch(err => {
        console.error('Failed to send welcome email:', err.message);
      });
    } catch (err) {
      console.error('Failed to send welcome email:', err.message);
    }

    console.log(`[AUTH JOIN] ${newUser.first_name} joined family "${family.family_name}" (${assignedRole})`);

    res.json({
      success: true,
      message: `Welcome to the ${family.family_name} pot!`,
      user: newUser,
      family
    });
  } catch (error) {
    console.error('[AUTH JOIN ERROR]', error);
    res.status(500).json({ success: false, error: 'Internal server error while joining family.' });
  }
}

/**
 * Request Password Reset (Forgot Password)
 * POST /api/auth/forgot-password
 * Asynchronously triggers Nodemailer to send OTP/link and prevents email enumeration.
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = dbState.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (user) {
      // Generate 6-digit OTP and reset token
      const resetOtp = String(Math.floor(100000 + Math.random() * 900000));
      const resetToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

      user.reset_otp = resetOtp;
      user.reset_token = resetToken;
      user.reset_expires = expiresAt;

      // Non-blocking asynchronous dispatch of password reset email
      sendPasswordResetEmail({
        to: user.email,
        firstName: user.first_name,
        resetOtp,
        resetLink: `${process.env.APP_URL || 'http://localhost:5173'}?token=${resetToken}`,
        expiresMinutes: 15
      }).catch(err => {
        console.error('[AUTH FORGOT PASSWORD EMAIL ERROR] Failed to dispatch reset email:', err.message);
      });

      console.log(`[AUTH FORGOT PASSWORD] Generated OTP ${resetOtp} for user ${user.email} (Expires in 15 mins)`);
    } else {
      console.log(`[AUTH FORGOT PASSWORD] Reset requested for non-registered email "${cleanEmail}" (Silent handling to prevent enumeration)`);
    }

    // Always respond with a generic success message to prevent email enumeration
    return res.json({
      success: true,
      message: 'If an account exists for this email address, you will receive password reset instructions shortly.'
    });
  } catch (error) {
    console.error('[AUTH FORGOT PASSWORD ERROR]', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while processing your request. Please try again later.'
    });
  }
}

module.exports = {
  login,
  registerFamily,
  joinFamily,
  forgotPassword,
  emailService,
  SMTPNotificationService: emailService
};
