import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './tokens.css';
import './styles.css';

// Initialize PWA: service worker registration and offline detection
import { registerServiceWorker, setupOfflineDetection } from './pwa.js';

// Register service worker
registerServiceWorker().catch((err) => {
  console.warn('Failed to register service worker:', err);
});

// Set up offline/online detection
setupOfflineDetection(
  () => {
    console.log('App is online - fresh data available');
    // Dispatch event that components can listen to
    window.dispatchEvent(new CustomEvent('app-online'));
  },
  () => {
    console.log('App is offline - using cached data');
    // Dispatch event that components can listen to
    window.dispatchEvent(new CustomEvent('app-offline'));
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
