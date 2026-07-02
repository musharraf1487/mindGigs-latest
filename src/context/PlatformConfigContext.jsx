import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribePlatformConfig, DEFAULT_CONFIG } from '../services/platformConfig';

const PlatformConfigContext = createContext(DEFAULT_CONFIG);

export function usePlatformConfig() {
  return useContext(PlatformConfigContext);
}

export function PlatformConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    // Subscribe to real-time Firestore updates
    const unsubscribe = subscribePlatformConfig((newConfig) => {
      setConfig(newConfig);
    });
    return () => unsubscribe();
  }, []);

  return (
    <PlatformConfigContext.Provider value={config}>
      {children}
    </PlatformConfigContext.Provider>
  );
}
