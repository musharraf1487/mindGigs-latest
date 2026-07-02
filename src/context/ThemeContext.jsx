import React, { useEffect } from 'react';

/**
 * ThemeProvider — enforces light mode on every mount.
 * Dark mode is permanently disabled for this project.
 */
export function ThemeProvider({ children }) {
  useEffect(() => {
    document.body.classList.remove('dark-theme');
  }, []);

  return children;
}
