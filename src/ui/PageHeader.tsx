import React from 'react'

/**
 * Cabecera de página unificada: título + acciones opcionales, dentro de una tarjeta.
 * Todas las páginas usan esta estructura para consistencia visual.
 */
export function PageHeader(props: {
  title: string
  children?: React.ReactNode
  /** Contenido debajo del título (ej. pestañas en Tesorería) */
  extra?: React.ReactNode
}) {
  return (
    <div className="sf-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {props.title}
        </h1>
        {props.children}
      </div>
      {props.extra ? <div className="mt-3">{props.extra}</div> : null}
    </div>
  )
}
