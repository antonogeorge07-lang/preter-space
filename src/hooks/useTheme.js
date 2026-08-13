import { useSyncExternalStore, useCallback } from 'react';

const STORAGE_KEY = 'theme';
const DARK_CLASS = 'theme-dark';

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light') return 'light';
    if (stored === 'dark') return 'dark';
  } catch {}
  return 'dark';
}

let currentTheme = getInitialTheme();
const listeners = new Set();

function applyTheme(theme) {
  currentTheme = theme;
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add(DARK_CLASS);
  else root.classList.remove(DARK_CLASS);
  try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  listeners.forEach(l => l());
}

function subscribe(listener) {
  listeners.add(listener);
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY) {
      currentTheme = e.newValue === 'light' ? 'light' : 'dark';
      const root = document.documentElement;
      if (currentTheme === 'dark') root.classList.add(DARK_CLASS);
      else root.classList.remove(DARK_CLASS);
      listeners.forEach(l => l());
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot() { return currentTheme; }
function getServerSnapshot() { return 'dark'; }

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }, []);
  const setTheme = useCallback((t) => {
    if (t === 'light' || t === 'dark') applyTheme(t);
  }, []);
  return { theme, toggle, setTheme, isDark: theme === 'dark' };
}