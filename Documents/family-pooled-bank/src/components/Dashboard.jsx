import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Landmark, 
  CreditCard, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Receipt, 
  RotateCcw,
  HandCoins
} from 'lucide-react';
import { db } from '../services/db';
import PooledFundCard from './PooledFundCard';
import ExpenseFormModal from './ExpenseFormModal';
import AllocationRequestModal from './AllocationRequestModal';
import FamilyInviteCard from './FamilyInviteCard';

export default function Dashboard({ currentUser, currentFamily, onDataChange, onNavigateTab }) {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [directAllocateAmount, setDirectAllocateAmount] = useState('');
  const [directAllocateBowlId, setDirectAllocateBowlId] = useState('');
  const [directAllocatePurpose, setDirectAllocatePurpose] = useState('');
  const [allocateError, setAllocateError] = useState('');
  const [allocateSuccess, setAllocateSuccess] = useState('');

  // Filter & Search states for the comprehensive Household Transaction History
  const [activeTypeFilter, setActiveTypeFilter] = useState('all'); // 'all' | 'expense' | 'pool'
  const [searchQuery, setSearchQuery] = useState('');
  const [memberFilter, setMemberFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const familyId = currentUser?.family_id || currentFamily?.family_id;
  const users = db.getUsers(familyId);
  const categories = db.getCategories();
  const pooledFund = db.getPooledFund(familyId);
  const poolTransactions = db.getPoolTransactions(familyId);
  const expenses = db.getExpenses(familyId);

  // Financial calculations - strictly pooled contributions, pot allocations & household expenses
  const totalContributions = poolTransactions
    .filter(p => p.type === 'contribution')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAllocations = poolTransactions
    .filter(p => p.type === 'allocation')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  // Build Unified Household Transaction History (Contributions, Allocations & Expenses)
  const allHouseholdTransactions = [
    ...expenses.map(e => ({
      id: `exp-${e.expense_id}`,
      rawId: e.expense_id,
      type: 'expense',
      title: e.description || e.title || 'General Household Expense',
      amount: Number(e.amount),
      date: e.date_spent,
      user_id: e.user_id,
      category_id: e.category_id,
      payment_method: e.payment_method || 'Bank Transfer',
      notes: e.notes || ''
    })),
    ...poolTransactions.map(p => ({
      id: `pool-${p.transaction_id}`,
      rawId: p.transaction_id,
      type: p.type === 'contribution' ? 'pool_deposit' : 'pool_allocation',
      title: p.purpose || (p.type === 'contribution' ? 'Family Pot Contribution' : 'Family Pot Allocation'),
      amount: Number(p.amount),
      date: p.date || p.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      user_id: p.user_id,
      category_id: null,
      payment_method: 'Shared Vault',
      notes: p.purpose || ''
    }))
  ];

  // Filtered & Sorted Transactions
  const filteredTransactions = allHouseholdTransactions
    .filter(tx => {
      // Type filter
      if (activeTypeFilter === 'expense' && tx.type !== 'expense') return false;
      if (activeTypeFilter === 'pool' && tx.type !== 'pool_deposit' && tx.type !== 'pool_allocation') return false;

      // Member filter
      if (memberFilter !== 'all' && tx.user_id !== Number(memberFilter)) return false;

      // Category filter (only applicable to expenses)
      if (categoryFilter !== 'all') {
        if (tx.type !== 'expense' || tx.category_id !== Number(categoryFilter)) return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const member = users.find(u => u.user_id === tx.user_id);
        const memberName = `${member?.first_name || ''} ${member?.last_name || ''}`.toLowerCase();
        const category = categories.find(c => c.category_id === tx.category_id);
        const categoryName = category?.category_name.toLowerCase() || '';

        const matchTitle = tx.title.toLowerCase().includes(q);
        const matchNotes = (tx.notes || '').toLowerCase().includes(q);
        const matchMethod = (tx.payment_method || '').toLowerCase().includes(q);

        if (!matchTitle && !matchNotes && !matchMethod && !memberName.includes(q) && !categoryName.includes(q)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'oldest') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'highest') return b.amount - a.amount;
      if (sortBy === 'lowest') return a.amount - b.amount;
      return 0;
    });

  // Aggregated totals for the filtered results
  const filteredExpenseTotal = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const filteredContributions = filteredTransactions.filter(t => t.type === 'pool_deposit').reduce((sum, t) => sum + t.amount, 0);
  const filteredAllocations = filteredTransactions.filter(t => t.type === 'pool_allocation').reduce((sum, t) => sum + t.amount, 0);

  const resetFilters = () => {
    setActiveTypeFilter('all');
    setSearchQuery('');
    setMemberFilter('all');
    setCategoryFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters = activeTypeFilter !== 'all' || searchQuery !== '' || memberFilter !== 'all' || categoryFilter !== 'all' || sortBy !== 'newest';

  return (
    <div>
      {/* Central Pooled Fund Component */}
      <PooledFundCard 
        currentUser={currentUser}
        poolData={pooledFund}
        transactions={poolTransactions}
        onDataChange={onDataChange}
      />

      {/* Parent Dashboard Card: Private Family Invite Code & Copy Invite Link Button */}
      {currentUser?.role === 'parent' && (
        <FamilyInviteCard 
          currentFamily={currentFamily}
          currentUser={currentUser}
        />
      )}

      {/* Quick Actions & High-level Financial Widgets (Dynamic Parent vs. Child Role Check) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Household Cashflow Overview</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {currentUser?.role === 'parent' 
              ? '👑 Parent Admin View: Full control to contribute & disburse pot funds'
              : 'Child Contributor View: Contribute to pot & request fund allocations'}
          </span>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
        {/* Total Pooled Contributions Card */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <span>TOTAL CONTRIBUTIONS</span>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.35rem', borderRadius: '8px' }}>
              <TrendingUp size={18} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: '#10b981' }}>
            ₦{totalContributions.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pooled contributions from household</span>
        </div>

        {/* Total Expenses Card */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <span>TOTAL FAMILY EXPENSES</span>
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', padding: '0.35rem', borderRadius: '8px' }}>
              <TrendingDown size={18} color="#f43f5e" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
            ₦{totalExpenses.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{expenses.length} transaction{expenses.length === 1 ? '' : 's'} recorded</span>
        </div>

        {/* Pot Allocations Disbursed */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <span>POT ALLOCATIONS</span>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '0.35rem', borderRadius: '8px' }}>
              <ArrowDownLeft size={18} color="#3b82f6" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: '#38bdf8' }}>
            ₦{totalAllocations.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Disbursed from shared vault</span>
        </div>

        {/* Pooled Bank Fund */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <span>SHARED FAMILY POT</span>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '0.35rem', borderRadius: '8px' }}>
              <Landmark size={18} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: '#f59e0b' }}>
            ₦{Number(pooledFund?.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>100% transparent Family Pot</span>
        </div>
      </div>

      {/* COMPREHENSIVE HOUSEHOLD TRANSACTION HISTORY (Takes over the remaining executive dashboard) */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Receipt size={22} color="#10b981" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Household Transaction History & Ledger</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                  Unified audit log of all expenditures, pooled contributions, and shared pot allocations.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Transaction Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button 
              onClick={() => setShowExpenseModal(true)} 
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            >
              <CreditCard size={14} /> + Expense
            </button>
          </div>
        </div>

        {/* Metric Bar for Active Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: 'var(--bg-primary)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Transactions Shown
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
              {filteredTransactions.length} of {allHouseholdTransactions.length}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Filtered Outflows
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f43f5e' }}>
              -₦{filteredExpenseTotal.toLocaleString()}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Filtered Contributions
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
              +₦{filteredContributions.toLocaleString()}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Filtered Allocations
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>
              ₦{filteredAllocations.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
          {/* Top Row: Type Pills & Search */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            {/* Type Selector Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All Activities (${allHouseholdTransactions.length})` },
                { id: 'expense', label: `Expenses (${expenses.length})` },
                { id: 'pool', label: `Shared Vault (${poolTransactions.length})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTypeFilter(tab.id)}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem',
                    background: activeTypeFilter === tab.id ? 'var(--primary)' : 'var(--bg-primary)',
                    color: activeTypeFilter === tab.id ? '#ffffff' : 'var(--text-muted)',
                    borderColor: activeTypeFilter === tab.id ? 'var(--primary)' : 'var(--border-color)',
                    fontWeight: activeTypeFilter === tab.id ? 700 : 500
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Keyword Search Input */}
            <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 240px' }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text"
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions, notes, members, categories..."
                style={{ paddingLeft: '2.4rem', fontSize: '0.825rem' }}
              />
            </div>
          </div>

          {/* Bottom Row: Dropdown Filters & Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Member Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Member:</span>
              <select
                className="form-select"
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', width: 'auto' }}
              >
                <option value="all">All Family Members</option>
                {users.map(u => (
                  <option key={u.user_id} value={u.user_id}>{u.avatar} {u.first_name} {u.last_name}</option>
                ))}
              </select>
            </div>

            {/* Category Dropdown (Expenses) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category:</span>
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', width: 'auto' }}
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.category_id} value={c.category_id}>{c.icon} {c.category_name}</option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sort:</span>
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', width: 'auto' }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}
              >
                <RotateCcw size={13} /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Transaction Details</th>
                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Member User</th>
                <th style={{ padding: '0.75rem 1rem' }}>Method / Channel</th>
                <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Amount (₦)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map(tx => {
                  const member = users.find(u => u.user_id === tx.user_id);
                  const category = categories.find(c => c.category_id === tx.category_id);

                  const isExpense = tx.type === 'expense';
                  const isPoolDeposit = tx.type === 'pool_deposit';
                  const isPoolAlloc = tx.type === 'pool_allocation';

                  return (
                    <tr 
                      key={tx.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Description & Category */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.4rem' }}>
                            {category?.icon || (isPoolDeposit ? '📥' : '📤')}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                              {tx.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {category?.category_name || (isPoolDeposit ? 'Shared Pot Deposit' : 'Shared Pot Allocation')}
                              {tx.notes && ` • "${tx.notes}"`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {tx.date}
                      </td>

                      {/* Logged By */}
                      <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.1rem' }}>{member?.avatar || '👤'}</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                              {member?.first_name} {member?.last_name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: member?.role === 'parent' ? '#10b981' : '#60a5fa' }}>
                              {member?.role === 'parent' ? 'Parent' : 'Child'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Payment Method / Channel */}
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {tx.payment_method}
                      </td>

                      {/* Transaction Type Badge */}
                      <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                        {isExpense && (
                          <span className="badge badge-danger">
                            <TrendingDown size={12} /> Expense
                          </span>
                        )}
                        {isPoolDeposit && (
                          <span className="badge badge-parent">
                            <ArrowUpRight size={12} /> Pot Contribution
                          </span>
                        )}
                        {isPoolAlloc && (
                          <span className="badge badge-warning">
                            <ArrowDownLeft size={12} /> Pot Allocation
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td style={{ 
                        padding: '0.9rem 1rem', 
                        textAlign: 'right', 
                        fontWeight: 700, 
                        fontSize: '0.95rem',
                        color: isExpense ? '#f43f5e' : isPoolDeposit ? '#10b981' : '#f59e0b',
                        whiteSpace: 'nowrap'
                      }}>
                        {isExpense && `-₦${tx.amount.toLocaleString()}`}
                        {isPoolDeposit && `+₦${tx.amount.toLocaleString()}`}
                        {isPoolAlloc && `-₦${tx.amount.toLocaleString()}`}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <Filter size={32} color="var(--text-subtle)" />
                      <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                        {allHouseholdTransactions.length === 0 ? 'No transactions recorded yet' : 'No transactions match your filter criteria'}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', margin: 0 }}>
                        {allHouseholdTransactions.length === 0 
                          ? 'Contribute to the family pot or log a shared expense to begin your ledger.'
                          : 'Try clearing search terms or resetting filters to view all household financial records.'}
                      </p>
                      {allHouseholdTransactions.length > 0 && (
                        <button onClick={resetFilters} className="btn btn-secondary" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Modal */}
      <ExpenseFormModal 
        currentUser={currentUser}
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onExpenseAdded={onDataChange}
      />

      {/* Child Allocation Request Modal */}
      <AllocationRequestModal 
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        currentUser={currentUser}
        onRequestSubmitted={onDataChange}
      />

      {/* Parent Direct Allocate Modal */}
      {showAllocateModal && currentUser?.role === 'parent' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <ArrowDownLeft color="#f59e0b" /> Allocate Pooled Funds (Parent Admin)
              </h3>
              <button 
                onClick={() => setShowAllocateModal(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              setAllocateError('');
              if (!directAllocateAmount || Number(directAllocateAmount) <= 0) {
                setAllocateError('Please enter a valid allocation amount (₦).');
                return;
              }
              try {
                const targetBowl = categories.find(c => (c.category_id || c.id) === Number(directAllocateBowlId)) || categories[0];
                db.allocateFromPool(
                  currentUser.user_id || currentUser.id,
                  directAllocateAmount,
                  directAllocatePurpose || `Allocation for ${targetBowl?.category_name}`,
                  familyId
                );
                setAllocateSuccess(`₦${Number(directAllocateAmount).toLocaleString()} allocated successfully!`);
                setDirectAllocateAmount('');
                setDirectAllocatePurpose('');
                onDataChange();
                setTimeout(() => {
                  setAllocateSuccess('');
                  setShowAllocateModal(false);
                }, 1200);
              } catch (err) {
                setAllocateError(err.message || 'Allocation failed');
              }
            }}>
              <div className="modal-body">
                {allocateError && (
                  <div style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f87171', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    ⚠️ {allocateError}
                  </div>
                )}
                {allocateSuccess && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    ✅ {allocateSuccess}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Available Pooled Balance</label>
                  <input type="text" className="form-input" value={`₦${Number(pooledFund?.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`} disabled style={{ opacity: 0.7 }} />
                </div>

                <div className="form-group">
                  <label className="form-label">Destination Smart Bowl</label>
                  <select 
                    className="form-select"
                    value={directAllocateBowlId}
                    onChange={(e) => setDirectAllocateBowlId(e.target.value)}
                  >
                    {categories.map(c => (
                      <option key={c.category_id || c.id} value={c.category_id || c.id}>
                        {c.icon || '🍲'} {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Allocation Amount (₦)</label>
                  <input 
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 50000"
                    className="form-input"
                    value={directAllocateAmount}
                    onChange={(e) => setDirectAllocateAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Purpose Note</label>
                  <input 
                    type="text"
                    placeholder="e.g. House Rent Advance / Children School Fees"
                    className="form-input"
                    value={directAllocatePurpose}
                    onChange={(e) => setDirectAllocatePurpose(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAllocateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-accent">Execute Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
