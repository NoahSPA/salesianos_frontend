import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { apiFetch, ERROR_MENSAJE_ES } from '../app/api'
import { formatDateDDMMYYYY } from '../utils/date'
import { useAuth } from '../app/auth'
import { Button } from '../ui/Button'
import { IconCheck, IconPlus, IconX } from '../ui/Icons'
import { MapboxPointPicker, type MapPoint } from '../ui/MapboxPointPicker'
import { Modal } from '../ui/Modal'
import { PageHeader } from '../ui/PageHeader'
import { SeriesBadge } from '../ui/SeriesBadge'
import { Switch } from '../ui/Switch'

type Series = { id: string; name: string; active: boolean; color?: string | null }

type Player = { id: string; first_name: string; last_name: string; primary_series_id: string; active?: boolean }
type Tournament = {
  id: string
  name: string
  season_year: number
  active: boolean
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  start_month?: string | null
  end_month?: string | null
  series_ids: string[]
  player_ids?: string[]
  location?: {
    name?: string | null
    map_url?: string | null
    lat?: number | null
    lng?: number | null
  } | null
}

type Match = {
  id: string
  tournament_id: string
  series_id: string
  opponent: string
  match_date: string
  status: { code: string; label: string; color_hex: string }
  our_goals?: number | null
  opponent_goals?: number | null
}

/** Formatea YYYY-MM en hora local para evitar desfase por UTC (ej. mar 2026). */
function formatYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })
}

export function TournamentsPage() {
  const { accessToken, me } = useAuth()
  const [items, setItems] = useState<Tournament[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentYear = new Date().getFullYear()
  const [filterYear, setFilterYear] = useState(currentYear)
  const [filterSeriesId, setFilterSeriesId] = useState('')

  const mapboxToken = (import.meta.env as { VITE_MAPBOX_TOKEN?: string }).VITE_MAPBOX_TOKEN

  const [name, setName] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [startMonth, setStartMonth] = useState('')
  const [endMonth, setEndMonth] = useState('')
  const [locMapUrl, setLocMapUrl] = useState('')
  const [locPoint, setLocPoint] = useState<MapPoint | null>(null)
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [mapUrlHint, setMapUrlHint] = useState<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editYear, setEditYear] = useState(new Date().getFullYear())
  const [editActive, setEditActive] = useState(true)
  const [editStartMonth, setEditStartMonth] = useState('')
  const [editEndMonth, setEditEndMonth] = useState('')
  const [editLocMapUrl, setEditLocMapUrl] = useState('')
  const [editLocPoint, setEditLocPoint] = useState<MapPoint | null>(null)
  const [editMapUrlHint, setEditMapUrlHint] = useState<string | null>(null)
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, boolean>>({})
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, boolean>>({})
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [createSeriesIds, setCreateSeriesIds] = useState<string[]>([])
  const [createPlayerIds, setCreatePlayerIds] = useState<string[]>([])
  const [editSeriesIds, setEditSeriesIds] = useState<string[]>([])
  const [editPlayerIds, setEditPlayerIds] = useState<string[]>([])
  const [editRosterFilterSeries, setEditRosterFilterSeries] = useState('')
  const [columnTab, setColumnTab] = useState<Record<string, 'partidos' | 'plantel'>>({})
  const [players, setPlayers] = useState<Player[]>([])

  async function reload() {
    if (!accessToken) return
    const [tournamentsData, seriesData, matchesData, playersData] = await Promise.all([
      apiFetch<Tournament[]>('/api/tournaments', { authToken: accessToken }),
      apiFetch<Series[]>('/api/series', { authToken: accessToken }),
      apiFetch<Match[]>('/api/matches', { authToken: accessToken }),
      apiFetch<Player[]>('/api/players?active=true', { authToken: accessToken }),
    ])
    setItems(tournamentsData)
    setSeries(seriesData)
    setMatches(matchesData)
    setPlayers(Array.isArray(playersData) ? playersData : [])
  }

  const seriesOptions = useMemo(() => series.filter((s) => s.active), [series])
  const seriesById = useMemo(() => Object.fromEntries(series.map((s) => [s.id, s])), [series])
  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])
  // Torneos: filtro solo por año (se muestran todos los torneos del año)
  const itemsFiltrados = useMemo(() => items.filter((t) => t.season_year === filterYear), [items, filterYear])
  const yearOptions = useMemo(() => {
    const years = new Set(items.map((t) => t.season_year))
    years.add(currentYear)
    return Array.from(years).sort((a, b) => b - a)
  }, [items, currentYear])
  // Todos los partidos por torneo, agrupados por serie (IDs normalizados a string)
  const matchesByTournamentBySeries = useMemo(() => {
    const byTournament: Record<string, Record<string, Match[]>> = {}
    for (const m of matches) {
      const tid = String(m.tournament_id ?? '')
      if (!byTournament[tid]) byTournament[tid] = {}
      const sid = String(m.series_id ?? '')
      if (!byTournament[tid][sid]) byTournament[tid][sid] = []
      byTournament[tid][sid].push(m)
    }
    for (const tid of Object.keys(byTournament)) {
      for (const sid of Object.keys(byTournament[tid])) {
        byTournament[tid][sid].sort((a, b) => a.match_date.localeCompare(b.match_date))
      }
    }
    return byTournament
  }, [matches])

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    reload()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when accessToken changes
  }, [accessToken])

  const canAdmin = me?.role === 'admin'

  function parseGoogleMapsLatLng(raw: string): MapPoint | null {
    const v = (raw || '').trim()
    if (!v) return null
    try {
      const u = new URL(v)

      // Caso común: https://www.google.com/maps/.../@-33.45,-70.66,17z
      const atMatch = u.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
      if (atMatch) {
        const lat = Number(atMatch[1])
        const lng = Number(atMatch[2])
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
      }

      // Caso: ?q=lat,lng  o  ?query=lat,lng  o  ?destination=lat,lng
      for (const key of ['q', 'query', 'destination', 'll']) {
        const val = u.searchParams.get(key)
        if (!val) continue
        const m = val.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
        if (m) {
          const lat = Number(m[1])
          const lng = Number(m[2])
          if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
        }
      }
    } catch {
      // ignore
    }
    return null
  }

  useEffect(() => {
    const p = parseGoogleMapsLatLng(locMapUrl)
    if (p) {
      setLocPoint(p)
      setMapUrlHint(null)
    } else if (locMapUrl.trim()) {
      setMapUrlHint('No pude extraer coordenadas. Pega el link completo de Google Maps (uno que incluya @lat,lng).')
    } else {
      setMapUrlHint(null)
    }
  }, [locMapUrl])

  useEffect(() => {
    const p = parseGoogleMapsLatLng(editLocMapUrl)
    if (p) {
      setEditLocPoint(p)
      setEditMapUrlHint(null)
    } else if (editLocMapUrl.trim()) {
      setEditMapUrlHint('No pude extraer coordenadas. Pega el link completo de Google Maps (uno que incluya @lat,lng).')
    } else {
      setEditMapUrlHint(null)
    }
  }, [editLocMapUrl])

  const createCoordText = useMemo(() => {
    if (!locPoint) return 'Sin punto seleccionado'
    return `${locPoint.lat.toFixed(6)}, ${locPoint.lng.toFixed(6)}`
  }, [locPoint])

  const editCoordText = useMemo(() => {
    if (!editLocPoint) return 'Sin punto seleccionado'
    return `${editLocPoint.lat.toFixed(6)}, ${editLocPoint.lng.toFixed(6)}`
  }, [editLocPoint])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Torneos"
        extra={
          !loading && items.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/50">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium">Año</span>
                <select
                  className="sf-input w-auto min-w-[5rem] py-1.5 text-sm"
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                  aria-label="Filtrar por año"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-slate-300 dark:text-slate-500" aria-hidden>|</span>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium">Partidos por serie</span>
                <select
                  className="sf-input w-auto min-w-[10rem] py-1.5 text-sm"
                  value={filterSeriesId}
                  onChange={(e) => setFilterSeriesId(e.target.value)}
                  aria-label="Filtrar partidos por serie"
                  title={filterSeriesId ? 'Solo se muestran partidos de esta serie. Elige «Todas» para ver todos.' : ''}
                >
                  <option value="">Todas</option>
                  {seriesOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {itemsFiltrados.length} torneo{itemsFiltrados.length !== 1 ? 's' : ''}
              </span>
            </div>
          ) : undefined
        }
      >
        {canAdmin ? (
          <Button variant="primary" icon={<IconPlus />} onClick={() => { setCreateFieldErrors({}); setCreateSeriesIds([]); setCreatePlayerIds([]); setOpen(true) }}>
            Nuevo torneo
          </Button>
        ) : null}
      </PageHeader>

      <Modal
        open={open && canAdmin}
        title="Crear torneo"
        onClose={() => {
          if (creating) return
          setError(null)
          setOpen(false)
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" icon={<IconX />} onClick={() => setOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon={<IconCheck />}
              loading={creating}
              disabled={creating}
              onClick={async () => {
                if (!accessToken) return
                setError(null)
                if (!name.trim()) {
                  setCreateFieldErrors({ name: true })
                  return
                }
                setCreateFieldErrors({})
                setCreating(true)
                try {
                  await apiFetch<Tournament>('/api/tournaments', {
                    method: 'POST',
                    authToken: accessToken,
                    body: JSON.stringify({
                      name: name.trim(),
                      season_year: year,
                      location:
                        locMapUrl.trim() || locPoint
                          ? {
                              name: null,
                              map_url: locMapUrl.trim() || null,
                              lat: locPoint?.lat ?? null,
                              lng: locPoint?.lng ?? null,
                            }
                          : null,
                      active: true,
                      series_ids: createSeriesIds,
                      player_ids: createPlayerIds.length > 0 ? createPlayerIds : [],
                      start_month: startMonth.trim() || null,
                      end_month: endMonth.trim() || null,
                    }),
                  })
                  setName('')
                  setStartMonth('')
                  setEndMonth('')
                  setLocMapUrl('')
                  setLocPoint(null)
                  await reload()
                  setOpen(false)
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : ERROR_MENSAJE_ES)
                } finally {
                  setCreating(false)
                }
              }}
            >
              {creating ? 'Creando…' : 'Crear'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200 sm:col-span-3">{error}</div> : null}
          <label className="block text-sm sm:col-span-2">
            Nombre
            <input className={`mt-1 sf-input ${createFieldErrors.name ? 'sf-input-invalid' : ''}`} value={name} onChange={(e) => { setName(e.target.value); setCreateFieldErrors((p) => (p.name ? { ...p, name: false } : p)) }} />
            {createFieldErrors.name && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Año
            <input
              className="mt-1 sf-input"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              required
            />
          </label>
          <div className="sm:col-span-3 grid grid-cols-2 gap-3">
            <label className="block text-sm text-slate-700 dark:text-slate-300">
              Mes inicio cuotas (YYYY-MM)
              <input className="mt-1 sf-input w-full" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
            </label>
            <label className="block text-sm text-slate-700 dark:text-slate-300">
              Mes término cuotas (YYYY-MM)
              <input className="mt-1 sf-input w-full" type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} />
            </label>
          </div>
          <div className="sm:col-span-3">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Series que participan</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {seriesOptions.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={createSeriesIds.includes(s.id)}
                    onChange={(e) => {
                      if (e.target.checked) setCreateSeriesIds((prev) => [...prev, s.id])
                      else setCreateSeriesIds((prev) => prev.filter((id) => id !== s.id))
                    }}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                  {s.name}
                </label>
              ))}
              {seriesOptions.length === 0 ? <span className="text-xs text-slate-500 dark:text-slate-400">No hay series activas.</span> : null}
            </div>
          </div>
          {createSeriesIds.length > 0 ? (
            <div className="sm:col-span-3">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Plantel (opcional)</div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Si no seleccionas jugadores, se consideran todos los de las series. Si seleccionas, solo esos jugarán en el torneo.</p>
              <div className="mt-2 max-h-48 overflow-y-auto rounded border border-slate-200 dark:border-slate-600">
                {players.filter((p) => createSeriesIds.includes(p.primary_series_id))
                  .sort((a, b) => (a.last_name || '').localeCompare(b.last_name || '', 'es') || (a.first_name || '').localeCompare(b.first_name || '', 'es'))
                  .map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                      <input
                        type="checkbox"
                        checked={createPlayerIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) setCreatePlayerIds((prev) => [...prev, p.id])
                          else setCreatePlayerIds((prev) => prev.filter((id) => id !== p.id))
                        }}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                      />
                      {p.first_name} {p.last_name} {seriesById[p.primary_series_id] ? `(${seriesById[p.primary_series_id].name})` : ''}
                    </label>
                  ))}
                {players.filter((p) => createSeriesIds.includes(p.primary_series_id)).length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">No hay jugadores en las series seleccionadas.</p>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="sm:col-span-3">
            <div className="text-sm font-medium">Ubicación (mapa)</div>
            <label className="mt-2 block text-sm">
              URL Google Maps (opcional)
              <input
                className="mt-1 sf-input"
                type="url"
                value={locMapUrl}
                onChange={(e) => setLocMapUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
              />
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pega un link de Google Maps (maps.app.goo.gl o google.com/maps).</div>
              {mapUrlHint ? <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">{mapUrlHint}</div> : null}
            </label>
            <div className="mt-3">
              <MapboxPointPicker token={mapboxToken} value={locPoint} onChange={setLocPoint} />
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Punto: <span className="font-medium">{createCoordText}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Haz click en el mapa para seleccionar el punto.</div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen && canAdmin}
        title="Editar torneo"
        maxWidthClassName="sm:max-w-5xl"
        onClose={() => {
          if (editing) return
          setError(null)
          setEditOpen(false)
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" icon={<IconX />} onClick={() => setEditOpen(false)} disabled={editing}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon={<IconCheck />}
              loading={editing}
              disabled={editing || !editId}
              onClick={async () => {
                if (!accessToken || !editId) return
                setError(null)
                if (!editName.trim()) {
                  setEditFieldErrors({ editName: true })
                  return
                }
                setEditFieldErrors({})
                setEditing(true)
                try {
                  await apiFetch<Tournament>(`/api/tournaments/${editId}`, {
                    method: 'PATCH',
                    authToken: accessToken,
                    body: JSON.stringify({
                      name: editName.trim(),
                      season_year: editYear,
                      active: editActive,
                      series_ids: editSeriesIds,
                      player_ids: editPlayerIds,
                      start_month: editStartMonth.trim() || null,
                      end_month: editEndMonth.trim() || null,
                      location:
                        editLocMapUrl.trim() || editLocPoint
                          ? {
                              name: null,
                              map_url: editLocMapUrl.trim() || null,
                              lat: editLocPoint?.lat ?? null,
                              lng: editLocPoint?.lng ?? null,
                            }
                          : null,
                    }),
                  })
                  await reload()
                  setEditOpen(false)
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
                } finally {
                  setEditing(false)
                }
              }}
            >
              {editing ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200 lg:col-span-2">{error}</div> : null}
          {/* Columna izquierda: datos del torneo */}
          <div className="space-y-3">
            <label className="block text-sm text-slate-700 dark:text-slate-300">
              Nombre
              <input className={`mt-1 w-full sf-input ${editFieldErrors.editName ? 'sf-input-invalid' : ''}`} value={editName} onChange={(e) => { setEditName(e.target.value); setEditFieldErrors((p) => (p.editName ? { ...p, editName: false } : p)) }} />
              {editFieldErrors.editName && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Año
                <input
                  className="mt-1 w-full sf-input"
                  type="number"
                  min={2000}
                  max={2100}
                  value={editYear}
                  onChange={(e) => setEditYear(Number(e.target.value))}
                  required
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Switch checked={editActive} onChange={setEditActive} aria-label="Activo" size="sm" />
              <span>Activo</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-slate-700 dark:text-slate-300">
              Mes inicio cuotas (YYYY-MM)
              <input className="mt-1 w-full sf-input" type="month" value={editStartMonth} onChange={(e) => setEditStartMonth(e.target.value)} />
            </label>
            <label className="block text-sm text-slate-700 dark:text-slate-300">
              Mes término cuotas (YYYY-MM)
              <input className="mt-1 w-full sf-input" type="month" value={editEndMonth} onChange={(e) => setEditEndMonth(e.target.value)} />
            </label>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Series que participan</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {seriesOptions.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={editSeriesIds.includes(s.id)}
                    onChange={(e) => {
                      if (e.target.checked) setEditSeriesIds((prev) => [...prev, s.id])
                      else setEditSeriesIds((prev) => prev.filter((id) => id !== s.id))
                    }}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                  />
                  {s.name}
                </label>
              ))}
              {seriesOptions.length === 0 ? <span className="text-xs text-slate-500 dark:text-slate-400">No hay series activas.</span> : null}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Ubicación (mapa)</div>
            <label className="mt-2 block text-sm text-slate-700 dark:text-slate-300">
              URL Google Maps (opcional)
              <input
                className="mt-1 w-full sf-input"
                type="url"
                value={editLocMapUrl}
                onChange={(e) => setEditLocMapUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
              />
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pega un link de Google Maps.</div>
              {editMapUrlHint ? <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">{editMapUrlHint}</div> : null}
            </label>
            <div className="mt-3">
              <MapboxPointPicker token={mapboxToken} value={editLocPoint} onChange={setEditLocPoint} />
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Punto: <span className="font-medium">{editCoordText}</span>
              </div>
            </div>
          </div>
          </div>
          {/* Columna derecha: plantel */}
          <div className="border-t border-slate-200 pt-6 lg:border-t-0 lg:border-l lg:border-slate-200 lg:pl-6 lg:pt-0 dark:border-slate-600">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Plantel (opcional)</div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Si no seleccionas jugadores, se consideran todos los de las series.</p>
            {editSeriesIds.length > 0 ? (
              <>
                <label className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Filtrar por serie
                  <select
                    className="mt-1 block w-full sf-input py-2 text-sm"
                    value={editRosterFilterSeries}
                    onChange={(e) => setEditRosterFilterSeries(e.target.value)}
                    aria-label="Filtrar jugadores por serie"
                  >
                    <option value="">Todas las series</option>
                    {editSeriesIds.map((sid) => (
                      <option key={sid} value={sid}>
                        {seriesById[sid]?.name ?? sid}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    onClick={() => {
                      const filtered = players
                        .filter((p) => editSeriesIds.includes(p.primary_series_id) && (!editRosterFilterSeries || p.primary_series_id === editRosterFilterSeries))
                        .map((p) => p.id)
                      setEditPlayerIds((prev) => Array.from(new Set([...prev, ...filtered])))
                    }}
                  >
                    Seleccionar todos
                  </button>
                </div>
                <div className="mt-2 max-h-[32rem] overflow-y-auto rounded border border-slate-200 dark:border-slate-600">
                  {players
                    .filter((p) => editSeriesIds.includes(p.primary_series_id) && (!editRosterFilterSeries || p.primary_series_id === editRosterFilterSeries))
                    .sort((a, b) => (a.last_name || '').localeCompare(b.last_name || '', 'es') || (a.first_name || '').localeCompare(b.first_name || '', 'es'))
                    .map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={editPlayerIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) setEditPlayerIds((prev) => [...prev, p.id])
                            else setEditPlayerIds((prev) => prev.filter((id) => id !== p.id))
                          }}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        />
                        {p.first_name} {p.last_name} {seriesById[p.primary_series_id] ? `(${seriesById[p.primary_series_id].name})` : ''}
                      </label>
                    ))}
                  {players.filter((p) => editSeriesIds.includes(p.primary_series_id) && (!editRosterFilterSeries || p.primary_series_id === editRosterFilterSeries)).length === 0 ? (
                    <p className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {editRosterFilterSeries ? 'No hay jugadores en esta serie.' : 'No hay jugadores en las series seleccionadas.'}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Selecciona al menos una serie para gestionar el plantel.</p>
            )}
          </div>
        </div>
      </Modal>

      {loading ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center">
          <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
        </div>
      ) : null}
      {!open && !editOpen && error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}

      {items.length === 0 && !loading ? (
        <div className="sf-card rounded-xl border border-slate-200 p-8 text-center text-slate-600 dark:border-slate-600 dark:text-slate-400">
          <p className="font-medium">No hay torneos todavía.</p>
          <p className="mt-1 text-sm">Crea uno con el botón «Nuevo torneo».</p>
        </div>
      ) : itemsFiltrados.length === 0 ? (
        <div className="sf-card rounded-xl border border-slate-200 p-8 text-center text-slate-600 dark:border-slate-600 dark:text-slate-400">
          <p className="font-medium">No hay torneos para el año {filterYear}.</p>
          <p className="mt-1 text-sm">Cambia el año en el filtro o crea un torneo nuevo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {itemsFiltrados.map((t) => {
            const bySeries = matchesByTournamentBySeries[String(t.id)] ?? {}
            const displaySeriesIds = (
              filterSeriesId && (t.series_ids ?? []).includes(filterSeriesId)
                ? [filterSeriesId]
                : (t.series_ids ?? [])
            ).sort((a, b) => {
              const na = seriesById[a]?.name ?? ''
              const nb = seriesById[b]?.name ?? ''
              return na.localeCompare(nb)
            })
            const matchCount = displaySeriesIds.reduce((acc, sid) => acc + (bySeries[sid]?.length ?? 0), 0)
            return (
              <div
                key={t.id}
                className="group sf-card flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-600 dark:bg-slate-800/50"
              >
                {/* Cabecera: nombre, año, estado, editar */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/80">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {t.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="sf-badge sf-badge-blue text-xs">{t.season_year}</span>
                      {matchCount > 0 ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {matchCount} partido{matchCount !== 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {canAdmin ? (
                      <>
                        <Switch
                          checked={!!t.active}
                          onChange={async (checked) => {
                            if (!accessToken) return
                            setTogglingId(t.id)
                            try {
                              await apiFetch<Tournament>(`/api/tournaments/${t.id}`, {
                                method: 'PATCH',
                                authToken: accessToken,
                                body: JSON.stringify({ active: checked }),
                              })
                              await reload()
                            } catch {
                              await reload()
                            } finally {
                              setTogglingId(null)
                            }
                          }}
                          disabled={togglingId === t.id}
                          aria-label={t.active ? 'Activo (desactivar)' : 'Inactivo (activar)'}
                          size="sm"
                        />
                        <button
                          type="button"
                          className="rounded p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-600 dark:hover:text-slate-300"
                          onClick={() => {
                            setEditId(t.id)
                            setEditFieldErrors({})
                            setEditName(t.name ?? '')
                            setEditYear(t.season_year ?? new Date().getFullYear())
                            setEditActive(!!t.active)
                            setEditStartMonth(t.start_month ?? '')
                            setEditEndMonth(t.end_month ?? '')
                            setEditLocMapUrl(t.location?.map_url ?? '')
                            setEditLocPoint(
                              t.location?.lat != null && t.location?.lng != null ? { lat: t.location.lat, lng: t.location.lng } : null
                            )
                            setEditSeriesIds(Array.isArray(t.series_ids) ? [...t.series_ids] : [])
                            setEditPlayerIds(Array.isArray(t.player_ids) ? [...t.player_ids] : [])
                            setEditRosterFilterSeries('')
                            setEditOpen(true)
                          }}
                          title="Editar torneo"
                          aria-label="Editar torneo"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {t.active ? 'Activo' : 'Inactivo'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cuerpo: descripción, cuotas, series, ubicación */}
                <div className="flex flex-1 flex-col px-4 py-3">
                  {t.description ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t.description}</p>
                  ) : null}
                  <dl className="mt-2 space-y-1 text-xs">
                    {t.start_month && t.end_month ? (
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-slate-500 dark:text-slate-400">Cuotas:</dt>
                        <dd className="text-slate-700 dark:text-slate-300">
                          {formatYearMonth(t.start_month)} – {formatYearMonth(t.end_month)}
                        </dd>
                      </div>
                    ) : null}
                    {Array.isArray(t.series_ids) && t.series_ids.length > 0 ? (
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        <dt className="shrink-0 text-slate-500 dark:text-slate-400">Series:</dt>
                        <dd className="flex flex-wrap gap-1">
                          {t.series_ids.map((sid) => (
                            <SeriesBadge key={sid} seriesId={sid} name={seriesById[sid]?.name} color={seriesById[sid]?.color} />
                          ))}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  {(t.location?.map_url || (t.location?.lat != null && t.location?.lng != null)) ? (
                    <div className="mt-3">
                      {t.location?.map_url ? (
                        <a
                          href={t.location.map_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                        >
                          Abrir en mapa
                        </a>
                      ) : null}
                      {t.location?.lat != null && t.location?.lng != null && !t.location?.map_url ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {t.location.lat.toFixed(4)}, {t.location.lng.toFixed(4)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Partidos y plantel por serie (columnas) */}
                {displaySeriesIds.length > 0 ? (
                  <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-600">
                    <div
                      className="grid gap-4"
                      style={{ gridTemplateColumns: `repeat(${displaySeriesIds.length}, minmax(0, 1fr))` }}
                    >
                      {displaySeriesIds.map((sid) => {
                        const list = bySeries[sid] ?? []
                        const roster =
                          Array.isArray(t.player_ids) && t.player_ids.length > 0
                            ? t.player_ids
                                .map((pid) => playersById[pid])
                                .filter((p): p is Player => !!p && p.primary_series_id === sid)
                            : players.filter((p) => p.primary_series_id === sid && (t.series_ids ?? []).includes(sid))
                        const serieName = seriesById[sid]?.name ?? 'Serie'
                        return (
                          <div
                            key={sid}
                            className="flex flex-col rounded-lg border border-slate-200 bg-slate-50/50 dark:border-slate-600 dark:bg-slate-800/30"
                          >
                            <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-600">
                              <SeriesBadge seriesId={sid} name={serieName} color={seriesById[sid]?.color} />
                            </div>
                            <div className="flex flex-1 flex-col p-0">
                              <div className="flex border-b border-slate-200 dark:border-slate-600">
                                <button
                                  type="button"
                                  onClick={() => setColumnTab((prev) => ({ ...prev, [`${t.id}_${sid}`]: 'partidos' }))}
                                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                                    (columnTab[`${t.id}_${sid}`] ?? 'partidos') === 'partidos'
                                      ? 'border-b-2 border-slate-900 bg-slate-100/80 text-slate-900 dark:border-slate-100 dark:bg-slate-700/50 dark:text-slate-100'
                                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30 dark:hover:text-slate-300'
                                  }`}
                                >
                                  Partidos {list.length > 0 ? `(${list.length})` : ''}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setColumnTab((prev) => ({ ...prev, [`${t.id}_${sid}`]: 'plantel' }))}
                                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                                    (columnTab[`${t.id}_${sid}`] ?? 'partidos') === 'plantel'
                                      ? 'border-b-2 border-slate-900 bg-slate-100/80 text-slate-900 dark:border-slate-100 dark:bg-slate-700/50 dark:text-slate-100'
                                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/30 dark:hover:text-slate-300'
                                  }`}
                                >
                                  Plantel ({roster.length})
                                </button>
                              </div>
                              <div className="min-h-[4rem] p-3">
                                {(columnTab[`${t.id}_${sid}`] ?? 'partidos') === 'partidos' ? (
                                  list.length > 0 ? (
                                    <ul className="space-y-1">
                                      {list.map((m) => {
                                        const hasScore = m.status?.code === 'jugado' && m.our_goals != null && m.opponent_goals != null
                                        const scoreColor =
                                          !hasScore
                                            ? 'text-slate-600 dark:text-slate-400'
                                            : (m.our_goals ?? 0) > (m.opponent_goals ?? 0)
                                              ? 'text-emerald-600 dark:text-emerald-400'
                                              : (m.our_goals ?? 0) < (m.opponent_goals ?? 0)
                                                ? 'text-rose-600 dark:text-rose-400'
                                                : 'text-slate-500 dark:text-slate-400'
                                        const dateLabel = m.match_date ? formatDateDDMMYYYY(m.match_date) : ''
                                        return (
                                          <li key={m.id}>
                                            <Link
                                              to={`/matches/${m.id}`}
                                              className="flex flex-wrap items-center gap-x-2 rounded py-0.5 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                            >
                                              <span className="text-slate-700 dark:text-slate-300">vs {m.opponent}</span>
                                              {hasScore ? (
                                                <span className={'font-semibold tabular-nums ' + scoreColor}>
                                                  {m.our_goals}–{m.opponent_goals}
                                                </span>
                                              ) : (
                                                <span className="text-slate-500 dark:text-slate-400">
                                                  {dateLabel}
                                                  {m.status?.label ? ` · ${m.status.label}` : ''}
                                                </span>
                                              )}
                                            </Link>
                                          </li>
                                        )
                                      })}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Sin partidos</p>
                                  )
                                ) : roster.length > 0 ? (
                                  <ul className="space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
                                    {roster
                                      .sort((a, b) => (a.first_name || '').localeCompare(b.first_name || '', 'es') || (a.last_name || '').localeCompare(b.last_name || '', 'es'))
                                      .map((p) => (
                                        <li key={p.id}>
                                          {p.first_name} {p.last_name}
                                        </li>
                                      ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {Array.isArray(t.player_ids) && t.player_ids.length > 0 ? 'Ninguno inscrito' : 'Sin jugadores'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

