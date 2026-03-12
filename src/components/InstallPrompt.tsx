import { Download, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useBranding } from '../app/branding'

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
  const [isIOSDevice, setIsIOSDevice] = useState(false)

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

    setIsIOSDevice(isIOS())

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as unknown as { prompt: () => Promise<{ outcome: string }> })
    }
    window.addEventListener('beforeinstallprompt', handler)

    setVisible(true)

    return () => window.removeEventListener('beforeinstallprompt', handler)
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
            <Download className="h-4 w-4" aria-hidden />
            Instalar
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-600 dark:hover:text-slate-200"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
