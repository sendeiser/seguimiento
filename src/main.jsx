import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './css/main.css'
import { AuthProvider } from './providers/AuthProvider.jsx'
import { ThemeProvider } from './providers/ThemeProvider.jsx'
import { ToastProvider } from './providers/ToastProvider.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
