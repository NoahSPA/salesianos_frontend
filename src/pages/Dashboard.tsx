import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
/** Iconos inline para no depender de declaraciones extra de lucide-react */
function IconUsers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconCalendar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 2v4" /><path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}
function IconChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
function IconDollarSign(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}
function IconFileCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="m9 15 2 2 4-4" />
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
function IconAlertCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
    </svg>
  )
}
import { apiFetch, ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { SeriesBadge } from '../ui/SeriesBadge'

type Match = {
  id: string
  tournament_id: string
  series_id: string
  opponent: string
  match_date: string
  call_time: string
  venue: string
  field_number?: string | null
  status: string
}

type Series = { id: string; name: string; active: boolean; color?: string | null }
type Tournament = { id: string; name: string; season_year: number; active: boolean }

type PlayerFeeStatus = { player_id: string; player_name: string; series_id: string; status: 'al_dia' | 'pendiente' | 'atrasado' }

type ConvocationOut = { id: string; match_id: string; series_id: string; public_link_id: string; invited_player_ids: string[] }
type ConvocationStatusOut = {
  convocation_id: string
  match_id: string
  invited_count: number
  confirmed_count: number
  declined_count: number
  pending_count: number
  lines: { player_id: string; player_name: string; status: 'confirmed' | 'declined' | 'pending'; comment?: string | null }[]
}

type SeriesConvocationCard = {
  series_id: string
  series_name: string
  match?: Match
  status?: ConvocationStatusOut
  error?: string
}

type FeeSummary = {
  periods: unknown[]
  total_collected: number
  total_pending: number
  collection_by_series?: { series_id: string; series_name: string; total_collected: number }[]
  collection_by_tournament?: unknown[]
  collection_by_player?: unknown[]
}

function formatClp(amount: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatMatchDate(d: string): string {
  try {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return d
  }
}

export function DashboardPage() {
  const { accessToken, me } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [matches, setMatches] = useState<Match[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])

  const [feeStatus, setFeeStatus] = useState<PlayerFeeStatus[] | null>(null)
  const [feeStatusError, setFeeStatusError] = useState<string | null>(null)

  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null)
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0)

  const [seriesConvocations, setSeriesConvocations] = useState<SeriesConvocationCard[] | null>(null)

  const canTreasury = me?.role === 'tesorero' || me?.role === 'admin'

  useEffect(() => {
    if (!accessToken) return
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const from = `${yyyy}-${mm}-${dd}`

    async function load() {
      setLoading(true)
      setError(null)
      setFeeStatusError(null)
      try {
        const baseCalls: [Promise<Match[]>, Promise<Series[]>, Promise<Tournament[]>] = [
          apiFetch<Match[]>(`/api/matches?from_date=${encodeURIComponent(from)}`, { authToken: accessToken }),
          apiFetch<Series[]>('/api/series', { authToken: accessToken }),
          apiFetch<Tournament[]>('/api/tournaments', { authToken: accessToken }),
        ]

        const treasuryCalls: Promise<unknown>[] = []
        if (canTreasury) {
          treasuryCalls.push(
            apiFetch<FeeSummary>('/api/fees/summary-by-period', { authToken: accessToken }).then(setFeeSummary).catch(() => setFeeSummary(null)),
            apiFetch<{ id: string }[]>('/api/payments?status=pending_validation&limit=500', { authToken: accessToken })
              .then((list) => setPendingPaymentsCount(Array.isArray(list) ? list.length : 0))
              .catch(() => setPendingPaymentsCount(0)),
          )
        }

        const [ms, ss, ts] = await Promise.all(baseCalls)
        await Promise.all(treasuryCalls)

        const sorted = [...ms].sort((a, b) => a.match_date.localeCompare(b.match_date) || a.call_time.localeCompare(b.call_time))
        setMatches(sorted)
        setSeries(ss)
        setTournaments(ts)

        try {
          const fs = await apiFetch<PlayerFeeStatus[]>('/api/fees/status?active=true', { authToken: accessToken })
          setFeeStatus(fs)
        } catch (e: unknown) {
          setFeeStatus(null)
          setFeeStatusError(e instanceof Error ? e.message : 'Sin permiso o error al cargar cuotas')
        }

        const activeSeries = ss.filter((x) => x.active)
        const firstMatchBySeries = new Map<string, Match>()
        for (const m of sorted) {
          if (!firstMatchBySeries.has(m.series_id)) firstMatchBySeries.set(m.series_id, m)
        }

        const cardsBase: SeriesConvocationCard[] = activeSeries.map((s) => ({
          series_id: s.id,
          series_name: s.name,
          match: firstMatchBySeries.get(s.id),
        }))

        const cards: SeriesConvocationCard[] = await Promise.all(
          cardsBase.map(async (c) => {
            if (!c.match) return c
            try {
              const conv = await apiFetch<ConvocationOut>(`/api/matches/${c.match.id}/convocation`, { authToken: accessToken })
              const st = await apiFetch<ConvocationStatusOut>(`/api/convocations/${conv.id}/status`, { authToken: accessToken })
              return { ...c, status: st }
            } catch (e: unknown) {
              return { ...c, error: e instanceof Error ? e.message : 'No hay convocatoria o no se pudo cargar' }
            }
          }),
        )
        setSeriesConvocations(cards)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [accessToken, canTreasury])

  const seriesById = useMemo(() => Object.fromEntries(series.map((s) => [s.id, s])), [series])
  const tournamentById = useMemo(() => Object.fromEntries(tournaments.map((t) => [t.id, t])), [tournaments])

  const feeCounts = useMemo(() => {
    const base = { al_dia: 0, pendiente: 0, atrasado: 0 }
    if (!feeStatus) return base
    for (const x of feeStatus) base[x.status]++
    return base
  }, [feeStatus])

  const totalPlayers = feeCounts.al_dia + feeCounts.pendiente + feeCounts.atrasado
  const pct = (n: number) => (totalPlayers ? Math.round((n / totalPlayers) * 100) : 0)

  const nextMatches = useMemo(() => matches.slice(0, 5), [matches])
  const activeSeriesCount = useMemo(() => series.filter((s) => s.active).length, [series])
  const activeTournamentsCount = useMemo(() => tournaments.filter((t) => t.active).length, [tournaments])

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4">
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <IconAlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <div className="sf-loading-spinner" role="status" aria-label="Cargando dashboard" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando información del equipo…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-8">
      {/* Cabecera */}
      <header className="border-b border-slate-200 pb-6 dark:border-slate-700">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          {greeting()}, {me?.username}
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Resumen del equipo y actividad reciente
        </p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <div className="sf-card overflow-hidden p-5 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Jugadores activos</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{totalPlayers}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5">
              <IconUsers className="h-6 w-6 text-primary" aria-hidden />
            </div>
          </div>
          <Link to="/players" className="mt-3 flex items-center text-sm font-medium text-primary hover:underline">
            Ver jugadores <IconChevronRight className="ml-0.5 h-4 w-4" />
          </Link>
        </div>

        <div className="sf-card overflow-hidden p-5 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Próximos partidos</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{matches.length}</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
              <IconCalendar className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden />
            </div>
          </div>
          <Link to="/matches" className="mt-3 flex items-center text-sm font-medium text-primary hover:underline">
            Ver calendario <IconChevronRight className="ml-0.5 h-4 w-4" />
          </Link>
        </div>

        {canTreasury ? (
          <>
            <div className="sf-card overflow-hidden p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Recaudación total</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
                    {feeSummary ? formatClp(feeSummary.total_collected) : '—'}
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
                  <IconDollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden />
                </div>
              </div>
              <Link to="/treasury" className="mt-3 flex items-center text-sm font-medium text-primary hover:underline">
                Ir a tesorería <IconChevronRight className="ml-0.5 h-4 w-4" />
              </Link>
            </div>

            <div className="sf-card overflow-hidden p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pagos por validar</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{pendingPaymentsCount}</p>
                </div>
                <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/30">
                  <IconFileCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden />
                </div>
              </div>
              <Link to="/treasury?tab=pending" className="mt-3 flex items-center text-sm font-medium text-primary hover:underline">
                Validar pagos <IconChevronRight className="ml-0.5 h-4 w-4" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="sf-card overflow-hidden p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Series activas</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{activeSeriesCount}</p>
                </div>
                <div className="rounded-lg bg-violet-100 p-2.5 dark:bg-violet-900/30">
                  <IconTrophy className="h-6 w-6 text-violet-600 dark:text-violet-400" aria-hidden />
                </div>
              </div>
              <Link to="/series" className="mt-3 flex items-center text-sm font-medium text-primary hover:underline">
                Ver series <IconChevronRight className="ml-0.5 h-4 w-4" />
              </Link>
            </div>

            <div className="sf-card overflow-hidden p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Torneos activos</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{activeTournamentsCount}</p>
                </div>
                <div className="rounded-lg bg-cyan-100 p-2.5 dark:bg-cyan-900/30">
                  <IconTrophy className="h-6 w-6 text-cyan-600 dark:text-cyan-400" aria-hidden />
                </div>
              </div>
              <Link to="/tournaments" className="mt-3 flex items-center text-sm font-medium text-primary hover:underline">
                Ver torneos <IconChevronRight className="ml-0.5 h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </section>

      {/* Estado de cuotas (si hay datos) */}
      {feeStatus && (
        <section className="sf-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Estado de cuotas</h2>
            <Link to="/treasury" className="text-sm font-medium text-primary hover:underline">
              Detalle en Tesorería
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 sm:max-w-md">
            <div className="rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-900/20">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Al día</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{feeCounts.al_dia}</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">Pendiente</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{feeCounts.pendiente}</p>
            </div>
            <div className="rounded-xl bg-rose-50 px-4 py-3 dark:bg-rose-900/20">
              <p className="text-xs font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300">Atrasado</p>
              <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">{feeCounts.atrasado}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
              <div className="flex h-full">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct(feeCounts.al_dia)}%` }} />
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct(feeCounts.pendiente)}%` }} />
                <div className="h-full bg-rose-500 transition-all" style={{ width: `${pct(feeCounts.atrasado)}%` }} />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {totalPlayers} jugadores con cuota asignada
            </p>
          </div>
        </section>
      )}
      {feeStatusError && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{feeStatusError}</p>
      )}

      {/* Tesorería resumida (solo si puede ver y hay summary) */}
      {canTreasury && feeSummary && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="sf-card p-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Resumen tesorería</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Recaudado</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatClp(feeSummary.total_collected)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pendiente de cobro</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatClp(feeSummary.total_pending)}</p>
              </div>
            </div>
            <Link to="/treasury" className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline">
              Ver tesorería completa <IconChevronRight className="ml-0.5 h-4 w-4" />
            </Link>
          </div>
          {feeSummary.collection_by_series && feeSummary.collection_by_series.length > 0 && (
            <div className="sf-card p-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recaudación por serie</h2>
              <ul className="mt-3 space-y-2">
                {feeSummary.collection_by_series.slice(0, 5).map((row) => (
                  <li key={row.series_id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{row.series_name}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{formatClp(row.total_collected)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Próximos partidos + Convocatorias */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="sf-card p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Próximos partidos</h2>
            <Link to="/matches" className="text-sm font-medium text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          {nextMatches.length === 0 ? (
            <p className="mt-4 text-slate-500 dark:text-slate-400">No hay partidos programados desde hoy.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {nextMatches.map((m) => {
                const s = seriesById[m.series_id]
                const t = tournamentById[m.tournament_id]
                return (
                  <li key={m.id}>
                    <Link
                      to={`/matches/${m.id}`}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-primary/30 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700/50"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="rounded-lg bg-slate-100 px-3 py-2 text-center dark:bg-slate-700">
                          <span className="block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                            {formatMatchDate(m.match_date).split(' ')[0]}
                          </span>
                          <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
                            {m.match_date.slice(8, 10)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">vs {m.opponent}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {m.venue}
                            {m.field_number ? ` · Cancha ${m.field_number}` : ''} · Citación {m.call_time}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {s && <SeriesBadge seriesId={m.series_id} name={s.name} color={s.color} />}
                            {t && <span className="text-xs text-slate-500 dark:text-slate-400">{t.name} {t.season_year}</span>}
                          </div>
                        </div>
                      </div>
                      <IconChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="sf-card p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Convocatorias por serie</h2>
          {!seriesConvocations ? (
            <div className="mt-4 flex justify-center py-6">
              <div className="sf-loading-spinner h-8 w-8" role="status" aria-label="Cargando" />
            </div>
          ) : seriesConvocations.length === 0 ? (
            <p className="mt-4 text-slate-500 dark:text-slate-400">No hay series activas.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {seriesConvocations.map((c) => {
                const m = c.match
                const st = c.status
                return (
                  <li key={c.series_id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-600">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{c.series_name}</p>
                        {m ? (
                          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            Próximo: <Link to={`/matches/${m.id}`} className="font-medium text-primary hover:underline">vs {m.opponent}</Link>
                            {' '}· {m.match_date} {m.call_time}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Sin partido próximo</p>
                        )}
                      </div>
                      {st && (
                        <div className="flex flex-wrap justify-end gap-1">
                          <span className="sf-badge sf-badge-emerald">{st.confirmed_count} ✓</span>
                          <span className="sf-badge sf-badge-amber">{st.pending_count} ?</span>
                          <span className="sf-badge sf-badge-rose">{st.declined_count} ✗</span>
                        </div>
                      )}
                    </div>
                    {m && st && st.confirmed_count > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {st.lines
                          .filter((l) => l.status === 'confirmed')
                          .slice(0, 6)
                          .map((l) => (
                            <span key={l.player_id} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                              {l.player_name}
                            </span>
                          ))}
                        {st.confirmed_count > 6 && <span className="text-xs text-slate-500">+{st.confirmed_count - 6}</span>}
                      </div>
                    )}
                    {m && !st && c.error && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{c.error}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
