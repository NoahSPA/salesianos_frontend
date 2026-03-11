import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { apiFetch, ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { Modal } from '../ui/Modal'
import { PageHeader } from '../ui/PageHeader'
import { SeriesBadge } from '../ui/SeriesBadge'

type Series = { id: string; name: string; active: boolean; color?: string | null }
type TournamentLocation = { name?: string | null; address?: string | null; map_url?: string | null }
type Tournament = { id: string; name: string; season_year: number; active: boolean; location?: TournamentLocation | null }
type Rival = { id: string; name: string; code?: string | null; series_ids: string[]; active: boolean }

type MatchStatusRef = { code: string; label: string; color_hex: string }

type Match = {
  id: string
  tournament_id: string
  series_id: string
  opponent: string
  match_date: string
  call_time: string
  venue: string
  field_number?: string | null
  status: MatchStatusRef
  notes?: string | null
  result?: string | null
  our_goals?: number | null
  opponent_goals?: number | null
}

export function MatchesPage() {
  const { accessToken, me } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const editIdFromUrl = searchParams.get('edit')
  const [series, setSeries] = useState<Series[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [rivals, setRivals] = useState<Rival[]>([])
  const [matchStatuses, setMatchStatuses] = useState<MatchStatusRef[]>([])
  const [items, setItems] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canCreate = me?.role === 'admin' || me?.role === 'delegado'

  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [seriesId, setSeriesId] = useState('')
  const [tournamentId, setTournamentId] = useState('')
  const [opponent, setOpponent] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [callTime, setCallTime] = useState('10:00')
  const [fieldNumber, setFieldNumber] = useState('')
  const [statusVal, setStatusVal] = useState<string>('programado')
  const [ourGoals, setOurGoals] = useState<number | ''>('')
  const [opponentGoals, setOpponentGoals] = useState<number | ''>('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})

  const seriesOptions = useMemo(() => series.filter((s) => s.active), [series])
  const tournamentOptions = useMemo(() => tournaments.filter((t) => t.active), [tournaments])
  const seriesById = useMemo(() => Object.fromEntries(series.map((s) => [s.id, s])), [series])
  const tournamentById = useMemo(() => Object.fromEntries(tournaments.map((t) => [t.id, t])), [tournaments])
  const itemsOrdenados = useMemo(() => [...items].sort((a, b) => a.match_date.localeCompare(b.match_date)), [items])

  const [filterSeriesId, setFilterSeriesId] = useState('')
  const itemsFiltrados = useMemo(() => {
    if (!filterSeriesId) return itemsOrdenados
    return itemsOrdenados.filter((m) => String(m.series_id) === String(filterSeriesId))
  }, [itemsOrdenados, filterSeriesId])
  const rivalsBySeries = useMemo(() => {
    if (!seriesId) return []
    return rivals.filter((r) => r.active && (r.series_ids ?? []).includes(seriesId))
  }, [rivals, seriesId])

  function openEdit(m: Match) {
    setEditingMatch(m)
    setFieldErrors({})
    setSeriesId(m.series_id)
    setTournamentId(m.tournament_id)
    setOpponent(m.opponent)
    setMatchDate(m.match_date)
    setCallTime(m.call_time)
    setFieldNumber(m.field_number ?? '')
    setStatusVal(m.status.code)
    setOurGoals(m.our_goals ?? '')
    setOpponentGoals(m.opponent_goals ?? '')
    setOpen(true)
  }

  function closeModal() {
    if (creating) return
    setError(null)
    setOpen(false)
    setEditingMatch(null)
  }

  async function reload() {
    if (!accessToken) return
    const [ms, ss, ts, rv, statuses] = await Promise.all([
      apiFetch<Match[]>('/api/matches', { authToken: accessToken }),
      apiFetch<Series[]>('/api/series', { authToken: accessToken }),
      apiFetch<Tournament[]>('/api/tournaments', { authToken: accessToken }),
      apiFetch<Rival[]>('/api/rivals', { authToken: accessToken }),
      apiFetch<MatchStatusRef[]>('/api/match-statuses', { authToken: accessToken }),
    ])
    setItems(ms)
    setSeries(ss)
    setTournaments(ts)
    setRivals(rv)
    setMatchStatuses(statuses)
  }

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    reload()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  // Abrir modal de edición si la URL trae ?edit=<matchId> (p. ej. desde detalle del partido)
  useEffect(() => {
    if (!editIdFromUrl || !canCreate || loading || items.length === 0) return
    const m = items.find((x) => x.id === editIdFromUrl)
    if (m) {
      openEdit(m)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('edit')
        return next
      }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editIdFromUrl, canCreate, loading, items])

  function statusBadge(s: MatchStatusRef) {
    return (
      <span
        className="sf-badge"
        style={{
          backgroundColor: s.color_hex + '20',
          color: s.color_hex,
          borderColor: s.color_hex + '40',
          borderWidth: 1,
          borderStyle: 'solid',
        }}
      >
        {s.label}
      </span>
    )
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Partidos"
        extra={
          !loading && items.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/50">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span>Serie:</span>
                <select
                  className="sf-input py-1.5 text-sm"
                  value={filterSeriesId}
                  onChange={(e) => setFilterSeriesId(e.target.value)}
                  aria-label="Filtrar por serie"
                >
                  <option value="">Todas</option>
                  {seriesOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400" title={filterSeriesId ? 'Filtro por serie activo. Elige «Todas» para ver todos los partidos.' : ''}>
                {filterSeriesId
                  ? `${itemsFiltrados.length} de ${itemsOrdenados.length} partido${itemsOrdenados.length !== 1 ? 's' : ''}`
                  : `${itemsFiltrados.length} partido${itemsFiltrados.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          ) : undefined
        }
      >
        {canCreate ? (
          <button
            className="sf-btn sf-btn-primary"
            onClick={() => {
              setEditingMatch(null)
              setFieldErrors({})
              setSeriesId('')
              setTournamentId('')
              setOpponent('')
              setMatchDate('')
              setCallTime('10:00')
              setFieldNumber('')
              setStatusVal('programado')
              setOpen(true)
            }}
          >
            Nuevo partido
          </button>
        ) : null}
      </PageHeader>

      <Modal
        open={open && canCreate}
        title={editingMatch ? 'Editar partido' : 'Crear partido'}
        onClose={closeModal}
        footer={
          <div className="flex justify-end gap-2">
            <button className="sf-btn sf-btn-secondary" onClick={closeModal} disabled={creating}>
              Cancelar
            </button>
            <button
              className="sf-btn sf-btn-primary"
              disabled={creating}
              onClick={async () => {
                if (!accessToken) return
                setError(null)
                const err: Record<string, boolean> = {}
                if (!seriesId) err.seriesId = true
                if (!tournamentId) err.tournamentId = true
                if (!opponent.trim()) err.opponent = true
                if (!matchDate) err.matchDate = true
                if (!callTime.trim()) err.callTime = true
                if (Object.keys(err).length > 0) {
                  setFieldErrors(err)
                  return
                }
                setFieldErrors({})
                setCreating(true)
                const payload: Record<string, unknown> = {
                  tournament_id: tournamentId,
                  series_id: seriesId,
                  opponent: opponent.trim(),
                  match_date: matchDate,
                  call_time: callTime.trim(),
                  venue: '',
                  field_number: fieldNumber.trim() ? fieldNumber.trim() : null,
                  notes: editingMatch?.notes ?? null,
                  status: statusVal,
                }
                if (editingMatch && statusVal === 'jugado') {
                  const our = ourGoals === '' ? null : Number(ourGoals)
                  const opp = opponentGoals === '' ? null : Number(opponentGoals)
                  payload.our_goals = our
                  payload.opponent_goals = opp
                  payload.result = our != null && opp != null ? `${our}-${opp}` : null
                }
                try {
                  if (editingMatch) {
                    await apiFetch<Match>(`/api/matches/${editingMatch.id}`, {
                      method: 'PATCH',
                      authToken: accessToken,
                      body: JSON.stringify(payload),
                    })
                  } else {
                    await apiFetch<Match>('/api/matches', {
                      method: 'POST',
                      authToken: accessToken,
                      body: JSON.stringify(payload),
                    })
                  }
                  setEditingMatch(null)
                  setOpponent('')
                  setMatchDate('')
                  setFieldNumber('')
                  setOurGoals('')
                  setOpponentGoals('')
                  await reload()
                  setOpen(false)
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : ERROR_MENSAJE_ES)
                } finally {
                  setCreating(false)
                }
              }}
            >
              {creating ? (editingMatch ? 'Guardando…' : 'Creando…') : editingMatch ? 'Guardar' : 'Crear'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Serie
            <select
              className={`mt-1 sf-input ${fieldErrors.seriesId ? 'sf-input-invalid' : ''}`}
              value={seriesId}
              onChange={(e) => {
                const newSeriesId = e.target.value
                setSeriesId(newSeriesId)
                if (newSeriesId !== seriesId) setOpponent('')
                setFieldErrors((p) => (p.seriesId ? { ...p, seriesId: false } : p))
              }}
            >
              <option value="" disabled>
                Selecciona…
              </option>
              {seriesOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {fieldErrors.seriesId && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Torneo
            <select className={`mt-1 sf-input ${fieldErrors.tournamentId ? 'sf-input-invalid' : ''}`} value={tournamentId} onChange={(e) => { setTournamentId(e.target.value); setFieldErrors((p) => (p.tournamentId ? { ...p, tournamentId: false } : p)) }}>
              <option value="" disabled>
                Selecciona…
              </option>
              {tournamentOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.season_year})
                </option>
              ))}
            </select>
            {fieldErrors.tournamentId && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Rival
            <select
              className={`mt-1 w-full sf-input ${fieldErrors.opponent ? 'sf-input-invalid' : ''}`}
              value={opponent}
              onChange={(e) => { setOpponent(e.target.value); setFieldErrors((p) => (p.opponent ? { ...p, opponent: false } : p)) }}
              disabled={!seriesId}
            >
              <option value="">
                {seriesId ? 'Selecciona rival…' : 'Selecciona serie primero'}
              </option>
              {rivalsBySeries.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}{r.code ? ` (${r.code})` : ''}
                </option>
              ))}
              {editingMatch && opponent && !rivalsBySeries.some((r) => r.name === opponent) ? (
                <option value={opponent}>{opponent} (fuera de lista)</option>
              ) : null}
            </select>
            {fieldErrors.opponent && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Fecha
            <input className={`mt-1 sf-input ${fieldErrors.matchDate ? 'sf-input-invalid' : ''}`} type="date" value={matchDate} onChange={(e) => { setMatchDate(e.target.value); setFieldErrors((p) => (p.matchDate ? { ...p, matchDate: false } : p)) }} />
            {fieldErrors.matchDate && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Hora citación
            <input className={`mt-1 sf-input ${fieldErrors.callTime ? 'sf-input-invalid' : ''}`} value={callTime} onChange={(e) => { setCallTime(e.target.value); setFieldErrors((p) => (p.callTime ? { ...p, callTime: false } : p)) }} />
            {fieldErrors.callTime && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Cancha
            <input className="mt-1 sf-input" value={fieldNumber} onChange={(e) => setFieldNumber(e.target.value)} placeholder="Opcional" />
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Estado
            <select
              className="mt-1 sf-input"
              value={statusVal}
              onChange={(e) => setStatusVal(e.target.value)}
            >
              {matchStatuses.length === 0 ? (
                <option value={statusVal}>{statusVal}</option>
              ) : (
                matchStatuses.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))
              )}
              {matchStatuses.length > 0 && statusVal && !matchStatuses.some((s) => s.code === statusVal) ? (
                <option value={statusVal}>{statusVal}</option>
              ) : null}
            </select>
          </label>
          {statusVal === 'jugado' ? (
            <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-600 dark:bg-slate-800/50">
              <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Marcador</p>
              <div className="grid grid-cols-4 gap-3 items-end">
                <div className="flex flex-col gap-1 min-w-0">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nuestros goles</label>
                  <input
                    className="sf-input h-11 w-full text-center text-lg font-semibold tabular-nums"
                    type="number"
                    min={0}
                    max={99}
                    value={ourGoals === '' ? '' : ourGoals}
                    onChange={(e) => setOurGoals(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
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
                    value={opponentGoals === '' ? '' : opponentGoals}
                    onChange={(e) => setOpponentGoals(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
                    aria-label="Goles rival"
                  />
                </div>
                <div className="flex flex-col justify-end items-center sm:items-start pb-2 min-w-0">
                  {ourGoals !== '' && opponentGoals !== '' ? (
                    <span
                      className={
                        'rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap ' +
                        (ourGoals > opponentGoals
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                          : ourGoals < opponentGoals
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200')
                      }
                    >
                      {ourGoals > opponentGoals ? 'Ganado' : ourGoals < opponentGoals ? 'Perdido' : 'Empate'}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
        </div>
      </Modal>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
        </div>
      ) : null}
      {!open && error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}

      {items.length === 0 && !loading ? (
        <div className="sf-card p-4 text-sm text-slate-600 dark:text-slate-400">No hay partidos.</div>
      ) : itemsFiltrados.length === 0 ? (
        <div className="sf-card p-4 text-sm text-slate-600 dark:text-slate-400">
          No hay partidos en esta serie.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {itemsFiltrados.map((m) => {
            const serie = seriesById[m.series_id]
            const torneo = tournamentById[m.tournament_id]
            const dateObj = m.match_date ? new Date(m.match_date + 'T12:00:00') : null
            const fechaLabel = dateObj ? dateObj.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : m.match_date
            const our = m.our_goals ?? null
            const opp = m.opponent_goals ?? null
            const hasResult = our != null && opp != null
            const resultVariant = hasResult
              ? our > opp
                ? 'win'
                : our < opp
                  ? 'loss'
                  : 'draw'
              : null
            const borderAccent = resultVariant
              ? resultVariant === 'win'
                ? 'border-l-4 border-l-emerald-500 dark:border-l-emerald-400'
                : resultVariant === 'loss'
                  ? 'border-l-4 border-l-rose-500 dark:border-l-rose-400'
                  : 'border-l-4 border-l-amber-500 dark:border-l-amber-400'
              : ''
            return (
              <Link
                key={m.id}
                to={`/matches/${m.id}`}
                className={
                  'sf-card group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-600 dark:bg-slate-800/50 dark:hover:border-slate-500 dark:hover:bg-slate-700/50 ' +
                  borderAccent
                }
              >
                {/* Cabecera: fecha destacada + serie + estado */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/80">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {fechaLabel}
                    </span>
                  {serie ? (
                    <SeriesBadge seriesId={m.series_id} name={serie.name} color={serie.color} />
                  ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {statusBadge(m.status)}
                    {canCreate ? (
                      <Link
                        to={`/matches?edit=${m.id}`}
                        className="rounded p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-600 dark:hover:text-slate-300"
                        onClick={(e) => e.stopPropagation()}
                        title="Editar partido"
                        aria-label="Editar partido"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                      </Link>
                    ) : null}
                  </div>
                </div>

                {/* Cuerpo: fixture Salesianos FC – resultado – rival (espacio equitativo) */}
                <div className="flex flex-1 flex-col px-4 py-4">
                  <div className="flex w-full items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-slate-700 dark:text-slate-300" title="Salesianos FC">
                      Salesianos FC
                    </span>
                    {hasResult && our != null && opp != null ? (
                      <span
                        className={
                          'shrink-0 inline-flex min-w-[4rem] justify-center rounded-lg px-3 py-1.5 text-2xl font-bold tabular-nums ' +
                          (resultVariant === 'win'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : resultVariant === 'loss'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300')
                        }
                      >
                        {our}–{opp}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        VS
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-slate-800 dark:text-slate-200" title={m.opponent}>
                      {m.opponent}
                    </span>
                  </div>
                  {hasResult && (
                    <div className="mt-3 flex justify-center">
                      <span
                        className={
                          'sf-badge text-xs ' +
                          (resultVariant === 'win' ? 'sf-badge-emerald' : resultVariant === 'loss' ? 'sf-badge-rose' : 'sf-badge-amber')
                        }
                      >
                        {resultVariant === 'win' ? 'Ganado' : resultVariant === 'loss' ? 'Perdido' : 'Empate'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pie: citación, cancha, torneo */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-400">
                  <span>Citación {m.call_time}</span>
                  {m.field_number ? (
                    <span className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-700">Cancha {m.field_number}</span>
                  ) : null}
                  {torneo ? (
                    <span className="truncate text-slate-500 dark:text-slate-500">{torneo.name}</span>
                  ) : null}
                  {!hasResult && m.result ? (
                    <span className="ml-auto font-medium text-slate-700 dark:text-slate-300">Resultado: {m.result}</span>
                  ) : null}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

