/**
 * Spinner de carga reutilizable. Usa la clase .sf-loading-spinner de index.css.
 */
export function Spinner(props: { size?: 'sm' | 'md'; className?: string }) {
  const size = props.size ?? 'md'
  const sizeClass = size === 'sm' ? 'sf-loading-spinner-sm' : ''
  return (
    <div
      className={`sf-loading-spinner ${sizeClass} ${props.className ?? ''}`.trim()}
      role="status"
      aria-label="Cargando"
    />
  )
}

/** Contenedor con spinner centrado (para pantalla completa o sección). */
export function SpinnerBlock(props: { size?: 'sm' | 'md'; className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-8 ${props.className ?? ''}`}
      role="status"
      aria-label="Cargando"
    >
      <Spinner size={props.size ?? 'md'} />
    </div>
  )
}
