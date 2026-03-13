/**
 * Botón unificado: mismo estilo, icono opcional y spinner cuando loading.
 * Variantes: primary (acción principal), secondary (cancelar/cerrar), danger (eliminar).
 */
import type { ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'danger'

const variantClass: Record<Variant, string> = {
  primary: 'sf-btn sf-btn-primary',
  secondary: 'sf-btn sf-btn-secondary',
  danger: 'sf-btn sf-btn-danger',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  /** Icono a la izquierda del texto. No se muestra cuando loading. */
  icon?: React.ReactNode
  loading?: boolean
  /** Clases extra (se aplican además de la variante). */
  className?: string
}

export function Button({
  variant = 'primary',
  icon,
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const baseClass = variantClass[variant]
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      className={`${baseClass} inline-flex items-center justify-center gap-2 ${className}`.trim()}
      disabled={isDisabled}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <span className="inline-block shrink-0" aria-hidden>
          <Spinner size="sm" />
        </span>
      ) : icon ? (
        <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5" aria-hidden>
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  )
}
