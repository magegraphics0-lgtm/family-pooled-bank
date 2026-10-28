import React, { useState } from 'react';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { db } from '../services/db';
import { SMTPNotificationService } from '../services/smtpService';

export default function ExpenseFormModal({ currentUser, isOpen, onClose, onExpenseAdded }) {
  const categories = db.getCategories();
  const [categoryId, setCategoryId] = useState(() => (categories[0]?.category_id || categories[0]?.id || 1));
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [dateSpent, setDateSpent] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [budgetAlert, setBudgetAlert] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setBudgetAlert(null);

    if (!amount || Number(amount) <= 0) {
      setErrorMsg('Please enter a valid expense amount in Naira (₦).');
      return;
    }

    try {
      // 1. Add expense to database (Table 3.5)
      const newExpense = db.addExpense({
        user_id: currentUser.user_id || currentUser.id,
        family_id: currentUser.family_id,
        category_id: Number(categoryId),
        amount: parseFloat(amount),
        payment_method: PaymentMethodFormatter(paymentMethod),
        date_spent: dateSpent,
        description: description || 'General Expense'
      });

      // 2. Compute updated category total
      const allExpenses = db.getExpenses(currentUser.family_id);
      const selectedCategory = categories.find(c => (c.category_id || c.id) === Number(categoryId));
      const categoryTotal = allExpenses
        .filter(ex => (ex.category_id || ex.bowl_id) === Number(categoryId))
        .reduce((sum, ex) => sum + Number(ex.amount), 0);

      // 3. Evaluate Budget Alert via SMTP service
      const currentFamily = db.getFamilyById(currentUser.family_id);
      const alertResult = SMTPNotificationService.evaluateBudgetAlerts(newExpense, selectedCategory, categoryTotal, currentFamily);

      onExpenseAdded();

      if (alertResult) {
        setBudgetAlert(alertResult);
      } else {
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error recording expense');
    }
  };

  const PaymentMethodFormatter = (val) => {
    return val;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard color="#f43f5e" /> Add Household Expense Entry
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {budgetAlert ? (
          /* Budget Warning / Overspend Result Banner (Figure 3.6 / 3.7 Output Design) */
          <div className="modal-body">
            <div style={{
              background: budgetAlert.severity === 'critical' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${budgetAlert.severity === 'critical' ? '#f43f5e' : '#f59e0b'}`,
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              textAlign: 'center'
            }}>
              <AlertTriangle size={48} color={budgetAlert.severity === 'critical' ? '#f43f5e' : '#f59e0b'} style={{ margin: '0 auto 0.75rem auto' }} />
              <h4 style={{ color: budgetAlert.severity === 'critical' ? '#f87171' : '#fbbf24', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                {budgetAlert.severity === 'critical' ? 'BUDGET LIMIT EXCEEDED!' : 'BUDGET LIMIT WARNING (80%+)'}
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '1rem', lineHeight: 1.5 }}>
                {budgetAlert.subject}
              </p>
              <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'left', marginBottom: '1rem' }}>
                ✉️ <strong>Automated SMTP Email Sent:</strong> Notifications dispatched to all household members ({db.getUsers(currentUser?.family_id).map(u => u.first_name).join(', ')}).
              </div>
              <button 
                onClick={() => { setBudgetAlert(null); onClose(); }} 
                className="btn btn-primary" 
                style={{ width: '100%' }}
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        ) : (
          /* Expense Form (Input Design Figure 3.5) */
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {errorMsg && (
                <div style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f87171', padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.8rem', color: '#60a5fa' }}>
                Logged By: <strong>{currentUser.first_name} {currentUser.last_name}</strong> ({currentUser.role.toUpperCase()})
              </div>

              <div className="form-group">
                <label className="form-label">Expense Category</label>
                <select 
                  className="form-select" 
                  value={categoryId} 
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat.category_id || cat.id} value={cat.category_id || cat.id}>
                      {cat.icon || '🍲'} {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount Spent (₦)</label>
                <input 
                  type="number" 
                  step="100" 
                  placeholder="e.g. 25000" 
                  className="form-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="grid-2" style={{ gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select 
                    className="form-select"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Bank Transfer">Bank Transfer (NIP/App)</option>
                    <option value="POS">POS Terminal</option>
                    <option value="Cash">Cash (Wallet/ATM)</option>
                    <option value="Card">Debit Card</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Date Spent</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={dateSpent}
                    onChange={(e) => setDateSpent(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description / Note</label>
                <input 
                  type="text" 
                  placeholder="e.g. NNPC Fuel / Market Groceries" 
                  className="form-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Expense Entry</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
