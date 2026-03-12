import { useEffect, useRef, useState } from 'react'
import { apiFetch, apiUpload, ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { useBranding } from '../app/branding'
import { PageHeader } from '../ui/PageHeader'

const DEFAULT_COLOR = '#006600'
const DEFAULT_APP_NAME = 'Salesianos FC'

export function AdminBrandingPage() {
  const { accessToken } = useAuth()
  const { branding, loading: brandingLoading, logoUrl, appName: currentAppName, refresh } = useBranding()
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLOR)
  const [appName, setAppName] = useState(DEFAULT_APP_NAME)
  const [saving, setSaving] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (branding?.primary_color) setPrimaryColor(branding.primary_color)
  }, [branding?.primary_color])

  useEffect(() => {
    if (branding?.app_name != null) setAppName(branding.app_name.trim() || DEFAULT_APP_NAME)
  }, [branding?.app_name])

  // Preview del color mientras se edita
  const prevColorRef = useRef(primaryColor)
  useEffect(() => {
    if (prevColorRef.current === primaryColor) return
    prevColorRef.current = primaryColor
    const rgb = /^#?([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(primaryColor)
    if (!rgb) return
    const r = parseInt(rgb[1], 16)
    const g = parseInt(rgb[2], 16)
    const b = parseInt(rgb[3], 16)
    const dr = Math.max(0, Math.floor(r * 0.85))
    const dg = Math.max(0, Math.floor(g * 0.85))
    const db = Math.max(0, Math.floor(b * 0.85))
    const root = document.documentElement
    root.style.setProperty('--color-primary', primaryColor)
    root.style.setProperty('--color-primary-hover', `rgb(${dr}, ${dg}, ${db})`)
    root.style.setProperty('--color-primary-light', `rgba(${r}, ${g}, ${b}, 0.14)`)
    root.style.setProperty('--color-primary-focus', `rgba(${r}, ${g}, ${b}, 0.4)`)
  }, [primaryColor])

  async function handleSaveColor() {
    if (!accessToken) return
    const hex = primaryColor.startsWith('#') ? primaryColor : `#${primaryColor}`
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setError('Color inválido. Use formato #RRGGBB (ej. #006600).')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await apiFetch('/api/settings/branding', {
        method: 'PATCH',
        authToken: accessToken,
        body: JSON.stringify({ primary_color: hex }),
      })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !accessToken) return
    setError(null)
    setUploadingLogo(true)
    try {
      await apiUpload('/api/settings/logo', file, { authToken: accessToken })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MENSAJE_ES)
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  function handleResetColor() {
    setPrimaryColor(DEFAULT_COLOR)
  }

  async function handleSaveAppName() {
    if (!accessToken) return
    const name = appName.trim() || DEFAULT_APP_NAME
    if (name.length > 120) {
      setError('El nombre no puede superar 120 caracteres.')
      return
    }
    setError(null)
    setSavingName(true)
    try {
      await apiFetch('/api/settings/branding', {
        method: 'PATCH',
        authToken: accessToken,
        body: JSON.stringify({ app_name: name }),
      })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
    } finally {
      setSavingName(false)
    }
  }

  function handleResetAppName() {
    setAppName(DEFAULT_APP_NAME)
  }

  if (brandingLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center">
        <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Personalizar sistema" />
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="sf-card p-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nombre del sistema</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Se muestra en la cabecera, pie de página, login y en partidos (ej. &quot;{currentAppName} vs Rival&quot;).
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <input
            type="text"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="sf-input max-w-md flex-1"
            maxLength={120}
            placeholder={DEFAULT_APP_NAME}
            aria-label="Nombre del sistema"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="sf-btn sf-btn-primary"
              disabled={savingName}
              onClick={handleSaveAppName}
            >
              {savingName ? 'Guardando…' : 'Guardar nombre'}
            </button>
            <button type="button" className="sf-btn sf-btn-secondary" onClick={handleResetAppName}>
              Restaurar por defecto
            </button>
          </div>
        </div>
      </div>

      <div className="sf-card p-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Logo del sistema</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Se muestra en la cabecera y en la pantalla de login.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="flex flex-col items-start gap-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800">
              <img
                src={logoUrl}
                alt="Logo actual"
                className="h-16 w-auto max-w-[200px] object-contain"
              />
            </div>
            <label className="sf-btn sf-btn-secondary inline-flex cursor-pointer items-center gap-2">
              {uploadingLogo ? 'Subiendo…' : 'Subir nuevo logo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingLogo}
                className="sr-only"
                onChange={handleLogoUpload}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="sf-card p-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Color principal</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Afecta botones, enlaces y elementos destacados.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white p-0 dark:border-slate-600 dark:bg-slate-800"
              aria-label="Color principal"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="sf-input w-24 font-mono text-sm"
              maxLength={7}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="sf-btn sf-btn-primary"
              disabled={saving}
              onClick={handleSaveColor}
            >
              {saving ? 'Guardando…' : 'Guardar color'}
            </button>
            <button type="button" className="sf-btn sf-btn-secondary" onClick={handleResetColor}>
              Restaurar por defecto
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Formato: #RRGGBB (ej. #006600). Guardar para aplicar.
        </p>
      </div>
    </div>
  )
}
