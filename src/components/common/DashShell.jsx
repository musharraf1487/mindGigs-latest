import React from 'react';


export function DashShell({
  sidebar,
  topbarTitle,
  topbarRight,
  children,
  dark = false,
}) {
  return (
    <div className="dash-layout">
      {sidebar}
      <div className={`dash-main ${dark ? 'dash-main-dark' : ''}`}>
        <div className={`dash-topbar ${dark ? 'dash-topbar-dark' : ''}`}>
          <div className="dash-topbar-title">{topbarTitle}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

            {topbarRight}
          </div>
        </div>
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}
