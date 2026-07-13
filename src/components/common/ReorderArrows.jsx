import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

// Up/down control used across expert dashboard offer lists (Sessions,
// Subscriptions, Products, Books, Custom Offerings, Highlights) so experts
// can reorder items within a list — the saved array order is what the
// public profile renders, so this is the single source of truth for display order.
export function ReorderArrows({ onMoveUp, onMoveDown, disableUp, disableDown }) {
  const btnStyle = (disabled) => ({
    width: 34,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    border: '1.5px solid var(--teal)',
    background: disabled ? 'rgba(0,0,0,0.03)' : 'rgba(26,184,160,0.1)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    color: 'var(--teal)',
  });

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button
        type="button"
        title="Move up"
        onClick={onMoveUp}
        disabled={disableUp}
        style={btnStyle(disableUp)}
      >
        <ChevronUp size={18} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        title="Move down"
        onClick={onMoveDown}
        disabled={disableDown}
        style={btnStyle(disableDown)}
      >
        <ChevronDown size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}
