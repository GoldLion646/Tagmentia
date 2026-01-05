import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { clearOldLogoCaches } from './utils/clearOldCaches'

// Clear old logo caches before app starts
clearOldLogoCaches();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
