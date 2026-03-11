/**
 * Validación de RUT chileno (módulo 11).
 * Formato aceptado: 12.345.678-5, 12345678-5, 123456785, etc.
 */

const RUT_RE = /^\s*([0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3})-?([0-9kK])\s*$/

/**
 * Comprueba si el RUT tiene formato y dígito verificador correctos.
 */
export function validateRut(value: string): boolean {
  if (!value || typeof value !== 'string') return false
  const m = value.trim().match(RUT_RE)
  if (!m) return false
  const numStr = (m[1] ?? '').replace(/\D/g, '')
  const dv = (m[2] ?? '').toUpperCase()
  if (numStr.length < 7 || numStr.length > 8) return false
  let n: number
  try {
    n = parseInt(numStr, 10)
  } catch {
    return false
  }
  let s = 0
  let mul = 2
  while (n > 0) {
    s += (n % 10) * mul
    n = Math.floor(n / 10)
    mul = mul === 7 ? 2 : mul + 1
  }
  const r = 11 - (s % 11)
  const expected = r === 11 ? '0' : r === 10 ? 'K' : String(r)
  return expected === dv
}

/**
 * Normaliza el RUT a formato 12345678-9 (sin puntos, DV en mayúscula).
 * Lanza si el RUT es inválido.
 */
export function normalizeRut(value: string): string {
  if (!validateRut(value)) throw new Error('RUT inválido')
  const m = value.trim().match(RUT_RE)
  if (!m) throw new Error('RUT inválido')
  const numStr = (m[1] ?? '').replace(/\D/g, '')
  const dv = (m[2] ?? '').toUpperCase()
  return `${parseInt(numStr, 10)}-${dv}`
}

/** Mensaje de error estándar para mostrar en formularios */
export const RUT_INVALID_MESSAGE = 'RUT inválido (ej: 12.345.678-5)'

/**
 * Formatea el RUT para mostrar en el input: 12.345.678-5
 * Acepta entrada parcial (ej. "123" -> "123") y con o sin puntos/guion.
 */
export function formatRutDisplay(value: string): string {
  const raw = (value ?? '').trim().replace(/\s/g, '')
  if (!raw) return ''
  const digitsOnly = raw.replace(/\D/g, '')
  const endsWithK = raw.toUpperCase().endsWith('K')
  let body: string
  let dv: string
  if (endsWithK && digitsOnly.length <= 8) {
    body = digitsOnly.slice(0, 8)
    dv = 'K'
  } else if (digitsOnly.length > 8) {
    body = digitsOnly.slice(0, 8)
    const last = digitsOnly.slice(8, 9)
    dv = last.toUpperCase() === 'K' ? 'K' : last
  } else {
    body = digitsOnly.slice(0, 8)
    dv = ''
  }
  if (!body) return raw.startsWith('K') || raw.startsWith('k') ? 'K' : ''
  const rev = body.split('').reverse()
  const groups: string[] = []
  for (let i = 0; i < rev.length; i += 3) {
    groups.push(rev.slice(i, i + 3).reverse().join(''))
  }
  const withDots = groups.reverse().join('.')
  return dv ? `${withDots}-${dv}` : withDots
}
