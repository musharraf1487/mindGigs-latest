import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PlatformConfigProvider } from './context/PlatformConfigContext';

ReactDOM.createRoot(document.getElementById('root')).render(
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
