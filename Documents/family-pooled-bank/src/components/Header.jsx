import React, { useState } from 'react';
import { 
  CookingPot, 
  ChevronDown, 
  LayoutDashboard, 
  PieChart, 
  FileSpreadsheet, 
  History,
  LogOut,
  Sun,
  Moon,
  Info,
  Shield,
  User,
  Bell,
  Check,
  X,
  CheckCircle,
  XCircle,
  Inbox
} from 'lucide-react';
import { db } from '../services/db';

export default function Header({ 
  currentUser, 
  currentFamily,
  onLogout,
  activeTab, 
  setActiveTab, 
  notifications = [],
  onDataChange,
  theme = 'light',
  onToggleTheme
}) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const familyName = currentFamily?.family_name || 'The Okafor Household';

  // Resolve relevant notifications based on RBAC role
  const isParent = currentUser?.role === 'parent';
  const displayedNotifications = (notifications || []).filter(n => {
    if (isParent) return true; // Parents see family-wide activity & requests
    // Children see notifications targeted to them or general announcements
    return !n.user_id || n.user_id === currentUser?.user_id;
  });

  const pendingRequests = displayedNotifications.filter(
    n => n.type === 'allocation_request' && n.status === 'pending'
  );

  const unreadCount = isParent 
    ? pendingRequests.length + displayedNotifications.filter(n => !n.is_read && n.status !== 'pending').length
    : displayedNotifications.filter(n => !n.is_read).length;

  const handleAcceptRequest = (requestId) => {
    try {
      db.approveAllocation(requestId, currentUser?.user_id || 1);
      if (onDataChange) onDataChange();
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleRejectRequest = (requestId) => {
    try {
      db.rejectAllocation(requestId, currentUser?.user_id || 1);
      if (onDataChange) onDataChange();
    } catch (err) {
      alert(`Rejection error: ${err.message}`);
    }
  };

  const handleMarkAllRead = () => {
    try {
      db.markAllNotificationsRead();
      if (onDataChange) onDataChange();
    } catch {
      // non-blocking
    }
  };

  return (
    <header className="header-wrapper" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
      {/* Closed-loop Academic Mock Ledger Disclaimer Banner */}
      <div className="mock-ledger-banner">
        <Info size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span>
          <strong>Academic Demo Notice:</strong> Closed-loop mock banking ledger for academic demonstration. Real fund movement is simulated via Paystack sandbox API and Mono API integration guidelines.
        </span>
      </div>

      {/* Top Banner & User Role Switcher */}
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Brand & Household Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ 
            background: 'var(--primary)', 
            width: '42px', 
            height: '42px', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#ffffff',
            boxShadow: '0 2px 8px var(--primary-light)'
          }}>
            <CookingPot size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', lineHeight: 1.1, color: 'var(--text-main)', letterSpacing: '-0.03em', margin: 0 }}>
                OnePot
              </h1>
              <span style={{ 
                fontSize: '0.675rem', 
                padding: '0.15rem 0.5rem', 
                borderRadius: 'var(--radius-full)', 
                background: 'var(--primary-light)', 
                color: 'var(--primary)', 
                fontWeight: 700 
              }}>
                Family Pot
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '3px' }}>
              <em>"One family, one pot = No stories"</em> • {familyName}
            </span>
          </div>
        </div>

        {/* Theme Toggle & Active User / Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Sleek Light/Dark Mode Sun/Moon Toggle */}
          <button 
            onClick={onToggleTheme}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle light or dark theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun size={16} color="#f59e0b" />
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Light</span>
              </>
            ) : (
              <>
                <Moon size={16} color="#475569" />
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Dark</span>
              </>
            )}
          </button>

          {/* Top Header Bell Icon & Notification Drawer */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowNotificationDrawer(!showNotificationDrawer);
                setShowRoleMenu(false);
              }}
              className="btn btn-secondary"
              style={{
                padding: '0.45rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                position: 'relative',
                background: showNotificationDrawer ? 'var(--bg-primary)' : undefined,
                borderColor: showNotificationDrawer ? 'var(--primary)' : undefined
              }}
              title="Notifications & Approval Requests"
              aria-label="Open notifications drawer"
            >
              <Bell size={16} color={unreadCount > 0 ? '#10b981' : 'var(--text-muted)'} />
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Alerts</span>
              {unreadCount > 0 && (
                <span style={{
                  background: isParent && pendingRequests.length > 0 ? '#f59e0b' : '#f43f5e',
                  color: '#ffffff',
                  fontSize: '0.675rem',
                  fontWeight: 800,
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 0 8px rgba(244, 63, 94, 0.4)'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotificationDrawer && (
              <div 
                className="glass-panel"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  width: '380px',
                  maxWidth: '92vw',
                  maxHeight: '520px',
                  display: 'flex',
                  flexDirection: 'column',
                  zIndex: 60,
                  boxShadow: 'var(--shadow-lg), 0 10px 30px rgba(0, 0, 0, 0.45)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden'
                }}
              >
                {/* Drawer Header */}
                <div style={{
                  padding: '0.85rem 1rem',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-primary)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Bell size={15} color="var(--primary)" />
                      {isParent ? 'Parent Approval Drawer' : 'Notification Feed'}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {pendingRequests.length > 0
                        ? `${pendingRequests.length} pending allocation request${pendingRequests.length === 1 ? '' : 's'}`
                        : 'All family updates caught up'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {displayedNotifications.length > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.725rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '0.2rem 0.4rem'
                        }}
                      >
                        Mark Read
                      </button>
                    )}
                    <button 
                      onClick={() => setShowNotificationDrawer(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                      aria-label="Close notifications drawer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Notification List Body */}
                <div style={{ overflowY: 'auto', maxHeight: '420px', padding: '0.65rem' }}>
                  {displayedNotifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                      <Inbox size={28} style={{ opacity: 0.4, margin: '0 auto 0.5rem auto', display: 'block' }} />
                      No notifications or approval requests at this time.
                    </div>
                  ) : (
                    displayedNotifications.map((notif, idx) => {
                      const isRequest = notif.type === 'allocation_request' || notif.request_id;
                      const isPending = notif.status === 'pending';
                      const isApproved = notif.status === 'approved';
                      const isRejected = notif.status === 'rejected';

                      return (
                        <div 
                          key={notif.notification_id || notif.id || idx}
                          style={{
                            padding: '0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            background: isPending 
                              ? 'rgba(245, 158, 11, 0.08)' 
                              : notif.is_read 
                                ? 'var(--bg-primary)' 
                                : 'rgba(16, 185, 129, 0.06)',
                            border: `1px solid ${isPending ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-color)'}`,
                            marginBottom: '0.5rem',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          {/* Item Metadata Tag Row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              background: isRequest 
                                ? 'rgba(245, 158, 11, 0.15)' 
                                : isApproved 
                                  ? 'rgba(16, 185, 129, 0.15)' 
                                  : 'rgba(59, 130, 246, 0.15)',
                              color: isRequest ? '#f59e0b' : isApproved ? '#10b981' : '#38bdf8'
                            }}>
                              {isRequest ? 'Allocation Request' : notif.type || 'Notification'}
                            </span>

                            <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)' }}>
                              {notif.sent_at ? new Date(notif.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>

                          {/* Primary Required Format: "[Child Name] requested allocation of ₦[Amount] for [Bowl Name]" */}
                          <div style={{ 
                            fontSize: '0.825rem', 
                            fontWeight: isPending ? 700 : 600, 
                            color: 'var(--text-main)', 
                            lineHeight: 1.35, 
                            marginBottom: isRequest ? '0.3rem' : 0 
                          }}>
                            {notif.message}
                          </div>

                          {/* Optional Reason if supplied */}
                          {isRequest && notif.description && (
                            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                              Reason: "{notif.description}"
                            </div>
                          )}

                          {/* Status & Inline Action Buttons */}
                          {isRequest && (
                            <div style={{ marginTop: '0.5rem', paddingTop: '0.45rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {/* Status Badge */}
                              <div>
                                {isPending && (
                                  <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>
                                    ⏳ Pending Review
                                  </span>
                                )}
                                {isApproved && (
                                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <CheckCircle size={13} /> Approved
                                  </span>
                                )}
                                {isRejected && (
                                  <span style={{ fontSize: '0.7rem', color: '#f43f5e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <XCircle size={13} /> Rejected
                                  </span>
                                )}
                              </div>

                              {/* Parent RBAC: Inline Accept & Reject Buttons */}
                              {isParent && isPending && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <button
                                    onClick={() => handleRejectRequest(notif.request_id || notif.notification_id || notif.id)}
                                    className="btn btn-secondary"
                                    style={{
                                      padding: '0.25rem 0.6rem',
                                      fontSize: '0.725rem',
                                      color: 'var(--accent-rose)',
                                      borderColor: 'rgba(244, 63, 94, 0.3)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      cursor: 'pointer'
                                    }}
                                    title="Reject Allocation Request"
                                  >
                                    <X size={13} /> Reject
                                  </button>

                                  <button
                                    onClick={() => handleAcceptRequest(notif.request_id || notif.notification_id || notif.id)}
                                    className="btn btn-primary"
                                    style={{
                                      padding: '0.25rem 0.65rem',
                                      fontSize: '0.725rem',
                                      background: '#059669',
                                      borderColor: '#059669',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      cursor: 'pointer'
                                    }}
                                    title="Accept & Execute Allocation"
                                  >
                                    <Check size={13} /> Accept
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Isolated User Profile & Logout Dropdown (Spotify Family Model) */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.85rem' }}
            >
              <span style={{ fontSize: '1.2rem' }}>{currentUser.avatar}</span>
              <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser.first_name} {currentUser.last_name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {currentUser.role === 'parent' ? '🛡️ Parent Admin' : '🧑‍🎓 Child Contributor'}
                </div>
              </div>
              <ChevronDown size={15} />
            </button>

            {showRoleMenu && (
              <div style={{ 
                position: 'absolute', 
                right: 0, 
                top: '110%', 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)', 
                padding: '0.85rem', 
                width: '270px', 
                zIndex: 50, 
                boxShadow: 'var(--shadow-lg)' 
              }}>
                {/* User Profile Card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ 
                    fontSize: '1.8rem', 
                    background: 'var(--bg-primary)', 
                    borderRadius: '12px', 
                    width: '46px', 
                    height: '46px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)'
                  }}>
                    {currentUser.avatar}
                  </div>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {currentUser.first_name} {currentUser.last_name}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: currentUser.role === 'parent' ? 'var(--primary)' : 'var(--accent-blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {currentUser.role === 'parent' ? <Shield size={12} /> : <User size={12} />}
                      {currentUser.role === 'parent' ? 'Parent (Admin)' : 'Child (Restricted)'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {currentUser.email}
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div style={{ padding: '0.65rem 0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span>Household:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{familyName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Access Tier:</span>
                    <span style={{ 
                      padding: '0.1rem 0.4rem', 
                      borderRadius: '4px', 
                      background: currentUser.role === 'parent' ? 'var(--primary-light)' : 'rgba(59, 130, 246, 0.15)',
                      color: currentUser.role === 'parent' ? 'var(--primary)' : 'var(--accent-blue)',
                      fontWeight: 600,
                      fontSize: '0.7rem'
                    }}>
                      {currentUser.role === 'parent' ? 'Full Control' : 'Contribution Only'}
                    </span>
                  </div>
                </div>

                {/* Sign Out Button */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      onLogout();
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.6rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      background: 'var(--accent-rose-light)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--accent-rose)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '0 1.25rem' }}>
        <div className="tab-navigation" style={{ marginBottom: 0 }}>
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={17} /> Dashboard
          </button>
          <button 
            className={`tab-btn ${activeTab === 'pool' ? 'active' : ''}`}
            onClick={() => setActiveTab('pool')}
          >
            <CookingPot size={17} /> The Pot (Contributions)
          </button>
          <button 
            className={`tab-btn ${activeTab === 'budgets' ? 'active' : ''}`}
            onClick={() => setActiveTab('budgets')}
          >
            <PieChart size={17} /> Smart Bowls (Budgets)
          </button>
          <button 
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <History size={17} /> Ledger Audit
          </button>
          <button 
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <FileSpreadsheet size={17} /> Periodic Reports
          </button>
        </div>
      </div>
    </header>
  );
}
