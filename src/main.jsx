import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Adaptive dark mode — follow system preference in real-time
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
const applyDarkMode = (isDark) => {
  document.documentElement.classList.toggle('dark', isDark);
};
applyDarkMode(darkModeQuery.matches);
darkModeQuery.addEventListener('change', (e) => applyDarkMode(e.matches));

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

// Online-only mode: clear any stale caches from previous versions so the app
// always fetches fresh data. The service worker (registered in index.html)
// stays active for PWA installability but performs no caching.
if (window.caches) {
  window.addEventListener('load', async () => {
    const keys = await window.caches.keys();
    for (const key of keys) {
      await window.caches.delete(key);
    }
  });
}

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}