import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock, Grid, LayoutDashboard, Pencil, Scale, Trash2, Users } from 'lucide-react'
import { apiFetch, ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { Modal } from '../ui/Modal'
import { PageHeader } from '../ui/PageHeader'
import { SeriesBadge } from '../ui/SeriesBadge'

type Payment = {
  id: string
  player_id: string
  player_name?: string | null
  amount: number
  currency: string
  status: 'pending_validation' | 'validated' | 'rejected'
  transfer_ref?: string | null
  notes_player?: string | null
  notes_treasurer?: string | null
  created_at?: string
  target_month?: string | null
}

type Player = { id: string; first_name: string; last_name: string; primary_series_id: string }
type PlayerStatus = {
  player_id: string
  player_name: string
  series_id: string
  status: 'al_dia' | 'pendiente' | 'atrasado'
  fee_amount?: number | null
  fee_source?: string | null
  total_pending?: number
  pending_months_count?: number
  credit_balance?: number
  total_contributed?: number
  paid_months_count?: number
}
type Series = { id: string; name: string; active: boolean; color?: string | null }

type FeeRule = {
  id: string
  scope: 'general' | 'series' | 'player'
  scope_id: string | null
  amount: number
  currency: string
  active: boolean
  effective_from: string
  effective_to: string | null
}

type PeriodSummary = {
  year_month: string
  status: 'al_dia' | 'pendiente'
  total_expected: number
  total_collected: number
  total_pending: number
  players_total: number
  players_paid: number
}

type CollectionBySeries = { series_id: string; series_name: string; total_collected: number; total_pending?: number }
type CollectionByTournament = {
  tournament_id: string
  tournament_name: string
  total_collected: number
  total_expected?: number
  total_pending?: number
}
type CollectionByPlayer = { player_id: string; player_name: string; total_collected: number }

type UnpaidPeriodsPlayer = { player_id: string; player_name: string; series_id: string; unpaid_months: string[] }
type UnpaidPeriodsData = {
  tournament_id: string
  tournament_name: string
  start_month: string
  end_month: string
  players: UnpaidPeriodsPlayer[]
}

/** Formatea YYYY-MM en hora local (ej. mar 2026). */
function formatYearMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })
}

/** Formatea YYYY-MM con mes largo en hora local (ej. marzo 2026). */
function formatYearMonthLong(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

/** Formatea monto en pesos CLP */
function clp(amount: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)
}

const STATUS_LABEL: Record<PlayerStatus['status'], string> = { al_dia: 'Al día', pendiente: 'Pendiente', atrasado: 'Atrasado' }
function StatusPill(props: { status: PlayerStatus['status'] }) {
  const s = props.status
  const variant = s === 'al_dia' ? 'sf-badge-emerald' : s === 'pendiente' ? 'sf-badge-amber' : 'sf-badge-rose'
  return <span className={'sf-badge ' + variant}>{STATUS_LABEL[s] ?? s}</span>
}

type PlayerPeriodCell = { status: 'pagado' | 'pendiente'; amount: number; paid: number }
type PlayerPeriodRow = { player_id: string; player_name: string; series_id: string; periods: Record<string, PlayerPeriodCell> }
type PlayerPeriodMatrix = { periods: string[]; players: PlayerPeriodRow[] }

type TabId = 'dashboard' | 'pending' | 'register' | 'status' | 'matrix' | 'rules'

const VALID_TABS: TabId[] = ['dashboard', 'pending', 'register', 'status', 'matrix', 'rules']

export function TreasuryPage() {
  const { accessToken, me } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as TabId | null
  const [tab, setTabState] = useState<TabId>(() => (tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'dashboard'))

  const setTab = (t: TabId) => {
    setTabState(t)
    setSearchParams(t === 'dashboard' ? {} : { tab: t }, { replace: true })
  }

  useEffect(() => {
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl) && tabFromUrl !== tab) setTabState(tabFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl])
  const [error, setError] = useState<string | null>(null)

  const [pending, setPending] = useState<Payment[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [seriesId, setSeriesId] = useState<string>('')
  const [feeStatus, setFeeStatus] = useState<PlayerStatus[]>([])
  const [feeRules, setFeeRules] = useState<FeeRule[]>([])
  const [collectionBySeries, setCollectionBySeries] = useState<CollectionBySeries[]>([])
  const [collectionByTournament, setCollectionByTournament] = useState<CollectionByTournament[]>([])
  const [collectionByPlayer, setCollectionByPlayer] = useState<CollectionByPlayer[]>([])
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary[]>([])
  const [totalCollected, setTotalCollected] = useState<number>(0)
  const [totalPending, setTotalPending] = useState<number>(0)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [playerMatrix, setPlayerMatrix] = useState<PlayerPeriodMatrix | null>(null)
  const [copiedPendingSummary, setCopiedPendingSummary] = useState(false)
  const [pendingSummaryOpen, setPendingSummaryOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'todos' | 'al_dia' | 'pendiente' | 'atrasado'>('todos')

  const [playerId, setPlayerId] = useState('')
  const [amount, setAmount] = useState(150000)
  const [paymentPeriod, setPaymentPeriod] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [transferRef, setTransferRef] = useState('')
  const [notesPlayer, setNotesPlayer] = useState('')
  const [saving, setSaving] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [feeForRegister, setFeeForRegister] = useState<{ fee_amount: number | null; fee_source: string | null } | null>(null)

  const [actionModal, setActionModal] = useState<{ payment: Payment; action: 'validate' | 'reject' } | null>(null)
  const [actionModalLoading, setActionModalLoading] = useState(false)
  const [notesTreasurer, setNotesTreasurer] = useState('')

  const [rulesOpen, setRulesOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<FeeRule | null>(null)
  const [ruleToDelete, setRuleToDelete] = useState<FeeRule | null>(null)
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null)
  const [ruleScope, setRuleScope] = useState<'general' | 'series' | 'player'>('general')
  const [ruleScopeId, setRuleScopeId] = useState('')
  const [ruleAmount, setRuleAmount] = useState(15000)
  const [registerFieldErrors, setRegisterFieldErrors] = useState<Record<string, boolean>>({})
  const [rulesFieldErrors, setRulesFieldErrors] = useState<Record<string, boolean>>({})
  const [ruleEffectiveFrom, setRuleEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [ruleEffectiveTo, setRuleEffectiveTo] = useState('')

  const [unpaidPeriodsData, setUnpaidPeriodsData] = useState<UnpaidPeriodsData | null>(null)
  const [unpaidPeriodsLoading, setUnpaidPeriodsLoading] = useState(false)

  const canTreasury = me?.role === 'tesorero' || me?.role === 'admin'

  async function reloadAll() {
    if (!accessToken) return
    setDashboardLoading(true)
    try {
      // Carga base: pendientes, series, jugadores y reglas.
      // El resumen y los estados detallados se cargan en efectos específicos (reloadSummary / reloadStatus)
      const [pays, ss, pl, rules] = await Promise.all([
        apiFetch<Payment[]>('/api/payments?status=pending_validation&limit=200', { authToken: accessToken }),
        apiFetch<Series[]>('/api/series', { authToken: accessToken }),
        apiFetch<Player[]>('/api/players?active=true', { authToken: accessToken }),
        apiFetch<FeeRule[]>('/api/fees/rules', { authToken: accessToken }),
      ])
      setPending(pays)
      setSeries(ss)
      setPlayers(pl)
      setFeeRules(rules)
    } finally {
      setDashboardLoading(false)
    }
  }

  async function reloadSummary() {
    if (!accessToken) return
    setDashboardLoading(true)
    try {
      const summary = await apiFetch<{
        periods: PeriodSummary[]
        total_collected: number
        total_pending: number
        collection_by_series?: CollectionBySeries[]
        collection_by_tournament?: CollectionByTournament[]
        collection_by_player?: CollectionByPlayer[]
      }>(`/api/fees/summary-by-period${seriesId ? `?series_id=${encodeURIComponent(seriesId)}` : ''}`, { authToken: accessToken })
      if (summary && typeof summary === 'object' && Array.isArray(summary.periods)) {
        setPeriodSummary(summary.periods)
        setTotalCollected(summary.total_collected ?? 0)
        setTotalPending(summary.total_pending ?? 0)
        setCollectionBySeries(Array.isArray(summary.collection_by_series) ? summary.collection_by_series : [])
        setCollectionByTournament(Array.isArray(summary.collection_by_tournament) ? summary.collection_by_tournament : [])
        setCollectionByPlayer(Array.isArray(summary.collection_by_player) ? summary.collection_by_player : [])
      } else {
        setPeriodSummary([])
        setTotalCollected(0)
        setTotalPending(0)
        setCollectionBySeries([])
        setCollectionByTournament([])
        setCollectionByPlayer([])
      }
    } finally {
      setDashboardLoading(false)
    }
  }

  async function reloadMatrix() {
    if (!accessToken) return
    const qs = new URLSearchParams()
    if (seriesId) qs.set('series_id', seriesId)
    const data = await apiFetch<PlayerPeriodMatrix>(`/api/fees/player-period-matrix${qs.toString() ? `?${qs}` : ''}`, { authToken: accessToken })
    setPlayerMatrix(data)
  }

  async function reloadStatus() {
    if (!accessToken) return
    const qs = new URLSearchParams()
    if (seriesId) qs.set('series_id', seriesId)
    const st = await apiFetch<PlayerStatus[]>(`/api/fees/status${qs.toString() ? `?${qs}` : ''}`, {
      authToken: accessToken,
    })
    setFeeStatus(st)
  }

  async function reloadRules() {
    if (!accessToken) return
    const rules = await apiFetch<FeeRule[]>('/api/fees/rules', { authToken: accessToken })
    setFeeRules(rules)
  }

  async function openUnpaidPeriods(tournamentId: string) {
    if (!accessToken) return
    setUnpaidPeriodsLoading(true)
    setUnpaidPeriodsData(null)
    try {
      const data = await apiFetch<UnpaidPeriodsData>(`/api/fees/unpaid-periods?tournament_id=${encodeURIComponent(tournamentId)}`, { authToken: accessToken })
      setUnpaidPeriodsData(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
    } finally {
      setUnpaidPeriodsLoading(false)
    }
  }

  useEffect(() => {
    if (!accessToken) return
    reloadAll().catch((e: unknown) => setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  useEffect(() => {
    if (!accessToken || tab !== 'status') return
    reloadStatus().catch((e: unknown) => setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId, tab])

  useEffect(() => {
    if (!accessToken || tab !== 'matrix') return
    reloadMatrix().catch((e: unknown) => setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, tab, seriesId])

  useEffect(() => {
    if (!accessToken || tab !== 'dashboard') return
    reloadSummary().catch((e: unknown) => setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, seriesId])

  useEffect(() => {
    if (!accessToken || !registerOpen || !playerId.trim() || !paymentPeriod) {
      setFeeForRegister(null)
      return
    }
    apiFetch<{ fee_amount: number | null; fee_source: string | null }>(
      `/api/fees/player-fee?player_id=${encodeURIComponent(playerId)}&year_month=${encodeURIComponent(paymentPeriod)}`,
      { authToken: accessToken },
    )
      .then((r) => {
        setFeeForRegister(r)
        setAmount(r.fee_amount != null ? r.fee_amount : 0)
      })
      .catch(() => setFeeForRegister(null))
  }, [accessToken, registerOpen, playerId, paymentPeriod])

  const pendingTotal = useMemo(() => pending.reduce((s, p) => s + (p.amount || 0), 0), [pending])

  const playersSorted = useMemo(
    () => [...players].sort((a, b) => (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name)),
    [players],
  )
  const seriesById = useMemo(() => Object.fromEntries(series.map((s) => [s.id, s])), [series])
  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  const statusByPlayerId = useMemo(
    () => Object.fromEntries(feeStatus.map((s) => [s.player_id, s.status] as const)),
    [feeStatus],
  )

  const matrixPlayersSorted = useMemo(
    () =>
      playerMatrix
        ? [...playerMatrix.players].sort((a, b) => a.player_name.localeCompare(b.player_name, 'es', { sensitivity: 'base' }))
        : null,
    [playerMatrix],
  )

  const pendingSummaryRows = useMemo(
    () => {
      if (!playerMatrix) return []
      const rows: { player_name: string; months: string[] }[] = []
      const playersForSummary = [...playerMatrix.players].sort((a, b) =>
        a.player_name.localeCompare(b.player_name, 'es', { sensitivity: 'base' }),
      )
      for (const p of playersForSummary) {
        const pendingPeriods = playerMatrix.periods.filter((ym) => {
          const cell = p.periods[ym]
          return cell && cell.status === 'pendiente'
        })
        if (pendingPeriods.length === 0) continue
        rows.push({
          player_name: p.player_name,
          months: pendingPeriods.map((ym) => formatYearMonth(ym)),
        })
      }
      return rows
    },
    [playerMatrix],
  )

  const pendingSummaryText = useMemo(() => {
    if (pendingSummaryRows.length === 0) return ''
    const lines: string[] = ['Jugador - Meses pendientes']
    for (const r of pendingSummaryRows) {
      lines.push(`${r.player_name} - ${r.months.join(', ')}`)
    }
    return lines.join('\n')
  }, [pendingSummaryRows])

  if (!canTreasury) return <div className="text-sm text-slate-600 dark:text-slate-400">Sin permiso.</div>

  function ruleScopeLabel(r: FeeRule) {
    if (r.scope === 'general') return 'General'
    if (r.scope === 'series' && r.scope_id) return seriesById[r.scope_id]?.name ?? r.scope_id
    if (r.scope === 'player' && r.scope_id) return playersById[r.scope_id] ? `${playersById[r.scope_id].first_name} ${playersById[r.scope_id].last_name}` : r.scope_id
    return r.scope_id ?? '-'
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Resumen', icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: 'pending', label: 'Pendientes', icon: <Clock className="h-5 w-5" /> },
    { id: 'status', label: 'Estados', icon: <Users className="h-5 w-5" /> },
    { id: 'matrix', label: 'Períodos', icon: <Grid className="h-5 w-5" /> },
    { id: 'rules', label: 'Reglas', icon: <Scale className="h-5 w-5" /> },
  ]

  return (
    <div className="space-y-3">
      <PageHeader
        title="Tesorería"
        extra={
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/50">
            <div className="grid grid-cols-5 gap-1 sm:flex sm:flex-wrap sm:gap-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  className={'flex flex-col items-center justify-center gap-0.5 rounded-lg p-2.5 text-sm font-medium transition-colors touch-manipulation sm:flex-row sm:gap-1.5 sm:px-3 ' + (tab === t.id ? 'bg-slate-900 text-white dark:bg-primary' : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 dark:active:bg-slate-600')}
                  onClick={() => setTab(t.id)}
                  title={t.label}
                  aria-label={t.label}
                >
                  {t.icon}
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Series</label>
                <select
                  className="sf-input w-full min-w-0 py-2 text-sm sm:w-auto sm:min-w-[180px] sm:py-1.5"
                  value={seriesId}
                  onChange={(e) => setSeriesId(e.target.value)}
                  aria-label="Filtrar por serie"
                >
                  <option value="">Todas las series</option>
                  {series.filter((s) => s.active).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Estado</span>
                {(['todos', 'al_dia', 'pendiente', 'atrasado'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={
                      'rounded-full px-2.5 py-1 text-xs font-medium transition-colors ' +
                      (statusFilter === s
                        ? 'bg-slate-900 text-white dark:bg-primary'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')
                    }
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <button
          className="sf-btn sf-btn-primary"
          onClick={() => {
            setTab('register')
            setRegisterFieldErrors({})
            setRegisterOpen(true)
          }}
        >
          Registrar pago
        </button>
      </PageHeader>

      {!registerOpen && !rulesOpen && error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}

      {tab === 'dashboard' ? (
        <div className="space-y-3">
          {dashboardLoading ? (
            <div className="sf-card flex flex-col items-center justify-center gap-3 p-12">
              <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Cargando resumen de tesorería…</p>
            </div>
          ) : (
            <>
          {/* Wireframe: izquierda ~66% (2 cards arriba + Resumen grande); derecha ~33% (3 cards apiladas, altura al contenido) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
            {/* Columna izquierda */}
            <div className="flex min-w-0 flex-col gap-4">
              {/* Fila superior: Recaudado + Pendiente */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sf-card flex h-32 flex-col justify-center p-4">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Recaudado</div>
                  <div className="text-xl font-semibold text-emerald-700">{clp(totalCollected)}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Suma de todos los pagos validados</p>
                </div>
                <div className="sf-card flex min-h-32 flex-col justify-center p-4">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Pendiente</div>
                  <div className="text-xl font-semibold text-amber-700">{clp(totalPending)}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Suma de lo que tiene que ser pagado (cuotas hasta el mes actual)</p>
                  {totalPending === 0 && feeRules.length > 0 ? (
                    <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-300/90">
                      Si esperas deuda: revisa que la regla de cuota esté <strong>vigente desde el primer mes</strong> (ej. 2026-01-01) y que los jugadores tengan esa serie.
                    </p>
                  ) : null}
                </div>
              </div>

              {pending.length > 0 ? (
                <div className="sf-card flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">Pagos por validar</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">{pending.length} pagos · {clp(pendingTotal)}</div>
                  </div>
                  <button className="sf-btn sf-btn-secondary" onClick={() => setTab('pending')}>
                    Ir a pendientes
                  </button>
                </div>
              ) : null}

              {/* Resumen por período — panel grande */}
              <div className="sf-card min-h-[320px] min-w-0 flex-1 overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Resumen por período
                </div>
                <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Solo meses pasados y actuales. Al día = todos los jugadores pagaron su cuota.
                </p>
                {(periodSummary?.length ?? 0) === 0 ? (
                  <div className="p-6 text-sm text-slate-600 dark:text-slate-400">
                    No hay períodos con cargos. Las cuotas se generan automáticamente al consultar.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <th className="px-4 py-2">Período</th>
                          <th className="px-4 py-2">Estado</th>
                          <th className="px-4 py-2 text-right">Recaudado</th>
                          <th className="px-4 py-2 text-right">Pendiente</th>
                          <th className="px-4 py-2 text-center">Jugadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(periodSummary ?? []).map((p) => (
                          <tr key={p.year_month} className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-700 dark:hover:bg-slate-700/30">
                            <td className="px-4 py-2 font-medium">
                              {formatYearMonthLong(p.year_month)}
                            </td>
                            <td className="px-4 py-2">
                              <span className={'sf-badge ' + (p.status === 'al_dia' ? 'sf-badge-emerald' : 'sf-badge-amber')}>
                                {p.status === 'al_dia' ? 'Al día' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-emerald-700 dark:text-emerald-300">
                              {clp(p.total_collected)}
                            </td>
                            <td className="px-4 py-2 text-right text-amber-700 dark:text-amber-300">
                              {clp(p.total_pending)}
                            </td>
                            <td className="px-4 py-2 text-center text-slate-600 dark:text-slate-400">
                              {p.players_paid}/{p.players_total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha: 3 cards apiladas, altura al contenido (serie y torneo compactas; jugador con scroll si hay muchos) */}
            <div className="flex flex-col gap-4">
              <div className="sf-card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Recaudación por serie
                </div>
                <div className="overflow-y-auto">
                  {collectionBySeries.length === 0 ? (
                    <p className="p-3 text-xs text-slate-500 dark:text-slate-400">Sin datos</p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody>
                        {collectionBySeries.map((r) => (
                          <tr key={r.series_id} className="border-b border-slate-100 dark:border-slate-700">
                            <td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">{r.series_name}</td>
                            <td className="px-3 py-1.5 text-right">
                              <span className="text-emerald-700 dark:text-emerald-300">{clp(r.total_collected)}</span>
                              {(r.total_pending ?? 0) > 0 && (
                                <span className="ml-1.5 block text-xs text-amber-700 dark:text-amber-300">Pend: {clp(r.total_pending!)}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="sf-card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Recaudación por torneo
                </div>
                <div className="overflow-y-auto">
                  {collectionByTournament.length === 0 ? (
                    <p className="p-3 text-xs text-slate-500 dark:text-slate-400">Sin datos</p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody>
                        {collectionByTournament.map((r) => (
                          <tr key={r.tournament_id} className="border-b border-slate-100 dark:border-slate-700">
                            <td className="px-3 py-1.5">
                              <div className="font-medium text-slate-800 dark:text-slate-200">{r.tournament_name}</div>
                              {(r.total_expected != null && r.total_expected > 0) ? (
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  Cuotas totales: {clp(r.total_expected)}
                                  {(r.total_pending != null && r.total_pending > 0) ? <> · Pendiente: {clp(r.total_pending)}</> : ''}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-3 py-1.5 text-right text-emerald-700 dark:text-emerald-300">{clp(r.total_collected)}</td>
                            <td className="px-3 py-1.5 text-right">
                              <button
                                type="button"
                                className="text-xs text-sky-600 hover:underline dark:text-sky-400"
                                onClick={() => openUnpaidPeriods(r.tournament_id)}
                                disabled={unpaidPeriodsLoading}
                              >
                                Periodos no pagados
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="sf-card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Recaudación por jugador
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {collectionByPlayer.length === 0 ? (
                    <p className="p-3 text-xs text-slate-500 dark:text-slate-400">Sin datos</p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody>
                        {collectionByPlayer.slice(0, 15).map((r) => (
                          <tr key={r.player_id} className="border-b border-slate-100 dark:border-slate-700">
                            <td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">{r.player_name}</td>
                            <td className="px-3 py-1.5 text-right text-emerald-700 dark:text-emerald-300">{clp(r.total_collected)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {collectionByPlayer.length > 15 ? (
                    <p className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      y {collectionByPlayer.length - 15} más
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      ) : null}

      <Modal
        open={pendingSummaryOpen}
        title="Resumen de cuotas pendientes"
        onClose={() => {
          setPendingSummaryOpen(false)
        }}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="sf-btn sf-btn-secondary"
              onClick={() => setPendingSummaryOpen(false)}
            >
              Cerrar
            </button>
            {pendingSummaryRows.length > 0 ? (
              <button
                type="button"
                className="sf-btn sf-btn-primary"
                onClick={async () => {
                  try {
                    if ('clipboard' in navigator && pendingSummaryText) {
                      await navigator.clipboard.writeText(pendingSummaryText)
                      setCopiedPendingSummary(true)
                      window.setTimeout(() => setCopiedPendingSummary(false), 1500)
                    }
                  } catch {
                    // ignore
                  }
                }}
              >
                {copiedPendingSummary ? 'Copiado' : 'Copiar para pegar en grupo'}
              </button>
            ) : null}
          </div>
        }
      >
        {pendingSummaryRows.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No hay jugadores con cuotas pendientes en los períodos visibles.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Este resumen está pensado para copiar y pegar en tu grupo de WhatsApp u otro chat.
            </p>
            <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20">
              <table className="w-full text-xs sm:text-[13px]">
                <thead className="bg-slate-100 text-left text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="px-2 py-1 sm:px-3 sm:py-2">Jugador</th>
                    <th className="px-2 py-1 sm:px-3 sm:py-2">Meses pendientes</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSummaryRows.map((r) => (
                    <tr key={r.player_name} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-2 py-1 font-medium text-slate-800 dark:text-slate-100 sm:px-3 sm:py-1.5">
                        {r.player_name}
                      </td>
                      <td className="px-2 py-1 text-slate-700 dark:text-slate-200 sm:px-3 sm:py-1.5">
                        {r.months.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {tab === 'pending' ? (
        <div className="space-y-2">
          {pending.length === 0 ? (
            <div className="sf-card p-4 text-sm text-slate-600 dark:text-slate-400">No hay pagos pendientes.</div>
          ) : (
            pending.map((p) => (
              <div key={p.id} className="sf-card p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{p.player_name || p.player_id}</div>
                  <span className="sf-badge sf-badge-amber">pendiente</span>
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {clp(p.amount)} · {p.created_at ? new Date(p.created_at).toLocaleString('es-CL') : '-'}
                </div>
                {p.target_month ? (
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Período: {formatYearMonthLong(p.target_month)}
                    {p.target_month > `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` ? (
                      <span className="ml-1.5 sf-badge sf-badge-emerald">adelantado</span>
                    ) : null}
                  </div>
                ) : null}
                {p.transfer_ref ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Ref: {p.transfer_ref}</div> : null}
                {p.notes_player ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Nota jugador: {p.notes_player}</div> : null}
                <div className="mt-3 flex gap-2">
                  <button
                    className="sf-btn sf-btn-primary"
                    onClick={() => {
                      setActionModal({ payment: p, action: 'validate' })
                      setNotesTreasurer('')
                    }}
                  >
                    Validar
                  </button>
                  <button
                    className="sf-btn sf-btn-secondary"
                    onClick={() => {
                      setActionModal({ payment: p, action: 'reject' })
                      setNotesTreasurer('')
                    }}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      <Modal
        open={!!actionModal}
        title={actionModal?.action === 'validate' ? 'Validar pago' : 'Rechazar pago'}
        onClose={() => { if (!actionModalLoading) setActionModal(null) }}
        footer={
          <div className="flex justify-end gap-2">
            <button className="sf-btn sf-btn-secondary" onClick={() => setActionModal(null)} disabled={actionModalLoading}>Cancelar</button>
            <button
              className="sf-btn sf-btn-primary inline-flex items-center justify-center gap-2"
              disabled={actionModalLoading}
              onClick={async () => {
                if (!accessToken || !actionModal) return
                setError(null)
                setActionModalLoading(true)
                const endpoint = actionModal.action === 'validate' ? 'validate' : 'reject'
                try {
                  await apiFetch(`/api/payments/${actionModal.payment.id}/${endpoint}`, {
                    method: 'POST',
                    authToken: accessToken,
                    body: JSON.stringify({ notes_treasurer: notesTreasurer.trim() || null }),
                  })
                  await reloadAll()
                  setActionModal(null)
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
                } finally {
                  setActionModalLoading(false)
                }
              }}
            >
              {actionModalLoading ? (
                <>
                  <span className="sf-loading-spinner sf-loading-spinner-sm inline-block shrink-0" role="status" aria-label="Procesando" />
                  {actionModal?.action === 'validate' ? 'Validando…' : 'Rechazando…'}
                </>
              ) : (
                actionModal?.action === 'validate' ? 'Validar' : 'Rechazar'
              )}
            </button>
          </div>
        }
      >
        {actionModal ? (
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {actionModal.payment.player_name || actionModal.payment.player_id} · {clp(actionModal.payment.amount)}
            </p>
            {actionModal.payment.target_month ? (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Período: {formatYearMonthLong(actionModal.payment.target_month)}
                {actionModal.payment.target_month > `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` ? (
                  <span className="ml-1.5 sf-badge sf-badge-emerald">pago adelantado</span>
                ) : null}
              </p>
            ) : null}
            <label className="mt-3 block text-sm">
              Nota del tesorero (opcional)
              <input
                className="mt-1 sf-input"
                value={notesTreasurer}
                onChange={(e) => setNotesTreasurer(e.target.value)}
                placeholder={actionModal.action === 'validate' ? 'Ej: Validado contra cartola' : 'Ej: No coincide la transferencia'}
              />
            </label>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!unpaidPeriodsData || unpaidPeriodsLoading}
        title="Periodos no pagados"
        onClose={() => { if (!unpaidPeriodsLoading) setUnpaidPeriodsData(null) }}
        footer={
          <div className="flex justify-end">
            <button type="button" className="sf-btn sf-btn-secondary" onClick={() => setUnpaidPeriodsData(null)} disabled={unpaidPeriodsLoading}>
              Cerrar
            </button>
          </div>
        }
      >
        {unpaidPeriodsLoading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Cargando…</p>
        ) : unpaidPeriodsData ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{unpaidPeriodsData.tournament_name}</p>
            {unpaidPeriodsData.start_month && unpaidPeriodsData.end_month ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Período cuotas: {formatYearMonth(unpaidPeriodsData.start_month)} – {formatYearMonth(unpaidPeriodsData.end_month)}
              </p>
            ) : null}
            {unpaidPeriodsData.players.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">No hay jugadores con periodos no pagados en este torneo (o el torneo no tiene período de cuotas definido).</p>
            ) : unpaidPeriodsData.players.every((p) => p.unpaid_months.length === 0) ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">Todos los jugadores están al día.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-600">
                      <th className="px-2 py-1.5 text-left font-medium text-slate-700 dark:text-slate-300">Jugador</th>
                      <th className="px-2 py-1.5 text-left font-medium text-slate-700 dark:text-slate-300">Meses no pagados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpaidPeriodsData.players
                      .filter((p) => p.unpaid_months.length > 0)
                      .map((p) => (
                        <tr key={p.player_id} className="border-b border-slate-100 dark:border-slate-700">
                          <td className="px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200">{p.player_name}</td>
                          <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">
                            {p.unpaid_months.map(formatYearMonth).join(', ')}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={registerOpen}
        title="Registrar pago"
        onClose={() => { if (!saving) { setError(null); setRegisterOpen(false) } }}
        footer={
          <div className="flex justify-end gap-2">
            <button className="sf-btn sf-btn-secondary" onClick={() => { setError(null); setRegisterOpen(false) }} disabled={saving}>Cancelar</button>
            <button
              className="sf-btn sf-btn-primary inline-flex items-center justify-center gap-2"
              disabled={saving}
              onClick={async () => {
                if (!accessToken) return
                setError(null)
                const err: Record<string, boolean> = {}
                if (!playerId.trim()) err.playerId = true
                if (amount <= 0) err.amount = true
                if (Object.keys(err).length > 0) {
                  setRegisterFieldErrors(err)
                  return
                }
                setRegisterFieldErrors({})
                setSaving(true)
                try {
                  await apiFetch('/api/payments', {
                    method: 'POST',
                    authToken: accessToken,
                    body: JSON.stringify({
                      player_id: playerId.trim(),
                      amount: amount,
                      currency: 'CLP',
                      transfer_ref: transferRef.trim() || null,
                      notes_player: notesPlayer.trim() || null,
                      target_month: paymentPeriod || null,
                    }),
                  })
                  setPlayerId('')
                  setAmount(150000)
                  setPaymentPeriod(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
                  setTransferRef('')
                  setNotesPlayer('')
                  await reloadAll()
                  setRegisterOpen(false)
                  setTab('pending')
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
                } finally {
                  setSaving(false)
                }
              }}
            >
              {saving ? (
                <>
                  <span className="sf-loading-spinner sf-loading-spinner-sm inline-block shrink-0" role="status" aria-label="Guardando" />
                  Guardando…
                </>
              ) : (
                'Registrar'
              )}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
            El pago se guarda como <strong>pendiente de validación</strong>. Para que cuente en la recaudación, valídalo desde la pestaña Pendientes.
          </p>
          {error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200 sm:col-span-2">{error}</div> : null}
          <label className="block text-sm sm:col-span-2">
            Jugador
            <select
              className={`mt-1 w-full sf-input ${registerFieldErrors.playerId ? 'sf-input-invalid' : ''}`}
              value={playerId}
              onChange={(e) => { setPlayerId(e.target.value); setRegisterFieldErrors((p) => (p.playerId ? { ...p, playerId: false } : p)) }}
            >
              <option value="">Selecciona jugador…</option>
              {playersSorted.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.last_name} {p.first_name} {seriesById[p.primary_series_id] ? `(${seriesById[p.primary_series_id].name})` : ''}
                </option>
              ))}
            </select>
            {registerFieldErrors.playerId && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
          </label>

          {playerId ? (
            <div className="sf-card col-span-2 flex flex-wrap items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
              <div>
                <span className="text-xs font-medium text-emerald-800">Cuota mensual (según reglas):</span>
                <span className="ml-2 font-semibold text-emerald-900 inline-flex items-center gap-1.5">
                  {feeForRegister?.fee_amount != null
                    ? clp(feeForRegister.fee_amount)
                    : feeForRegister === null && registerOpen
                      ? <span className="sf-loading-spinner sf-loading-spinner-sm inline-block shrink-0" role="status" aria-label="Cargando" />
                      : 'Sin cuota definida'}
                </span>
                {feeForRegister?.fee_source && feeForRegister.fee_source !== 'none' ? (
                  <span className="ml-1 text-xs text-emerald-700">
                    ({feeForRegister.fee_source === 'player' ? 'jugador' : feeForRegister.fee_source === 'series' ? 'serie' : 'general'})
                  </span>
                ) : null}
              </div>
              <div>
                <span className="text-xs font-medium text-emerald-800">Período:</span>
                <span className="ml-2 font-medium text-emerald-900">
                  {paymentPeriod
                    ? formatYearMonthLong(paymentPeriod)
                    : '—'}
                </span>
                {paymentPeriod && paymentPeriod > `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` ? (
                  <span className="ml-2 sf-badge sf-badge-emerald">Pago adelantado</span>
                ) : null}
              </div>
            </div>
          ) : null}

          <label className="block text-sm">
            Período (mes)
            <input
              className="mt-1 sf-input"
              type="month"
              value={paymentPeriod}
              onChange={(e) => setPaymentPeriod(e.target.value)}
              title="Mes al que corresponde el pago (cuota mensual)"
            />
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Puedes elegir un mes futuro para pagar por adelantado. Al validar, se creará el cargo de ese mes si no existe.</span>
          </label>
          <label className="block text-sm">
            Monto (CLP)
            <input
              className={`mt-1 sf-input ${registerFieldErrors.amount ? 'sf-input-invalid' : ''}`}
              type="number"
              min={0}
              value={amount}
              onChange={(e) => { setAmount(Number(e.target.value)); setRegisterFieldErrors((p) => (p.amount ? { ...p, amount: false } : p)) }}
            />
            {registerFieldErrors.amount && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Ingresa un monto mayor a 0</span>}
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Cuota mensual sugerida al seleccionar jugador</span>
          </label>
          <label className="block text-sm">
            Referencia (opcional)
            <input className="mt-1 sf-input" value={transferRef} onChange={(e) => setTransferRef(e.target.value)} />
          </label>
          <label className="block text-sm sm:col-span-2">
            Nota (opcional)
            <input className="mt-1 sf-input" value={notesPlayer} onChange={(e) => setNotesPlayer(e.target.value)} />
          </label>
        </div>
      </Modal>

      {tab === 'status' ? (
        <div className="space-y-4">
          <div className="space-y-4">
            {Object.entries(
              feeStatus.reduce<Record<string, PlayerStatus[]>>((acc, p) => {
                const sid = p.series_id || '_sin_serie'
                if (!acc[sid]) acc[sid] = []
                if (statusFilter === 'todos' || p.status === statusFilter) {
                  acc[sid].push(p)
                }
                return acc
              }, {})
            )
              .sort(([a], [b]) => {
                const na = seriesById[a]?.name ?? 'zzz'
                const nb = seriesById[b]?.name ?? 'zzz'
                return na.localeCompare(nb)
              })
              .map(([sid, players]) => {
                const serie = sid !== '_sin_serie' ? seriesById[sid] : null
                return (
                  <div key={sid} className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {serie ? (
                        <SeriesBadge seriesId={sid} name={serie.name} color={serie.color} />
                      ) : (
                        <span>Sin serie</span>
                      )}
                      <span className="text-slate-400 dark:text-slate-500">· {players.length} jugadores</span>
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {players.map((p) => (
                        <div
                          key={p.player_id}
                          className={`sf-card flex flex-col gap-2 p-4 ${
                            p.status === 'atrasado' ? 'border-l-4 border-l-rose-400' : p.status === 'pendiente' ? 'border-l-4 border-l-amber-400' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium text-slate-900">{p.player_name}</div>
                            <StatusPill status={p.status} />
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                            {p.fee_amount != null ? (
                              <span title={p.fee_source === 'player' ? 'Cuota propia' : p.fee_source === 'series' ? 'Cuota de la serie' : p.fee_source === 'general' ? 'Cuota general' : 'Sin cuota'}>
                                Cuota: {clp(p.fee_amount)}
                                {p.fee_source ? (
                                  <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">({p.fee_source === 'player' ? 'jugador' : p.fee_source === 'series' ? 'serie' : 'general'})</span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="text-amber-600">Sin cuota definida</span>
                            )}
                          </div>
{(p.total_contributed ?? 0) > 0 ? (
                            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                              Valor aportado: {clp(p.total_contributed ?? 0)}
                              {(p.paid_months_count ?? 0) > 0 ? (
                                <span className="ml-1 text-xs text-slate-500 dark:text-slate-500">
                                  · {p.paid_months_count} {p.paid_months_count === 1 ? 'mes pagado' : 'meses pagados'}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          {(p.total_pending ?? 0) > 0 ? (
                            <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                              Debe: {clp(p.total_pending ?? 0)}
                              {p.pending_months_count ? (
                                <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">
                                  ({p.pending_months_count} {p.pending_months_count === 1 ? 'mes' : 'meses'})
                                </span>
                              ) : null}
                              {((p.credit_balance ?? 0) > 0) ? (
                                <span className="ml-1 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                                  · Neto: {clp(Math.max(0, (p.total_pending ?? 0) - (p.credit_balance ?? 0)))}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          {(p.credit_balance ?? 0) > 0 ? (
                            <div className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                              Saldo a favor: {clp(p.credit_balance ?? 0)}
                            </div>
                          ) : null}
                          {!((p.total_pending ?? 0) > 0) && !((p.credit_balance ?? 0) > 0) && p.status === 'al_dia' ? (
                            <div className="mt-1 text-xs text-emerald-600">
                              Al día
                              {(p.paid_months_count ?? 0) > 0 ? ` · ${p.paid_months_count} ${p.paid_months_count === 1 ? 'mes pagado' : 'meses pagados'}` : null}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      ) : null}

      {tab === 'matrix' ? (
        <div className="space-y-4">
          {!playerMatrix ? (
            <div className="sf-card flex flex-col items-center justify-center p-8">
              <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
            </div>
          ) : playerMatrix.players.length === 0 ? (
            <div className="sf-card p-4 text-sm text-slate-600 dark:text-slate-400">No hay jugadores con cargos. Las cuotas se generan automáticamente al consultar.</div>
          ) : (
            <div className="sf-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <th className="sticky left-0 z-10 min-w-[140px] bg-slate-50 px-3 py-2 dark:bg-slate-800">Jugador</th>
                      <th className="min-w-[80px] px-3 py-2 text-center">Serie</th>
                      {playerMatrix.periods.map((ym) => (
                        <th key={ym} className="min-w-[70px] px-2 py-2 text-center text-xs font-medium" title={formatYearMonth(ym)}>
                          {formatYearMonth(ym)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const basePlayers = matrixPlayersSorted ?? playerMatrix.players
                      const filteredPlayers =
                        statusFilter === 'todos'
                          ? basePlayers
                          : basePlayers.filter((p) => statusByPlayerId[p.player_id] === statusFilter)
                      return filteredPlayers
                    })().map((p) => (
                      <tr key={p.player_id} className="group border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-700 dark:hover:bg-slate-700/30">
                        <td className="sticky left-0 z-10 min-w-[140px] bg-white px-3 py-2 font-medium group-hover:bg-slate-50/80 dark:bg-slate-800 dark:group-hover:bg-slate-700/50">{p.player_name}</td>
                        <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-400">{seriesById[p.series_id]?.name ?? '—'}</td>
                        {playerMatrix.periods.map((ym) => {
                          const cell = p.periods[ym]
                          if (!cell) return <td key={ym} className="px-2 py-2 text-center text-slate-300 dark:text-slate-500">—</td>
                          const isPaid = cell.status === 'pagado'
                          const title = isPaid
                            ? `Pagado: ${clp(cell.paid)}`
                            : `Pendiente: ${clp(cell.amount - cell.paid)}`
                          return (
                            <td key={ym} className="px-2 py-2 text-center" title={title}>
                              <span
                                aria-label={isPaid ? 'Pagado' : 'Pendiente'}
                                className={
                                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ' +
                                  (isPaid
                                    ? 'bg-emerald-500 text-white dark:bg-emerald-400'
                                    : 'bg-amber-400 text-amber-400 dark:bg-amber-300 dark:text-amber-300')
                                }
                              >
                                {isPaid ? '✓' : ''}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Leyenda</span>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold text-white dark:bg-emerald-400">
                      ✓
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">Pagado</span>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-semibold text-white dark:bg-amber-300">
                      •
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">Pendiente</span>
                  </div>
                  {pendingSummaryRows.length > 0 ? (
                    <button
                      type="button"
                      className="sf-btn sf-btn-secondary sf-btn-xs"
                      onClick={() => setPendingSummaryOpen(true)}
                    >
                      Ver resumen
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'rules' ? (
        <div className="space-y-4">
          <div className="sf-card border border-blue-100 bg-blue-50/50 p-4 text-sm text-slate-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-slate-300">
            <div className="font-medium text-slate-900 dark:text-slate-100">Jerarquía de cuotas (pago mensual)</div>
            <p className="mt-2">
              Define cuotas por orden de prioridad: <strong>general</strong> (para todos), <strong>por serie</strong> (sobrescribe general) o <strong>por jugador</strong> (sobrescribe serie).
              Si un jugador no tiene cuota propia, usa la de su serie; si la serie no tiene, usa la general.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              className="sf-btn sf-btn-primary"
              onClick={() => {
                setEditingRule(null)
                setRulesFieldErrors({})
                setRuleScope('general')
                setRuleScopeId('')
                setRuleAmount(15000)
                setRuleEffectiveFrom(new Date().toISOString().slice(0, 10))
                setRuleEffectiveTo('')
                setRulesOpen(true)
              }}
            >
              Nueva regla
            </button>
          </div>
          <div className="space-y-2">
            {feeRules.length === 0 ? (
              <div className="sf-card p-4 text-sm text-slate-600 dark:text-slate-400">No hay reglas de cuotas. Crea una para definir montos por serie o general.</div>
            ) : (
              feeRules.map((r) => (
                <div key={r.id} className="sf-card flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{ruleScopeLabel(r)} · {clp(r.amount)}/mes</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Período: {r.effective_from} — {r.effective_to ?? 'indefinido'} · {r.active ? 'Activa' : 'Inactiva'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                      onClick={() => {
                        setEditingRule(r)
                        setRulesFieldErrors({})
                        setRuleScope(r.scope)
                        setRuleScopeId(r.scope_id ?? '')
                        setRuleAmount(r.amount || 0)
                        setRuleEffectiveFrom(r.effective_from)
                        setRuleEffectiveTo(r.effective_to ?? '')
                        setRulesOpen(true)
                      }}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <button
                      className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      onClick={() => setRuleToDelete(r)}
                      title="Eliminar"
                      disabled={!!deletingRuleId}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <Modal
            open={!!ruleToDelete}
            title="Eliminar regla de cuota"
            onClose={() => { if (!deletingRuleId) setRuleToDelete(null) }}
            footer={
              <div className="flex justify-end gap-2">
                <button className="sf-btn sf-btn-secondary" onClick={() => setRuleToDelete(null)} disabled={!!deletingRuleId}>Cancelar</button>
                <button
                  className="sf-btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  disabled={!!deletingRuleId}
                  onClick={async () => {
                    if (!accessToken || !ruleToDelete) return
                    setError(null)
                    setDeletingRuleId(ruleToDelete.id)
                    try {
                      await apiFetch(`/api/fees/rules/${ruleToDelete.id}`, { method: 'DELETE', authToken: accessToken })
                      await reloadRules()
                      setRuleToDelete(null)
                    } catch (e: unknown) {
                      setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
                    } finally {
                      setDeletingRuleId(null)
                    }
                  }}
                >
                  {deletingRuleId ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
            }
          >
            {ruleToDelete ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ¿Eliminar la regla <strong>{ruleScopeLabel(ruleToDelete)} · {clp(ruleToDelete.amount)}/mes</strong>? Esta acción no se puede deshacer.
              </p>
            ) : null}
          </Modal>

          <Modal
            open={rulesOpen}
            title={editingRule ? 'Editar regla' : 'Nueva regla de cuota'}
            onClose={() => { setError(null); setRulesOpen(false) }}
            footer={
              <div className="flex justify-end gap-2">
                <button className="sf-btn sf-btn-secondary" onClick={() => { setError(null); setRulesOpen(false) }}>Cancelar</button>
                <button
                  className="sf-btn sf-btn-primary"
                  disabled={saving}
                  onClick={async () => {
                    if (!accessToken) return
                    setError(null)
                    const err: Record<string, boolean> = {}
                    if (ruleAmount <= 0) err.ruleAmount = true
                    if (ruleScope !== 'general' && !ruleScopeId.trim()) err.ruleScopeId = true
                    if (Object.keys(err).length > 0) {
                      setRulesFieldErrors(err)
                      return
                    }
                    setRulesFieldErrors({})
                    setSaving(true)
                    try {
                      const scopeId = ruleScope === 'general' ? undefined : (ruleScopeId.trim() || undefined)
                      if (editingRule) {
                        await apiFetch(`/api/fees/rules/${editingRule.id}`, {
                          method: 'PATCH',
                          authToken: accessToken,
                          body: JSON.stringify({
                            amount: ruleAmount,
                            effective_from: ruleEffectiveFrom,
                            effective_to: ruleEffectiveTo.trim() || null,
                          }),
                        })
                      } else {
                        await apiFetch('/api/fees/rules', {
                          method: 'POST',
                          authToken: accessToken,
                          body: JSON.stringify({
                            scope: ruleScope,
                            scope_id: scopeId,
                            amount: ruleAmount,
                            currency: 'CLP',
                            effective_from: ruleEffectiveFrom,
                            effective_to: ruleEffectiveTo.trim() || null,
                          }),
                        })
                      }
                      await reloadRules()
                      setRulesOpen(false)
                    } catch (e: unknown) {
                      setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
                    } finally {
                      setSaving(false)
                    }
                  }}
                >
                  {saving ? 'Guardando…' : editingRule ? 'Guardar' : 'Crear'}
                </button>
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200 sm:col-span-2">{error}</div> : null}
              <label className="block text-sm">
                Alcance
                <select className="mt-1 sf-input" value={ruleScope} onChange={(e) => { setRuleScope(e.target.value as FeeRule['scope']); setRuleScopeId(''); setRulesFieldErrors((p) => (p.ruleScopeId ? { ...p, ruleScopeId: false } : p)) }}>
                  <option value="general">General</option>
                  <option value="series">Por serie</option>
                  <option value="player">Por jugador</option>
                </select>
              </label>
              {ruleScope === 'series' ? (
                <label className="block text-sm">
                  Serie
                  <select className={`mt-1 sf-input ${rulesFieldErrors.ruleScopeId ? 'sf-input-invalid' : ''}`} value={ruleScopeId} onChange={(e) => { setRuleScopeId(e.target.value); setRulesFieldErrors((p) => (p.ruleScopeId ? { ...p, ruleScopeId: false } : p)) }}>
                    <option value="">Selecciona…</option>
                    {series.filter((s) => s.active).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {rulesFieldErrors.ruleScopeId && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
                </label>
              ) : ruleScope === 'player' ? (
                <label className="block text-sm">
                  Jugador
                  <select className={`mt-1 sf-input ${rulesFieldErrors.ruleScopeId ? 'sf-input-invalid' : ''}`} value={ruleScopeId} onChange={(e) => { setRuleScopeId(e.target.value); setRulesFieldErrors((p) => (p.ruleScopeId ? { ...p, ruleScopeId: false } : p)) }}>
                    <option value="">Selecciona…</option>
                    {playersSorted.map((p) => (
                      <option key={p.id} value={p.id}>{p.last_name} {p.first_name}</option>
                    ))}
                  </select>
                  {rulesFieldErrors.ruleScopeId && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
                </label>
              ) : null}
              <label className="block text-sm">
                Monto mensual (CLP)
                <input className={`mt-1 sf-input ${rulesFieldErrors.ruleAmount ? 'sf-input-invalid' : ''}`} type="number" min={0} value={ruleAmount} onChange={(e) => { setRuleAmount(Number(e.target.value)); setRulesFieldErrors((p) => (p.ruleAmount ? { ...p, ruleAmount: false } : p)) }} />
                {rulesFieldErrors.ruleAmount && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">El monto debe ser mayor a 0</span>}
              </label>
              <label className="block text-sm">
                Vigente desde
                <input className="mt-1 sf-input" type="date" value={ruleEffectiveFrom} onChange={(e) => setRuleEffectiveFrom(e.target.value)} required />
              </label>
              <label className="block text-sm">
                Vigente hasta (opcional)
                <input
                  className="mt-1 sf-input"
                  type="date"
                  value={ruleEffectiveTo}
                  onChange={(e) => setRuleEffectiveTo(e.target.value)}
                  placeholder="Sin vencimiento"
                />
                <span className="mt-1 block text-xs text-slate-500">Dejar vacío si aplica indefinidamente</span>
              </label>
            </div>
          </Modal>
        </div>
      ) : null}

    </div>
  )
}
