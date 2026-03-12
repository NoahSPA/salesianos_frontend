import { useCallback, useEffect, useState } from 'react'
import { useBranding } from '../app/useBranding'

const DISMISS_KEY = 'salesianos-install-dismissed'

/** Detecta si la app ya está instalada (modo standalone). */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true ||
    (document.referrer?.startsWith('android-app://') ?? false)
  )
}

/** Detecta si es móvil (pantalla estrecha o dispositivo táctil). */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.innerWidth < 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  )
}

/** Detecta iOS (Safari) para mostrar instrucciones de "Añadir a inicio". */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream
}

export function InstallPrompt() {
  const { appName } = useBranding()
  const [visible, setVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<{ outcome: string }> } | null>(null)
  const isIOSDevice = typeof navigator !== 'undefined' && isIOS()

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString())
    } catch {
      // ignore
    }
    setVisible(false)
  }, [])

  useEffect(() => {
    if (isStandalone()) return
    if (!isMobileDevice()) return
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY)
      if (dismissed) {
        const t = parseInt(dismissed, 10)
        if (!Number.isNaN(t) && Date.now() - t < 7 * 24 * 60 * 60 * 1000) return // No mostrar de nuevo en 7 días
      }
    } catch {
      // ignore
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as unknown as { prompt: () => Promise<{ outcome: string }> })
    }
    window.addEventListener('beforeinstallprompt', handler)

    const id = setTimeout(() => setVisible(true), 0)
    return () => {
      clearTimeout(id)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        const { outcome } = await deferredPrompt.prompt()
        if (outcome === 'accepted') dismiss()
      } catch {
        // ignore
      }
    }
  }, [deferredPrompt, dismiss])

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Sugerencia de instalar la aplicación"
      className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/95 px-4 py-3 shadow-sm dark:border-slate-600 dark:bg-slate-800/95 md:hidden"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {isIOSDevice
            ? `Añade ${appName} al inicio`
            : `Instala ${appName} en tu móvil`}
        </p>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
          {isIOSDevice
            ? 'Toca el botón compartir y luego "Añadir a la pantalla de inicio".'
            : 'Abre más rápido y usa la app como si fuera nativa.'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!isIOSDevice && deferredPrompt ? (
          <button
            type="button"
            onClick={handleInstall}
            className="sf-btn sf-btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Instalar
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-600 dark:hover:text-slate-200"
          aria-label="Cerrar"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
