/**
 * Formatea una fecha para mostrar al usuario en formato dd-mm-yyyy.
 * Acepta string ISO (YYYY-MM-DD o con hora) o Date.
 */
export function formatDateDDMMYYYY(value: string | Date | null | undefined): string {
  if (value == null) return ''
  const d = typeof value === 'string' ? new Date(value.includes('T') ? value : value + 'T12:00:00') : value
  if (Number.isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}

/**
 * Formatea fecha y hora para mostrar: dd-mm-yyyy HH:mm
 */
export function formatDateTimeDDMMYYYY(value: string | Date | null | undefined): string {
  if (value == null) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  const datePart = formatDateDDMMYYYY(d)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${datePart} ${h}:${m}`
}
