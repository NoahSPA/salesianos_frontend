import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { useTheme } from '../app/theme'

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

function IconEye() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )
}

export function LoginPage() {
  const nav = useNavigate()
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})

  function clearFieldError(field: string) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: false } : prev))
  }

  return (
    <div className="min-h-dvh bg-slate-50 transition-colors duration-300 dark:bg-slate-900">
      <div className="absolute right-4 top-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2.5 text-slate-500 transition-colors duration-300 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </div>
    <div className="mx-auto flex max-w-sm flex-col items-center justify-center px-4 py-16 text-center">
      <img src="/logo.png" alt="Salesianos F.C." className="mx-auto mb-6 h-24 w-auto object-contain" />
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Ingresar</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Accede para administrar el club
      </p>

      <form
        className="mt-6 space-y-3 sf-card p-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setError(null)
          const err: Record<string, boolean> = {}
          if (!username.trim()) err.username = true
          if (!password) err.password = true
          if (Object.keys(err).length > 0) {
            setFieldErrors(err)
            return
          }
          setFieldErrors({})
          setLoading(true)
          try {
            await login(username, password)
            nav('/')
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : ERROR_MENSAJE_ES)
          } finally {
            setLoading(false)
          }
        }}
      >
        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
          Usuario
          <input
            className={`mt-1 sf-input ${fieldErrors.username ? 'sf-input-invalid' : ''}`}
            value={username}
            onChange={(e) => { setUsername(e.target.value); clearFieldError('username') }}
            autoComplete="username"
          />
          {fieldErrors.username && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
        </label>

        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
          Contraseña
          <div className="relative">
            <input
              className={`mt-1 sf-input pr-10 ${fieldErrors.password ? 'sf-input-invalid' : ''}`}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearFieldError('password') }}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-600 dark:hover:text-slate-300"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? <IconEyeOff /> : <IconEye />}
            </button>
          </div>
          {fieldErrors.password && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
        </label>

        {error && <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div>}

        <button
          className="w-full sf-btn sf-btn-primary"
          disabled={loading}
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
    </div>
  )
}

