import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import PooledFundCard from './components/PooledFundCard';
import BudgetManager from './components/BudgetManager';
import PoolTransactionsLog from './components/PoolTransactionsLog';
import PeriodicReport from './components/PeriodicReport';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import { db } from './services/db';

export default function App() {
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
  
  // Dedicated Initial Boot State: Always boots directly to Landing Page
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'auth' | 'app'
  const [authInitialTab, setAuthInitialTab] = useState('login'); // 'login' | 'register-family' | 'join-family'
  
  // Dashboard Navigation Tab State (defaults to 'dashboard')
  const [activeTab, setActiveTab] = useState('dashboard');
  const [, setDbTick] = useState(0); // Trigger re-render on database updates
  const [notifications, setNotifications] = useState(db.getNotifications(initialSession?.user?.family_id));

  const handleDataChange = () => {
    setDbTick(prev => prev + 1);
    setNotifications(db.getNotifications(currentUser?.family_id));
  };

  const handleNavigateToLogin = () => {
    setAuthInitialTab('login');
    setCurrentView('auth');
  };

  const handleNavigateToRegister = () => {
    setAuthInitialTab('register-family');
    setCurrentView('auth');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
  };

  const handleLoginSuccess = (user, family) => {
    setCurrentUser(user);
    setCurrentFamily(family);
    setNotifications(db.getNotifications(user?.family_id));
    setDbTick(prev => prev + 1);
    setActiveTab('dashboard');
    setCurrentView('app');
  };

  const handleLogout = () => {
    db.clearSession();
    setCurrentUser(null);
    setCurrentFamily(null);
    setCurrentView('landing');
  };

  const pooledFund = db.getPooledFund(currentUser?.family_id);
  const poolTransactions = db.getPoolTransactions(currentUser?.family_id);

  // VIEW 1: Dedicated Landing Page Boot View
  if (currentView === 'landing') {
    return (
      <LandingPage 
        onNavigateToLogin={handleNavigateToLogin}
        onNavigateToRegister={handleNavigateToRegister}
        onGoToDashboard={() => setCurrentView('app')}
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // VIEW 2: Authentication Screen (Centralized Minimalist Card View)
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
            © 2026 <strong>OnePot</strong> • <em>"One family, one pot = No stories"</em>
          </div>
          <div style={{ fontSize: '0.775rem' }}>
            Closed-loop mock banking ledger for academic demonstration. Real fund movement simulated via Paystack & Mono API.
          </div>
        </div>
      </footer>
    </div>
  );
}
