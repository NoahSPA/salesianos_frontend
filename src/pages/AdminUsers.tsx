import { useEffect, useState } from 'react'
import { apiFetch, ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { Modal } from '../ui/Modal'
import { PageHeader } from '../ui/PageHeader'
import { Switch } from '../ui/Switch'

type User = {
  id: string
  username: string
  role: 'admin' | 'delegado' | 'tesorero' | 'jugador'
  active: boolean
  created_at: string
  updated_at: string
}

export function AdminUsersPage() {
  const { accessToken, me } = useAuth()
  const [items, setItems] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<User['role']>('delegado')
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})

  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [passwordModalErrors, setPasswordModalErrors] = useState<Record<string, boolean>>({})
  const [settingPassword, setSettingPassword] = useState(false)

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

  if (me?.role !== 'admin') return <div className="text-sm text-slate-600 dark:text-slate-400">Sin permiso.</div>

  return (
    <div className="space-y-3">
      <PageHeader title="Usuarios">
        <button className="sf-btn sf-btn-primary" onClick={() => { setFieldErrors({}); setOpen(true) }}>
          Nuevo usuario
        </button>
      </PageHeader>

      <Modal
        open={open}
        title="Crear usuario"
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
                  await apiFetch<User>('/api/auth/users', {
                    method: 'POST',
                    authToken: accessToken,
                    body: JSON.stringify({ username: username.trim(), password, role, active: true }),
                  })
                  setUsername('')
                  setPassword('')
                  setRole('delegado')
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200 sm:col-span-3">{error}</div> : null}
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Usuario
            <input className={`mt-1 sf-input ${fieldErrors.username ? 'sf-input-invalid' : ''}`} value={username} onChange={(e) => { setUsername(e.target.value); setFieldErrors((p) => (p.username ? { ...p, username: false } : p)) }} />
            {fieldErrors.username && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Contraseña
            <input className={`mt-1 sf-input ${fieldErrors.password ? 'sf-input-invalid' : ''}`} type="password" value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => (p.password ? { ...p, password: false } : p)) }} />
            {fieldErrors.password && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Rol
            <select className="mt-1 sf-input" value={role} onChange={(e) => setRole(e.target.value as User['role'])}>
              <option value="admin">admin</option>
              <option value="delegado">delegado</option>
              <option value="tesorero">tesorero</option>
              <option value="jugador">jugador</option>
            </select>
          </label>
        </div>
      </Modal>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
        </div>
      ) : null}
      {!open && error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}

      <div className="space-y-2">
        {items.map((u) => (
          <div key={u.id} className="sf-card p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-900 dark:text-slate-100">{u.username}</div>
              <span className="sf-badge sf-badge-slate">{u.role}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Switch checked={u.active} onChange={() => {}} disabled size="sm" aria-label={u.active ? 'Activo' : 'Inactivo'} />
              <span className="text-sm text-slate-600 dark:text-slate-400">{u.active ? 'activo' : 'inactivo'}</span>
              <button
                type="button"
                className="text-sm text-sky-600 hover:underline dark:text-sky-400"
                onClick={() => {
                  setPasswordModalUser(u)
                  setNewPassword('')
                  setNewPasswordConfirm('')
                  setPasswordModalErrors({})
                }}
              >
                Cambiar contraseña
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!passwordModalUser}
        title="Cambiar contraseña"
        onClose={() => { if (!settingPassword) setPasswordModalUser(null) }}
        footer={
          <div className="flex justify-end gap-2">
            <button className="sf-btn sf-btn-secondary" onClick={() => setPasswordModalUser(null)} disabled={settingPassword}>Cancelar</button>
            <button
              className="sf-btn sf-btn-primary"
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
            </button>
          </div>
        }
      >
        {passwordModalUser ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Nueva contraseña para <strong>{passwordModalUser.username}</strong> (mín. 8 caracteres).
            </p>
            <label className="block text-sm text-slate-700 dark:text-slate-300">
              Nueva contraseña
              <input
                className={`mt-1 sf-input ${passwordModalErrors.newPassword ? 'sf-input-invalid' : ''}`}
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordModalErrors((p) => (p.newPassword || p.confirm ? { ...p, newPassword: false, confirm: false } : p)) }}
                autoComplete="new-password"
              />
              {passwordModalErrors.newPassword && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Mínimo 8 caracteres</span>}
            </label>
            <label className="block text-sm text-slate-700 dark:text-slate-300">
              Repetir contraseña
              <input
                className={`mt-1 sf-input ${passwordModalErrors.confirm ? 'sf-input-invalid' : ''}`}
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => { setNewPasswordConfirm(e.target.value); setPasswordModalErrors((p) => (p.confirm ? { ...p, confirm: false } : p)) }}
                autoComplete="new-password"
              />
              {passwordModalErrors.confirm && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">No coincide</span>}
            </label>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

