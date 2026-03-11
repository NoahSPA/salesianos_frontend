export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

/** Mensaje por defecto cuando no se puede obtener un mensaje de error del servidor */
export const ERROR_MENSAJE_ES = 'Ha ocurrido un error'

export type ApiError = { detail?: string } | { message?: string }

const TRADUCCIONES_ERROR: Record<string, string> = {
  'field required': 'Campo requerido',
  'value is not a valid email address': 'El correo no es válido',
  'value is not a valid integer': 'El valor debe ser un número entero',
  'value is not a valid float': 'El valor debe ser un número',
  'ensure this value has at least': 'El valor es demasiado corto',
  'ensure this value has at most': 'El valor es demasiado largo',
  'ensure this value is greater than or equal to': 'El valor debe ser mayor o igual',
  'ensure this value is less than or equal to': 'El valor debe ser menor o igual',
  'Not Found': 'No encontrado',
  'Unauthorized': 'No autenticado',
  'Forbidden': 'Sin permiso',
  'Internal Server Error': 'Error del servidor',
}

function traducirMensaje(texto: string): string {
  const t = texto?.trim() || ''
  for (const [en, es] of Object.entries(TRADUCCIONES_ERROR)) {
    if (t === en || t.startsWith(en)) return t === en ? es : es + ': ' + t.slice(en.length).trim()
  }
  return t || ERROR_MENSAJE_ES
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { authToken?: string | null } = {},
): Promise<T> {
  const headers = new Headers(opts.headers)
  headers.set('Accept', 'application/json')
  if (opts.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (opts.authToken) headers.set('Authorization', `Bearer ${opts.authToken}`)

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    credentials: 'include',
  })

  if (!res.ok) {
    let data: unknown = null
    try {
      data = await res.json()
    } catch {
      // ignore
    }
    const d = data as { detail?: string | Array<{ msg?: string; message?: string }>; message?: string }
    let msg: string
    if (Array.isArray(d?.detail) && d.detail.length > 0) {
      const partes = d.detail.map((e) => e.msg ?? e.message ?? '').filter(Boolean)
      msg = partes.map(traducirMensaje).join('. ') || traducirMensaje(res.statusText)
    } else if (typeof d?.detail === 'string') {
      msg = traducirMensaje(d.detail)
    } else {
      msg = traducirMensaje(d?.message ?? res.statusText ?? '')
    }
    throw new Error(msg)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Sube un archivo con multipart/form-data. No añade Content-Type (el navegador lo establece con boundary). */
export async function apiUpload<T>(
  path: string,
  file: File,
  opts: { authToken?: string | null } = {},
): Promise<T> {
  const form = new FormData()
  form.append('file', file)
  const headers = new Headers()
  headers.set('Accept', 'application/json')
  if (opts.authToken) headers.set('Authorization', `Bearer ${opts.authToken}`)
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: form,
    credentials: 'include',
  })
  if (!res.ok) {
    let msg = ERROR_MENSAJE_ES
    try {
      const d = (await res.json()) as { detail?: string }
      msg = typeof d?.detail === 'string' ? traducirMensaje(d.detail) : res.statusText
    } catch {
      msg = res.statusText
    }
    throw new Error(msg)
  }
  return (await res.json()) as T
}

