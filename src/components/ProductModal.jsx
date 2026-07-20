import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCart, money } from '../lib/CartContext'

export default function ProductModal({
  product,
  onClose,
  allProducts = [],
  onSelectProduct,
}) {
  const { addItem } = useCart()
  const [groups, setGroups] = useState([])
  const [selected, setSelected] = useState({}) // groupId -> [optionIds]
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(true)

  // ---------- Galería ----------
  const photos = useMemo(() => {
    const extra = Array.isArray(product.images) ? product.images : []
    return [product.image_url, ...extra].filter(Boolean)
  }, [product])
  const [photoIdx, setPhotoIdx] = useState(0)
  const touchX = useRef(null)

  function prevPhoto() {
    setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)
  }
  function nextPhoto() {
    setPhotoIdx((i) => (i + 1) % photos.length)
  }
  function onTouchStart(e) {
    touchX.current = e.touches[0].clientX
  }
  function onTouchEnd(e) {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 40) return
    if (dx < 0) nextPhoto()
    else prevPhoto()
  }

  // ---------- Recomendados ----------
  const related = useMemo(() => {
    const avail = allProducts.filter(
      (p) =>
        p.id !== product.id &&
        p.is_active !== false &&
        !(p.stock !== null && p.stock !== undefined && p.stock <= 0)
    )
    const same = avail.filter(
      (p) => product.category_id && p.category_id === product.category_id
    )
    const others = avail.filter(
      (p) => !product.category_id || p.category_id !== product.category_id
    )
    return [...same, ...others].slice(0, 6)
  }, [allProducts, product])

  useEffect(() => {
    async function load() {
      const { data: gs } = await supabase
        .from('modifier_groups')
        .select('*, modifier_options(*)')
        .eq('product_id', product.id)
        .order('sort_order')
      setGroups(gs || [])
      setLoading(false)
    }
    load()
  }, [product.id])

  function toggle(group, option) {
    setSelected((prev) => {
      const current = prev[group.id] || []
      const has = current.includes(option.id)
      let next
      if (group.max_select === 1) {
        next = has ? [] : [option.id]
      } else if (has) {
        next = current.filter((id) => id !== option.id)
      } else if (current.length < group.max_select) {
        next = [...current, option.id]
      } else {
        next = current
      }
      return { ...prev, [group.id]: next }
    })
  }

  const chosenOptions = useMemo(() => {
    const all = []
    for (const g of groups) {
      const ids = selected[g.id] || []
      for (const o of g.modifier_options || []) {
        if (ids.includes(o.id)) all.push(o)
      }
    }
    return all
  }, [groups, selected])

  const missingRequired = groups.some(
    (g) => (selected[g.id] || []).length < g.min_select
  )

  const total =
    (Number(product.price) +
      chosenOptions.reduce((s, o) => s + Number(o.price_delta), 0)) *
    qty

  const maxQty = product.stock !== null && product.stock !== undefined ? product.stock : Infinity

  function confirm() {
    addItem(product, chosenOptions, qty)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {photos.length > 0 && (
          <div className="modal-gallery">
            <div
              className="modal-gallery-main"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <img src={photos[photoIdx]} alt={product.name} />
              {photos.length > 1 && (
                <>
                  <button
                    className="gal-arrow left"
                    onClick={prevPhoto}
                    aria-label="Foto anterior"
                  >
                    ‹
                  </button>
                  <button
                    className="gal-arrow right"
                    onClick={nextPhoto}
                    aria-label="Foto siguiente"
                  >
                    ›
                  </button>
                  <div className="gal-dots" aria-hidden="true">
                    {photos.map((_, i) => (
                      <span key={i} className={i === photoIdx ? 'on' : ''} />
                    ))}
                  </div>
                </>
              )}
            </div>
            {photos.length > 1 && (
              <div className="modal-gallery-thumbs">
                {photos.map((url, i) => (
                  <button
                    key={url}
                    className={i === photoIdx ? 'on' : ''}
                    onClick={() => setPhotoIdx(i)}
                    aria-label={`Foto ${i + 1}`}
                  >
                    <img src={url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="modal-body">
          <h2>{product.name}</h2>
          {product.description && <p className="desc">{product.description}</p>}

          {loading && <p className="desc">Cargando opciones…</p>}

          {maxQty !== Infinity && maxQty <= 5 && (
            <p className="stock-note">Quedan {maxQty} disponibles</p>
          )}

          {groups.map((g) => (
            <fieldset key={g.id} className="mod-group">
              <legend>
                {g.name}
                <span className="mod-hint">
                  {g.min_select > 0
                    ? ` · obligatorio${g.max_select > 1 ? ` (hasta ${g.max_select})` : ''}`
                    : g.max_select > 1
                    ? ` · elegí hasta ${g.max_select}`
                    : ' · opcional'}
                </span>
              </legend>
              {(g.modifier_options || [])
                .filter((o) => o.is_active)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((o) => {
                  const checked = (selected[g.id] || []).includes(o.id)
                  return (
                    <label key={o.id} className={checked ? 'mod-option checked' : 'mod-option'}>
                      <input
                        type={g.max_select === 1 ? 'radio' : 'checkbox'}
                        name={g.id}
                        checked={checked}
                        onChange={() => toggle(g, o)}
                      />
                      <span>{o.name}</span>
                      {Number(o.price_delta) !== 0 && (
                        <span className="delta">+{money(o.price_delta)}</span>
                      )}
                    </label>
                  )
                })}
            </fieldset>
          ))}

          <div className="modal-actions">
            <div className="qty">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Restar">−</button>
              <span>{qty}</span>
              <button
                onClick={() => setQty(Math.min(maxQty, qty + 1))}
                disabled={qty >= maxQty}
                aria-label="Sumar"
              >
                +
              </button>
            </div>
            <button
              className="btn-primary"
              disabled={missingRequired}
              onClick={confirm}
            >
              Agregar {money(total)}
            </button>
          </div>

          {onSelectProduct && related.length > 0 && (
            <div className="related">
              <h3>También te puede interesar</h3>
              <div className="related-strip">
                {related.map((r) => (
                  <button
                    key={r.id}
                    className="related-card"
                    onClick={() => onSelectProduct(r)}
                  >
                    {r.image_url ? (
                      <img src={r.image_url} alt="" loading="lazy" />
                    ) : (
                      <div className="related-img placeholder" />
                    )}
                    <strong>{r.name}</strong>
                    <span>{money(r.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
    </div>
  )
}
