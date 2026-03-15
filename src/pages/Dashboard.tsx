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
import { apiFetch, apiUpload, ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { Button } from '../ui/Button'
import { IconCheck, IconPlus, IconX } from '../ui/Icons'
import { Modal } from '../ui/Modal'
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
  collection_by_series?: { series_id: string; series_name: string; total_collected: number; total_pending?: number }[]
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

function getCalendarParts(d: string): { dow: string; day: string; month: string } {
  try {
    const [y, m, day] = d.split('-').map(Number)
    const date = new Date(y, m - 1, day)
    const dowIndex = date.getDay() // 0=Domingo
    const WEEKDAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'] as const
    const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'] as const
    return {
      dow: WEEKDAYS[dowIndex] ?? '',
      day: String(day).padStart(2, '0'),
      month: MONTHS[m - 1] ?? '',
    }
  } catch {
    return { dow: '', day: d.slice(8, 10) || d, month: '' }
  }
}

export function DashboardPage() {
  const { accessToken, me } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const [loadingBase, setLoadingBase] = useState(true)
  const [loadingFeeStatus, setLoadingFeeStatus] = useState(true)
  const [loadingTreasury, setLoadingTreasury] = useState(true)
  const canTreasury = me?.role === 'tesorero' || me?.role === 'admin'

  const [matches, setMatches] = useState<Match[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])

  const [feeStatus, setFeeStatus] = useState<PlayerFeeStatus[] | null>(null)
  const [feeStatusError, setFeeStatusError] = useState<string | null>(null)
  /** Conteo de jugadores cuando no hay permiso a /api/fees/status (ej. rol jugador) */
  const [playersCountFallback, setPlayersCountFallback] = useState<number | null>(null)

  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null)
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0)

  const [seriesConvocations, setSeriesConvocations] = useState<SeriesConvocationCard[] | null>(null)

  const [registerPaymentOpen, setRegisterPaymentOpen] = useState(false)
  const [registerPaymentSaving, setRegisterPaymentSaving] = useState(false)
  const [registerPaymentError, setRegisterPaymentError] = useState<string | null>(null)
  const [registerRut, setRegisterRut] = useState('')
  const [registerAmount, setRegisterAmount] = useState(0)
  const [registerFeeSuggestion, setRegisterFeeSuggestion] = useState<{ fee_amount: number | null; fee_source: string | null } | null>(null)
  const [registerPeriod, setRegisterPeriod] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [registerRef, setRegisterRef] = useState('')
  const [registerReceiptFile, setRegisterReceiptFile] = useState<File | null>(null)
  const [registerFieldErrors, setRegisterFieldErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!accessToken) return
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const from = `${yyyy}-${mm}-${dd}`

    setError(null)
    setFeeStatusError(null)
    setPlayersCountFallback(null)

    // Base: partidos, series, torneos (en paralelo; error solo si falla base)
    setLoadingBase(true)
    Promise.all([
      apiFetch<Match[]>(`/api/matches?from_date=${encodeURIComponent(from)}`, { authToken: accessToken }),
      apiFetch<Series[]>('/api/series', { authToken: accessToken }),
      apiFetch<Tournament[]>('/api/tournaments', { authToken: accessToken }),
    ])
      .then(([ms, ss, ts]) => {
        const matchesList = Array.isArray(ms) ? ms : []
        const seriesList = Array.isArray(ss) ? ss : []
        const tournamentsList = Array.isArray(ts) ? ts : []
        const sorted = [...matchesList].sort((a, b) => a.match_date.localeCompare(b.match_date) || a.call_time.localeCompare(b.call_time))
        setMatches(sorted)
        setSeries(seriesList)
        setTournaments(tournamentsList)
        setError(null)

        // Convocatorias dependen de base; se lanzan al tener series y partidos
        const activeSeries = seriesList.filter((x) => x.active)
        const firstMatchBySeries = new Map<string, Match>()
        for (const m of sorted) {
          if (!firstMatchBySeries.has(m.series_id)) firstMatchBySeries.set(m.series_id, m)
        }
        const cardsBase: SeriesConvocationCard[] = activeSeries.map((s) => ({
          series_id: s.id,
          series_name: s.name,
          match: firstMatchBySeries.get(s.id),
        }))
        Promise.all(
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
        ).then(setSeriesConvocations)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES))
      .finally(() => setLoadingBase(false))

    // Estado de cuotas (en paralelo con el resto)
    setLoadingFeeStatus(true)
    apiFetch<PlayerFeeStatus[]>('/api/fees/status?active=true', { authToken: accessToken })
      .then((st) => setFeeStatus(Array.isArray(st) ? st : []))
      .catch(async (e: unknown) => {
        setFeeStatus(null)
        setFeeStatusError(e instanceof Error ? e.message : 'Sin permiso o error al cargar cuotas')
        try {
          const list = await apiFetch<{ id: string }[]>('/api/players?active=true', { authToken: accessToken })
          setPlayersCountFallback(Array.isArray(list) ? list.length : 0)
        } catch {
          setPlayersCountFallback(0)
        }
      })
      .finally(() => setLoadingFeeStatus(false))

    // Tesorería (en paralelo; solo si puede ver)
    if (canTreasury) {
      setLoadingTreasury(true)
      Promise.all([
        apiFetch<FeeSummary>('/api/fees/summary-by-period', { authToken: accessToken }).then(setFeeSummary).catch(() => setFeeSummary(null)),
        apiFetch<{ id: string }[]>('/api/payments?status=pending_validation&limit=500', { authToken: accessToken })
          .then((list) => setPendingPaymentsCount(Array.isArray(list) ? list.length : 0))
          .catch(() => setPendingPaymentsCount(0)),
      ]).finally(() => setLoadingTreasury(false))
    } else {
      setLoadingTreasury(false)
    }
  }, [accessToken, canTreasury])

  useEffect(() => {
    if (!accessToken || !registerPaymentOpen || !registerRut.trim() || !registerPeriod) {
      setRegisterFeeSuggestion(null)
      return
    }
    apiFetch<{ fee_amount: number | null; fee_source: string | null }>(
      `/api/fees/player-fee-by-rut?rut=${encodeURIComponent(registerRut.trim())}&year_month=${encodeURIComponent(registerPeriod)}`,
      { authToken: accessToken },
    )
      .then((r) => {
        setRegisterFeeSuggestion(r)
        setRegisterAmount(r.fee_amount != null ? r.fee_amount : 0)
      })
      .catch(() => setRegisterFeeSuggestion(null))
  }, [accessToken, registerPaymentOpen, registerRut, registerPeriod])

  const seriesById = useMemo(() => Object.fromEntries(series.map((s) => [s.id, s])), [series])
  const tournamentById = useMemo(() => Object.fromEntries(tournaments.map((t) => [t.id, t])), [tournaments])

  const feeCounts = useMemo(() => {
    const base = { al_dia: 0, pendiente: 0, atrasado: 0 }
    if (!feeStatus) return base
    for (const x of feeStatus) base[x.status]++
    return base
  }, [feeStatus])

  const totalPlayers =
    feeStatus !== null ? feeCounts.al_dia + feeCounts.pendiente + feeCounts.atrasado : (playersCountFallback ?? 0)
  const pct = (n: number) => (totalPlayers ? Math.round((n / totalPlayers) * 100) : 0)

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

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            {greeting()}, {me?.username}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Resumen del equipo y actividad reciente
          </p>
        </div>
        {!canTreasury ? (
          <Button
            variant="primary"
            icon={<IconPlus className="h-4 w-4" />}
            onClick={() => {
              setRegisterPaymentOpen(true)
              setRegisterPaymentError(null)
              setRegisterFieldErrors({})
            }}
          >
            Registrar pago
          </Button>
        ) : null}
      </header>

      {/* KPIs: cada caja con skeleton o dato */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <div className="sf-card overflow-hidden p-5 transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Jugadores activos</p>
              {loadingFeeStatus ? <div className="mt-1 h-8 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" aria-hidden /> : <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{totalPlayers}</p>}
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
              {loadingBase ? <div className="mt-1 h-8 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" aria-hidden /> : <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{matches.length}</p>}
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
                  {loadingTreasury ? <div className="mt-1 h-8 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" aria-hidden /> : <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">{feeSummary ? formatClp(feeSummary.total_collected) : '—'}</p>}
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
                  {loadingTreasury ? <div className="mt-1 h-8 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" aria-hidden /> : <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{pendingPaymentsCount}</p>}
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
                  {loadingBase ? <div className="mt-1 h-8 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" aria-hidden /> : <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{activeSeriesCount}</p>}
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
                  {loadingBase ? <div className="mt-1 h-8 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" aria-hidden /> : <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{activeTournamentsCount}</p>}
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

      {/* Estado de cuotas */}
      {(loadingFeeStatus || feeStatus) && (
        <section className="sf-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Estado de cuotas</h2>
            <Link to="/treasury" className="text-sm font-medium text-primary hover:underline">
              Detalle en Tesorería
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 sm:max-w-md">
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center dark:bg-emerald-900/20">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Al día</p>
              {loadingFeeStatus ? <div className="mx-auto mt-1 h-8 w-10 animate-pulse rounded bg-emerald-200 dark:bg-emerald-800" aria-hidden /> : <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{feeCounts.al_dia}</p>}
            </div>
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-center dark:bg-amber-900/20">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">Pendiente</p>
              {loadingFeeStatus ? <div className="mx-auto mt-1 h-8 w-10 animate-pulse rounded bg-amber-200 dark:bg-amber-800" aria-hidden /> : <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{feeCounts.pendiente}</p>}
            </div>
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-center dark:bg-rose-900/20">
              <p className="text-xs font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300">Atrasado</p>
              {loadingFeeStatus ? <div className="mx-auto mt-1 h-8 w-10 animate-pulse rounded bg-rose-200 dark:bg-rose-800" aria-hidden /> : <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">{feeCounts.atrasado}</p>}
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
              {loadingFeeStatus ? (
                <div className="h-full w-2/3 animate-pulse rounded-full bg-slate-300 dark:bg-slate-500" aria-hidden />
              ) : (
                <div className="flex h-full">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct(feeCounts.al_dia)}%` }} />
                  <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct(feeCounts.pendiente)}%` }} />
                  <div className="h-full bg-rose-500 transition-all" style={{ width: `${pct(feeCounts.atrasado)}%` }} />
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {loadingFeeStatus ? <span className="inline-block h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" aria-hidden /> : `${totalPlayers} jugadores con cuota asignada`}
            </p>
          </div>
        </section>
      )}
      {feeStatusError && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{feeStatusError}</p>
      )}

      <Modal
        open={registerPaymentOpen}
        title="Registrar pago"
        onClose={() => {
          if (!registerPaymentSaving) {
            setRegisterPaymentOpen(false)
            setRegisterPaymentError(null)
            setRegisterRut('')
            setRegisterAmount(0)
            setRegisterFeeSuggestion(null)
            setRegisterPeriod(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
            setRegisterRef('')
            setRegisterReceiptFile(null)
            setRegisterFieldErrors({})
          }
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              icon={<IconX />}
              onClick={() => setRegisterPaymentOpen(false)}
              disabled={registerPaymentSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon={<IconCheck />}
              loading={registerPaymentSaving}
              disabled={registerPaymentSaving}
              onClick={async () => {
                if (!accessToken) return
                setRegisterPaymentError(null)
                const err: Record<string, boolean> = {}
                if (!registerRut.trim()) err.rut = true
                if (registerAmount <= 0) err.amount = true
                if (Object.keys(err).length > 0) {
                  setRegisterFieldErrors(err)
                  return
                }
                setRegisterFieldErrors({})
                setRegisterPaymentSaving(true)
                try {
                  const created = await apiFetch<{ id: string }>('/api/payments/self-register', {
                    method: 'POST',
                    authToken: accessToken,
                    body: JSON.stringify({
                      rut: registerRut.trim(),
                      amount: registerAmount,
                      target_month: registerPeriod || null,
                      reference_number: registerRef.trim() || null,
                      notes_player: registerRef.trim() || null,
                    }),
                  })
                  if (registerReceiptFile) {
                    await apiUpload(`/api/payments/${created.id}/receipt`, registerReceiptFile, {
                      authToken: accessToken,
                    })
                  }
                  setRegisterPaymentOpen(false)
                  setRegisterRut('')
                  setRegisterAmount(0)
                  setRegisterFeeSuggestion(null)
                  setRegisterPeriod(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
                  setRegisterRef('')
                  setRegisterReceiptFile(null)
                } catch (e: unknown) {
                  setRegisterPaymentError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
                } finally {
                  setRegisterPaymentSaving(false)
                }
              }}
            >
              {registerPaymentSaving ? 'Guardando…' : 'Registrar'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
            El pago queda <strong>pendiente de validación</strong>. El tesorero lo revisará y validará.
          </p>
          {registerPaymentError ? (
            <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200 sm:col-span-2">
              {registerPaymentError}
            </div>
          ) : null}
          <label className="block text-sm sm:col-span-2">
            RUT
            <input
              className={`mt-1 w-full sf-input ${registerFieldErrors.rut ? 'sf-input-invalid' : ''}`}
              type="text"
              placeholder="12345678-9"
              value={registerRut}
              onChange={(e) => {
                setRegisterRut(e.target.value)
                setRegisterFieldErrors((p) => (p.rut ? { ...p, rut: false } : p))
              }}
            />
            {registerFieldErrors.rut && (
              <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>
            )}
          </label>
          {registerRut.trim() && registerPeriod ? (
            <div className="sf-card col-span-2 flex flex-wrap items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
              <div>
                <span className="text-xs font-medium text-emerald-800">Cuota mensual (según reglas):</span>
                <span className="ml-2 font-semibold text-emerald-900 inline-flex items-center gap-1.5">
                  {registerFeeSuggestion?.fee_amount != null
                    ? formatClp(registerFeeSuggestion.fee_amount)
                    : registerFeeSuggestion === null
                      ? null
                      : 'Sin cuota definida'}
                </span>
                {registerFeeSuggestion?.fee_source && registerFeeSuggestion.fee_source !== 'none' ? (
                  <span className="ml-1 text-xs text-emerald-700">
                    ({registerFeeSuggestion.fee_source === 'player' ? 'jugador' : registerFeeSuggestion.fee_source === 'series' ? 'serie' : 'general'})
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
          <label className="block text-sm">
            Período (mes)
            <input
              className="mt-1 w-full sf-input"
              type="month"
              value={registerPeriod}
              onChange={(e) => setRegisterPeriod(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Monto (CLP)
            <input
              className={`mt-1 w-full sf-input ${registerFieldErrors.amount ? 'sf-input-invalid' : ''}`}
              type="number"
              min={0}
              value={registerAmount}
              onChange={(e) => {
                setRegisterAmount(Number(e.target.value))
                setRegisterFieldErrors((p) => (p.amount ? { ...p, amount: false } : p))
              }}
            />
            {registerFieldErrors.amount && (
              <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Ingresa un monto mayor a 0</span>
            )}
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Sugerido según RUT y período; puedes editarlo.</span>
          </label>
          <label className="block text-sm sm:col-span-2">
            Referencia (opcional)
            <input
              className="mt-1 w-full sf-input"
              type="text"
              placeholder="Nº transferencia o nota"
              value={registerRef}
              onChange={(e) => setRegisterRef(e.target.value)}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            Comprobante de pago (opcional)
            <input
              className="mt-1 w-full sf-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              onChange={(e) => setRegisterReceiptFile(e.target.files?.[0] ?? null)}
            />
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              Imagen o PDF, máx 8 MB
            </span>
          </label>
        </div>
      </Modal>

      {/* Tesorería resumida (solo si puede ver) */}
      {canTreasury && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="sf-card p-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Resumen tesorería</h2>
            {loadingTreasury ? (
              <div className="mt-4 space-y-3" aria-hidden>
                <div className="h-6 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-6 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Recaudado</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{feeSummary ? formatClp(feeSummary.total_collected) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pendiente de cobro</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{feeSummary ? formatClp(feeSummary.total_pending) : '—'}</p>
                </div>
              </div>
            )}
            <Link to="/treasury" className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline">
              Ver tesorería completa <IconChevronRight className="ml-0.5 h-4 w-4" />
            </Link>
          </div>
          <div className="sf-card p-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recaudación por serie</h2>
            {loadingTreasury ? (
              <ul className="mt-3 space-y-2" aria-hidden>
                {[1, 2, 3, 4].map((i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </li>
                ))}
              </ul>
            ) : feeSummary?.collection_by_series && feeSummary.collection_by_series.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {feeSummary.collection_by_series.slice(0, 5).map((row) => (
                  <li key={row.series_id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{row.series_name}</span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">{formatClp(row.total_collected)}</span>
                      {(row.total_pending ?? 0) > 0 && (
                        <span className="text-xs text-amber-700 dark:text-amber-300">Pendiente: {formatClp(row.total_pending!)}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Sin datos</p>
            )}
          </div>
        </section>
      )}

      {/* Próximos partidos + Convocatorias */}
      <section className="sf-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Próximos partidos y convocatorias</h2>
          <Link to="/matches" className="sf-btn sf-btn-ghost px-3 py-1.5 text-sm font-medium">
            Ver todos los partidos
          </Link>
        </div>
        {!seriesConvocations ? (
          <ul className="mt-4 space-y-4" aria-hidden>
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-600">
                <div className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="flex gap-3">
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : seriesConvocations.length === 0 ? (
          <p className="mt-4 text-slate-500 dark:text-slate-400">No hay series activas.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {seriesConvocations.map((c) => {
              const m = c.match
              const st = c.status
              const serie = seriesById[c.series_id]
              const calendar = m ? getCalendarParts(m.match_date) : null
              const torneo = m ? tournamentById[m.tournament_id] : undefined
              const content = (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    {calendar ? (
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
                    ) : (
                      <div className="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                        Sin fecha
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeriesBadge seriesId={c.series_id} name={c.series_name || serie?.name} color={serie?.color} />
                      </div>
                      {m ? (
                        <>
                          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            Próximo: <span className="font-medium text-primary">vs {m.opponent}</span>
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <IconClock className="h-3.5 w-3.5" aria-hidden />
                              <span>Citación {m.call_time}</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <IconMapPin className="h-3.5 w-3.5" aria-hidden />
                              <span>
                                {m.venue}
                                {m.field_number ? ` Cancha ${m.field_number}` : ''}
                              </span>
                            </span>
                            {torneo && (
                              <span className="inline-flex items-center gap-1">
                                <IconTrophy className="h-3.5 w-3.5" aria-hidden />
                                <span>
                                  {torneo.name} {torneo.season_year}
                                </span>
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Sin partido próximo</p>
                      )}
                    </div>
                    {st && (
                      <div className="flex flex-shrink-0 flex-col items-end gap-1 sm:flex-row sm:justify-end">
                        <span className="sf-badge sf-badge-emerald inline-flex min-w-[2.5rem] justify-center">
                          {st.confirmed_count} ✓
                        </span>
                        <span className="sf-badge sf-badge-amber inline-flex min-w-[2.5rem] justify-center">
                          {st.pending_count} ?
                        </span>
                        <span className="sf-badge sf-badge-rose inline-flex min-w-[2.5rem] justify-center">
                          {st.declined_count} ✗
                        </span>
                      </div>
                    )}
                  </div>
                  {m && st && st.confirmed_count > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {st.lines
                        .filter((l) => l.status === 'confirmed')
                        .slice(0, 6)
                        .map((l) => (
                          <span
                            key={l.player_id}
                            className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          >
                            {l.player_name}
                          </span>
                        ))}
                      {st.confirmed_count > 6 && (
                        <span className="text-xs text-slate-500">+{st.confirmed_count - 6}</span>
                      )}
                    </div>
                  )}
                  {m && !st && c.error && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{c.error}</p>
                  )}
                </>
              )
              return (
                <li key={c.series_id}>
                  {m ? (
                    <Link
                      to={`/matches/${m.id}`}
                      className="block rounded-xl border border-slate-200 p-4 transition-colors hover:border-primary/30 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700/50"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-600">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
