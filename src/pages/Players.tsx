import { useEffect, useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { apiFetch, apiUpload, ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { Modal } from '../ui/Modal'
import { PageHeader } from '../ui/PageHeader'
import { SeriesBadge } from '../ui/SeriesBadge'
import { formatRutDisplay, normalizeRut, RUT_INVALID_MESSAGE, validateRut } from '../utils/rut'
import { getPlayerAvatarUrl } from '../utils/avatar'
import { Switch } from '../ui/Switch'

type Series = { id: string; name: string; active: boolean; color?: string | null }

type Player = {
  id: string
  first_name: string
  second_first_name?: string | null
  last_name: string
  second_last_name?: string | null
  rut: string
  birth_date: string
  phone: string
  email?: string | null
  primary_series_id: string
  series_ids: string[]
  positions: string[]
  level_stars: number
  active: boolean
  notes?: string | null
  avatar_url?: string | null
  avatar_file_id?: string | null
}

type PlayerImportResult = {
  inserted: number
  updated: number
  skipped: number
  errors: Array< { line: number; error: string; row: Record<string, string> } >
}

/** Etiquetas en español para mostrar campo = valor en errores de importación */
const IMPORT_FIELD_LABELS: Record<string, string> = {
  rut: 'RUT',
  first_name: 'Primer nombre',
  second_first_name: 'Segundo nombre',
  last_name: 'Primer apellido',
  second_last_name: 'Segundo apellido',
  birth_date: 'Fecha nacimiento',
  phone: 'Celular',
  email: 'Email',
  position_primary: 'Posición principal',
  position_secondary: 'Posición secundaria',
  level: 'Nivel',
  notes: 'Observaciones',
}
function formatRowAsFieldValue(row: Record<string, string>): Array<{ campo: string; valor: string }> {
  return Object.entries(row)
    .filter(([, v]) => v != null && String(v).trim() !== '')
    .map(([key, valor]) => ({
      campo: IMPORT_FIELD_LABELS[key] ?? key,
      valor: String(valor).trim(),
    }))
}

const PLAYER_POSITIONS: Array<{ code: Player['positions'][number]; label: string; group: string }> = [
  { code: 'gk', label: 'Portero', group: 'Portero' },
  { code: 'rb', label: 'Lateral derecho', group: 'Defensa' },
  { code: 'cb', label: 'Central', group: 'Defensa' },
  { code: 'lb', label: 'Lateral izquierdo', group: 'Defensa' },
  { code: 'rwb', label: 'Carrilero derecho', group: 'Defensa' },
  { code: 'lwb', label: 'Carrilero izquierdo', group: 'Defensa' },
  { code: 'dm', label: 'Medio defensivo', group: 'Mediocampo' },
  { code: 'cm', label: 'Medio centro', group: 'Mediocampo' },
  { code: 'am', label: 'Medio ofensivo', group: 'Mediocampo' },
  { code: 'rw', label: 'Extremo derecho', group: 'Ataque' },
  { code: 'lw', label: 'Extremo izquierdo', group: 'Ataque' },
  { code: 'st', label: 'Delantero centro', group: 'Ataque' },
  { code: 'cf', label: 'Segundo delantero', group: 'Ataque' },
]

function PlayerAvatar(props: { firstName: string; lastName: string; avatarUrl?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const [imgError, setImgError] = useState(false)
  const sizeClass = props.size === 'sm' ? 'h-10 w-10 text-sm' : props.size === 'lg' ? 'h-24 w-24 text-2xl' : 'h-12 w-12 text-base'
  const initials = `${(props.firstName || '').trim().slice(0, 1)}${(props.lastName || '').trim().slice(0, 1)}`.toUpperCase() || '?'
  const showImg = props.avatarUrl?.trim() && !imgError
  return (
    <div className={`${sizeClass} shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600`}>
      {showImg ? (
        <img
          src={props.avatarUrl!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-medium text-slate-600 dark:text-slate-300" aria-hidden>
          {initials}
        </div>
      )}
    </div>
  )
}

function Stars(props: { value: number; onChange?: (v: number) => void; readonly?: boolean; compact?: boolean }) {
  const v = Math.max(0, Math.min(5, props.value || 0))
  const size = props.compact ? 'h-5 w-5' : 'h-8 w-8'
  const iconSize = props.compact ? 'h-3 w-3' : 'h-5 w-5'
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1
        const filled = n <= v
        return (
          <button
            key={n}
            type="button"
            className={'rounded border transition-colors ' + size + ' ' + (filled ? 'border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/30' : 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800') + (props.readonly ? ' opacity-90' : ' hover:bg-slate-50 dark:hover:bg-slate-700')}
            onClick={props.readonly ? undefined : () => props.onChange?.(n)}
            aria-label={`${n} estrellas`}
            disabled={props.readonly}
          >
            <svg viewBox="0 0 24 24" className={'mx-auto ' + iconSize + ' ' + (filled ? 'text-amber-500 dark:text-amber-400' : 'text-slate-300 dark:text-slate-500')} fill="currentColor" aria-hidden="true">
              <path d="M12 17.27l-5.18 3.05 1.39-5.93L3 9.24l6.02-.51L12 3l2.98 5.73L21 9.24l-5.21 5.15 1.39 5.93z" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

export function PlayersPage() {
  const { accessToken, me } = useAuth()
  const [series, setSeries] = useState<Series[]>([])
  const [items, setItems] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [seriesId, setSeriesId] = useState<string>('')

  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [firstName, setFirstName] = useState('')
  const [secondFirstName, setSecondFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [secondLastName, setSecondLastName] = useState('')
  const [rut, setRut] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [primarySeriesId, setPrimarySeriesId] = useState('')
  const [primaryPosition, setPrimaryPosition] = useState('')
  const [secondaryPosition, setSecondaryPosition] = useState('')
  const [levelStars, setLevelStars] = useState<number>(3)
  const [active, setActive] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [importExcelOpen, setImportExcelOpen] = useState(false)
  const [importExcelSeriesId, setImportExcelSeriesId] = useState('')
  const [importExcelFile, setImportExcelFile] = useState<File | null>(null)
  const [importExcelUploading, setImportExcelUploading] = useState(false)
  const [importExcelError, setImportExcelError] = useState<string | null>(null)
  const [importExcelResult, setImportExcelResult] = useState<PlayerImportResult | null>(null)

  const canAdmin = me?.role === 'admin'

  function clearPlayerFieldError(field: string) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev))
  }

  const seriesOptions = useMemo(() => series.filter((s) => s.active), [series])
  const seriesById = useMemo(() => Object.fromEntries(series.map((s) => [s.id, s])), [series])
  const posLabel = useMemo(() => Object.fromEntries(PLAYER_POSITIONS.map((p) => [p.code, p.label])), [])

  function openCreate() {
    setEditingPlayer(null)
    setFieldErrors({})
    setFirstName('')
    setSecondFirstName('')
    setLastName('')
    setSecondLastName('')
    setRut('')
    setBirthDate('')
    setPhone('')
    setEmail('')
    setPrimarySeriesId('')
    setPrimaryPosition('')
    setSecondaryPosition('')
    setLevelStars(3)
    setActive(true)
    setAvatarUrl('')
    setOpen(true)
  }

  function openEdit(p: Player) {
    setEditingPlayer(p)
    setFieldErrors({})
    setFirstName(p.first_name)
    setSecondFirstName(p.second_first_name ?? '')
    setLastName(p.last_name)
    setSecondLastName(p.second_last_name ?? '')
    setRut(formatRutDisplay(p.rut))
    setBirthDate(typeof p.birth_date === 'string' ? p.birth_date.slice(0, 10) : '')
    setPhone(p.phone)
    setEmail(p.email ?? '')
    setPrimarySeriesId(p.primary_series_id)
    const pos = p.positions ?? []
    setPrimaryPosition(pos[0] ?? '')
    setSecondaryPosition(pos[1] ?? '')
    setLevelStars(p.level_stars ?? 3)
    setActive(p.active)
    setAvatarUrl(p.avatar_url ?? '')
    setOpen(true)
  }

  function closeModal() {
    if (!creating) {
      setError(null)
      setOpen(false)
      setEditingPlayer(null)
    }
  }

  async function reload() {
    if (!accessToken) return
    const qs = new URLSearchParams()
    if (q.trim()) qs.set('q', q.trim())
    if (seriesId) qs.set('series_id', seriesId)
    const [players, seriesList] = await Promise.all([
      apiFetch<Player[]>(`/api/players${qs.toString() ? `?${qs}` : ''}`, { authToken: accessToken }),
      apiFetch<Series[]>('/api/series', { authToken: accessToken }),
    ])
    setItems(players)
    setSeries(seriesList)
  }

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    reload()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  // Al abrir el modal, asegurar que hay series (por si el listado falló antes)
  useEffect(() => {
    if (open && canAdmin && accessToken && series.length === 0 && !loading) {
      apiFetch<Series[]>('/api/series', { authToken: accessToken })
        .then(setSeries)
        .catch(() => {})
    }
  }, [open, canAdmin, accessToken, series.length, loading])

  /** Coordenadas en la cancha (x, y) en % — vista desde arriba, nuestro arco abajo */
  const positionCoords: Record<string, { x: number; y: number }> = useMemo(() => ({
    gk: { x: 50, y: 90 },
    lb: { x: 18, y: 76 },
    lwb: { x: 14, y: 72 },
    cb: { x: 50, y: 76 },
    rwb: { x: 86, y: 72 },
    rb: { x: 82, y: 76 },
    dm: { x: 50, y: 58 },
    cm: { x: 50, y: 48 },
    am: { x: 50, y: 38 },
    lw: { x: 22, y: 28 },
    st: { x: 50, y: 18 },
    rw: { x: 78, y: 28 },
    cf: { x: 50, y: 24 },
  }), [])

  /** Jugadores con punto (x,y) para la cancha; solo posición principal, misma posición repartida con pequeño offset */
  const playersOnField = useMemo(() => {
    const byPos: Record<string, Player[]> = {}
    for (const p of items) {
      const pos = (p.positions && p.positions[0]) || 'cm'
      if (!byPos[pos]) byPos[pos] = []
      byPos[pos].push(p)
    }
    const out: Array<{ player: Player; x: number; y: number }> = []
    for (const [pos, list] of Object.entries(byPos)) {
      const base = positionCoords[pos] ?? positionCoords.cm
      list.forEach((player, i) => {
        const n = list.length
        const jitterX = n > 1 ? (i - (n - 1) / 2) * 6 : 0
        out.push({ player, x: base.x + jitterX, y: base.y })
      })
    }
    return out
  }, [items, positionCoords])

  return (
    <div className="space-y-3">
      <PageHeader
        title="Jugadores"
        extra={
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/50">
            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
              <span>Buscar (nombre o RUT)</span>
              <input className="sf-input w-48 min-w-0 sm:w-56" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
              <span>Serie</span>
              <select
                className="sf-input max-w-[180px]"
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
              >
                <option value="">Todas</option>
                {seriesOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="sf-btn sf-btn-secondary"
              onClick={async () => {
                setLoading(true)
                setError(null)
                try {
                  await reload()
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
                } finally {
                  setLoading(false)
                }
              }}
            >
              Buscar
            </button>
          </div>
        }
      >
        {canAdmin ? (
          <div className="flex flex-wrap items-center gap-2">
            <button className="sf-btn sf-btn-primary" onClick={openCreate}>
              Nuevo jugador
            </button>
            <button
              type="button"
              className="sf-btn sf-btn-secondary"
              onClick={() => {
                setImportExcelOpen(true)
                setImportExcelSeriesId(seriesOptions[0]?.id ?? '')
                setImportExcelFile(null)
                setImportExcelError(null)
                setImportExcelResult(null)
              }}
            >
              Cargar Excel
            </button>
          </div>
        ) : null}
      </PageHeader>

      {/* Vista cancha (vertical) + listado en 2 columnas: 4 + 8 */}
      {items.length > 0 && !loading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="sf-card overflow-hidden p-2 sm:p-4">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Vista en cancha (posición principal)</div>
              <div className="relative w-full max-w-[240px] mx-auto rounded-lg overflow-hidden" style={{ aspectRatio: '68/105' }}>
                <img
                  src="/soccerfield.jpg"
                  alt="Cancha"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {playersOnField.map(({ player, x, y }) => {
                  const initials = `${(player.first_name || '').trim().slice(0, 1)}${(player.last_name || '').trim().slice(0, 1)}`.toUpperCase() || '?'
                  return (
                    <div
                      key={player.id}
                      className="absolute flex items-center justify-center rounded-full border-2 border-white shadow-md cursor-pointer hover:opacity-90 text-white text-xs font-semibold select-none w-8 h-8"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: player.active ? '#006600' : '#64748b',
                      }}
                      onClick={() => canAdmin && openEdit(player)}
                      title={`${player.first_name} ${player.last_name}${canAdmin ? ' · Clic para editar' : ''}`}
                    >
                      {initials}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((p) => {
                const primarySeries = seriesById[p.primary_series_id]
                const prim = (p.positions ?? [])[0]
                const sec = (p.positions ?? [])[1]
                return (
                  <div key={p.id} className="sf-card relative flex flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-600">
                    {canAdmin ? (
                      <button
                        type="button"
                        className="absolute right-2 top-2 rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                        onClick={() => openEdit(p)}
                        title="Editar"
                        aria-label="Editar jugador"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={2} />
                      </button>
                    ) : null}
                    <div className="flex items-start gap-3">
                      <PlayerAvatar firstName={p.first_name} lastName={p.last_name} avatarUrl={getPlayerAvatarUrl(p)} size="sm" />
                      <div className="min-w-0 flex-1 pr-8">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="font-medium text-slate-900 truncate dark:text-slate-100">
                            {p.first_name} {p.last_name}
                          </span>
                        </div>
                        {primarySeries ? (
                          <SeriesBadge seriesId={p.primary_series_id} name={primarySeries.name} color={primarySeries.color} className="mt-1" />
                        ) : null}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 truncate dark:text-slate-400" title={p.rut}>{p.rut}</div>
                    <div className="mt-auto space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <div className="truncate">
                        {prim ? `${posLabel[prim] ?? prim}${sec ? ` · ${posLabel[sec] ?? sec}` : ''}` : '—'}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-0.5">
                          <Stars value={p.level_stars ?? 3} readonly compact />
                        </div>
                        {canAdmin ? (
                          <Switch
                            checked={!!p.active}
                            onChange={async (checked) => {
                              if (!accessToken) return
                              setTogglingId(p.id)
                              try {
                                await apiFetch<Player>(`/api/players/${p.id}`, {
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
                            disabled={togglingId === p.id}
                            aria-label={p.active ? 'Activo (desactivar)' : 'Inactivo (activar)'}
                            size="sm"
                          />
                        ) : (
                          <Switch checked={!!p.active} onChange={() => {}} disabled size="sm" aria-label={p.active ? 'Activo' : 'Inactivo'} />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        open={open && canAdmin}
        title={editingPlayer ? 'Editar jugador' : 'Crear jugador'}
        maxWidthClassName="sm:max-w-5xl"
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
                if (!firstName.trim()) err.firstName = true
                if (!lastName.trim()) err.lastName = true
                if (!rut.trim()) err.rut = true
                else if (!validateRut(rut.trim())) err.rut = true
                if (!birthDate) err.birthDate = true
                if (!phone.trim()) err.phone = true
                if (!primarySeriesId) err.primarySeriesId = true
                if (!primaryPosition) err.primaryPosition = true
                if (levelStars < 1) err.levelStars = true
                if (Object.keys(err).length > 0) {
                  setFieldErrors(err)
                  return
                }
                setFieldErrors({})
                setCreating(true)
                const positions = [primaryPosition, secondaryPosition].filter(Boolean)
                try {
                  const rutNormalized = normalizeRut(rut.trim())
                  const body = {
                    first_name: firstName.trim(),
                    second_first_name: secondFirstName.trim() || null,
                    last_name: lastName.trim(),
                    second_last_name: secondLastName.trim() || null,
                    rut: rutNormalized,
                    birth_date: birthDate,
                    phone: phone.trim(),
                    email: email.trim() || null,
                    primary_series_id: primarySeriesId,
                    series_ids: editingPlayer?.series_ids ?? [],
                    positions,
                    level_stars: levelStars,
                    active,
                    notes: editingPlayer?.notes ?? null,
                    avatar_url: avatarUrl.trim() || null,
                  }
                  if (editingPlayer) {
                    await apiFetch<Player>(`/api/players/${editingPlayer.id}`, {
                      method: 'PATCH',
                      authToken: accessToken,
                      body: JSON.stringify(body),
                    })
                  } else {
                    await apiFetch<Player>('/api/players', {
                      method: 'POST',
                      authToken: accessToken,
                      body: JSON.stringify(body),
                    })
                  }
                  setEditingPlayer(null)
                  setFirstName('')
                  setSecondFirstName('')
                  setLastName('')
                  setSecondLastName('')
                  setRut('')
                  setBirthDate('')
                  setPhone('')
                  setEmail('')
                  setPrimarySeriesId('')
                  setPrimaryPosition('')
                  setSecondaryPosition('')
                  setLevelStars(3)
                  setActive(true)
                  setAvatarUrl('')
                  await reload()
                  setOpen(false)
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : ERROR_MENSAJE_ES)
                } finally {
                  setCreating(false)
                }
              }}
            >
              {creating ? (editingPlayer ? 'Guardando…' : 'Creando…') : editingPlayer ? 'Guardar' : 'Crear'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}
          {/* 1. Datos del jugador + Serie */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-600">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Datos del jugador</div>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row">
              <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Primer nombre
                  <input className={`mt-1 sf-input ${fieldErrors.firstName ? 'sf-input-invalid' : ''}`} value={firstName} onChange={(e) => { setFirstName(e.target.value); clearPlayerFieldError('firstName') }} />
                  {fieldErrors.firstName && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Segundo nombre
                  <input className="mt-1 sf-input" value={secondFirstName} onChange={(e) => setSecondFirstName(e.target.value)} placeholder="Opcional" />
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Primer apellido
                  <input className={`mt-1 sf-input ${fieldErrors.lastName ? 'sf-input-invalid' : ''}`} value={lastName} onChange={(e) => { setLastName(e.target.value); clearPlayerFieldError('lastName') }} />
                  {fieldErrors.lastName && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Segundo apellido
                  <input className="mt-1 sf-input" value={secondLastName} onChange={(e) => setSecondLastName(e.target.value)} placeholder="Opcional" />
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  RUT
                  <input
                    className={`mt-1 sf-input ${fieldErrors.rut ? 'sf-input-invalid' : ''}`}
                    value={rut}
                    onChange={(e) => {
                      setRut(formatRutDisplay(e.target.value))
                      clearPlayerFieldError('rut')
                    }}
                    placeholder="12.345.678-5"
                  />
                  {fieldErrors.rut && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{!rut.trim() ? 'Requerido' : RUT_INVALID_MESSAGE}</span>}
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Nacimiento
                <input className={`mt-1 sf-input ${fieldErrors.birthDate ? 'sf-input-invalid' : ''}`} type="date" value={birthDate} onChange={(e) => { setBirthDate(e.target.value); clearPlayerFieldError('birthDate') }} />
                {fieldErrors.birthDate && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
              </label>
              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Teléfono / Celular
                <input className={`mt-1 sf-input ${fieldErrors.phone ? 'sf-input-invalid' : ''}`} value={phone} onChange={(e) => { setPhone(e.target.value); clearPlayerFieldError('phone') }} placeholder="+569..." />
                {fieldErrors.phone && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
              </label>
              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Email
                <input className="mt-1 sf-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opcional@ejemplo.com" />
              </label>
              <label className="block text-sm text-slate-700 dark:text-slate-300">
                Serie principal
                <select
                  className={`mt-1 sf-input ${fieldErrors.primarySeriesId ? 'sf-input-invalid' : ''}`}
                  value={primarySeriesId}
                  onChange={(e) => { setPrimarySeriesId(e.target.value); clearPlayerFieldError('primarySeriesId') }}
                  aria-label="Serie principal"
                >
                  <option value="">
                    Selecciona…
                  </option>
                  {series.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.active ? '' : ' (inactiva)'}
                    </option>
                  ))}
                </select>
              </label>
              {editingPlayer ? (
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Switch checked={active} onChange={setActive} aria-label="Activo" />
                  <span>Activo</span>
                </label>
              ) : null}
              </div>
              {editingPlayer ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-800/30 lg:min-w-[180px]">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Foto del jugador</div>
                  {(editingPlayer.avatar_file_id || editingPlayer.avatar_url?.trim()) ? (
                    <PlayerAvatar
                      firstName={editingPlayer.first_name}
                      lastName={editingPlayer.last_name}
                      avatarUrl={getPlayerAvatarUrl(editingPlayer)}
                      size="lg"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-200 text-3xl text-slate-500 dark:bg-slate-600 dark:text-slate-400">
                      ?
                    </div>
                  )}
                  <label
                    className={`inline-flex cursor-pointer items-center justify-center rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-600 dark:hover:text-slate-200 ${uploadingAvatar ? 'cursor-not-allowed opacity-60' : ''}`}
                    title={editingPlayer.avatar_file_id || editingPlayer.avatar_url?.trim() ? 'Cambiar foto' : 'Agregar foto'}
                  >
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="user"
                      disabled={uploadingAvatar}
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (!f || !accessToken || !editingPlayer) return
                        setUploadingAvatar(true)
                        try {
                          const updated = await apiUpload<Player>(
                            `/api/players/${editingPlayer.id}/avatar`,
                            f,
                            { authToken: accessToken },
                          )
                          setEditingPlayer(updated)
                          await reload()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : ERROR_MENSAJE_ES)
                        } finally {
                          setUploadingAvatar(false)
                          e.target.value = ''
                        }
                      }}
                    />
                    {uploadingAvatar ? (
                      <span className="text-xs">…</span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    )}
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          {/* 2. Posiciones (70%) + 3. Nivel (30%) en la misma fila */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[7fr_3fr]">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-600">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Posiciones</div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">La principal se usa para ubicar al jugador en la vista de cancha.</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Posición principal
                  <select
                    className={`mt-1 sf-input ${fieldErrors.primaryPosition ? 'sf-input-invalid' : ''}`}
                    value={primaryPosition}
                    onChange={(e) => { setPrimaryPosition(e.target.value); clearPlayerFieldError('primaryPosition') }}
                  >
                    <option value="">Selecciona…</option>
                    {PLAYER_POSITIONS.map((p) => (
                      <option key={p.code} value={p.code}>{p.label} ({p.group})</option>
                    ))}
                  </select>
                  {fieldErrors.primaryPosition && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  Posición secundaria (opcional)
                  <select
                    className="mt-1 sf-input"
                    value={secondaryPosition}
                    onChange={(e) => setSecondaryPosition(e.target.value)}
                  >
                    <option value="">Ninguna</option>
                    {PLAYER_POSITIONS.filter((p) => !primaryPosition || p.code !== primaryPosition).map((p) => (
                      <option key={p.code} value={p.code}>{p.label} ({p.group})</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className={`rounded-xl border p-4 dark:border-slate-600 ${fieldErrors.levelStars ? 'border-red-500 dark:border-red-400' : 'border-slate-200'}`}>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Nivel</div>
              <div className="mt-3">
                <Stars value={levelStars} onChange={(v) => { setLevelStars(v); clearPlayerFieldError('levelStars') }} />
                {fieldErrors.levelStars && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Selecciona al menos 1 estrella</span>}
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">1 = principiante, 5 = crack.</div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={importExcelOpen && !!canAdmin}
        title="Cargar jugadores desde Excel"
        maxWidthClassName="sm:max-w-2xl"
        onClose={() => {
          if (!importExcelUploading) {
            setImportExcelOpen(false)
            setImportExcelResult(null)
            setImportExcelFile(null)
            setImportExcelError(null)
          }
        }}
        footer={
          <div className="flex justify-end gap-2">
            <button
              className="sf-btn sf-btn-secondary"
              onClick={() => {
                setImportExcelOpen(false)
                setImportExcelResult(null)
                setImportExcelFile(null)
                setImportExcelError(null)
              }}
              disabled={importExcelUploading}
            >
              Cerrar
            </button>
            {!importExcelResult ? (
              <button
                className="sf-btn sf-btn-primary"
                disabled={!importExcelSeriesId || !importExcelFile || importExcelUploading}
                onClick={async () => {
                  if (!importExcelFile || !importExcelSeriesId || !accessToken) return
                  setImportExcelError(null)
                  setImportExcelUploading(true)
                  try {
                    const result = await apiUpload<PlayerImportResult>('/api/players/import-excel', importExcelFile, {
                      authToken: accessToken,
                      form: { series_id: importExcelSeriesId },
                    })
                    setImportExcelResult(result)
                    await reload()
                  } catch (e: unknown) {
                    setImportExcelError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
                  } finally {
                    setImportExcelUploading(false)
                  }
                }}
              >
                {importExcelUploading ? 'Cargando…' : 'Cargar'}
              </button>
            ) : null}
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            La nómina se carga <strong>por serie</strong>: elija la serie y suba el Excel. Primera fila = cabeceras: <strong>RUT</strong>, <strong>Primer Nombre</strong>, <strong>Segundo Nombre</strong>, <strong>Primer Apellido</strong>, <strong>Segundo Apellido</strong>, <strong>Fecha Nacimiento</strong> (AAAA-MM-DD o DD/MM/AAAA), <strong>Celular</strong>, <strong>Email</strong>, <strong>Posición Principal</strong>, <strong>Posición Secundaria</strong> (opcional).
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            RUT puede llevar puntos. Si el RUT ya existe, se actualiza (no se duplica). En las cajas se sigue mostrando primer nombre y primer apellido.
          </p>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/50">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Planilla de ejemplo</span>
            <a
              href="/Nomina%20de%20jugadores.xlsx"
              download="Nomina de jugadores.xlsx"
              className="sf-btn sf-btn-primary inline-flex items-center gap-2"
            >
              Descargar planilla
            </a>
          </div>
          {importExcelError ? (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{importExcelError}</div>
          ) : null}
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Serie</span>
            <select
              className="mt-1 sf-input w-full"
              value={importExcelSeriesId}
              onChange={(e) => setImportExcelSeriesId(e.target.value)}
              required
            >
              <option value="">Seleccione la serie</option>
              {seriesOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Archivo .xlsx</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white file:text-sm"
              onChange={(e) => setImportExcelFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {importExcelResult ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/50">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="font-medium text-emerald-700 dark:text-emerald-400">Creados: {importExcelResult.inserted}</span>
                <span className="font-medium text-blue-700 dark:text-blue-400">Actualizados: {importExcelResult.updated}</span>
                {importExcelResult.skipped > 0 ? (
                  <span className="font-medium text-amber-700 dark:text-amber-400">Con error: {importExcelResult.skipped}</span>
                ) : null}
              </div>
              {importExcelResult.errors.length > 0 ? (
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Errores por fila</div>
                  <div className="max-h-56 overflow-y-auto rounded border border-slate-200 dark:border-slate-600">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                        <tr>
                          <th className="px-2 py-1.5 font-semibold">Fila</th>
                          <th className="px-2 py-1.5 font-semibold">Mensaje</th>
                          <th className="px-2 py-1.5 font-semibold">Campo</th>
                          <th className="px-2 py-1.5 font-semibold">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importExcelResult.errors.map((err, i) => {
                          const pairs = formatRowAsFieldValue(err.row)
                          return (
                            <tr key={i} className="border-t border-slate-200 dark:border-slate-600">
                              <td className="whitespace-nowrap px-2 py-1.5 align-top">{err.line}</td>
                              <td className="px-2 py-1.5 text-red-600 dark:text-red-400 align-top max-w-[220px]">{err.error}</td>
                              <td className="align-top px-2 py-1.5">
                                <div className="flex flex-col gap-0.5 text-slate-700 dark:text-slate-300">
                                  {pairs.length > 0 ? pairs.map((p, j) => <span key={j} className="font-medium">{p.campo}</span>) : '—'}
                                </div>
                              </td>
                              <td className="align-top px-2 py-1.5 max-w-[180px]">
                                <div className="flex flex-col gap-0.5 truncate text-slate-600 dark:text-slate-400" title={pairs.map((p) => `${p.campo}: ${p.valor}`).join('\n')}>
                                  {pairs.length > 0 ? pairs.map((p, j) => <span key={j} className="truncate">{p.valor}</span>) : '—'}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Modal>

      {loading ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center">
          <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
        </div>
      ) : null}
      {!open && error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}

      {items.length === 0 && !loading ? (
        <div className="sf-card p-4 text-sm text-slate-600 dark:text-slate-400">No hay jugadores.</div>
      ) : null}
    </div>
  )
}

