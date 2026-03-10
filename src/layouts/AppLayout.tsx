import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { apiFetch, ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { useTheme } from '../app/theme'
import { Modal } from '../ui/Modal'

function IconMoon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}
function IconSun() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

function NavItem(props: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={props.to}
      end={props.end}
      className={({ isActive }) =>
        classNames(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-300',
          isActive ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
        )
      }
    >
      <span>{props.label}</span>
    </NavLink>
  )
}

export function AppLayout() {
  const { me, logout, accessToken } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const nav = useNavigate()
  const role = me?.role
  const isAdmin = role === 'admin'
  const isTreasurer = role === 'tesorero' || role === 'admin'

  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null)
  const [changePasswordErrors, setChangePasswordErrors] = useState<Record<string, boolean>>({})
  const [changingPassword, setChangingPassword] = useState(false)

  return (
    <div className="flex h-dvh flex-col">
      {/* Header fijo */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-none">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900 transition-colors duration-300 dark:text-slate-100">
            <img src="/logo.png" alt="Salesianos F.C." className="h-10 w-auto object-contain" />
            <span>Salesianos FC</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md p-2 text-slate-600 transition-colors duration-300 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}
            >
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            <span className="hidden text-slate-600 transition-colors duration-300 sm:inline dark:text-slate-400">{me?.username}</span>
            <button
              type="button"
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              onClick={() => {
                setChangePasswordOpen(true)
                setCurrentPassword('')
                setNewPassword('')
                setNewPasswordConfirm('')
                setChangePasswordError(null)
                setChangePasswordErrors({})
              }}
            >
              Cambiar contraseña
            </button>
            <button
              className="sf-btn sf-btn-secondary px-3 py-1.5"
              onClick={async () => {
                await logout()
                nav('/login')
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <Modal
        open={changePasswordOpen}
        title="Cambiar mi contraseña"
        onClose={() => { if (!changingPassword) setChangePasswordOpen(false) }}
        footer={
          <div className="flex justify-end gap-2">
            <button className="sf-btn sf-btn-secondary" onClick={() => setChangePasswordOpen(false)} disabled={changingPassword}>Cancelar</button>
            <button
              className="sf-btn sf-btn-primary"
              disabled={changingPassword}
              onClick={async () => {
                if (!accessToken) return
                setChangePasswordError(null)
                const err: Record<string, boolean> = {}
                if (!currentPassword) err.current = true
                if (newPassword.length < 8) err.newPassword = true
                if (newPassword !== newPasswordConfirm) err.confirm = true
                if (Object.keys(err).length > 0) {
                  setChangePasswordErrors(err)
                  return
                }
                setChangePasswordErrors({})
                setChangingPassword(true)
                try {
                  await apiFetch('/api/auth/change-password', {
                    method: 'POST',
                    authToken: accessToken,
                    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
                  })
                  setChangePasswordOpen(false)
                  setCurrentPassword('')
                  setNewPassword('')
                  setNewPasswordConfirm('')
                } catch (e: unknown) {
                  setChangePasswordError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
                } finally {
                  setChangingPassword(false)
                }
              }}
            >
              {changingPassword ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {changePasswordError ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{changePasswordError}</div> : null}
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Contraseña actual
            <input
              className={`mt-1 sf-input ${changePasswordErrors.current ? 'sf-input-invalid' : ''}`}
              type="password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setChangePasswordErrors((p) => (p.current ? { ...p, current: false } : p)) }}
              autoComplete="current-password"
            />
            {changePasswordErrors.current && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerida</span>}
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Nueva contraseña (mín. 8 caracteres)
            <input
              className={`mt-1 sf-input ${changePasswordErrors.newPassword ? 'sf-input-invalid' : ''}`}
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setChangePasswordErrors((p) => (p.newPassword || p.confirm ? { ...p, newPassword: false, confirm: false } : p)) }}
              autoComplete="new-password"
            />
            {changePasswordErrors.newPassword && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Mínimo 8 caracteres</span>}
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Repetir nueva contraseña
            <input
              className={`mt-1 sf-input ${changePasswordErrors.confirm ? 'sf-input-invalid' : ''}`}
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => { setNewPasswordConfirm(e.target.value); setChangePasswordErrors((p) => (p.confirm ? { ...p, confirm: false } : p)) }}
              autoComplete="new-password"
            />
            {changePasswordErrors.confirm && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">No coincide</span>}
          </label>
        </div>
      </Modal>

      {/* Sidebar fijo (solo desktop) */}
      <aside className="fixed left-0 top-14 bottom-12 z-20 hidden w-[260px] border-r border-slate-200 bg-white transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900 md:block">
        <div className="flex h-full flex-col overflow-y-auto p-4">
          <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 transition-colors duration-300 dark:text-slate-400">
            Navegación
          </div>
          <nav className="space-y-1">
            <NavItem to="/" label="Inicio" end />
            <NavItem to="/players" label="Jugadores" />
            <NavItem to="/matches" label="Partidos" />
            <NavItem to="/series" label="Series" />
            <NavItem to="/tournaments" label="Torneos" />
            <NavItem to="/rivals" label="Rivales" />
            {isTreasurer ? (
              <>
                <NavItem to="/treasury" label="Tesorería" />
              </>
            ) : null}
          </nav>

          {isAdmin ? (
            <>
              <div className="mt-4 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 transition-colors duration-300 dark:text-slate-400">
                Admin
              </div>
              <nav className="space-y-1">
                <NavItem to="/admin/users" label="Usuarios" />
                <NavItem to="/admin/audit" label="Auditoría" />
              </nav>
            </>
          ) : null}
        </div>
      </aside>

      {/* Body: área principal con scroll */}
      <main className="min-h-0 flex-1 overflow-y-auto pt-14 pb-28 md:pl-[260px] md:pb-12">
        <div className="mx-auto max-w-7xl px-4 py-4 md:py-6">
          <Outlet />
        </div>
      </main>

      {/* Footer siempre visible */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 flex h-12 items-center justify-center border-t border-slate-200 bg-white/95 text-center text-sm text-slate-500 backdrop-blur transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-400 md:left-0">
        <span>Salesianos FC © {new Date().getFullYear()}</span>
      </footer>

      {/* Bottom nav (mobile): encima del footer */}
      <nav className="fixed bottom-12 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/95 md:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-6 gap-1 px-2 py-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              classNames(
                'rounded-md px-2 py-2 text-center text-xs transition-colors duration-300',
                isActive ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
              )
            }
          >
            Inicio
          </NavLink>
          <NavLink
            to="/matches"
            className={({ isActive }) =>
              classNames(
                'rounded-md px-2 py-2 text-center text-xs transition-colors duration-300',
                isActive ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
              )
            }
          >
            Partidos
          </NavLink>
          <NavLink
            to="/players"
            className={({ isActive }) =>
              classNames(
                'rounded-md px-2 py-2 text-center text-xs transition-colors duration-300',
                isActive ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
              )
            }
          >
            Jugadores
          </NavLink>
          <NavLink
            to="/series"
            className={({ isActive }) =>
              classNames(
                'rounded-md px-2 py-2 text-center text-xs transition-colors duration-300',
                isActive ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
              )
            }
          >
            Series
          </NavLink>
          <NavLink
            to="/rivals"
            className={({ isActive }) =>
              classNames(
                'rounded-md px-2 py-2 text-center text-xs transition-colors duration-300',
                isActive ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
              )
            }
          >
            Riv.
          </NavLink>
          <NavLink
            to={isTreasurer ? '/treasury' : '/tournaments'}
            className={({ isActive }) =>
              classNames(
                'rounded-md px-2 py-2 text-center text-xs transition-colors duration-300',
                isActive ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
              )
            }
          >
            {isTreasurer ? 'Tes.' : 'Torneos'}
          </NavLink>
        </div>
      </nav>
    </div>
  )
}

