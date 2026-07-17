// ============================================================
// Horarios de atención por tienda (settings.schedule)
// Formato: { enabled: bool, days: { '0'..'6': { on, from, to } } }
// Claves de día según JS: 0=domingo ... 6=sábado
// "to" menor o igual que "from" = cruza la medianoche (ej: 20:00 a 02:00)
// "00:00" como cierre = hasta la medianoche en punto
// ============================================================

export const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const toMins = (t) => {
  const [h, m] = (t || '00:00').split(':').map(Number)
  return h * 60 + (m || 0)
}

function slotCovers(cfg, minsFromDayStart) {
  if (!cfg?.on) return false
  const from = toMins(cfg.from)
  let to = toMins(cfg.to)
  if (to === 0) to = 1440
  if (to <= from) to += 1440 // cruza medianoche
  return minsFromDayStart >= from && minsFromDayStart < to
}

export function isStoreOpen(schedule) {
  if (!schedule?.enabled) return true
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const day = now.getDay()
  if (slotCovers(schedule.days?.[day], mins)) return true
  // madrugada: puede seguir abierto el turno de ayer que cruzó medianoche
  const yesterday = (day + 6) % 7
  if (slotCovers(schedule.days?.[yesterday], mins + 1440)) return true
  return false
}

export function nextOpening(schedule) {
  if (!schedule?.enabled) return null
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const today = now.getDay()
  for (let offset = 0; offset < 7; offset++) {
    const d = (today + offset) % 7
    const cfg = schedule.days?.[d]
    if (!cfg?.on) continue
    const from = toMins(cfg.from)
    if (offset === 0 && mins >= from) continue // hoy ya pasó la apertura
    const when = offset === 0 ? 'hoy' : offset === 1 ? 'mañana' : `el ${DAY_NAMES[d]}`
    return `${when} a las ${cfg.from}`
  }
  return null
}
