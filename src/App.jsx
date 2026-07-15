import { Routes, Route } from 'react-router-dom'
import { useTenant } from './lib/TenantContext'
import Store from './pages/Store'
import Checkout from './pages/Checkout'
import OrderConfirmed from './pages/OrderConfirmed'
import AdminLogin from './admin/AdminLogin'
import AdminLayout from './admin/AdminLayout'
import Orders from './admin/Orders'
import Products from './admin/Products'
import History from './admin/History'
import Settings from './admin/Settings'

export default function App() {
  const { tenant, loading, error } = useTenant()

  if (loading) return <div className="screen-msg">Cargando…</div>
  if (error === 'landing')
    return (
      <div className="screen-msg">
        <h1>Fornistore</h1>
        <p>Tiendas online para tu negocio: pedidos, pagos y panel de gestión.</p>
        <p className="desc">Muy pronto podrás crear tu tienda acá. 🚀</p>
      </div>
    )
  if (error || !tenant)
    return (
      <div className="screen-msg">
        <h1>Tienda no encontrada</h1>
        <p>Verificá la dirección de la tienda.</p>
      </div>
    )

  return (
    <Routes>
      <Route path="/" element={<Store />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/pedido/:orderNumber" element={<OrderConfirmed />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Orders />} />
        <Route path="productos" element={<Products />} />
        <Route path="historial" element={<History />} />
        <Route path="config" element={<Settings />} />
      </Route>
    </Routes>
  )
}
