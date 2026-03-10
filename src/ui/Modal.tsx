import { useEffect } from 'react'

export function Modal(props: {
  open: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
  footer?: React.ReactNode
  maxWidthClassName?: string
}) {
  const { open, onClose } = props
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity dark:bg-slate-950/60"
          onClick={(e) => { if (e.target === e.currentTarget) props.onClose() }}
          aria-hidden="true"
        />
      <div className="absolute inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={props.title}
          className={'w-full ' + (props.maxWidthClassName ?? 'sm:max-w-lg')}
        >
          <div className="sf-card overflow-hidden rounded-t-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{props.title}</div>
              <button className="sf-btn sf-btn-secondary px-2 py-1" onClick={props.onClose}>
                Cerrar
              </button>
            </div>
            <div className="max-h-[75dvh] overflow-auto p-4">{props.children}</div>
            {props.footer ? (
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">{props.footer}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

