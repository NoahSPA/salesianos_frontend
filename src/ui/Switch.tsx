type SwitchProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  'aria-label'?: string
  size?: 'sm' | 'md'
}

/**
 * Switch elegante para estado activo/inactivo.
 * Proporciones refinadas, sombra suave y transición fluida.
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  'aria-label': ariaLabel = 'Activo o inactivo',
  size = 'md',
}: SwitchProps) {
  const isSm = size === 'sm'
  const trackClass =
    'inline-flex shrink-0 cursor-pointer items-center rounded-full outline-none transition-colors duration-200 ease-in-out ' +
    'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary)] ' +
    'disabled:cursor-not-allowed disabled:opacity-50 ' +
    (isSm ? 'h-6 w-11 p-0.5' : 'h-7 w-12 p-1') +
    (checked
      ? ' border-0 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
      : ' border border-slate-300 bg-slate-100 dark:border-slate-500 dark:bg-slate-600 dark:hover:bg-slate-500') +
    (!checked && !disabled ? ' hover:border-slate-400 hover:bg-slate-200 dark:hover:border-slate-400' : '') +
    (disabled && !checked ? ' hover:bg-slate-100 dark:hover:bg-slate-600' : '')

  const thumbClass =
    'pointer-events-none inline-block rounded-full bg-white shadow transition-transform duration-200 ease-in-out ' +
    (isSm ? 'h-5 w-5' : 'h-5 w-5') +
    (checked ? (isSm ? ' translate-x-5' : ' translate-x-6') : ' translate-x-0')

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={trackClass}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className={thumbClass} />
    </button>
  )
}
