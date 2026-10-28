import React, { useState } from 'react';
import { 
  Users, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  QrCode,
  Lock
} from 'lucide-react';

export default function FamilyInviteCard({ currentFamily, currentUser }) {
  const [copied, setCopied] = useState(false);

  // Resolve invite code dynamically from active family object
  const inviteCode = currentFamily?.invite_code || '';
  const familyName = currentFamily?.family_name || 'Your Household';

  // Build registration invite URL
  const inviteUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/register?invite=${inviteCode}`
    : `https://onepot.app/register?invite=${inviteCode}`;

  const handleCopyLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
      } else {
        // Fallback for older browser contexts
        const textArea = document.createElement('textarea');
        textArea.value = inviteUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Could not copy link to clipboard:', err);
    }
  };

  return (
    <div 
      className="card family-invite-card"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.25s ease'
      }}
    >
      {/* Decorative background glow element */}
      <div 
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0) 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Header with Title & Role Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Private Family Invite Link
              </h3>
              <span style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 700
              }}>
                Parent Admin Vault
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Share this exclusive invite code with household members to join <strong>{familyName}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Main Code Highlight & Action Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-primary)',
        border: '1px dashed var(--border-color)',
        borderRadius: '14px',
        padding: '0.85rem 1.15rem',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}>
        {/* Code badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Invite Code:
          </div>
          <div 
            id="family-invite-code-badge"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '0.3rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}
          >
            {inviteCode}
          </div>
        </div>

        {/* Copy Invite Link Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            id="copy-invite-link-btn"
            type="button"
            onClick={handleCopyLink}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: copied ? '#059669' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: copied ? '0 4px 12px rgba(5, 150, 105, 0.4)' : '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}
          >
            {copied ? (
              <>
                <Check size={16} />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy Invite Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security Privacy Notice */}
      <div style={{
        marginTop: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        fontSize: '0.74rem',
        color: 'var(--text-subtle)'
      }}>
        <Lock size={12} color="var(--primary)" />
        <span>
          Private Vault: Registration without a valid family invite code is automatically blocked to keep your pooled finances safe.
        </span>
      </div>
    </div>
  );
}
