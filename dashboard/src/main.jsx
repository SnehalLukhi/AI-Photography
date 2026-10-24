import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import apps from './apps/index.js'
import { ConsoleProvider } from './core/store.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConsoleProvider apps={apps}><App /></ConsoleProvider>
  </React.StrictMode>,
)
