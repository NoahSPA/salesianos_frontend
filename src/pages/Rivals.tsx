import { useEffect, useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { apiFetch, ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { Button } from '../ui/Button'
import { IconCheck, IconPlus, IconX } from '../ui/Icons'
import { Modal } from '../ui/Modal'
import { PageHeader } from '../ui/PageHeader'
import { SeriesBadge } from '../ui/SeriesBadge'
import { Switch } from '../ui/Switch'

type Series = { id: string; name: string; active: boolean; color?: string | null }

type Rival = {
  id: string
  name: string
  code?: string | null
  series_ids: string[]
  active: boolean
  notes?: string | null
}

export function RivalsPage() {
  const { accessToken, me } = useAuth()
  const [series, setSeries] = useState<Series[]>([])
  const [items, setItems] = useState<Rival[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seriesIdFilter, setSeriesIdFilter] = useState<string>('')

  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingRival, setEditingRival] = useState<Rival | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [seriesIds, setSeriesIds] = useState<string[]>([])
  const [active, setActive] = useState(true)
  const [notes, setNotes] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const canAdmin = me?.role === 'admin'

  const seriesById = useMemo(() => Object.fromEntries(series.map((s) => [s.id, s])), [series])

  function toggleSeriesId(id: string) {
    setSeriesIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function openCreate() {
    setEditingRival(null)
    setFieldErrors({})
    setName('')
    setCode('')
    setSeriesIds([])
    setActive(true)
    setNotes('')
    setOpen(true)
  }

  function openEdit(r: Rival) {
    setEditingRival(r)
    setName(r.name)
    setCode(r.code ?? '')
    setSeriesIds(r.series_ids ?? [])
    setActive(r.active)
    setNotes(r.notes ?? '')
    setOpen(true)
  }

  function closeModal() {
    if (!creating) {
      setError(null)
      setOpen(false)
      setEditingRival(null)
    }
  }

  async function reload() {
    if (!accessToken) return
    const qs = new URLSearchParams()
    if (seriesIdFilter) qs.set('series_id', seriesIdFilter)
    const [rivalsList, seriesList] = await Promise.all([
      apiFetch<Rival[]>(`/api/rivals${qs.toString() ? `?${qs}` : ''}`, { authToken: accessToken }),
      apiFetch<Series[]>('/api/series', { authToken: accessToken }),
    ])
    setItems(rivalsList)
    setSeries(seriesList)
  }

  useEffect(() => {
    if (!accessToken) return
    setLoading(true)
    reload()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload intentionally omitted to run only when accessToken/seriesIdFilter change
  }, [accessToken, seriesIdFilter])

  if (loading) return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center">
      <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
    </div>
  )

  return (
    <div className="space-y-3">
      <PageHeader
        title="Rivales"
        extra={
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/50">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="font-medium">Series</span>
              <select
                className="sf-input max-w-xs py-1.5 text-sm"
                value={seriesIdFilter}
                onChange={(e) => setSeriesIdFilter(e.target.value)}
              >
                <option value="">Todas</option>
                {series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      >
        {canAdmin ? (
          <Button variant="primary" icon={<IconPlus />} onClick={openCreate}>
            Nuevo rival
          </Button>
        ) : null}
      </PageHeader>

      <Modal
        open={open && canAdmin}
        title={editingRival ? 'Editar rival' : 'Crear rival'}
        maxWidthClassName="sm:max-w-lg"
        onClose={closeModal}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" icon={<IconX />} onClick={closeModal} disabled={creating}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon={<IconCheck />}
              loading={creating}
              disabled={creating}
              onClick={async () => {
                if (!accessToken) return
                setError(null)
                if (!name.trim()) {
                  setFieldErrors({ name: true })
                  return
                }
                setFieldErrors({})
                setCreating(true)
                try {
                  const body = {
                    name: name.trim(),
                    code: code.trim() || null,
                    series_ids: seriesIds,
                    active,
                    notes: notes.trim() || null,
                  }
                  if (editingRival) {
                    await apiFetch<Rival>(`/api/rivals/${editingRival.id}`, {
                      method: 'PATCH',
                      authToken: accessToken,
                      body: JSON.stringify(body),
                    })
                  } else {
                    await apiFetch<Rival>('/api/rivals', {
                      method: 'POST',
                      authToken: accessToken,
                      body: JSON.stringify(body),
                    })
                  }
                  setEditingRival(null)
                  setName('')
                  setCode('')
                  setSeriesIds([])
                  setActive(true)
                  setNotes('')
                  await reload()
                  setOpen(false)
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : ERROR_MENSAJE_ES)
                } finally {
                  setCreating(false)
                }
              }}
            >
              {creating ? (editingRival ? 'Guardando…' : 'Creando…') : editingRival ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Nombre
            <input className={`mt-1 sf-input ${fieldErrors.name ? 'sf-input-invalid' : ''}`} value={name} onChange={(e) => { setName(e.target.value); setFieldErrors((p) => (p.name ? { ...p, name: false } : p)) }} />
            {fieldErrors.name && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">Requerido</span>}
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Código (opcional)
            <input className="mt-1 sf-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ej. ABC" />
          </label>
          <div className="block text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium">Series en las que participa</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {series.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700/50">
                  <input
                    type="checkbox"
                    checked={seriesIds.includes(s.id)}
                    onChange={() => toggleSeriesId(s.id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
            {series.length === 0 ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No hay series. Crea series primero.</p> : null}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Switch checked={active} onChange={setActive} aria-label="Activo" />
            <span>Activo</span>
          </label>
          <label className="block text-sm text-slate-700 dark:text-slate-300">
            Notas (opcional)
            <textarea className="mt-1 sf-input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
      </Modal>

      {!open && error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}

      {items.length === 0 && !loading ? (
        <div className="sf-card rounded-xl border border-slate-200 p-6 text-center text-slate-600 dark:border-slate-600 dark:text-slate-400">
          No hay rivales.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((r) => (
            <div
              key={r.id}
              className="group sf-card relative flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-600 dark:bg-slate-800/50"
            >
              {canAdmin ? (
                <button
                  type="button"
                  className="absolute right-2 top-2 rounded p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-600 dark:hover:text-slate-300"
                  onClick={() => openEdit(r)}
                  title="Editar"
                  aria-label="Editar rival"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              ) : null}
              <div className="pr-8">
                <div className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</div>
                {r.code ? <div className="text-xs text-slate-500 dark:text-slate-400">{r.code}</div> : null}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {r.series_ids?.length ? (
                  r.series_ids.map((sid) => {
                    const s = seriesById[sid]
                    return <SeriesBadge key={sid} seriesId={sid} name={s?.name} color={s?.color} />
                  })
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500">Sin series</span>
                )}
              </div>
              <div
                className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-600"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs text-slate-500 dark:text-slate-400">{r.active ? 'Activo' : 'Inactivo'}</span>
                {canAdmin ? (
                  <Switch
                    checked={!!r.active}
                    onChange={async (checked) => {
                      if (!accessToken) return
                      setTogglingId(r.id)
                      try {
                        await apiFetch<Rival>(`/api/rivals/${r.id}`, {
                          method: 'PATCH',
                          authToken: accessToken,
                          body: JSON.stringify({ active: checked }),
                        })
                        await reload()
                      } catch {
                        await reload()
                      } finally {
                        setTogglingId(null)
                      }
                    }}
                    disabled={togglingId === r.id}
                    aria-label={r.active ? 'Activo (desactivar)' : 'Inactivo (activar)'}
                    size="sm"
                  />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
