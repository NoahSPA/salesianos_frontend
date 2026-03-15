import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { IconArrowLeft, IconCheck, IconCopy, IconFileText, IconX } from '../ui/Icons'
import { apiFetch, ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { useBranding } from '../app/useBranding'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { PageHeader } from '../ui/PageHeader'
import { SeriesBadge } from '../ui/SeriesBadge'

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

type Series = { id: string; name: string; active: boolean; color?: string | null }
type Tournament = { id: string; name: string; season_year: number; active: boolean }

type Match = {
  id: string
  tournament_id: string
  series_id: string
  opponent: string
  match_date: string
  call_time: string
  venue: string
  field_number?: string | null
  status: { code: string; label: string; color_hex: string }
  result?: string | null
  our_goals?: number | null
  opponent_goals?: number | null
}

type Player = {
  id: string
  first_name: string
  last_name: string
  active: boolean
  primary_series_id: string
  series_ids: string[]
  phone?: string | null
}

type Convocation = {
  id: string
  match_id: string
  series_id: string
  invited_player_ids: string[]
  public_link_id: string
  created_by_user_id: string
}

type AttendanceStatus = 'pending' | 'confirmed' | 'declined'

type ConvStatus = {
  convocation_id: string
  match_id: string
  series_id: string
  public_link_id: string
  invited_count: number
  confirmed_count: number
  declined_count: number
  pending_count: number
  lines: Array<{
    player_id: string
    player_name: string
    status: AttendanceStatus
    comment?: string | null
    updated_at: string
  }>
}

function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const ta = document.createElement('textarea')
  ta.value = text
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
  return Promise.resolve()
}

/** Normaliza teléfono para wa.me: solo dígitos; si es 9 dígitos empezando en 9 se asume Chile (+56). */
function phoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  if (digits.length === 9 && digits.startsWith('9')) return '56' + digits
  if (digits.length >= 10) return digits
  return digits
}

export function MatchDetailPage() {
  const { matchId } = useParams()
  const { accessToken, me } = useAuth()
  const { appName } = useBranding()
  const [match, setMatch] = useState<Match | null>(null)
  const [series, setSeries] = useState<Series | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [conv, setConv] = useState<Convocation | null>(null)
  const [status, setStatus] = useState<ConvStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [ourGoalsEdit, setOurGoalsEdit] = useState<number | ''>('')
  const [opponentGoalsEdit, setOpponentGoalsEdit] = useState<number | ''>('')
  const [savingResult, setSavingResult] = useState(false)
  const [resumenModalOpen, setResumenModalOpen] = useState(false)
  const [recordatoriosModalOpen, setRecordatoriosModalOpen] = useState(false)

  const canManage = me?.role === 'admin' || me?.role === 'delegado'

  const publicLink = useMemo(() => {
    if (!conv) return null
    return `${window.location.origin}/c/${conv.public_link_id}`
  }, [conv])

  const tournamentById = useMemo(() => Object.fromEntries(tournaments.map((t) => [t.id, t])), [tournaments])

  async function loadAll() {
    if (!accessToken || !matchId) return
    const m = await apiFetch<Match>(`/api/matches/${matchId}`, { authToken: accessToken })
    setMatch(m)
    const [pl, seriesList, tournamentsList, maybeConv] = await Promise.all([
      apiFetch<Player[]>(`/api/players?series_id=${encodeURIComponent(m.series_id)}`, { authToken: accessToken }),
      apiFetch<Series[]>('/api/series', { authToken: accessToken }),
      apiFetch<Tournament[]>('/api/tournaments', { authToken: accessToken }),
      apiFetch<Convocation>(`/api/matches/${matchId}/convocation`, { authToken: accessToken }).catch(() => null as Convocation | null),
    ])
    setPlayers(pl)
    setSeries(seriesList.find((s) => s.id === m.series_id) ?? null)
    setTournaments(tournamentsList)
    if (maybeConv) {
      setConv(maybeConv)
      const st = await apiFetch<ConvStatus>(`/api/convocations/${maybeConv.id}/status`, { authToken: accessToken })
      setStatus(st)
    } else {
      setConv(null)
      setStatus(null)
    }
  }

  useEffect(() => {
    loadAll().catch((e: unknown) => setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, matchId])

  useEffect(() => {
    if (match) {
      setOurGoalsEdit(match.our_goals ?? '')
      setOpponentGoalsEdit(match.opponent_goals ?? '')
    }
  }, [match])

  useEffect(() => {
    if (!accessToken || !conv) return
    const t = setInterval(() => {
      apiFetch<ConvStatus>(`/api/convocations/${conv.id}/status`, { authToken: accessToken })
        .then(setStatus)
        .catch(() => {})
    }, 5000)
    return () => clearInterval(t)
  }, [accessToken, conv])

  const statusByPlayerId = useMemo(() => {
    const m: Record<string, { status: AttendanceStatus; comment?: string | null }> = {}
    if (!status?.lines) return m
    for (const l of status.lines) m[l.player_id] = { status: l.status, comment: l.comment }
    return m
  }, [status])

  const allPlayersWithStatus = useMemo(() => {
    return players.map((p) => {
      const st = statusByPlayerId[p.id]
      const status: AttendanceStatus = st ? st.status : 'pending'
      return { ...p, status, comment: st?.comment }
    })
  }, [players, statusByPlayerId])

  const sortPlayersByName = (a: { first_name?: string; last_name?: string }, b: { first_name?: string; last_name?: string }) => {
    const c = (a.first_name || '').localeCompare(b.first_name || '', 'es', { sensitivity: 'base' })
    return c !== 0 ? c : (a.last_name || '').localeCompare(b.last_name || '', 'es', { sensitivity: 'base' })
  }

  const groupedByStatus = useMemo(() => {
    const confirmed = allPlayersWithStatus.filter((p) => p.status === 'confirmed').sort(sortPlayersByName)
    const pending = allPlayersWithStatus.filter((p) => p.status === 'pending').sort(sortPlayersByName)
    const declined = allPlayersWithStatus.filter((p) => p.status === 'declined').sort(sortPlayersByName)
    return { confirmed, pending, declined }
  }, [allPlayersWithStatus])

  const pendingConWhatsApp = useMemo(() => {
    return groupedByStatus.pending.filter((p) => phoneForWhatsApp(p.phone))
  }, [groupedByStatus.pending])

  const mensajeRecordatorioPara = (firstName: string) => {
    const saludo = `Hola, ${firstName}. ¿Puedes confirmar si vas al partido? Aquí van los datos:\n\n`
    return saludo + whatsappText
  }

  const whatsappText = useMemo(() => {
    if (!match || !status) return ''
    const confirmed = status.lines.filter((l) => l.status === 'confirmed').map((l) => `- ${l.player_name}`).join('\n')
    const declined = status.lines.filter((l) => l.status === 'declined').map((l) => `- ${l.player_name}`).join('\n')
    const pending = status.lines.filter((l) => l.status === 'pending').map((l) => `- ${l.player_name}`).join('\n')
    const locationLine = [match.venue, match.field_number ? `cancha ${match.field_number}` : null].filter(Boolean).join(' · ')
    const shortLink = publicLink ?? ''
    const d = new Date(match.match_date + 'T12:00:00')
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const dayName = d.toLocaleDateString('es-CL', { weekday: 'long' })
    const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1)
    const dateLine = `${dd}-${mm}-${yyyy} (${dayNameCap}) - Citación ${match.call_time}`
    return [
      `${appName} vs ${match.opponent}`,
      dateLine,
      ...(locationLine ? [locationLine, ''] : []),
      `Link para confirmar:`,
      shortLink,
      ``,
      `Confirmados (${status.confirmed_count})`,
      confirmed || '(ninguno)',
      ``,
      `No pueden (${status.declined_count})`,
      declined || '(ninguno)',
      ``,
      `Pendientes (${status.pending_count})`,
      pending || '(ninguno)',
    ].join('\n')
  }, [match, status, publicLink, appName])

  if (!match) {
    return (
      <div className="space-y-4">
        <PageHeader title="Detalle del partido" />
        <div className="flex min-h-[40vh] flex-col items-center justify-center">
          <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <PageHeader title="Detalle del partido">
        <div className="flex flex-wrap items-center gap-2">
          {canManage ? (
            <Link
              to={`/matches?edit=${match.id}`}
              className="sf-btn sf-btn-secondary inline-flex items-center gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Editar partido
            </Link>
          ) : null}
          <Link to="/matches" className="sf-btn sf-btn-secondary inline-flex items-center gap-2">
              <IconArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Volver a partidos
            </Link>
        </div>
      </PageHeader>
      {/* Cabecera del partido */}
      <div className="sf-card overflow-hidden rounded-xl border border-slate-200 p-3 dark:border-slate-600">
        <div className="flex flex-wrap items-start gap-4">
          {(() => {
            const calendar = getCalendarParts(match.match_date)
            const torneo = tournamentById[match.tournament_id]
            return (
              <>
                <div className="flex-shrink-0">
                  <div className="rounded-lg bg-slate-100 px-3 py-2 text-center leading-tight dark:bg-slate-700">
                    <span className="block text-[10px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                      {calendar.dow}
                    </span>
                    <span className="block text-lg font-bold text-slate-900 dark:text-slate-100">
                      {calendar.day}
                    </span>
                    <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-300">
                      {calendar.month}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  {series ? (
                    <SeriesBadge seriesId={series.id} name={series.name} color={series.color} />
                  ) : null}
                  <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">vs {match.opponent}</h1>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <IconClock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" aria-hidden />
                      Citación {match.call_time}
                    </span>
                    {(match.venue || match.field_number) ? (
                      <span className="inline-flex items-center gap-1">
                        <IconMapPin className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" aria-hidden />
                        {[match.venue, match.field_number ? `cancha ${match.field_number}` : null].filter(Boolean).join(' · ')}
                      </span>
                    ) : null}
                    {torneo ? (
                      <span className="inline-flex items-center gap-1">
                        <IconTrophy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" aria-hidden />
                        {torneo.name} {torneo.season_year}
                      </span>
                    ) : null}
                  </div>
                  {(match.our_goals != null && match.opponent_goals != null) || match.result ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {match.our_goals != null && match.opponent_goals != null ? (
                        <>
                          <span
                            className={
                              'font-semibold ' +
                              (match.our_goals > match.opponent_goals
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : match.our_goals < match.opponent_goals
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-500 dark:text-slate-400')
                            }
                          >
                            {match.our_goals}-{match.opponent_goals}
                          </span>
                          <span className={'sf-badge ' + (match.our_goals > match.opponent_goals ? 'sf-badge-emerald' : match.our_goals < match.opponent_goals ? 'sf-badge-rose' : 'sf-badge-amber')}>
                            {match.our_goals > match.opponent_goals ? 'Ganado' : match.our_goals < match.opponent_goals ? 'Perdido' : 'Empate'}
                          </span>
                        </>
                      ) : match.result ? (
                        <span className="font-medium text-slate-800 dark:text-slate-200">Resultado: {match.result}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}

      {/* Resultado y Convocatoria: en una fila solo cuando hay resultado (jugado); si no, solo convocatoria a ancho completo para no dejar hueco */}
      {canManage && match?.status?.code === 'jugado' ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Resultado del encuentro */}
          <div className="sf-card rounded-xl border border-slate-200 p-3 dark:border-slate-600">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Resultado del encuentro</h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Nuestros goles y goles del rival. Ganado, Empate o Perdido según el marcador.
            </p>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-800/50">
            <div className="grid grid-cols-4 gap-3 items-end">
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nuestros goles</label>
                <input
                  className="sf-input h-11 w-full text-center text-lg font-semibold tabular-nums"
                  type="number"
                  min={0}
                  max={99}
                  value={ourGoalsEdit === '' ? '' : ourGoalsEdit}
                  onChange={(e) => setOurGoalsEdit(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
                  aria-label="Nuestros goles"
                />
              </div>
              <div className="flex flex-col justify-end items-center pb-2 min-w-0">
                <span className="text-xl font-bold text-slate-400 dark:text-slate-500" aria-hidden="true">–</span>
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Goles rival</label>
                <input
                  className="sf-input h-11 w-full text-center text-lg font-semibold tabular-nums"
                  type="number"
                  min={0}
                  max={99}
                  value={opponentGoalsEdit === '' ? '' : opponentGoalsEdit}
                  onChange={(e) => setOpponentGoalsEdit(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
                  aria-label="Goles rival"
                />
              </div>
              <div className="flex flex-col justify-end items-center sm:items-start pb-2 min-w-0">
                {ourGoalsEdit !== '' && opponentGoalsEdit !== '' ? (
                  <span
                    className={
                      'rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap ' +
                      (Number(ourGoalsEdit) > Number(opponentGoalsEdit)
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                        : Number(ourGoalsEdit) < Number(opponentGoalsEdit)
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200')
                    }
                  >
                    {Number(ourGoalsEdit) > Number(opponentGoalsEdit) ? 'Ganado' : Number(ourGoalsEdit) < Number(opponentGoalsEdit) ? 'Perdido' : 'Empate'}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            icon={<IconCheck />}
            loading={savingResult}
            className="mt-3"
            onClick={async () => {
              if (!accessToken || !matchId) return
              setSavingResult(true)
              setError(null)
              try {
                const our = ourGoalsEdit === '' ? null : Number(ourGoalsEdit)
                const opp = opponentGoalsEdit === '' ? null : Number(opponentGoalsEdit)
                const updated = await apiFetch<Match>(`/api/matches/${matchId}`, {
                  method: 'PATCH',
                  authToken: accessToken,
                  body: JSON.stringify({
                    our_goals: our,
                    opponent_goals: opp,
                    result: our != null && opp != null ? `${our}-${opp}` : null,
                  }),
                })
                setMatch(updated)
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
              } finally {
                setSavingResult(false)
              }
            }}
          >
            {savingResult ? 'Guardando…' : 'Guardar resultado'}
          </Button>
          </div>
        {/* Convocatoria (misma caja, en la fila cuando partido jugado) */}
          <div className="sf-card rounded-xl border border-slate-200 p-3 dark:border-slate-600">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Convocatoria</h2>
            {match?.status?.code === 'jugado' ? (
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              Partido ya jugado. No se puede crear ni actualizar la convocatoria.
            </p>
            ) : (
              <>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                  Crean o actualizan la convocatoria para generar el link y que confirmen asistencia.
                </p>
                <Button
                  variant="primary"
                  icon={<IconCheck />}
                  loading={saving}
                  disabled={players.length === 0}
                  className="mt-2"
                  onClick={async () => {
                    if (!accessToken || !matchId) return
                    setSaving(true)
                    setError(null)
                    try {
                      const allPlayerIds = players.map((p) => p.id)
                      const c = await apiFetch<Convocation>(`/api/matches/${matchId}/convocation`, {
                        method: 'POST',
                        authToken: accessToken,
                        body: JSON.stringify({ invited_player_ids: allPlayerIds }),
                      })
                      setConv(c)
                      const st = await apiFetch<ConvStatus>(`/api/convocations/${c.id}/status`, { authToken: accessToken })
                      setStatus(st)
                    } catch (e: unknown) {
                      setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
                    } finally {
                      setSaving(false)
                    }
                  }}
                >
                  {saving ? 'Guardando…' : conv ? 'Actualizar convocatoria' : 'Crear convocatoria'}
                </Button>
              </>
            )}
            {conv ? (
              <>
                <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-600">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Link corto de confirmación</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Comparte este link para que confirmen asistencia.</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <a
                      href={publicLink ?? '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 break-all rounded-md bg-slate-50 px-3 py-2 font-mono text-sm text-primary underline decoration-primary/60 hover:decoration-primary dark:bg-slate-800 dark:text-primary"
                    >
                      {publicLink}
                    </a>
                    <Button variant="secondary" icon={<IconCopy />} className="shrink-0 text-sm" onClick={() => publicLink && copyText(publicLink)}>
                      Copiar link
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a className="sf-btn sf-btn-primary inline-flex items-center gap-2 text-sm" href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                  <Button variant="secondary" icon={<IconFileText />} className="text-sm" onClick={() => setResumenModalOpen(true)}>
                    Ver resumen
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : canManage ? (
        /* Solo Convocatoria a ancho completo (programado, suspendido, reprogramado): no hay hueco */
        <div className="sf-card rounded-xl border border-slate-200 p-3 dark:border-slate-600">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Convocatoria</h2>
          {match?.status?.code === 'jugado' ? (
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              Partido ya jugado. No se puede crear ni actualizar la convocatoria.
            </p>
          ) : (
            <>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                Crean o actualizan la convocatoria para generar el link y que confirmen asistencia.
              </p>
              <Button
                variant="primary"
                icon={<IconCheck />}
                loading={saving}
                disabled={players.length === 0}
                className="mt-2"
                onClick={async () => {
                  if (!accessToken || !matchId) return
                  setSaving(true)
                  setError(null)
                  try {
                    const allPlayerIds = players.map((p) => p.id)
                    const c = await apiFetch<Convocation>(`/api/matches/${matchId}/convocation`, {
                      method: 'POST',
                      authToken: accessToken,
                      body: JSON.stringify({ invited_player_ids: allPlayerIds }),
                    })
                    setConv(c)
                    const st = await apiFetch<ConvStatus>(`/api/convocations/${c.id}/status`, { authToken: accessToken })
                    setStatus(st)
                  } catch (e: unknown) {
                    setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                {saving ? 'Guardando…' : conv ? 'Actualizar convocatoria' : 'Crear convocatoria'}
              </Button>
            </>
          )}
          {conv ? (
            <>
              <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-600">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Link corto de confirmación</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Comparte este link para que confirmen asistencia.</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <a
                    href={publicLink ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 break-all rounded-md bg-slate-50 px-3 py-2 font-mono text-sm text-primary underline decoration-primary/60 hover:decoration-primary dark:bg-slate-800 dark:text-primary"
                  >
                    {publicLink}
                  </a>
                  <Button variant="secondary" icon={<IconCopy />} className="shrink-0 text-sm" onClick={() => publicLink && copyText(publicLink)}>
                    Copiar link
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <a className="sf-btn sf-btn-primary inline-flex items-center gap-2 text-sm" href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
                <Button variant="secondary" icon={<IconFileText />} className="text-sm" onClick={() => setResumenModalOpen(true)}>
                  Ver resumen
                </Button>
              </div>
            </>
          ) : null}
        </div>
      ) : conv && publicLink ? (
        <div className="sf-card rounded-xl border border-slate-200 p-3 dark:border-slate-600">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Confirmar asistencia</h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
            Indica si vas o no al partido usando el siguiente enlace.
          </p>
          <a
            href={publicLink}
            target="_blank"
            rel="noreferrer"
            className="sf-btn sf-btn-primary mt-3 inline-flex items-center gap-2"
          >
            <IconCheck className="h-4 w-4" />
            Confirmar mi asistencia
          </a>
        </div>
      ) : null}

      <Modal
        open={recordatoriosModalOpen}
        title="Enviar recordatorio por WhatsApp"
        onClose={() => setRecordatoriosModalOpen(false)}
        footer={
          <Button variant="secondary" icon={<IconX />} onClick={() => setRecordatoriosModalOpen(false)}>
            Cerrar
          </Button>
        }
      >
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
          Cada enlace abre WhatsApp con un mensaje personalizado para ese jugador. Puedes enviar uno por uno.
        </p>
        <ul className="space-y-2">
          {pendingConWhatsApp.map((p) => {
            const waNumber = phoneForWhatsApp(p.phone)!
            const text = mensajeRecordatorioPara(p.first_name)
            const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white py-2 pl-3 pr-2 dark:border-slate-600 dark:bg-slate-800/50">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {p.first_name} {p.last_name}
                </span>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="sf-btn sf-btn-primary text-sm"
                >
                  WhatsApp
                </a>
              </li>
            )
          })}
        </ul>
      </Modal>

      <Modal
        open={resumenModalOpen}
        title="Resumen para compartir"
        onClose={() => setResumenModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" icon={<IconX />} onClick={() => setResumenModalOpen(false)}>
              Cerrar
            </Button>
            <Button variant="primary" icon={<IconCopy />} onClick={() => { copyText(whatsappText); setResumenModalOpen(false) }}>
              Copiar resumen
            </Button>
          </div>
        }
      >
        <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200">
          {whatsappText || 'Cargando…'}
        </pre>
      </Modal>

      {/* Lista de todos los jugadores con su estado de confirmación */}
      <div className="sf-card rounded-xl border border-slate-200 p-3 dark:border-slate-600">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Confirmaciones{series ? ` · ${series.name}` : ''}
        </h2>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
          Jugadores de la serie y si asisten o no.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-700 dark:bg-emerald-900/20">
            <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Confirmados ({groupedByStatus.confirmed.length})</h3>
            <ul className="mt-1.5 space-y-1">
              {groupedByStatus.confirmed.length === 0 ? (
                <li className="text-sm text-slate-500 dark:text-slate-400">Ninguno</li>
              ) : (
                groupedByStatus.confirmed.map((p) => (
                  <li key={p.id} className="flex items-start gap-2">
                    <span className="shrink-0 text-sm font-medium text-slate-900 dark:text-slate-100">{p.first_name} {p.last_name}</span>
                    {p.comment ? <span className="text-xs text-slate-600 dark:text-slate-400">{p.comment}</span> : null}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">Pendientes ({groupedByStatus.pending.length})</h3>
              {pendingConWhatsApp.length > 0 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                  onClick={() => setRecordatoriosModalOpen(true)}
                >
                  Enviar recordatorio por WhatsApp
                </button>
              ) : null}
            </div>
            <ul className="mt-1.5 space-y-1">
              {groupedByStatus.pending.length === 0 ? (
                <li className="text-sm text-slate-500 dark:text-slate-400">Ninguno</li>
              ) : (
                groupedByStatus.pending.map((p) => (
                  <li key={p.id} className="flex items-start gap-2">
                    <span className="shrink-0 text-sm font-medium text-slate-900 dark:text-slate-100">{p.first_name} {p.last_name}</span>
                    {p.comment ? <span className="text-xs text-slate-600 dark:text-slate-400">{p.comment}</span> : null}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-700 dark:bg-rose-900/20">
            <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-200">No pueden ({groupedByStatus.declined.length})</h3>
            <ul className="mt-1.5 space-y-1">
              {groupedByStatus.declined.length === 0 ? (
                <li className="text-sm text-slate-500 dark:text-slate-400">Ninguno</li>
              ) : (
                groupedByStatus.declined.map((p) => (
                  <li key={p.id} className="flex items-start gap-2">
                    <span className="shrink-0 text-sm font-medium text-slate-900 dark:text-slate-100">{p.first_name} {p.last_name}</span>
                    {p.comment ? <span className="text-xs text-slate-600 dark:text-slate-400">{p.comment}</span> : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

