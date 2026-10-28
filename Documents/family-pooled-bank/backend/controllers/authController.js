/**
 * OnePot Authentication & Family Membership Controller
 * Handles user login, parent registration with private family invite code generation,
 * member registration via validated invite codes, and asynchronous Nodemailer dispatch.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const dbState = require('../models/dbState');
const db = require('../models/db');
const emailService = require('../services/emailService');
const { sendPasswordResetEmail, sendWelcomeEmail, sendLoginAlert } = emailService;

/**
 * Generate a unique uppercase family invite code formatted like 'FAM-XXXXXX'
 * Uses Node's built-in cryptographic pseudo-random generator.
 */
function generateFamilyInviteCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const randomBytes = crypto.randomBytes(6);
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[randomBytes[i] % chars.length];
  }
  return `FAM-${suffix}`;
}

/**
 * Ensure uniqueness of the generated invite code against in-memory & active DB
 */
async function getUniqueInviteCode() {
  let code = generateFamilyInviteCode();
  let attempts = 0;

  while (attempts < 20) {
    const memoryHit = dbState.families.some(
      f => f.invite_code && f.invite_code.toUpperCase() === code
    );
    if (!memoryHit) {
      const dbHits = await db.query('SELECT id FROM families WHERE invite_code = ? LIMIT 1', [code]);
      if (!dbHits || dbHits.length === 0) {
        return code;
      }
    }
    code = generateFamilyInviteCode();
    attempts++;
  }
  return code;
}

/**
 * User Login
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password, user_id } = req.body;

    let user = null;
    if (user_id) {
      const dbUsers = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [Number(user_id)]);
      if (dbUsers && dbUsers.length > 0) {
        const row = dbUsers[0];
        user = {
          id: row.id,
          user_id: row.id,
          family_id: row.family_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          password_hash: row.password_hash,
          role: row.role,
          avatar: row.avatar_url || (row.role === 'parent' ? '👑' : '👤'),
          title: row.role === 'parent' ? 'Parent (Family Admin)' : 'Member (Family Contributor)'
        };
      }
    } else if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const dbUsers = await db.query('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [normalizedEmail]);
      if (dbUsers && dbUsers.length > 0) {
        const row = dbUsers[0];
        user = {
          id: row.id,
          user_id: row.id,
          family_id: row.family_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          password_hash: row.password_hash,
          role: row.role,
          avatar: row.avatar_url || (row.role === 'parent' ? '👑' : '👤'),
          title: row.role === 'parent' ? 'Parent (Family Admin)' : 'Member (Family Contributor)'
        };
      } else {
        // Fallback check memory if DB returned null (e.g. offline)
        user = dbState.users.find(u => u.email.toLowerCase() === normalizedEmail);
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found. Please check your email or create a family account.'
      });
    }

    // Verify Password dynamically: test bcrypt hash, then plaintext fallback for legacy test data
    let isValidPassword = false;
    if (user.password_hash) {
      try {
        isValidPassword = await bcrypt.compare(password, user.password_hash);
      } catch {
        isValidPassword = false;
      }
    }

    if (!isValidPassword && user.password) {
      isValidPassword = (password === user.password);
    }

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Please verify your credentials and try again.'
      });
    }

    // Resolve user's family dynamically from database
    let family = null;
    if (user.family_id) {
      const dbFamilies = await db.query('SELECT * FROM families WHERE id = ? LIMIT 1', [user.family_id]);
      if (dbFamilies && dbFamilies.length > 0) {
        family = dbFamilies[0];
      }
    }
    if (!family) {
      family = dbState.families.find(f => (f.id || f.family_id) === user.family_id);
    }

    if (!family) {
      return res.status(404).json({
        success: false,
        error: 'Family vault linked to this user account could not be found.'
      });
    }

    // Safe user payload (omit password hash)
    const { password_hash, password: userPlainPass, ...safeUser } = user;

    // Non-blocking asynchronous dispatch of ALAT-style Login Security Alert email
    try {
      sendLoginAlert(user, req).catch(err => {
        console.error('Failed to send login alert email:', err.message);
      });
    } catch (err) {
      console.error('Failed to send login alert email:', err.message);
    }

    res.json({
      success: true,
      message: `Welcome back, ${user.first_name}!`,
      user: safeUser,
      family
    });
  } catch (error) {
    console.error('[AUTH LOGIN ERROR]', error);
    res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
}

/**
 * Get Current Authenticated User & Family Session from DB
 * GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    const userId = req.query.user_id || req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User session not provided.' });
    }

    const dbUsers = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [Number(userId)]);
    if (!dbUsers || dbUsers.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found in database.' });
    }

    const row = dbUsers[0];
    const safeUser = {
      id: row.id,
      user_id: row.id,
      family_id: row.family_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      role: row.role,
      avatar: row.avatar_url || (row.role === 'parent' ? '👑' : '👤'),
      title: row.role === 'parent' ? 'Parent (Family Admin)' : 'Member (Family Contributor)'
    };

    let family = null;
    if (safeUser.family_id) {
      const dbFamilies = await db.query('SELECT * FROM families WHERE id = ? LIMIT 1', [safeUser.family_id]);
      if (dbFamilies && dbFamilies.length > 0) {
        family = dbFamilies[0];
      }
    }

    return res.json({ success: true, user: safeUser, family });
  } catch (error) {
    console.error('[AUTH GET ME ERROR]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 1. Parent Registration
 * POST /api/auth/register-parent
 * 
 * Process:
 * 1. Hashes password and creates the user with role = 'parent'.
 * 2. Generates a unique family invite code and creates the family in `families`.
 * 3. Inserts the parent into `family_members` as 'head'.
 * 4. Dispatches the welcome email via Nodemailer.
 */
async function registerParent(req, res) {
  try {
    const { 
      family_name, 
      familyName, 
      first_name, 
      firstName, 
      last_name, 
      lastName, 
      email, 
      password, 
      avatar 
    } = req.body;

    const resolvedFamilyName = (family_name || familyName || '').trim();
    const resolvedFirstName = (first_name || firstName || '').trim();
    const resolvedLastName = (last_name || lastName || '').trim();
    const resolvedEmail = (email || '').trim().toLowerCase();

    if (!resolvedFamilyName || !resolvedFirstName || !resolvedEmail || !password) {
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

    // Check if email already exists in memory or MySQL
    const existingMemoryUser = dbState.users.find(u => u.email.toLowerCase() === resolvedEmail);
    if (existingMemoryUser) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    const dbExisting = await db.query('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [resolvedEmail]);
    if (dbExisting && dbExisting.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    // 1. Hashes password and prepares user with role = 'parent'
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 2. Generates a unique family invite code formatted like 'FAM-XXXXXX'
    const inviteCode = await getUniqueInviteCode();

    // ID allocations
    const newUserId = dbState.users.length > 0 
      ? Math.max(...dbState.users.map(u => u.id || u.user_id || 0)) + 1 
      : 1;

    const newFamilyId = dbState.families.length > 0 
      ? Math.max(...dbState.families.map(f => f.id || f.family_id || 0)) + 1 
      : 1;

    const newMemberId = (dbState.family_members && dbState.family_members.length > 0)
      ? Math.max(...dbState.family_members.map(m => m.id || 0)) + 1
      : 1;

    // Create user object
    const newUser = {
      id: newUserId,
      user_id: newUserId,
      family_id: newFamilyId,
      first_name: resolvedFirstName,
      last_name: resolvedLastName,
      email: resolvedEmail,
      password, // for mock local reference
      password_hash: passwordHash,
      role: 'parent',
      avatar: avatar || '👑',
      title: 'Parent (Family Head)',
      created_at: new Date().toISOString()
    };

    // Create family object with created_by = user.id
    const newFamily = {
      id: newFamilyId,
      family_id: newFamilyId,
      family_name: resolvedFamilyName,
      invite_code: inviteCode,
      created_by: newUserId,
      total_pot_balance: 0.00,
      emergency_fund_balance: 0.00,
      auto_save_percentage: 5,
      created_at: new Date().toISOString().split('T')[0]
    };

    // 3. Insert parent into family_members as 'head'
    const newMemberRecord = {
      id: newMemberId,
      family_id: newFamilyId,
      user_id: newUserId,
      role_in_family: 'head',
      joined_at: new Date().toISOString()
    };

    // Update in-memory state
    dbState.users.push(newUser);
    dbState.families.push(newFamily);
    if (!dbState.family_members) dbState.family_members = [];
    dbState.family_members.push(newMemberRecord);

    // Seed default smart bowls for the new family in memory
    const defaultBowls = [
      { id: dbState.bowls.length + 1, family_id: newFamilyId, category_name: 'House Rent', allocated_amount: 0, spent_amount: 0, priority_level: 'High' },
      { id: dbState.bowls.length + 2, family_id: newFamilyId, category_name: 'Food & Groceries', allocated_amount: 0, spent_amount: 0, priority_level: 'High' },
      { id: dbState.bowls.length + 3, family_id: newFamilyId, category_name: 'School Fees', allocated_amount: 0, spent_amount: 0, priority_level: 'High' },
      { id: dbState.bowls.length + 4, family_id: newFamilyId, category_name: 'Utilities & Power', allocated_amount: 0, spent_amount: 0, priority_level: 'Medium' }
    ];
    dbState.bowls.push(...defaultBowls);

    // Save to active MySQL database if available
    try {
      const userInsert = await db.query(
        'INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [newUser.first_name, newUser.last_name, newUser.email, newUser.password_hash, 'parent']
      );
      const insertedUserId = userInsert?.insertId || newUserId;

      const familyInsert = await db.query(
        'INSERT INTO families (family_name, invite_code, created_by, total_pot_balance, emergency_fund_balance) VALUES (?, ?, ?, 0.00, 0.00)',
        [newFamily.family_name, newFamily.invite_code, insertedUserId]
      );
      const insertedFamilyId = familyInsert?.insertId || newFamilyId;

      await db.query('UPDATE users SET family_id = ? WHERE id = ?', [insertedFamilyId, insertedUserId]);

      await db.query(
        'INSERT INTO family_members (family_id, user_id, role_in_family) VALUES (?, ?, ?)',
        [insertedFamilyId, insertedUserId, 'head']
      );

      // Align IDs if MySQL returned autoincrement
      newUser.id = insertedUserId;
      newUser.user_id = insertedUserId;
      newUser.family_id = insertedFamilyId;
      newFamily.id = insertedFamilyId;
      newFamily.family_id = insertedFamilyId;
      newFamily.created_by = insertedUserId;
      newMemberRecord.family_id = insertedFamilyId;
      newMemberRecord.user_id = insertedUserId;
    } catch (dbErr) {
      console.warn('[DB MYSQL MIRROR NOTICE]', dbErr.message);
    }

    // 4. Dispatches the welcome email via Nodemailer
    try {
      sendWelcomeEmail(newUser).catch(err => {
        console.error('Failed to send welcome email:', err.message);
      });
    } catch (err) {
      console.error('Failed to send welcome email:', err.message);
    }

    console.log(`[AUTH REGISTER-PARENT] Registered parent "${newUser.email}" for family "${newFamily.family_name}" (Invite: ${inviteCode})`);

    return res.status(201).json({
      success: true,
      message: `Parent account and Family Vault "${newFamily.family_name}" created successfully! Invite code: ${inviteCode}`,
      user: newUser,
      family: newFamily,
      invite_code: inviteCode
    });
  } catch (error) {
    console.error('[AUTH REGISTER-PARENT ERROR]', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during parent registration.'
    });
  }
}

/**
 * 2. Member Registration
 * POST /api/auth/register-member
 * 
 * Process:
 * 1. Validates the invite_code.
 * 2. Registers the new user with role = 'member'.
 * 3. Links the user to `family_members` under that `family_id`.
 * 4. Dispatches the welcome email via Nodemailer.
 */
async function registerMember(req, res) {
  try {
    const { 
      invite_code, 
      inviteCode, 
      first_name, 
      firstName, 
      last_name, 
      lastName, 
      email, 
      password, 
      role_in_family, 
      avatar 
    } = req.body;

    const rawInviteCode = (invite_code || inviteCode || '').trim().toUpperCase();
    const resolvedFirstName = (first_name || firstName || '').trim();
    const resolvedLastName = (last_name || lastName || '').trim();
    const resolvedEmail = (email || '').trim().toLowerCase();

    if (!rawInviteCode) {
      return res.status(400).json({
        success: false,
        error: 'A valid family invite code is required to register as a family member.'
      });
    }

    if (!resolvedFirstName || !resolvedEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'First name, Email, and Password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    // 1. Validates the invite_code
    let family = dbState.families.find(
      f => f.invite_code && f.invite_code.toUpperCase() === rawInviteCode
    );

    if (!family) {
      const dbFamilies = await db.query(
        'SELECT * FROM families WHERE UPPER(invite_code) = ? LIMIT 1',
        [rawInviteCode]
      );
      if (dbFamilies && dbFamilies.length > 0) {
        family = dbFamilies[0];
        if (!dbState.families.some(f => (f.id || f.family_id) === (family.id || family.family_id))) {
          dbState.families.push(family);
        }
      }
    }

    if (!family) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired family invite code. Registration without a valid family invite code is blocked.'
      });
    }

    // Check if email already registered
    const existingMemoryUser = dbState.users.find(u => u.email.toLowerCase() === resolvedEmail);
    if (existingMemoryUser) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    const dbExisting = await db.query('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [resolvedEmail]);
    if (dbExisting && dbExisting.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    // 2. Hashes password and registers new user with role = 'member'
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const familyId = family.id || family.family_id;
    const newUserId = dbState.users.length > 0 
      ? Math.max(...dbState.users.map(u => u.id || u.user_id || 0)) + 1 
      : 1;

    const newMemberId = (dbState.family_members && dbState.family_members.length > 0)
      ? Math.max(...dbState.family_members.map(m => m.id || 0)) + 1
      : 1;

    // Map role in family: 'child' or 'spouse', default 'child'
    const validRoleInFamily = (role_in_family === 'spouse' || role_in_family === 'head') 
      ? role_in_family 
      : 'child';

    const newUser = {
      id: newUserId,
      user_id: newUserId,
      family_id: familyId,
      first_name: resolvedFirstName,
      last_name: resolvedLastName,
      email: resolvedEmail,
      password, // for mock local reference
      password_hash: passwordHash,
      role: 'member',
      avatar: avatar || (validRoleInFamily === 'spouse' ? '🛡️' : '👤'),
      title: validRoleInFamily === 'spouse' ? 'Spouse (Family Member)' : 'Child (Family Member)',
      created_at: new Date().toISOString()
    };

    // 3. Links the user to `family_members` under that `family_id`
    const newMemberRecord = {
      id: newMemberId,
      family_id: familyId,
      user_id: newUserId,
      role_in_family: validRoleInFamily,
      joined_at: new Date().toISOString()
    };

    // Update in-memory state
    dbState.users.push(newUser);
    if (!dbState.family_members) dbState.family_members = [];
    dbState.family_members.push(newMemberRecord);

    // Save to active MySQL database if available
    try {
      const userInsert = await db.query(
        'INSERT INTO users (family_id, first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
        [familyId, newUser.first_name, newUser.last_name, newUser.email, newUser.password_hash, 'member']
      );
      const insertedUserId = userInsert?.insertId || newUserId;

      await db.query(
        'INSERT INTO family_members (family_id, user_id, role_in_family) VALUES (?, ?, ?)',
        [familyId, insertedUserId, validRoleInFamily]
      );

      newUser.id = insertedUserId;
      newUser.user_id = insertedUserId;
      newMemberRecord.user_id = insertedUserId;
    } catch (dbErr) {
      console.warn('[DB MYSQL MIRROR NOTICE]', dbErr.message);
    }

    // 4. Dispatches the welcome email via Nodemailer
    try {
      sendWelcomeEmail(newUser).catch(err => {
        console.error('Failed to send welcome email:', err.message);
      });
    } catch (err) {
      console.error('Failed to send welcome email:', err.message);
    }

    console.log(`[AUTH REGISTER-MEMBER] ${newUser.first_name} registered as member of "${family.family_name}" (${validRoleInFamily})`);

    return res.status(201).json({
      success: true,
      message: `Welcome to the ${family.family_name} vault!`,
      user: newUser,
      family
    });
  } catch (error) {
    console.error('[AUTH REGISTER-MEMBER ERROR]', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during member registration.'
    });
  }
}

/**
 * Backward compatibility: registerFamily alias to registerParent
 */
const registerFamily = registerParent;

/**
 * Backward compatibility: joinFamily alias to registerMember
 */
async function joinFamily(req, res) {
  if (req.body.invite_code) {
    return registerMember(req, res);
  }
  // If joined by family_id directly from legacy demo
  const { family_id, first_name, last_name, email, password, role, avatar } = req.body;
  const family = dbState.families.find(f => (f.id || f.family_id) === Number(family_id));
  if (!family) {
    return res.status(404).json({ success: false, error: 'Family not found.' });
  }
  req.body.invite_code = family.invite_code;
  return registerMember(req, res);
}

/**
 * Request Password Reset (Forgot Password)
 * POST /api/auth/forgot-password
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
      const resetOtp = String(Math.floor(100000 + Math.random() * 900000));
      const resetToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const expiresAt = Date.now() + 15 * 60 * 1000;

      user.reset_otp = resetOtp;
      user.reset_token = resetToken;
      user.reset_expires = expiresAt;

      sendPasswordResetEmail({
        to: user.email,
        firstName: user.first_name,
        resetOtp,
        resetLink: `${process.env.APP_URL || 'http://localhost:5173'}?token=${resetToken}`,
        expiresMinutes: 15
      }).catch(err => {
        console.error('[AUTH FORGOT PASSWORD EMAIL ERROR]', err.message);
      });
    }

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
  generateFamilyInviteCode,
  login,
  getMe,
  registerParent,
  registerMember,
  registerFamily,
  joinFamily,
  forgotPassword,
  emailService,
  SMTPNotificationService: emailService
};
