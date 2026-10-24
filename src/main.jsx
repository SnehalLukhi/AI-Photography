import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { loadCatalogue } from './lib/catalogue.js'
import './index.css'

// The template catalogue comes from the backend. It is loaded first and the app's modules are imported afterwards, because they build their
// template lists when they are evaluated. If the backend does not answer, the bundled templates are used.
async function start() {
  await loadCatalogue()
  const { default: App } = await import('./App.jsx')
  const { StudioProvider } = await import('./context/StudioContext.jsx')
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <StudioProvider>
          <App />
        </StudioProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
}
start()
