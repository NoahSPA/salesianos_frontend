import { Key, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch, ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { Button } from '../ui/Button'
import { IconCheck, IconUserPlus, IconX } from '../ui/Icons'
import { Modal } from '../ui/Modal'
import { PageHeader } from '../ui/PageHeader'

type PlayerRef = { id: string; first_name: string; last_name: string }

type User = {
  id: string
  username: string
  role: 'admin' | 'delegado' | 'tesorero' | 'jugador'
  active: boolean
  created_at: string
  updated_at: string
  player_id?: string | null
  player?: PlayerRef | null
}

type Player = {
  id: string
  first_name: string
  last_name: string
  active: boolean
}

export function AdminUsersPage() {
  const { accessToken, me } = useAuth()
  const [items, setItems] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<User['role']>('delegado')
  const [createPlayerId, setCreatePlayerId] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})

  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [passwordModalErrors, setPasswordModalErrors] = useState<Record<string, boolean>>({})
  const [settingPassword, setSettingPassword] = useState(false)

  const [players, setPlayers] = useState<Player[]>([])
  const [linkModalUser, setLinkModalUser] = useState<User | null>(null)
  const [linkPlayerId, setLinkPlayerId] = useState<string>('')
  const [linking, setLinking] = useState(false)

  async function reload() {
    if (!accessToken) return
    const data = await apiFetch<User[]>('/api/auth/users', { authToken: accessToken })
    setItems(data)
  }

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    reload()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  useEffect(() => {
    if (open && accessToken) apiFetch<Player[]>('/api/players?active=true', { authToken: accessToken }).then(setPlayers).catch(() => {})
  }, [open, accessToken])

  useEffect(() => {
    if (!linkModalUser || !accessToken) return
    apiFetch<Player[]>('/api/players?active=true', { authToken: accessToken }).then(setPlayers).catch(() => {})
  }, [linkModalUser, accessToken])

  const playersSorted = useMemo(
    () =>
      [...players].sort((a, b) => {
        const c = (a.first_name || '').localeCompare(b.first_name || '', 'es', { sensitivity: 'base' })
        return c !== 0 ? c : (a.last_name || '').localeCompare(b.last_name || '', 'es', { sensitivity: 'base' })
      }),
    [players],
  )

  if (me?.role !== 'admin') return null

  return (
    <div className="space-y-3">
      <PageHeader title="Usuarios">
        <Button variant="primary" icon={<IconUserPlus />} onClick={() => { setFieldErrors({}); setOpen(true) }}>
          Nuevo usuario
        </Button>
      </PageHeader>

      <Modal
        open={open}
        title="Crear usuario"
        maxWidthClassName="sm:max-w-xl"
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
                const err: Record<string, boolean> = {}
                if (!username.trim()) err.username = true
                if (!password) err.password = true
                if (Object.keys(err).length > 0) {
                  setFieldErrors(err)
                  return
                }
                setFieldErrors({})
                setCreating(true)
                try {
                  const body: { username: string; password: string; role: User['role']; active: boolean; player_id?: string } = { username: username.trim(), password, role, active: true }
                  if (createPlayerId.trim()) body.player_id = createPlayerId.trim()
                  await apiFetch<User>('/api/auth/users', { method: 'POST', authToken: accessToken, body: JSON.stringify(body) })
                  setUsername('')
                  setPassword('')
                  setRole('delegado')
                  setCreatePlayerId('')
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
        <div className="space-y-6">
          {error ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200" role="alert">
              {error}
            </div>
          ) : null}

          <section className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Datos de acceso</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Usuario</span>
                <input
                  className={`sf-input w-full ${fieldErrors.username ? 'sf-input-invalid' : ''}`}
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setFieldErrors((p) => (p.username ? { ...p, username: false } : p)) }}
                  placeholder="nombre de usuario"
                />
                {fieldErrors.username && <span className="block text-xs text-red-600 dark:text-red-400">Requerido</span>}
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña</span>
                <input
                  className={`sf-input w-full ${fieldErrors.password ? 'sf-input-invalid' : ''}`}
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => (p.password ? { ...p, password: false } : p)) }}
                  placeholder="mín. 8 caracteres"
                />
                {fieldErrors.password && <span className="block text-xs text-red-600 dark:text-red-400">Requerido</span>}
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Rol y jugador</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Rol</span>
                <select className="sf-input w-full" value={role} onChange={(e) => setRole(e.target.value as User['role'])}>
                  <option value="admin">Admin</option>
                  <option value="delegado">Delegado</option>
                  <option value="tesorero">Tesorero</option>
                  <option value="jugador">Jugador</option>
                </select>
              </label>
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Vincular a jugador (opcional)</span>
                <select className="sf-input w-full" value={createPlayerId} onChange={(e) => setCreatePlayerId(e.target.value)}>
                  <option value="">— Ninguno —</option>
                  {playersSorted.map((p) => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400">Un jugador solo puede estar vinculado a una cuenta.</p>
              </label>
            </div>
          </section>
        </div>
      </Modal>

      {loading ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center">
          <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
        </div>
      ) : null}
      {!open && error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Usuario</th>
              <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Rol</th>
              <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Jugador vinculado</th>
              <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Estado</th>
              <th className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
            {items.map((u) => (
              <tr key={u.id} className="bg-white dark:bg-slate-900">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{u.username}</td>
                <td className="px-4 py-3"><span className="sf-badge sf-badge-slate">{u.role}</span></td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {u.player ? `${u.player.first_name} ${u.player.last_name}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={u.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
                    {u.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded p-1.5 text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/30"
                      title={u.player_id ? 'Cambiar jugador vinculado' : 'Vincular jugador'}
                      aria-label={u.player_id ? 'Cambiar jugador vinculado' : 'Vincular jugador'}
                      onClick={() => { setLinkModalUser(u); setLinkPlayerId(u.player_id || '') }}
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                      title="Cambiar contraseña"
                      aria-label="Cambiar contraseña"
                      onClick={() => { setPasswordModalUser(u); setNewPassword(''); setNewPasswordConfirm(''); setPasswordModalErrors({}) }}
                    >
                      <Key className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!linkModalUser}
        title={linkModalUser?.player_id ? 'Cambiar jugador vinculado' : 'Vincular jugador'}
        maxWidthClassName="sm:max-w-md"
        onClose={() => { if (!linking) setLinkModalUser(null) }}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" icon={<IconX />} onClick={() => setLinkModalUser(null)} disabled={linking}>Cancelar</Button>
            <Button
              variant="primary"
              icon={<IconCheck />}
              loading={linking}
              disabled={linking}
              onClick={async () => {
                if (!accessToken || !linkModalUser) return
                setLinking(true)
                try {
                  const payload = linkPlayerId.trim() ? { player_id: linkPlayerId.trim() } : { player_id: null }
                  const updated = await apiFetch<User>(`/api/auth/users/${linkModalUser.id}`, {
                    method: 'PATCH',
                    authToken: accessToken,
                    body: JSON.stringify(payload),
                  })
                  setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                  setLinkModalUser(null)
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
                } finally {
                  setLinking(false)
                }
              }}
            >
              {linking ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        }
      >
        {linkModalUser ? (
          <div className="space-y-5">
            <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Usuario</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{linkModalUser.username}</p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Jugador</span>
              <select className="sf-input w-full" value={linkPlayerId} onChange={(e) => setLinkPlayerId(e.target.value)}>
                <option value="">— Ninguno (desvincular) —</option>
                {playersSorted.map((p) => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400">Elige un jugador o “Ninguno” para desvincular.</p>
            </label>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!passwordModalUser}
        title="Cambiar contraseña"
        maxWidthClassName="sm:max-w-md"
        onClose={() => { if (!settingPassword) setPasswordModalUser(null) }}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" icon={<IconX />} onClick={() => setPasswordModalUser(null)} disabled={settingPassword}>Cancelar</Button>
            <Button
              variant="primary"
              icon={<IconCheck />}
              loading={settingPassword}
              disabled={settingPassword}
              onClick={async () => {
                if (!accessToken || !passwordModalUser) return
                setPasswordModalErrors({})
                const err: Record<string, boolean> = {}
                if (newPassword.length < 8) err.newPassword = true
                if (newPassword !== newPasswordConfirm) err.confirm = true
                if (Object.keys(err).length > 0) {
                  setPasswordModalErrors(err)
                  return
                }
                setSettingPassword(true)
                try {
                  await apiFetch(`/api/auth/users/${passwordModalUser.id}/set-password`, {
                    method: 'POST',
                    authToken: accessToken,
                    body: JSON.stringify({ new_password: newPassword }),
                  })
                  setPasswordModalUser(null)
                  setNewPassword('')
                  setNewPasswordConfirm('')
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
                } finally {
                  setSettingPassword(false)
                }
              }}
            >
              {settingPassword ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        }
      >
        {passwordModalUser ? (
          <div className="space-y-5">
            <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Usuario</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{passwordModalUser.username}</p>
            </div>
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Nueva contraseña</span>
                <input
                  className={`sf-input w-full ${passwordModalErrors.newPassword ? 'sf-input-invalid' : ''}`}
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordModalErrors((p) => (p.newPassword || p.confirm ? { ...p, newPassword: false, confirm: false } : p)) }}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
                {passwordModalErrors.newPassword && <span className="block text-xs text-red-600 dark:text-red-400">Mínimo 8 caracteres</span>}
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Repetir contraseña</span>
                <input
                  className={`sf-input w-full ${passwordModalErrors.confirm ? 'sf-input-invalid' : ''}`}
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => { setNewPasswordConfirm(e.target.value); setPasswordModalErrors((p) => (p.confirm ? { ...p, confirm: false } : p)) }}
                  placeholder="Repetir contraseña"
                  autoComplete="new-password"
                />
                {passwordModalErrors.confirm && <span className="block text-xs text-red-600 dark:text-red-400">No coincide</span>}
              </label>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

