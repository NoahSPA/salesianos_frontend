import { useEffect, useState } from 'react'
import { apiFetch, ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { PageHeader } from '../ui/PageHeader'

type AuditLog = {
  id: string
  action: string
  entity_type: string
  entity_id: string
  actor_user_id?: string | null
  actor_role?: string | null
  actor_username?: string | null
  created_at: string
}

export function AdminAuditPage() {
  const { accessToken, me } = useAuth()
  const [items, setItems] = useState<AuditLog[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function reload() {
    if (!accessToken) return
    const data = await apiFetch<AuditLog[]>('/api/audit?limit=100', { authToken: accessToken })
    setItems(data)
  }

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    reload()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  if (me?.role !== 'admin') return null

  return (
    <div className="space-y-3">
      <PageHeader title="Auditoría" />

      {loading ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center">
          <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
        </div>
      ) : null}
      {error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}

      <div className="space-y-2">
        {items.map((a) => (
          <div key={a.id} className="sf-card rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-900 dark:text-slate-100">{a.action}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(a.created_at).toLocaleString()}</div>
            </div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {a.entity_type}:{a.entity_id}
            </div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {a.actor_username ? `${a.actor_username} (${a.actor_role})` : 'público'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

