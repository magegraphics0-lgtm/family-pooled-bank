import React, { useState } from 'react';
import { PieChart, Lock, ShieldCheck, CheckCircle } from 'lucide-react';
import { db } from '../services/db';

export default function BudgetManager({ currentUser, onDataChange }) {
  const familyId = currentUser?.family_id || 1;
  const categories = db.getCategories();
  const budgetLimits = db.getBudgetLimits(familyId);
  const expenses = db.getExpenses(familyId);

  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [newLimitAmount, setNewLimitAmount] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isParent = currentUser.role === 'parent';

  const handleSaveLimit = (categoryId) => {
    if (!isParent) {
      alert('🔒 Access Restricted: Only Parent Managers can edit spending caps.');
      return;
    }

    if (!newLimitAmount || Number(newLimitAmount) < 0) {
      return;
    }

    db.updateBudgetLimit(categoryId, newLimitAmount, familyId);
    setEditingCategoryId(null);
    setSuccessMsg('Budget spending limit updated successfully!');
    onDataChange();

    setTimeout(() => setSuccessMsg(''), 3500);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart color="#10b981" /> Monthly Category Budget Caps & Spending Limits
          </h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Configured limits automatically trigger real-time SMTP Email Alerts at 80% & 100% threshold consumption.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isParent ? (
            <span className="badge badge-parent"><ShieldCheck size={14} /> Parent Admin Mode</span>
          ) : (
            <span className="badge badge-child"><Lock size={14} /> Child Read-Only Mode</span>
          )}
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
          <CheckCircle size={20} /> {successMsg}
        </div>
      )}

      <div className="grid-2">
        {categories.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3.5rem 1rem', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-muted)' }}>
            <PieChart size={36} color="var(--text-subtle)" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>No Smart Bowls Configured Yet</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
              Smart Bowls categorize household expenses and track monthly spending limits.
            </p>
          </div>
        ) : (
          categories.map(cat => {
            const catId = cat.category_id || cat.id;
            const limitObj = budgetLimits.find(b => (b.category_id || b.limit_id) === catId);
            const limitAmount = limitObj ? Number(limitObj.amount) : Number(cat.allocated_amount || 0);
            
            const totalSpent = expenses
              .filter(e => (e.category_id || e.bowl_id) === catId)
              .reduce((sum, e) => sum + Number(e.amount), 0);

            const remainingAmount = Math.max(limitAmount - totalSpent, 0);
            const percent = limitAmount > 0 ? Math.round((totalSpent / limitAmount) * 100) : 0;
            const isEditing = editingCategoryId === catId;

            return (
              <div key={catId} className="glass-panel" style={{ padding: '1.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.6rem' }}>{cat.icon || '🍲'}</span>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{cat.category_name}</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Period: Monthly</span>
                    </div>
                  </div>

                  {isParent && !isEditing && (
                    <button 
                      onClick={() => {
                        setEditingCategoryId(catId);
                        setNewLimitAmount(limitAmount);
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    >
                      Edit Cap
                    </button>
                  )}
                </div>

              {isEditing ? (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <input 
                    type="number"
                    step="1000"
                    className="form-input"
                    value={newLimitAmount}
                    onChange={(e) => setNewLimitAmount(e.target.value)}
                    placeholder="Enter limit in ₦"
                    style={{ padding: '0.4rem 0.65rem', fontSize: '0.85rem' }}
                  />
                  <button onClick={() => handleSaveLimit(cat.category_id)} className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>Save</button>
                  <button onClick={() => setEditingCategoryId(null)} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>Cancel</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.65rem' }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Amount Spent: </span>
                      <strong style={{ fontSize: '1.05rem', color: percent >= 100 ? '#f43f5e' : percent >= 80 ? '#f59e0b' : 'var(--primary)' }}>
                        ₦{totalSpent.toLocaleString()}
                      </strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Amount Remaining: </span>
                      <strong style={{ fontSize: '1.05rem', color: remainingAmount <= 0 && limitAmount > 0 ? '#f43f5e' : 'var(--text-main)' }}>
                        ₦{remainingAmount.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {/* Explicit Progress Bar displaying Percentage and Amount Already Spent */}
                  <div style={{ marginTop: '0.4rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      marginBottom: '0.35rem',
                      color: percent >= 100 ? '#f43f5e' : percent >= 80 ? '#f59e0b' : 'var(--primary)'
                    }}>
                      <span>{percent}% Consumed</span>
                      <span>₦{totalSpent.toLocaleString()} Spent of ₦{limitAmount.toLocaleString()}</span>
                    </div>

                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '20px',
                      background: 'var(--bg-primary)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        width: `${Math.min(percent, 100)}%`,
                        height: '100%',
                        background: percent >= 100 ? '#f43f5e' : percent >= 80 ? '#f59e0b' : 'var(--primary)',
                        borderRadius: '10px',
                        transition: 'width 0.35s ease'
                      }} />
                      <span style={{
                        position: 'absolute',
                        width: '100%',
                        textAlign: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#ffffff',
                        textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                        pointerEvents: 'none',
                        letterSpacing: '0.2px'
                      }}>
                        {percent}% • ₦{totalSpent.toLocaleString()} Spent
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
    </div>
  );
}
