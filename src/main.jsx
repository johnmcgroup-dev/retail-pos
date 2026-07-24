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

// Online-only mode: unregister any service worker and clear all caches so the
// app always fetches fresh data from the server.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
    }
    if (window.caches) {
      const keys = await window.caches.keys();
      for (const key of keys) {
        await window.caches.delete(key);
      }
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