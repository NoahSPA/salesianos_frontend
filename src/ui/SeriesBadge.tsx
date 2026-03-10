import { getSeriesBadgeColor } from '../app/seriesBadge'

type Props = {
  seriesId: string
  name?: string | null
  /** Color hex desde BD (ej. #3B82F6). Si viene, se usa en lugar de la paleta. */
  color?: string | null
  className?: string
}

/** Convierte #rrggbb a rgba( r, g, b, alpha ). */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Badge de serie unificado. Si la serie tiene color hex en BD se usa; si no, paleta por series_id.
 * Con color custom: un solo color en tonos suaves (fondo y borde tenues, texto en el color).
 */
export function SeriesBadge({ seriesId, name, color: hexColor, className = '' }: Props) {
  const label = name ?? (seriesId || 'Serie')
  const raw = hexColor?.trim()
  const normalizedHex = raw ? (raw.startsWith('#') ? raw : `#${raw}`) : null

  if (normalizedHex && /^#[0-9A-Fa-f]{6}$/.test(normalizedHex)) {
    return (
      <span
        className={`sf-badge ${className}`.trim()}
        title={label}
        style={{
          backgroundColor: hexToRgba(normalizedHex, 0.14),
          color: normalizedHex,
          borderColor: hexToRgba(normalizedHex, 0.35),
        }}
      >
        {label}
      </span>
    )
  }

  const colorClass = getSeriesBadgeColor(seriesId)
  return (
    <span className={`sf-badge ${colorClass} ${className}`.trim()} title={label}>
      {label}
    </span>
  )
}
