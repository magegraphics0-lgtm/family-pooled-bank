import React, { useState } from 'react';
import { HandCoins, PieChart, ShieldAlert, CheckCircle, X } from 'lucide-react';
import { db } from '../services/db';

export default function AllocationRequestModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  onRequestSubmitted 
}) {
  const categories = db.getCategories() || [];
  
  const [selectedBowlId, setSelectedBowlId] = useState(categories[0]?.category_id || 1);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Please enter a valid requested amount greater than ₦0.');
      return;
    }

    if (!selectedBowlId) {
      setErrorMsg('Please select a destination Smart Bowl.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Please provide a brief reason for this allocation request.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedCategory = categories.find(c => (c.category_id || c.id) === Number(selectedBowlId));
      const bowlName = selectedCategory ? selectedCategory.category_name : 'Smart Bowl';

      db.requestAllocation({
        familyId: currentUser?.family_id,
        childId: currentUser?.user_id || currentUser?.id,
        bowlId: Number(selectedBowlId),
        amount: numAmount,
        description: description.trim()
      });

      setSuccessMsg(`Allocation request of ₦${numAmount.toLocaleString()} for ${bowlName} submitted for parent approval.`);
      setAmount('');
      setDescription('');
      
      if (onRequestSubmitted) {
        onRequestSubmitted();
      }

      setTimeout(() => {
        setSuccessMsg('');
        setIsSubmitting(false);
        onClose();
      }, 1400);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit allocation request.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <HandCoins color="var(--primary)" size={22} /> Request Fund Allocation
          </h3>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Child Contributor Notice */}
            <div style={{ 
              padding: '0.75rem 1rem', 
              background: 'rgba(59, 130, 246, 0.1)', 
              borderRadius: 'var(--radius-sm)', 
              marginBottom: '1.25rem', 
              fontSize: '0.8rem', 
              color: 'var(--accent-blue)', 
              lineHeight: 1.45,
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <strong>Child Contributor Workflow:</strong> Child accounts cannot allocate funds directly. Submitting this request stages it as <code>pending</code> and routes an instant real-time notification to your Family Parent Admins to Accept or Reject.
            </div>

            {errorMsg && (
              <div style={{ 
                background: 'rgba(244, 63, 94, 0.15)', 
                color: '#f87171', 
                padding: '0.75rem 1rem', 
                borderRadius: 'var(--radius-sm)', 
                marginBottom: '1rem', 
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <ShieldAlert size={16} /> {errorMsg}
              </div>
            )}

            {successMsg && (
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.15)', 
                border: '1px solid #10b981', 
                color: '#10b981', 
                padding: '0.75rem 1rem', 
                borderRadius: 'var(--radius-sm)', 
                marginBottom: '1rem', 
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle size={16} /> {successMsg}
              </div>
            )}

            {/* Smart Bowl Selection */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <PieChart size={15} color="var(--primary)" /> Target Smart Bowl
              </label>
              <select 
                className="form-select"
                value={selectedBowlId}
                onChange={(e) => setSelectedBowlId(e.target.value)}
                required
              >
                {categories.map(cat => (
                  <option key={cat.category_id || cat.id} value={cat.category_id || cat.id}>
                    {cat.icon || '🍲'} {cat.category_name}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                The specific household category/bowl this allocation will draw against upon parent approval.
              </span>
            </div>

            {/* Amount Input */}
            <div className="form-group">
              <label className="form-label">Requested Allocation Amount (₦)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--primary)' }}>
                  ₦
                </span>
                <input 
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 15000"
                  className="form-input"
                  style={{ paddingLeft: '2rem' }}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Reason / Description */}
            <div className="form-group">
              <label className="form-label">Reason / Short Description</label>
              <input 
                type="text"
                placeholder="e.g. Semester textbooks, lab materials, or transportation"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                A brief explanation visible directly to the parent in their notification drawer.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-accent"
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <HandCoins size={16} /> {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
