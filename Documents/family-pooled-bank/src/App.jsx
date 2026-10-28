import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import PooledFundCard from './components/PooledFundCard';
import BudgetManager from './components/BudgetManager';
import PoolTransactionsLog from './components/PoolTransactionsLog';
import PeriodicReport from './components/PeriodicReport';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import RegisterPage from './components/RegisterPage';
import { db } from './services/db';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialSession = db.getCurrentSession();
  
  // Theme Engine State - Persisted in localStorage with system preference fallback
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('onepot_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
    } catch {
      return 'light';
    }
  });

  // Synchronize data-theme on document root whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('onepot_theme', theme);
    } catch {
      // Ignore localStorage write failure in restricted environments
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // User & Family Session State
  const [currentUser, setCurrentUser] = useState(initialSession?.user || null);
  const [currentFamily, setCurrentFamily] = useState(initialSession?.family || null);
  
  // Dedicated Initial Boot State: Always boots directly to Landing Page unless /register is requested
  const [currentView, setCurrentView] = useState(() => {
    if (window.location.pathname === '/register' || window.location.search.includes('invite=')) {
      return 'register';
    }
    return 'landing';
  });
  const [authInitialTab, setAuthInitialTab] = useState('login'); // 'login' | 'register-family'
  
  // Dashboard Navigation Tab State (defaults to 'dashboard')
  const [activeTab, setActiveTab] = useState('dashboard');
  const [, setDbTick] = useState(0); // Trigger re-render on database updates
  const [notifications, setNotifications] = useState(db.getNotifications(initialSession?.user?.family_id));

  // Listen to browser path changes
  useEffect(() => {
    if (location.pathname === '/register' || location.search.includes('invite=')) {
      setCurrentView('register');
    }
  }, [location.pathname, location.search]);

  // Synchronize live financial data from backend MySQL on load and whenever family changes
  useEffect(() => {
    if (currentUser?.family_id) {
      db.syncFromBackend(currentUser.family_id).then(() => {
        setNotifications(db.getNotifications(currentUser.family_id));
        setDbTick(prev => prev + 1);
      });
    }
  }, [currentUser?.family_id]);

  const handleDataChange = async () => {
    if (currentUser?.family_id) {
      await db.syncFromBackend(currentUser.family_id);
    }
    setDbTick(prev => prev + 1);
    setNotifications(db.getNotifications(currentUser?.family_id));
  };

  const handleNavigateToLogin = () => {
    setAuthInitialTab('login');
    setCurrentView('auth');
    if (location.pathname !== '/') navigate('/');
  };

  const handleNavigateToRegister = () => {
    setAuthInitialTab('register-family');
    setCurrentView('auth');
    if (location.pathname !== '/') navigate('/');
  };

  const handleNavigateToMemberRegister = () => {
    setCurrentView('register');
    if (location.pathname !== '/register') navigate('/register');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    if (location.pathname !== '/') navigate('/');
  };

  const handleLoginSuccess = async (user, family) => {
    setCurrentUser(user);
    setCurrentFamily(family);
    if (user?.family_id) {
      await db.syncFromBackend(user.family_id);
    }
    setNotifications(db.getNotifications(user?.family_id));
    setDbTick(prev => prev + 1);
    setActiveTab('dashboard');
    setCurrentView('app');
    if (location.pathname !== '/') navigate('/');
  };

  const handleLogout = () => {
    db.clearSession();
    setCurrentUser(null);
    setCurrentFamily(null);
    setCurrentView('landing');
    if (location.pathname !== '/') navigate('/');
  };

  const pooledFund = db.getPooledFund(currentUser?.family_id);
  const poolTransactions = db.getPoolTransactions(currentUser?.family_id);

  // VIEW 1: Dedicated Member Registration View (/register?invite=CODE)
  const isRegisterRoute = currentView === 'register' || location.pathname === '/register' || location.search.includes('invite=');
  if (isRegisterRoute && currentView !== 'app') {
    return (
      <RegisterPage 
        onRegisterSuccess={handleLoginSuccess}
        onNavigateToLogin={handleNavigateToLogin}
        onNavigateToParentRegister={handleNavigateToRegister}
        onBackToLanding={handleBackToLanding}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // VIEW 2: Dedicated Landing Page Boot View
  if (currentView === 'landing') {
    return (
      <LandingPage 
        onNavigateToLogin={handleNavigateToLogin}
        onNavigateToRegister={handleNavigateToRegister}
        onNavigateToMemberRegister={handleNavigateToMemberRegister}
        onGoToDashboard={() => setCurrentView('app')}
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // VIEW 3: Authentication Screen (Centralized Minimalist Card View)
  if (currentView === 'auth' || !currentUser) {
    return (
      <AuthModal 
        key={authInitialTab}
        onLoginSuccess={handleLoginSuccess} 
        theme={theme}
        onToggleTheme={toggleTheme}
        initialTab={authInitialTab}
        onBackToLanding={handleBackToLanding}
      />
    );
  }

  // VIEW 3: Authenticated Main Application View
  return (
    <div className="app-container">
      {/* Header with OnePot Navigation, Isolated User Profile & Theme Engine */}
      <Header 
        currentUser={currentUser}
        currentFamily={currentFamily}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        onDataChange={handleDataChange}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main View Container */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard 
            currentUser={currentUser}
            currentFamily={currentFamily}
            onDataChange={handleDataChange}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'pool' && (
          <div>
            <PooledFundCard 
              currentUser={currentUser}
              poolData={pooledFund}
              transactions={poolTransactions}
              onDataChange={handleDataChange}
            />
            <PoolTransactionsLog transactions={poolTransactions} />
          </div>
        )}

        {activeTab === 'budgets' && (
          <BudgetManager 
            currentUser={currentUser}
            onDataChange={handleDataChange}
          />
        )}

        {activeTab === 'logs' && (
          <PoolTransactionsLog transactions={poolTransactions} />
        )}

        {activeTab === 'reports' && (
          <PeriodicReport 
            currentUser={currentUser}
            currentFamily={currentFamily}
          />
        )}
      </main>

      {/* App Footer */}
      <footer style={{ 
        background: 'var(--bg-secondary)', 
        borderTop: '1px solid var(--border-color)', 
        padding: '1.25rem 0', 
        marginTop: 'auto', 
        textAlign: 'center', 
        fontSize: '0.825rem', 
        color: 'var(--text-subtle)' 
      }}>
        <div style={{ 
          maxWidth: '1320px', 
          margin: '0 auto', 
          padding: '0 1.25rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '0.75rem' 
        }}>
          <div>
            © 2026 <strong>OnePot</strong>
          </div>
          <div style={{ fontSize: '0.775rem' }}>
            An academic demonstration of a banking ledger; Real fund movement is not yet supported.
          </div>
        </div>
      </footer>
    </div>
  );
}
