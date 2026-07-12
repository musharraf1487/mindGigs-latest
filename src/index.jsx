import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PlatformConfigProvider } from './context/PlatformConfigContext';

// Render-failure watchdog: if the app hasn't painted anything into #root
// within a few seconds, surface whatever error caused it directly on the
// page instead of leaving visitors staring at a blank white screen with no
// way to tell us what happened.
let bootError = null;
window.addEventListener('error', (e) => {
  bootError = e.error?.stack || e.message || String(e);
  console.error('[boot] Uncaught error:', bootError);
});
window.addEventListener('unhandledrejection', (e) => {
  bootError = e.reason?.stack || e.reason?.message || String(e.reason);
  console.error('[boot] Unhandled promise rejection:', bootError);
});

const rootEl = document.getElementById('root');

setTimeout(() => {
  if (rootEl && rootEl.childElementCount === 0) {
    rootEl.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
        <div style="max-width:520px;text-align:center;">
          <h1 style="font-size:1.3rem;margin-bottom:12px;">Something went wrong loading this page</h1>
          <p style="color:#64748B;font-size:.9rem;margin-bottom:16px;">Please refresh, or contact support if this keeps happening.</p>
          ${bootError ? `<pre style="text-align:left;white-space:pre-wrap;background:#f4f6f9;border-radius:8px;padding:12px;font-size:.75rem;color:#e84444;overflow:auto;max-height:240px;">${bootError.replace(/</g, '&lt;')}</pre>` : ''}
        </div>
      </div>`;
  }
}, 6000);

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <PlatformConfigProvider>
          <App />
        </PlatformConfigProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
