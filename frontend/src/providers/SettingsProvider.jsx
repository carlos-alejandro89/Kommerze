'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Default settings object
const APP_SETTINGS = {
  general: {
    language: 'es',
  },
  theme: {
    mode: 'system',
  },
};

const SettingsContext = createContext(undefined);

const LOCAL_STORAGE_PREFIX = 'app_settings_';

const isBrowser = () => typeof window !== 'undefined';

function getFromPath(obj, path) {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

function setToPath(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const lastObj = keys.reduce((acc, key) => (acc[key] ??= {}), obj);
  lastObj[lastKey] = value;
  return { ...obj };
}

function getLeafFromStorage(path) {
  if (!isBrowser()) return undefined;
  try {
    const item = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${path}`);
    return item ? JSON.parse(item) : undefined;
  } catch (err) {
    return undefined;
  }
}

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(structuredClone(APP_SETTINGS));

  useEffect(() => {
    if (!isBrowser()) return;

    const init = structuredClone(APP_SETTINGS);
    Object.keys(localStorage)
      .filter((key) => key.startsWith(LOCAL_STORAGE_PREFIX))
      .forEach((key) => {
        const path = key.replace(LOCAL_STORAGE_PREFIX, '');
        const value = getLeafFromStorage(path);
        if (value !== undefined) {
          setToPath(init, path, value);
        }
      });
    setSettings(init);
  }, []);

  const getOption = useCallback((path) => {
    return getFromPath(settings, path);
  }, [settings]);

  const setOption = useCallback((path, value) => {
    setSettings((prev) => setToPath({ ...prev }, path, value));
  }, []);

  const contextValue = useMemo(
    () => ({ getOption, setOption, settings }),
    [getOption, setOption, settings],
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
};
