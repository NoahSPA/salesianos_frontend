/**
 * Paleta de colores para badges de serie. Mismo orden en todo el sistema
 * para que una serie (p. ej. "Golden") siempre tenga el mismo color.
 */
const SERIES_BADGE_PALETTE = [
  'sf-badge-blue',
  'sf-badge-emerald',
  'sf-badge-violet',
  'sf-badge-amber',
  'sf-badge-rose',
  'sf-badge-cyan',
  'sf-badge-orange',
  'sf-badge-indigo',
] as const

const FALLBACK = 'sf-badge-slate'

/** Hash estable: mismo series_id → mismo índice. */
function hashSeriesId(seriesId: string): number {
  let h = 0
  const s = String(seriesId)
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return h
}

/**
 * Devuelve la clase de badge (sf-badge-*) que corresponde a la serie.
 * Mismo series_id siempre produce el mismo color en toda la app.
 */
export function getSeriesBadgeColor(seriesId: string): string {
  if (!seriesId) return FALLBACK
  const index = hashSeriesId(seriesId) % SERIES_BADGE_PALETTE.length
  return SERIES_BADGE_PALETTE[index]
}
