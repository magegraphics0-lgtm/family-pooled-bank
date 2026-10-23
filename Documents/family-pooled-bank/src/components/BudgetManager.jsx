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
        {categories.map(cat => {
          const limitObj = budgetLimits.find(b => b.category_id === cat.category_id);
          const limitAmount = limitObj ? Number(limitObj.amount) : 0;
          
          const totalSpent = expenses
            .filter(e => e.category_id === cat.category_id)
            .reduce((sum, e) => sum + Number(e.amount), 0);

          const percent = limitAmount > 0 ? Math.round((totalSpent / limitAmount) * 100) : 0;
          const isEditing = editingCategoryId === cat.category_id;

          return (
            <div key={cat.category_id} className="glass-panel" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1.6rem' }}>{cat.icon}</span>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{cat.category_name}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Period: Monthly</span>
                  </div>
                </div>

                {isParent && !isEditing && (
                  <button 
                    onClick={() => {
                      setEditingCategoryId(cat.category_id);
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Spent to Date: </span>
                      <strong style={{ fontSize: '1rem', color: percent >= 100 ? '#f43f5e' : percent >= 80 ? '#f59e0b' : '#10b981' }}>
                        ₦{totalSpent.toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Cap: </span>
                      <strong style={{ fontSize: '1rem', color: '#ffffff' }}>
                        ₦{limitAmount.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(percent, 100)}%`,
                      height: '100%',
                      background: percent >= 100 ? '#f43f5e' : percent >= 80 ? '#f59e0b' : '#10b981',
                      borderRadius: '4px'
                    }} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
