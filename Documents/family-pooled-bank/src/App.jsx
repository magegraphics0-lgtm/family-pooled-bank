import React, { useState } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import PooledFundCard from './components/PooledFundCard';
import BudgetManager from './components/BudgetManager';
import PoolTransactionsLog from './components/PoolTransactionsLog';
import PeriodicReport from './components/PeriodicReport';
import NotificationDrawer from './components/NotificationDrawer';
import AuthModal from './components/AuthModal';
import { db } from './services/db';

export default function App() {
  const users = db.getUsers();
  const initialSession = db.getCurrentSession();
  
  // App state - defaults to null so app ALWAYS starts on Login/Registration screen
  const [currentUser, setCurrentUser] = useState(initialSession?.user || null);
  const [currentFamily, setCurrentFamily] = useState(initialSession?.family || null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [, setDbTick] = useState(0); // Trigger re-render on database updates
  const [notifications, setNotifications] = useState(db.getNotifications(initialSession?.user?.family_id));

  const handleDataChange = () => {
    setDbTick(prev => prev + 1);
    setNotifications(db.getNotifications(currentUser?.family_id));
  };

  const handleLoginSuccess = (user, family) => {
    setCurrentUser(user);
    setCurrentFamily(family);
    setNotifications(db.getNotifications(user?.family_id));
    setDbTick(prev => prev + 1);
  };

  const handleLogout = () => {
    db.clearSession();
    setCurrentUser(null);
    setCurrentFamily(null);
  };

  const handleResetData = () => {
    if (window.confirm('Wipe all local data and reset application to a blank slate state?')) {
      db.resetToDefault();
      db.clearSession();
      setCurrentUser(null);
      setCurrentFamily(null);
      handleDataChange();
    }
  };

  const pooledFund = db.getPooledFund(currentUser?.family_id);
  const poolTransactions = db.getPoolTransactions(currentUser?.family_id);

  // Authentication Guard Screen
  if (!currentUser) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Header with Navigation & Role Switcher */}
      <Header 
        currentUser={currentUser}
        currentFamily={currentFamily}
        users={users}
        onSwitchUser={(user) => {
          setCurrentUser(user);
          db.setCurrentSession(user, currentFamily);
        }}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notifications={notifications}
        onToggleNotifications={() => setActiveTab('smtp')}
        onResetData={handleResetData}
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

        {activeTab === 'smtp' && (
          <NotificationDrawer 
            notifications={notifications}
            onDataChange={handleDataChange}
          />
        )}
      </main>

      {/* App Footer */}
      <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', padding: '1.25rem 0', marginTop: 'auto', textAlign: 'center', fontSize: '0.825rem', color: 'var(--text-subtle)' }}>
        <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '0 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            © 2026 <strong>NaijaFamily Pooled Bank & Family Financial Planner</strong> • Designed for Nigerian Households
          </div>
          <div>
            Built with React, Node.js REST Architecture, Chart.js & Nodemailer SMTP Engine
          </div>
        </div>
      </footer>
    </div>
  );
}
