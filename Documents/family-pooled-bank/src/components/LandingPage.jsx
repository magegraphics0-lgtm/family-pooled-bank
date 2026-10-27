import React from 'react';
import { 
  CookingPot, 
  ArrowRight, 
  LogIn, 
  UserPlus, 
  ShieldCheck, 
  PieChart, 
  Sun, 
  Moon, 
  Info,
  CheckCircle2,
  Lock,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function LandingPage({
  onNavigateToLogin,
  onNavigateToRegister,
  onGoToDashboard,
  currentUser,
  theme = 'light',
  onToggleTheme
}) {
  return (
    <div className="landing-container" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      color: 'var(--text-main)',
      transition: 'background-color 0.25s ease, color 0.25s ease'
    }}>
      {/* Closed-loop Academic Mock Ledger Disclaimer Banner */}
      <div className="mock-ledger-banner" style={{
        background: 'rgba(5, 150, 105, 0.08)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.5rem 1.25rem',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        textAlign: 'center'
      }}>
        <Info size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span>
          <strong>Academic Demo Notice:</strong> Closed-loop mock banking ledger for academic demonstration. Real fund movement is simulated via Paystack sandbox API and Mono API integration guidelines.
        </span>
      </div>

      {/* Top Navbar */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        transition: 'background-color 0.25s ease'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          {/* Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <CookingPot size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                  OnePot
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '9999px',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontWeight: 700
                }}>
                  Family Pot
                </span>
              </div>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', lineHeight: 1.1 }}>
                <em>"One family, one pot = No stories"</em>
              </span>
            </div>
          </div>

          {/* Right Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Theme Toggle Button */}
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

            {currentUser ? (
              <button
                type="button"
                onClick={onGoToDashboard}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}
              >
                <span>Dashboard ({currentUser.first_name})</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  id="landing-login-btn"
                  onClick={onNavigateToLogin}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <LogIn size={15} />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  id="landing-get-started-btn"
                  onClick={onNavigateToRegister}
                  className="btn btn-primary"
                  style={{
                    padding: '0.5rem 1.15rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <UserPlus size={15} />
                  <span>Get Started</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Centered Focus */}
      <section style={{
        maxWidth: '880px',
        margin: '0 auto',
        padding: '5rem 1.5rem 4rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        {/* Eyebrow Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 1rem',
          background: 'var(--primary-light)',
          border: '1px solid var(--primary-border)',
          borderRadius: '9999px',
          fontSize: '0.825rem',
          color: 'var(--primary)',
          fontWeight: 700,
          marginBottom: '1.5rem'
        }}>
          <Sparkles size={15} />
          <span>Digital Family Financial Collective</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 5.5vw, 4rem)',
          fontWeight: 800,
          lineHeight: 1.12,
          letterSpacing: '-0.04em',
          margin: '0 auto 1.5rem auto',
          fontFamily: 'Outfit, sans-serif',
          maxWidth: '800px'
        }}>
          One family, one pot. <br />
          <span style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Zero stories.
          </span>
        </h1>

        <p style={{
          fontSize: '1.15rem',
          lineHeight: 1.65,
          color: 'var(--text-muted)',
          maxWidth: '640px',
          margin: '0 auto 2.5rem auto'
        }}>
          Consolidate household funds, manage shared groceries, automate monthly contributions, and eliminate awkward money conversations with automated budgets & alerts.
        </p>

        {/* Action CTAs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '3rem'
        }}>
          <button
            type="button"
            id="hero-get-started-cta"
            onClick={onNavigateToRegister}
            className="btn btn-primary"
            style={{
              padding: '0.9rem 2rem',
              fontSize: '1.05rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              borderRadius: '14px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)'
            }}
          >
            <span>Get Started</span>
            <ArrowRight size={18} />
          </button>

          <button
            type="button"
            id="hero-login-cta"
            onClick={onNavigateToLogin}
            className="btn btn-secondary"
            style={{
              padding: '0.9rem 1.75rem',
              fontSize: '1.05rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.55rem',
              borderRadius: '14px'
            }}
          >
            <LogIn size={18} />
            <span>Sign In to Household</span>
          </button>
        </div>

        {/* Trust Highlights */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2rem',
          flexWrap: 'wrap',
          paddingTop: '1.75rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          width: '100%',
          maxWidth: '680px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <CheckCircle2 size={17} color="var(--primary)" />
            <span>Closed-Loop Ledger</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <CheckCircle2 size={17} color="var(--primary)" />
            <span>Simulated Paystack Sandbox</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <CheckCircle2 size={17} color="var(--primary)" />
            <span>Zero Spread / Open Audit</span>
          </div>
        </div>
      </section>

      {/* 4 Feature Pillars Grid */}
      <section style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '3rem 1.5rem',
        borderTop: '1px solid var(--border-color)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.5rem 0' }}>
            Built for Real Household Financial Needs
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            Solve common family frictions around contributions, utility bills, school fees, and transparency.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Card 1 */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.75rem',
            transition: 'transform 0.2s ease, border-color 0.2s ease'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <CookingPot size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
              The Pooled Pot
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              One single transparent ledger for the whole family. Everyone deposits via simulated card or transfer and can verify live balances anytime.
            </p>
          </div>

          {/* Card 2 */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.75rem',
            transition: 'transform 0.2s ease, border-color 0.2s ease'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <PieChart size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
              Smart Bowls (Budgets)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Ring-fence funds for rent, food, generator fuel, and school terms. Prevent budget overspending with clear visual limit meters.
            </p>
          </div>

          {/* Card 3 */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.75rem',
            transition: 'transform 0.2s ease, border-color 0.2s ease'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
              Role-Based Governance
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Parents maintain administrative oversight and allocation approval, while working dependents and students contribute with full ledger audit rights.
            </p>
          </div>

          {/* Card 4 */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.75rem',
            transition: 'transform 0.2s ease, border-color 0.2s ease'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(168, 85, 247, 0.1)',
              color: '#a855f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Lock size={22} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
              Privacy & Closed-Loop Security
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Personal individual income remains private. Only what is contributed into the family pot is visible on the collective dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '3rem 1.5rem',
        borderTop: '1px solid var(--border-color)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 0.5rem 0' }}>
            How OnePot Works in 3 Simple Steps
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
            Get your household financial ledger running in less than 2 minutes.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem'
        }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>01</div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>Create Your Household</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              The head of household registers a new family account and receives an instant, unique family invite code.
            </p>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>02</div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>Set Up Smart Bowls</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Define monthly budget targets for Groceries, School Fees, and House Rent to ring-fence essential family obligations.
            </p>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>03</div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>Pool & Track in Real Time</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Contribute simulated funds via Paystack sandbox API. Review transactions and periodic expenditure reports together.
            </p>
          </div>
        </div>

        {/* Ready to start banner */}
        <div style={{
          marginTop: '3.5rem',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%)',
          border: '1px solid var(--primary-border)',
          borderRadius: '20px',
          padding: '2.5rem 1.5rem',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 0.65rem 0', letterSpacing: '-0.02em' }}>
            Ready to streamline your family finances?
          </h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
            Join hundreds of Nigerian families pooling smarter and budgeting with complete peace of mind.
          </p>
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="btn btn-primary"
            style={{
              padding: '0.85rem 2rem',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: '12px',
              boxShadow: '0 8px 18px rgba(16, 185, 129, 0.3)'
            }}
          >
            <span>Start Your Family Pot Free</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        padding: '2rem 1.5rem',
        fontSize: '0.825rem',
        color: 'var(--text-subtle)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            © 2026 <strong>OnePot</strong> • <em>"One family, one pot = No stories"</em>
          </div>
          <div style={{ fontSize: '0.75rem' }}>
            Closed-loop mock banking ledger for academic demonstration. Real fund movement simulated via Paystack & Mono API.
          </div>
        </div>
      </footer>
    </div>
  );
}
