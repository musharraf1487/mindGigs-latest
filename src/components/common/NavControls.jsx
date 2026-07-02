import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function NavControls({ dark = false }) {
  const goBack = () => window.history.back();
  const goForward = () => window.history.forward();

  return (
    <div className="nav-controls" style={{ display: 'flex', gap: '8px', marginRight: '16px' }}>
      <button 
        onClick={goBack}
        className={`nav-btn ${dark ? 'nav-btn-dark' : 'nav-btn-light'}`}
        title="Go Back"
      >
        <ChevronLeft size={18} />
      </button>
      <button 
        onClick={goForward}
        className={`nav-btn ${dark ? 'nav-btn-dark' : 'nav-btn-light'}`}
        title="Go Forward"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
