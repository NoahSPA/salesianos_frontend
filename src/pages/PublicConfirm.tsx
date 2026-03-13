import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../app/api'
import { useTheme } from '../app/theme'
import { Button } from '../ui/Button'
import { IconSend } from '../ui/Icons'
import { formatRutDisplay, normalizeRut, RUT_INVALID_MESSAGE, validateRut } from '../utils/rut'

type PublicInfo = {
  public_link_id: string
  series_name: string
  opponent: string
  match_date: string
  call_time: string
  venue: string
  field_number?: string | null
}

type Status = 'pending' | 'confirmed' | 'declined'

function IconMoon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}
function IconSun() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

export function PublicConfirmPage() {
  const { publicLinkId } = useParams()
  const { theme, toggleTheme } = useTheme()
  const [info, setInfo] = useState<PublicInfo | null>(null)
  const [rut, setRut] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [statusVal, setStatusVal] = useState<Status>('confirmed')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})
  const id = publicLinkId || ''

  useEffect(() => {
    if (!id) return
    apiFetch<PublicInfo>(`/api/public/convocations/${encodeURIComponent(id)}`)
      .then(setInfo)
      .catch((e: unknown) => setMsg(e instanceof Error ? e.message : 'No encontrado'))
  }, [id])

  return (
    <div className="min-h-dvh bg-slate-50 transition-colors duration-300 dark:bg-slate-900">
      <div className="absolute right-4 top-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2.5 text-slate-500 transition-colors duration-300 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </div>
      <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Confirmar asistencia</h1>
      {info ? (
        <div className="sf-card mt-4 p-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">{info.series_name}</div>
          <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            vs {info.opponent}
          </div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            {info.match_date} · citación {info.call_time}
          </div>
          <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {info.venue}
            {info.field_number ? ` · cancha ${info.field_number}` : ''}
          </div>
        </div>
      ) : (
        <div className="sf-card mt-4 flex flex-col items-center justify-center p-8">
          <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
        </div>
      )}

      <form
        className="sf-card mt-4 space-y-3 p-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!id) return
          setMsg(null)
          const err: Record<string, boolean> = {}
          if (!rut.trim()) err.rut = true
          else if (!validateRut(rut)) err.rut = true
          if (!birthDate.trim()) err.birthDate = true
          if (Object.keys(err).length > 0) {
            setFieldErrors(err)
            return
          }
          setFieldErrors({})
          setLoading(true)
          try {
            const rutNormalized = normalizeRut(rut.trim())
            await apiFetch(`/api/public/convocations/${encodeURIComponent(id)}/respond`, {
              method: 'POST',
              body: JSON.stringify({
                rut: rutNormalized,
                birth_date: birthDate,
                status: statusVal,
                comment: comment || null,
              }),
            })
            setMsg('Respuesta guardada. Gracias.')
          } catch (err: unknown) {
            setMsg(err instanceof Error ? err.message : 'No se pudo validar')
          } finally {
            setLoading(false)
          }
        }}
      >
        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Valida tu identidad</div>
        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
          RUT
          <input
            className={`mt-1 sf-input ${fieldErrors.rut ? 'sf-input-invalid' : ''}`}
            placeholder="12.345.678-5"
            value={rut}
            onChange={(e) => {
              const formatted = formatRutDisplay(e.target.value)
              setRut(formatted)
              setFieldErrors((p) => (p.rut ? { ...p, rut: false } : p))
            }}
          />
          {fieldErrors.rut && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{!rut.trim() ? 'Requerido' : RUT_INVALID_MESSAGE}</span>}
        </label>
        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
          Fecha de nacimiento
          <input
            className={`mt-1 sf-input ${fieldErrors.birthDate ? 'sf-input-invalid' : ''}`}
            type="date"
            value={birthDate}
            onChange={(e) => { setBirthDate(e.target.value); setFieldErrors((p) => (p.birthDate ? { ...p, birthDate: false } : p)) }}
          />
          {fieldErrors.birthDate && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
        </label>

        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Tu respuesta</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={
              'rounded-md border px-3 py-2 text-sm transition-colors ' +
              (statusVal === 'confirmed'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')
            }
            onClick={() => setStatusVal('confirmed')}
          >
            Confirmo
          </button>
          <button
            type="button"
            className={
              'rounded-md border px-3 py-2 text-sm transition-colors ' +
              (statusVal === 'declined'
                ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-600 dark:bg-rose-900/30 dark:text-rose-200'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')
            }
            onClick={() => setStatusVal('declined')}
          >
            No puedo
          </button>
        </div>

        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
          Comentario (opcional)
          <input className="mt-1 sf-input" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={300} />
        </label>

        {msg && <div className="rounded-md bg-slate-100 p-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">{msg}</div>}

        <Button type="submit" variant="primary" icon={<IconSend />} loading={loading} className="w-full">
          {loading ? 'Enviando…' : 'Enviar'}
        </Button>
      </form>
      </div>
    </div>
  )
}

