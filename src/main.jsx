import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { TenantProvider } from './lib/TenantContext'
import { CartProvider } from './lib/CartContext'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <TenantProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </TenantProvider>
    </BrowserRouter>
  </React.StrictMode>
)
