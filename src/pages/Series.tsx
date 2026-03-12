import { useEffect, useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { apiFetch, ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { Modal } from '../ui/Modal'
import { PageHeader } from '../ui/PageHeader'
import { SeriesBadge } from '../ui/SeriesBadge'
import { Switch } from '../ui/Switch'

type Series = {
  id: string
  name: string
  code?: string | null
  active: boolean
  color?: string | null
  whatsapp_group_url?: string | null
  delegate_user_id?: string | null
  delegate_player_id?: string | null
  treasurer_user_id?: string | null
  treasurer_player_id?: string | null
  delegate_display_name?: string | null
  treasurer_display_name?: string | null
}

type User = {
  id: string
  username: string
  role: 'admin' | 'delegado' | 'tesorero' | 'jugador'
  active: boolean
}

type Player = {
  id: string
  first_name: string
  last_name: string
  active: boolean
  primary_series_id?: string
  series_ids?: string[]
}

type AssigneeValue = '' | `user:${string}` | `player:${string}`

export function SeriesPage() {
  const { accessToken, me } = useAuth()
  const [items, setItems] = useState<Series[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newColor, setNewColor] = useState('')
  const [newWhatsapp, setNewWhatsapp] = useState('')
  const [newDelegate, setNewDelegate] = useState<AssigneeValue>('')
  const [newTreasurer, setNewTreasurer] = useState<AssigneeValue>('')

  const [editing, setEditing] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [editDelegate, setEditDelegate] = useState<AssigneeValue>('')
  const [editTreasurer, setEditTreasurer] = useState<AssigneeValue>('')

  const [users, setUsers] = useState<User[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [assigneesError, setAssigneesError] = useState<string | null>(null)
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, boolean>>({})
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, boolean>>({})
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function reload() {
    if (!accessToken) return
    const [data, playersData] = await Promise.all([
      apiFetch<Series[]>('/api/series', { authToken: accessToken }),
      apiFetch<Player[]>('/api/players', { authToken: accessToken }),
    ])
    setItems(data)
    setPlayers(playersData)
  }

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    reload()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload intentionally omitted to run only on accessToken change
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    if (me?.role !== 'admin') return
    setAssigneesError(null)
    apiFetch<User[]>('/api/auth/users', { authToken: accessToken })
      .then((us) => setUsers(us.filter((u) => u.active)))
      .catch((e: unknown) => {
        setAssigneesError(e instanceof Error ? e.message : 'No se pudieron cargar usuarios')
      })
  }, [accessToken, me?.role])

  const playersBySeriesId = useMemo(() => {
    const map: Record<string, Player[]> = {}
    for (const s of items) {
      map[s.id] = players.filter(
        (p) => p.primary_series_id === s.id || (p.series_ids && p.series_ids.includes(s.id)),
      )
    }
    return map
  }, [items, players])

  const usersById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users])
  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players])

  function assigneeLabel(v: AssigneeValue): string {
    if (!v) return '—'
    const [kind, id] = v.split(':', 2)
    if (kind === 'user') {
      const u = usersById[id]
      return u ? `${u.username} (usuario · ${u.role})` : `usuario ${id}`
    }
    const p = playersById[id]
    return p ? `${p.first_name} ${p.last_name} (jugador)` : `jugador ${id}`
  }

  function selectToPayload(v: AssigneeValue): { user_id: string | null; player_id: string | null } {
    if (!v) return { user_id: null, player_id: null }
    const [kind, id] = v.split(':', 2)
    if (kind === 'user') return { user_id: id, player_id: null }
    return { user_id: null, player_id: id }
  }

  if (loading) return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center">
      <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
    </div>
  )
  if (error && !open && !editOpen) return <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div>

  return (
    <div className="space-y-3">
      <PageHeader title="Series">
        {me?.role === 'admin' ? (
          <button className="sf-btn sf-btn-primary" onClick={() => { setCreateFieldErrors({}); setOpen(true) }}>
            Nueva serie
          </button>
        ) : null}
      </PageHeader>

      <Modal
        open={open && me?.role === 'admin'}
        title="Crear serie"
        onClose={() => {
          if (creating) return
          setError(null)
          setOpen(false)
        }}
        footer={
          <div className="flex justify-end gap-2">
            <button className="sf-btn sf-btn-secondary" onClick={() => setOpen(false)} disabled={creating}>
              Cancelar
            </button>
            <button
              className="sf-btn sf-btn-primary"
              disabled={creating}
              onClick={async () => {
                if (!accessToken) return
                setError(null)
                if (!newName.trim()) {
                  setCreateFieldErrors({ newName: true })
                  return
                }
                setCreateFieldErrors({})
                setCreating(true)
                try {
                  const del = selectToPayload(newDelegate)
                  const tre = selectToPayload(newTreasurer)
                  await apiFetch<Series>('/api/series', {
                    method: 'POST',
                    authToken: accessToken,
                    body: JSON.stringify({
                      name: newName,
                      code: newCode || null,
                      color: newColor.trim() ? (newColor.trim().startsWith('#') ? newColor.trim() : `#${newColor.trim()}`) : null,
                      whatsapp_group_url: newWhatsapp || null,
                      active: true,
                      delegate_user_id: del.user_id,
                      delegate_player_id: del.player_id,
                      treasurer_user_id: tre.user_id,
                      treasurer_player_id: tre.player_id,
                    }),
                  })
                  setNewName('')
                  setNewCode('')
                  setNewColor('')
                  setNewWhatsapp('')
                  setNewDelegate('')
                  setNewTreasurer('')
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
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}
          {assigneesError ? (
            <div className="rounded-md bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">{assigneesError}</div>
          ) : null}
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Nombre
            <input className={`mt-1 sf-input ${createFieldErrors.newName ? 'sf-input-invalid' : ''}`} value={newName} onChange={(e) => { setNewName(e.target.value); setCreateFieldErrors((p) => (p.newName ? { ...p, newName: false } : p)) }} />
            {createFieldErrors.newName && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Código
            <input className="mt-1 sf-input" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Color badge (opcional)
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input
                type="color"
                className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white p-0.5 dark:border-slate-600 dark:bg-slate-800"
                value={newColor || '#3B82F6'}
                onChange={(e) => setNewColor(e.target.value)}
                title="Elegir color"
              />
              <span className="font-mono text-sm text-slate-600 dark:text-slate-400">{newColor || '—'}</span>
              {newColor ? (
                <button type="button" className="text-xs text-slate-500 underline hover:text-slate-700 dark:hover:text-slate-400" onClick={() => setNewColor('')}>
                  Quitar color
                </button>
              ) : null}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Se usa en las etiquetas de la serie en toda la app. Sin elegir = color automático.</div>
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Link WhatsApp (opcional)
            <input className="mt-1 sf-input" value={newWhatsapp} onChange={(e) => setNewWhatsapp(e.target.value)} />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-700 dark:text-slate-300">
              Delegado (usuario o jugador)
              <select className="mt-1 sf-input" value={newDelegate} onChange={(e) => setNewDelegate(e.target.value as AssigneeValue)}>
                <option value="">— Sin asignar —</option>
                <optgroup label="Usuarios">
                  {users.map((u) => (
                    <option key={u.id} value={`user:${u.id}`}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Jugadores">
                  {players.filter((p) => p.active).map((p) => (
                    <option key={p.id} value={`player:${p.id}`}>
                      {p.first_name} {p.last_name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label className="block text-sm text-slate-700 dark:text-slate-300">
              Tesorero (usuario o jugador)
              <select className="mt-1 sf-input" value={newTreasurer} onChange={(e) => setNewTreasurer(e.target.value as AssigneeValue)}>
                <option value="">— Sin asignar —</option>
                <optgroup label="Usuarios">
                  {users.map((u) => (
                    <option key={u.id} value={`user:${u.id}`}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Jugadores">
                  {players.filter((p) => p.active).map((p) => (
                    <option key={p.id} value={`player:${p.id}`}>
                      {p.first_name} {p.last_name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen && me?.role === 'admin'}
        title="Editar serie"
        onClose={() => {
          if (editing) return
          setError(null)
          setEditOpen(false)
        }}
        footer={
          <div className="flex justify-end gap-2">
            <button className="sf-btn sf-btn-secondary" onClick={() => { setError(null); setEditOpen(false) }} disabled={editing}>
              Cancelar
            </button>
            <button
              className="sf-btn sf-btn-primary"
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
                  const del = selectToPayload(editDelegate)
                  const tre = selectToPayload(editTreasurer)
                  await apiFetch<Series>(`/api/series/${editId}`, {
                    method: 'PATCH',
                    authToken: accessToken,
                    body: JSON.stringify({
                      name: editName.trim(),
                      code: editCode.trim() ? editCode.trim() : null,
                      color: editColor.trim() ? (editColor.trim().startsWith('#') ? editColor.trim() : `#${editColor.trim()}`) : null,
                      whatsapp_group_url: editWhatsapp.trim() ? editWhatsapp.trim() : null,
                      active: editActive,
                      delegate_user_id: del.user_id,
                      delegate_player_id: del.player_id,
                      treasurer_user_id: tre.user_id,
                      treasurer_player_id: tre.player_id,
                    }),
                  })
                  await reload()
                  setEditOpen(false)
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : ERROR_MENSAJE_ES)
                } finally {
                  setEditing(false)
                }
              }}
            >
              {editing ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}
          {assigneesError ? (
            <div className="rounded-md bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">{assigneesError}</div>
          ) : null}
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Nombre
            <input className={`mt-1 sf-input ${editFieldErrors.editName ? 'sf-input-invalid' : ''}`} value={editName} onChange={(e) => { setEditName(e.target.value); setEditFieldErrors((p) => (p.editName ? { ...p, editName: false } : p)) }} />
            {editFieldErrors.editName && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Código
            <input className="mt-1 sf-input" value={editCode} onChange={(e) => setEditCode(e.target.value)} />
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Deja vacío para limpiar el código.</div>
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Color badge (opcional)
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input
                type="color"
                className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white p-0.5 dark:border-slate-600 dark:bg-slate-800"
                value={editColor || '#3B82F6'}
                onChange={(e) => setEditColor(e.target.value)}
                title="Elegir color"
              />
              <span className="font-mono text-sm text-slate-600 dark:text-slate-400">{editColor || '—'}</span>
              {editColor ? (
                <button type="button" className="text-xs text-slate-500 underline hover:text-slate-700 dark:hover:text-slate-400" onClick={() => setEditColor('')}>
                  Quitar color
                </button>
              ) : null}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Se usa en las etiquetas de la serie. Vacío = color automático.</div>
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Link WhatsApp (opcional)
            <input className="mt-1 sf-input" value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} />
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Deja vacío para limpiar el link.</div>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-700 dark:text-slate-300">
              Delegado (usuario o jugador)
              <select className="mt-1 sf-input" value={editDelegate} onChange={(e) => setEditDelegate(e.target.value as AssigneeValue)}>
                <option value="">— Sin asignar —</option>
                <optgroup label="Usuarios">
                  {users.map((u) => (
                    <option key={u.id} value={`user:${u.id}`}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Jugadores">
                  {players.filter((p) => p.active).map((p) => (
                    <option key={p.id} value={`player:${p.id}`}>
                      {p.first_name} {p.last_name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Actual: {assigneeLabel(editDelegate)}</div>
            </label>
            <label className="block text-sm text-slate-700 dark:text-slate-300">
              Tesorero (usuario o jugador)
              <select className="mt-1 sf-input" value={editTreasurer} onChange={(e) => setEditTreasurer(e.target.value as AssigneeValue)}>
                <option value="">— Sin asignar —</option>
                <optgroup label="Usuarios">
                  {users.map((u) => (
                    <option key={u.id} value={`user:${u.id}`}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Jugadores">
                  {players.filter((p) => p.active).map((p) => (
                    <option key={p.id} value={`player:${p.id}`}>
                      {p.first_name} {p.last_name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Actual: {assigneeLabel(editTreasurer)}</div>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Switch checked={editActive} onChange={setEditActive} aria-label="Activa" />
            <span>Activa</span>
          </label>
        </div>
      </Modal>

      {items.length === 0 ? (
        <div className="sf-card p-4 text-sm text-slate-600 dark:text-slate-400">
          No hay series todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((s) => {
            const seriesPlayers = playersBySeriesId[s.id] ?? []
            return (
              <div key={s.id} className="sf-card flex flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
                <div className="border-b border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{s.name}</span>
                      {s.code ? <span className="text-xs text-slate-500 dark:text-slate-400">({s.code})</span> : null}
                      <SeriesBadge seriesId={s.id} name={s.name} color={s.color} />
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {me?.role === 'admin' ? (
                        <Switch
                          checked={!!s.active}
                          onChange={async (checked) => {
                            if (!accessToken) return
                            setTogglingId(s.id)
                            try {
                              await apiFetch<Series>(`/api/series/${s.id}`, {
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
                          disabled={togglingId === s.id}
                          aria-label={s.active ? 'Activa (desactivar)' : 'Inactiva (activar)'}
                          size="sm"
                        />
                      ) : (
                        <Switch checked={!!s.active} onChange={() => {}} disabled size="sm" aria-label={s.active ? 'Activa' : 'Inactiva'} />
                      )}
                      {me?.role === 'admin' ? (
                        <button
                          type="button"
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                          onClick={() => {
                            setEditId(s.id)
                            setEditFieldErrors({})
                            setEditName(s.name ?? '')
                            setEditCode(s.code ?? '')
                            setEditColor(s.color ?? '')
                            setEditWhatsapp(s.whatsapp_group_url ?? '')
                            setEditActive(!!s.active)
                            const delVal: AssigneeValue = s.delegate_user_id
                              ? (`user:${s.delegate_user_id}` as const)
                              : s.delegate_player_id
                                ? (`player:${s.delegate_player_id}` as const)
                                : ''
                            const treVal: AssigneeValue = s.treasurer_user_id
                              ? (`user:${s.treasurer_user_id}` as const)
                              : s.treasurer_player_id
                                ? (`player:${s.treasurer_player_id}` as const)
                                : ''
                            setEditDelegate(delVal)
                            setEditTreasurer(treVal)
                            setEditOpen(true)
                          }}
                          title="Editar serie"
                          aria-label="Editar serie"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={2} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                    <span>Delegado: {s.delegate_display_name ?? assigneeLabel((s.delegate_user_id ? `user:${s.delegate_user_id}` : s.delegate_player_id ? `player:${s.delegate_player_id}` : '') as AssigneeValue)}</span>
                    <span>Tesorero: {s.treasurer_display_name ?? assigneeLabel((s.treasurer_user_id ? `user:${s.treasurer_user_id}` : s.treasurer_player_id ? `player:${s.treasurer_player_id}` : '') as AssigneeValue)}</span>
                  </div>
                  {s.whatsapp_group_url ? (
                    <a className="mt-1 block truncate text-xs text-slate-600 underline dark:text-slate-400" href={s.whatsapp_group_url} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  ) : null}
                </div>
                <div className="flex-1 overflow-auto p-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Jugadores ({seriesPlayers.length})</div>
                  <ul className="mt-1.5 space-y-1">
                    {seriesPlayers.length === 0 ? (
                      <li className="text-sm text-slate-400 dark:text-slate-500">Ninguno</li>
                    ) : (
                      [...seriesPlayers]
                        .sort((a, b) => {
                          const c = (a.first_name || '').localeCompare(b.first_name || '', 'es', { sensitivity: 'base' })
                          return c !== 0 ? c : (a.last_name || '').localeCompare(b.last_name || '', 'es', { sensitivity: 'base' })
                        })
                        .map((p) => (
                        <li key={p.id} className="text-sm text-slate-700 dark:text-slate-300">
                          {p.first_name} {p.last_name}
                          {!p.active ? <span className="ml-1 text-slate-400 dark:text-slate-500">(inact.)</span> : null}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

