import { createContext, useContext, useMemo, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([]) // {key, product, quantity, modifiers, unitPrice}

  function addItem(product, modifiers, quantity) {
    const modsPrice = modifiers.reduce((s, m) => s + Number(m.price_delta), 0)
    const unitPrice = Number(product.price) + modsPrice
    const key = product.id + '|' + modifiers.map((m) => m.id).sort().join(',')
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key)
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + quantity } : i
        )
      }
      return [...prev, { key, product, modifiers, quantity, unitPrice }]
    })
  }

  function updateQty(key, quantity) {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, quantity } : i))
    )
  }

  function clear() {
    setItems([])
  }

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [items]
  )
  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items])

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, clear, subtotal, count }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)

export const money = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
