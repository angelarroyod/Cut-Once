import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { useAppStore } from './state/store.ts';
import './index.css';

// Theme lives on <html> so the CSS palette switches; done before the first
// paint and on every change, so a reload never flashes the wrong palette.
const applyTheme = (theme: string) => {
  document.documentElement.dataset.theme = theme;
  // browser chrome follows the chosen palette, not just the system one (paper / paper-night)
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    m.setAttribute('content', theme === 'dark' ? '#0f1420' : '#f4f7fb');
  }
};
applyTheme(useAppStore.getState().theme);
useAppStore.subscribe((s) => applyTheme(s.theme));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
