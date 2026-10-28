import React, { useState } from 'react';
import { 
  CookingPot, 
  Users, 
  LogIn, 
  Key, 
  Mail, 
  Building, 
  CheckCircle, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  Info,
  ArrowLeft
} from 'lucide-react';
import { db } from '../services/db';
import { SMTPNotificationService } from '../services/smtpService';

export default function AuthModal({ 
  onLoginSuccess, 
  theme = 'light', 
  onToggleTheme,
  initialTab = 'login',
  onBackToLanding
}) {
  const [activeTab, setActiveTab] = useState(initialTab === 'join-family' ? 'login' : initialTab); // 'login' | 'register-family'
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Form States - Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form States - Forgot Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Form States - Register Family
  const [regFamilyName, setRegFamilyName] = useState('');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regRole, setRegRole] = useState('parent');

  // Handler: Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      const { user, family } = await db.loginUser({ email: loginEmail.trim(), password: loginPassword });
      setSuccessMsg(`Welcome back, ${user.first_name}!`);
      setTimeout(() => {
        setLoading(false);
        onLoginSuccess(user, family);
      }, 500);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  // Quick Demo Login Helper
  const handleQuickLogin = async (email, password) => {
    setLoginEmail(email);
    setLoginPassword(password);
    setError('');
    try {
      setLoading(true);
      const { user, family } = await db.loginUser({ email, password });
      setSuccessMsg(`Welcome back, ${user.first_name}!`);
      setTimeout(() => {
        setLoading(false);
        onLoginSuccess(user, family);
      }, 400);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  // Handler: Forgot Password (Silent Non-Enumeration)
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('Please enter your account email address.');
      return;
    }

    try {
      setError('');
      setForgotLoading(true);

      // Triggers backend POST /api/auth/forgot-password and records local notification
      await db.requestPasswordReset(forgotEmail.trim());

      setForgotLoading(false);
      setForgotSubmitted(true);
    } catch {
      // Always treat silently on the frontend to prevent email enumeration
      setForgotLoading(false);
      setForgotSubmitted(true);
    }
  };

  // Handler: Register Family (Parent Registration)
  const handleRegisterFamilySubmit = async (e) => {
    e.preventDefault();
    if (!regFamilyName.trim() || !regFirstName.trim() || !regEmail.trim()) {
      setError('Family Name, Admin First Name, and Email are required.');
      return;
    }
    if (!regPassword) {
      setError('Please create a password for your new family account.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match! Please verify your password confirmation.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      const { user, family } = await db.registerParent({
        familyName: regFamilyName.trim(),
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        avatar: regRole === 'parent' ? '👑' : '👤'
      });

      // Dispatch automated welcome notification
      SMTPNotificationService.sendWelcomeEmail(user, family);

      setSuccessMsg(`Family Account "${family.family_name}" created! Invite code: ${family.invite_code || ''}`);
      setTimeout(() => {
        setLoading(false);
        onLoginSuccess(user, family);
      }, 700);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

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
      {/* Top Floating Bar */}
      <div style={{
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 0'
      }}>
        {onBackToLanding ? (
          <button
            type="button"
            onClick={onBackToLanding}
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
        ) : <div />}

        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem' }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle light or dark theme"
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

      {/* Centralized Authentication Card */}
      <div style={{
        maxWidth: '460px',
        width: '100%',
        margin: '1.5rem auto',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        padding: '2.25rem 2rem',
        boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
        transition: 'background-color 0.25s ease, border-color 0.25s ease'
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
            {isForgotPassword ? 'Reset Password' : 'OnePot'}
          </h2>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
            {isForgotPassword 
              ? 'Enter your registered email to receive reset instructions'
              : 'One family, one pot = No stories'
            }
          </p>
        </div>

        {/* Academic Mock Ledger Notice Pill */}
        <div style={{
          background: 'var(--primary-light)',
          border: '1px solid var(--primary-border)',
          borderRadius: '10px',
          padding: '0.45rem 0.75rem',
          marginBottom: '1.25rem',
          fontSize: '0.725rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          lineHeight: 1.3
        }}>
          <Info size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
          <span>
            This site is an academic demonstration of a family banking ledger. Transactions are simulated using Paystack test mode as real fund movement is not yet supported.
          </span>
        </div>

        {/* Error and Success Alerts */}
        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            color: '#f43f5e',
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            fontSize: '0.8rem',
            marginBottom: '1.25rem',
            lineHeight: 1.4
          }}>
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#10b981',
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            fontSize: '0.8rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}>
            <CheckCircle size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* VIEW 1: FORGOT PASSWORD SCREEN */}
        {isForgotPassword ? (
          <div>
            {!forgotSubmitted ? (
              <form onSubmit={handleForgotPasswordSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Registered Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="email"
                      required
                      placeholder="e.g. emeka.okafor@gov.ng"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 2.5rem',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        transition: 'border-color 0.15s ease'
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.925rem',
                    cursor: forgotLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 6px 16px rgba(16, 185, 129, 0.3)',
                    marginBottom: '1rem',
                    opacity: forgotLoading ? 0.75 : 1
                  }}
                >
                  {forgotLoading ? 'Sending Instructions...' : 'Send Reset Instructions'}
                  {!forgotLoading && <ArrowRight size={16} />}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto'
                }}>
                  <CheckCircle size={32} />
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
                  Check Your Inbox
                </h3>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  If an account exists for <strong style={{ color: 'var(--text-main)' }}>{forgotEmail}</strong>, password reset instructions and a 6-digit OTP code have been sent. Please check your inbox and spam folder.
                </p>

                <div style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '0.85rem',
                  fontSize: '0.775rem',
                  color: 'var(--text-subtle)',
                  marginBottom: '1.5rem',
                  textAlign: 'left'
                }}>
                  🔒 <em>Security notice: To protect household privacy, OnePot never confirms whether an email is registered or unregistered.</em>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setForgotSubmitted(false);
                      setError('');
                    }}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 700 }}
                  >
                    Return to Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotSubmitted(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    Send to a different email
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* VIEW 2: AUTH TABS (SIGN IN / NEW FAMILY / JOIN FAMILY) */
          <div>
            {/* Segmented Tab Control */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.25rem',
              background: 'var(--bg-primary)',
              padding: '0.3rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              marginBottom: '1.5rem'
            }}>
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setError(''); setSuccessMsg(''); }}
                style={{
                  padding: '0.55rem 0.35rem',
                  borderRadius: '9px',
                  border: 'none',
                  background: activeTab === 'login' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'login' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.775rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('register-family'); setError(''); setSuccessMsg(''); }}
                style={{
                  padding: '0.55rem 0.35rem',
                  borderRadius: '9px',
                  border: 'none',
                  background: activeTab === 'register-family' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'register-family' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.775rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Building size={13} />
                <span>New Family</span>
              </button>
            </div>

            {/* TAB: LOGIN */}
            {activeTab === 'login' && (
              <div>
                <form onSubmit={handleLoginSubmit}>
                  {/* Email Field */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Account Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="email"
                        required
                        placeholder="emeka.okafor@gov.ng"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem 0.75rem 2.5rem',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem',
                          outline: 'none',
                          transition: 'border-color 0.15s ease'
                        }}
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Key size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem',
                          outline: 'none',
                          transition: 'border-color 0.15s ease'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0
                        }}
                      >
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Unobtrusive Forgot Password Link */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
                    <button
                      type="button"
                      id="forgot-password-link"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setForgotEmail(loginEmail || '');
                        setError('');
                        setSuccessMsg('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '0.15rem 0',
                        textDecoration: 'none'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 8px 18px rgba(16, 185, 129, 0.3)',
                      marginBottom: '1.5rem',
                      opacity: loading ? 0.75 : 1
                    }}
                  >
                    <span>{loading ? 'Authenticating...' : 'Sign In to Pot'}</span>
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </form>

                {/* Quick 1-Click Demo Profiles */}
                <div style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Quick Demo Credentials (Isolated Accounts)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('parent@onepot.app', 'ParentPassword123!')}
                      style={{
                        padding: '0.5rem 0.65rem',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        fontSize: '0.775rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div>👑 Demo Parent</div>
                      <div style={{ fontSize: '0.675rem', color: 'var(--primary)' }}>parent@onepot.app</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('child@onepot.app', 'ChildPassword123!')}
                      style={{
                        padding: '0.5rem 0.65rem',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        fontSize: '0.775rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div>👤 Demo Child</div>
                      <div style={{ fontSize: '0.675rem', color: 'var(--accent-blue)' }}>child@onepot.app</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: REGISTER NEW FAMILY */}
            {activeTab === 'register-family' && (
              <form onSubmit={handleRegisterFamilySubmit}>
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Family / Household Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. The Adeleke Household"
                    value={regFamilyName}
                    onChange={(e) => setRegFamilyName(e.target.value)}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Admin First Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Babatunde"
                      value={regFirstName}
                      onChange={(e) => setRegFirstName(e.target.value)}
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
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Adeleke"
                      value={regLastName}
                      onChange={(e) => setRegLastName(e.target.value)}
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

                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Admin Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="babatunde@adeleke.org.ng"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
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

                {/* Password & Confirm */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        placeholder="Min 6 chars"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.7rem 2rem 0.7rem 0.85rem',
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
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.5rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      Confirm
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showRegConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Re-enter"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.7rem 2rem 0.7rem 0.85rem',
                          background: 'var(--bg-primary)',
                          border: regConfirmPassword && regPassword !== regConfirmPassword ? '1px solid #f43f5e' : '1px solid var(--border-color)',
                          borderRadius: '10px',
                          color: 'var(--text-main)',
                          fontSize: '0.875rem',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.5rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {showRegConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password match indicator */}
                {regConfirmPassword && (
                  <div style={{
                    fontSize: '0.725rem',
                    marginBottom: '0.85rem',
                    color: regPassword === regConfirmPassword ? '#10b981' : '#f43f5e',
                    fontWeight: 600
                  }}>
                    {regPassword === regConfirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                  </div>
                )}

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    Family Role
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
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
                  >
                    <option value="parent">Parent / Head of Household (Full Rights)</option>
                    <option value="child">Child / Dependent (Contributor)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.925rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 8px 18px rgba(16, 185, 129, 0.3)',
                    opacity: loading ? 0.75 : 1
                  }}
                >
                  <span>{loading ? 'Creating Account...' : 'Create Family & Start Pot'}</span>
                  {!loading && <ArrowRight size={16} />}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer Notice */}
      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-subtle)', padding: '0.5rem' }}>
        © 2026 OnePot • An academic demonstration of a banking ledger; Real fund movement is not yet supported.
      </div>
    </div>
  );
}
