import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../app/api'
import { useTheme } from '../app/theme'
import { Button } from '../ui/Button'
import { IconSend } from '../ui/Icons'
import { SeriesBadge } from '../ui/SeriesBadge'
import { formatRutDisplay, normalizeRut, RUT_INVALID_MESSAGE, validateRut } from '../utils/rut'

type PublicInfo = {
  public_link_id: string
  series_name: string
  opponent: string
  match_date: string
  call_time: string
  venue: string
  field_number?: string | null
  tournament_name?: string | null
  tournament_season_year?: number | null
}

type Status = 'pending' | 'confirmed' | 'declined'

function getCalendarParts(d: string): { dow: string; day: string; month: string } {
  try {
    const [y, m, day] = d.split('-').map(Number)
    const date = new Date(y, m - 1, day)
    const dowIndex = date.getDay()
    const WEEKDAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'] as const
    const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'] as const
    return {
      dow: WEEKDAYS[dowIndex] ?? '',
      day: String(day).padStart(2, '0'),
      month: MONTHS[m - 1] ?? '',
    }
  } catch {
    return { dow: '', day: '', month: '' }
  }
}

function IconClock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function IconMapPin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 21s-6-4.35-6-10a6 6 0 0 1 12 0c0 5.65-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  )
}
function IconTrophy(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

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
  const [submitted, setSubmitted] = useState(false)
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
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-center leading-tight dark:bg-slate-700">
              <span className="block text-[10px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                {getCalendarParts(info.match_date).dow}
              </span>
              <span className="block text-lg font-bold text-slate-900 dark:text-slate-100">
                {getCalendarParts(info.match_date).day}
              </span>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-300">
                {getCalendarParts(info.match_date).month}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <SeriesBadge seriesId={info.series_name} name={info.series_name} />
              </div>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Próximo: <span className="font-medium text-primary">vs {info.opponent}</span>
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <IconClock className="h-3.5 w-3.5" aria-hidden />
                  <span>Citación {info.call_time}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <IconMapPin className="h-3.5 w-3.5" aria-hidden />
                  <span>
                    {info.venue}
                    {info.field_number ? ` Cancha ${info.field_number}` : ''}
                  </span>
                </span>
                {info.tournament_name && (
                  <span className="inline-flex items-center gap-1">
                    <IconTrophy className="h-3.5 w-3.5" aria-hidden />
                    <span>
                      {info.tournament_name}
                      {info.tournament_season_year != null ? ` ${info.tournament_season_year}` : ''}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="sf-card mt-4 flex flex-col items-center justify-center p-8">
          <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
        </div>
      )}

      {submitted ? (
        <div className="sf-card mt-4 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" aria-hidden>
            ✓
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">¡Listo!</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tu respuesta fue guardada. Puedes cerrar esta pestaña.
          </p>
        </div>
      ) : (
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
            setSubmitted(true)
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

        <Button type="submit" variant="primary" icon={<IconSend />} loading={loading} className="w-full" disabled={loading}>
          {loading ? 'Enviando…' : 'Enviar'}
        </Button>
      </form>
      )}
      </div>
    </div>
  )
}

