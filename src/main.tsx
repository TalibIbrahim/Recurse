import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find root DOM element');
}

// Purge any legacy demo state from previous browser sessions
try {
  localStorage.removeItem('codegrind_demo_mode_active');
  localStorage.removeItem('codegrind_demo_store_v1');
  localStorage.removeItem('codegrind_demo_store');
} catch {
  // Ignore localStorage access failures
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
