import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  CookingPot, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Key, 
  ArrowLeft,
  Sun,
  Moon,
  Sparkles,
  Users
} from 'lucide-react';
import { db } from '../services/db';

export default function RegisterPage({ 
  onRegisterSuccess, 
  onNavigateToLogin, 
  onNavigateToParentRegister,
  onBackToLanding,
  theme = 'light',
  onToggleTheme
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteFromUrl = searchParams.get('invite') || '';

  // Invite state
  const [inviteInput, setInviteInput] = useState(inviteFromUrl);
  const [verificationStatus, setVerificationStatus] = useState('idle'); // 'idle' | 'verifying' | 'valid' | 'invalid'
  const [familyName, setFamilyName] = useState('');
  const [familyId, setFamilyId] = useState(null);
  const [verifiedCode, setVerifiedCode] = useState('');
  const [verifyError, setVerifyError] = useState('');

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [roleInFamily, setRoleInFamily] = useState('child'); // 'child' | 'spouse'
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submission states
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Function to verify invite code via backend GET /api/family/verify-invite/:code
  const verifyCode = useCallback(async (codeToVerify) => {
    if (!codeToVerify || !codeToVerify.trim()) {
      setVerificationStatus('invalid');
      setFamilyName('');
      setFamilyId(null);
      setVerifiedCode('');
      setVerifyError('A family invite code is required to register as a household member.');
      return;
    }

    const cleanCode = codeToVerify.trim().toUpperCase();
    setVerificationStatus('verifying');
    setVerifyError('');

    try {
      // First attempt backend verification endpoint
      const response = await fetch(`http://localhost:5000/api/family/verify-invite/${encodeURIComponent(cleanCode)}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setVerificationStatus('valid');
        setFamilyName(data.family_name || 'Family');
        setFamilyId(data.family_id);
        setVerifiedCode(cleanCode);
        setVerifyError('');
      } else {
        // Fallback to local DB check
        const localCheck = await db.verifyInviteCode(cleanCode);
        if (localCheck.valid) {
          setVerificationStatus('valid');
          setFamilyName(localCheck.family_name || 'Family');
          setFamilyId(localCheck.family_id);
          setVerifiedCode(cleanCode);
          setVerifyError('');
        } else {
          setVerificationStatus('invalid');
          setFamilyName('');
          setFamilyId(null);
          setVerifiedCode('');
          setVerifyError(data.error || 'Invalid or expired family invite code. Registration is blocked.');
        }
      }
    } catch {
      // Offline fallback
      try {
        const localCheck = await db.verifyInviteCode(cleanCode);
        if (localCheck.valid) {
          setVerificationStatus('valid');
          setFamilyName(localCheck.family_name || 'Family');
          setFamilyId(localCheck.family_id);
          setVerifiedCode(cleanCode);
          setVerifyError('');
        } else {
          setVerificationStatus('invalid');
          setFamilyName('');
          setFamilyId(null);
          setVerifiedCode('');
          setVerifyError('Invalid family invite code. Please request a new invite link from your parent admin.');
        }
      } catch (err) {
        setVerificationStatus('invalid');
        setFamilyName('');
        setFamilyId(null);
        setVerifiedCode('');
        setVerifyError(err.message || 'Invalid or expired family invite code.');
      }
    }
  }, []);

  // Automatically verify on initial component load or when invite parameter changes
  useEffect(() => {
    if (inviteFromUrl) {
      setInviteInput(inviteFromUrl);
      verifyCode(inviteFromUrl);
    } else {
      setVerificationStatus('invalid');
      setVerifyError('No invite code provided in link. A valid private family invite code is required to register.');
    }
  }, [inviteFromUrl, verifyCode]);

  // Handle manual invite code verification check
  const handleManualVerify = (e) => {
    e.preventDefault();
    if (!inviteInput.trim()) {
      setVerifyError('Please enter a family invite code.');
      setVerificationStatus('invalid');
      return;
    }
    // Update URL search param
    setSearchParams({ invite: inviteInput.trim().toUpperCase() });
    verifyCode(inviteInput.trim().toUpperCase());
  };

  // Handle member registration form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Hard block if verification is not valid
    if (verificationStatus !== 'valid' || !verifiedCode) {
      setFormError('Registration blocked: A verified family invite code is required to join a household.');
      return;
    }

    if (!firstName.trim()) {
      setFormError('Please enter your first name.');
      return;
    }

    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }

    if (!password) {
      setFormError('Please create a secure password.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter your password confirmation.');
      return;
    }

    setSubmitting(true);

    try {
      // Call backend POST /api/auth/register-member
      let registerResult = null;
      try {
        const res = await fetch('http://localhost:5000/api/auth/register-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invite_code: verifiedCode,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim().toLowerCase(),
            password,
            role_in_family: roleInFamily
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          registerResult = data;
        } else {
          throw new Error(data.error || 'Failed to complete member registration.');
        }
      } catch (backendErr) {
        if (backendErr.message && !backendErr.message.includes('fetch')) {
          throw backendErr;
        }
        // Fallback to local DB registration
        registerResult = await db.registerMember({
          inviteCode: verifiedCode,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          password,
          roleInFamily
        });
      }

      setSuccessMessage(`Welcome! You have successfully joined the ${familyName} pot.`);
      
      // Store session and navigate to dashboard
      const user = registerResult.user;
      const family = registerResult.family || { family_name: familyName, id: familyId };
      db.setCurrentSession(user, family);

      setTimeout(() => {
        setSubmitting(false);
        if (onRegisterSuccess) {
          onRegisterSuccess(user, family);
        }
      }, 1000);
    } catch (err) {
      setSubmitting(false);
      setFormError(err.message || 'An error occurred during registration. Please try again.');
    }
  };

  const isSubmitDisabled = verificationStatus !== 'valid' || submitting;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      color: 'var(--text-main)',
      transition: 'background-color 0.25s ease, color 0.25s ease',
      padding: '1.25rem'
    }}>
      {/* Top Floating Navigation Bar */}
      <div style={{
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 0'
      }}>
        <button
          type="button"
          onClick={onBackToLanding || (() => window.location.href = '/')}
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.45rem 0.85rem',
            fontSize: '0.825rem',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>

        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem' }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} color="#f59e0b" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon size={15} color="#475569" />
                <span>Dark</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Registration Card */}
      <div style={{
        maxWidth: '500px',
        width: '100%',
        margin: '1.5rem auto',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        padding: '2.25rem 2rem',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.25s ease'
      }}>
        {/* Brand Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            margin: '0 auto 0.75rem auto',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 8px 18px rgba(16, 185, 129, 0.35)'
          }}>
            <CookingPot size={28} />
          </div>

          <h2 style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            color: 'var(--text-main)',
            margin: '0 0 0.3rem 0',
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-0.03em'
          }}>
            Family Member Registration
          </h2>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0 }}>
            Join your family vault and collaborate on pooled budgets
          </p>
        </div>

        {/* ============================================================ */}
        {/* INVITE STATUS BANNER (VALID vs INVALID / MISSING) */}
        {/* ============================================================ */}

        {/* CASE 1: VERIFYING IN PROGRESS */}
        {verificationStatus === 'verifying' && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '12px',
            padding: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.825rem',
            color: '#3b82f6'
          }}>
            <div className="spinner" style={{
              width: '18px',
              height: '18px',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <span>Verifying family invite code <strong>{inviteInput}</strong>...</span>
          </div>
        )}

        {/* CASE 2: VALID CODE - Display "Joining the [Family Name] Family" */}
        {verificationStatus === 'valid' && (
          <div 
            id="verified-family-banner"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '14px',
              padding: '1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                background: '#10b981',
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0
              }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Verified Private Invitation
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
                  Joining the <span style={{ color: '#10b981' }}>{familyName}</span> Family
                </div>
              </div>
            </div>

            <div style={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#059669',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              {verifiedCode}
            </div>
          </div>
        )}

        {/* CASE 3: INVALID OR MISSING CODE - Display Warning Banner */}
        {verificationStatus === 'invalid' && (
          <div 
            id="invalid-invite-warning"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '14px',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444' }}>
                  Private Family Invite Required
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                  {verifyError || 'Registration without a valid family invite code is blocked to preserve household privacy.'}
                </div>
              </div>
            </div>

            {/* Manual Invite Code Input form */}
            <form onSubmit={handleManualVerify} style={{ display: 'flex', gap: '0.45rem', marginTop: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Key size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="manual-invite-code-input"
                  type="text"
                  placeholder="Enter FAM-XXXXXX"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    color: 'var(--text-main)',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              <button
                id="verify-code-btn"
                type="submit"
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.55rem 0.85rem', fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                Verify Code
              </button>
            </form>
          </div>
        )}

        {/* Error and Success Alerts */}
        {formError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#ef4444',
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            fontSize: '0.8rem',
            marginBottom: '1rem',
            lineHeight: 1.4
          }}>
            ⚠️ {formError}
          </div>
        )}

        {successMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#10b981',
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            fontSize: '0.8rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}>
            <CheckCircle size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Member Registration Form */}
        <form onSubmit={handleSubmit}>
          {/* Name Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                First Name *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="reg-first-name"
                  type="text"
                  required
                  placeholder="e.g. Tobi"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem 0.7rem 2.3rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                Last Name
              </label>
              <input
                id="reg-last-name"
                type="text"
                placeholder="e.g. Okafor"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Email Field */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
              Email Address *
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="reg-email"
                type="email"
                required
                placeholder="tobi.okafor@onepot.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem 0.7rem 2.3rem',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Role in Family Selection */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
              Your Role in Household *
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem'
            }}>
              <button
                type="button"
                onClick={() => setRoleInFamily('child')}
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: '10px',
                  border: `1px solid ${roleInFamily === 'child' ? '#10b981' : 'var(--border-color)'}`,
                  background: roleInFamily === 'child' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-primary)',
                  color: roleInFamily === 'child' ? '#10b981' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>👤 Child / Youth</span>
              </button>

              <button
                type="button"
                onClick={() => setRoleInFamily('spouse')}
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: '10px',
                  border: `1px solid ${roleInFamily === 'spouse' ? '#10b981' : 'var(--border-color)'}`,
                  background: roleInFamily === 'spouse' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-primary)',
                  color: roleInFamily === 'spouse' ? '#10b981' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>🛡️ Spouse / Co-Head</span>
              </button>
            </div>
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
              Create Password *
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 2.5rem 0.7rem 2.3rem',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
              Confirm Password *
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="reg-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 2.5rem 0.7rem 2.3rem',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit Button (DISABLED IF VERIFICATION IS NOT VALID) */}
          <button
            id="register-submit-btn"
            type="submit"
            disabled={isSubmitDisabled}
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '12px',
              border: 'none',
              background: isSubmitDisabled
                ? 'var(--border-color)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: isSubmitDisabled ? 'var(--text-muted)' : '#ffffff',
              fontWeight: 800,
              fontSize: '0.925rem',
              cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: isSubmitDisabled ? 'none' : '0 6px 18px rgba(16, 185, 129, 0.35)',
              opacity: isSubmitDisabled ? 0.6 : 1,
              transition: 'all 0.2s ease',
              marginBottom: '1rem'
            }}
          >
            {submitting ? (
              <span>Creating Member Account...</span>
            ) : verificationStatus !== 'valid' ? (
              <>
                <Lock size={16} />
                <span>Valid Family Invite Code Required</span>
              </>
            ) : (
              <>
                <span>Complete Registration & Join {familyName}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Alternative Links (Parent Register & Login) */}
        <div style={{
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          textAlign: 'center',
          fontSize: '0.8rem'
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Need to create a new household instead? </span>
            <button
              id="switch-to-parent-reg-btn"
              type="button"
              onClick={onNavigateToParentRegister}
              style={{
                background: 'none',
                border: 'none',
                color: '#10b981',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline'
              }}
            >
              Register as Parent Admin
            </button>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
            <button
              id="switch-to-login-btn"
              type="button"
              onClick={onNavigateToLogin}
              style={{
                background: 'none',
                border: 'none',
                color: '#10b981',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline'
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-subtle)', padding: '1rem 0' }}>
        OnePot • An academic demonstration of a banking ledger; Real fund movement is not yet supported.
      </div>
    </div>
  );
}
