import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

// Small up/down control used across expert dashboard offer lists (Sessions,
// Subscriptions, Products, Books, Custom Offerings, Highlights) so experts
// can reorder items within a list — the saved array order is what the
// public profile renders, so this is the single source of truth for display order.
export function ReorderArrows({ onMoveUp, onMoveDown, disableUp, disableDown }) {
  const btnStyle = (disabled) => ({
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    border: '1px solid rgba(0,0,0,0.1)',
    background: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    color: 'var(--sl)',
  });

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button
        type="button"
        title="Move up"
        onClick={onMoveUp}
        disabled={disableUp}
        style={btnStyle(disableUp)}
      >
        <ChevronUp size={13} />
      </button>
      <button
        type="button"
        title="Move down"
        onClick={onMoveDown}
        disabled={disableDown}
        style={btnStyle(disableDown)}
      >
        <ChevronDown size={13} />
      </button>
    </div>
  );
}
