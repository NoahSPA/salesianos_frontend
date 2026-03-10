import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch, ERROR_MENSAJE_ES } from '../app/api'
import { useAuth } from '../app/auth'
import { PageHeader } from '../ui/PageHeader'
import { SeriesBadge } from '../ui/SeriesBadge'

type Series = { id: string; name: string; active: boolean; color?: string | null }

type Match = {
  id: string
  tournament_id: string
  series_id: string
  opponent: string
  match_date: string
  call_time: string
  venue: string
  field_number?: string | null
  status: string
  result?: string | null
  our_goals?: number | null
  opponent_goals?: number | null
}

type Player = {
  id: string
  first_name: string
  last_name: string
  active: boolean
  primary_series_id: string
  series_ids: string[]
}

type Convocation = {
  id: string
  match_id: string
  series_id: string
  invited_player_ids: string[]
  public_link_id: string
  created_by_user_id: string
}

type AttendanceStatus = 'pending' | 'confirmed' | 'declined'

type ConvStatus = {
  convocation_id: string
  match_id: string
  series_id: string
  public_link_id: string
  invited_count: number
  confirmed_count: number
  declined_count: number
  pending_count: number
  lines: Array<{
    player_id: string
    player_name: string
    status: AttendanceStatus
    comment?: string | null
    updated_at: string
  }>
}

function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const ta = document.createElement('textarea')
  ta.value = text
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
  return Promise.resolve()
}

export function MatchDetailPage() {
  const { matchId } = useParams()
  const { accessToken, me } = useAuth()
  const [match, setMatch] = useState<Match | null>(null)
  const [series, setSeries] = useState<Series | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [conv, setConv] = useState<Convocation | null>(null)
  const [status, setStatus] = useState<ConvStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [ourGoalsEdit, setOurGoalsEdit] = useState<number | ''>('')
  const [opponentGoalsEdit, setOpponentGoalsEdit] = useState<number | ''>('')
  const [savingResult, setSavingResult] = useState(false)

  const canManage = me?.role === 'admin' || me?.role === 'delegado'

  const publicLink = useMemo(() => {
    if (!conv) return null
    return `${window.location.origin}/c/${conv.public_link_id}`
  }, [conv])

  async function loadAll() {
    if (!accessToken || !matchId) return
    const m = await apiFetch<Match>(`/api/matches/${matchId}`, { authToken: accessToken })
    setMatch(m)
    const [pl, seriesList, maybeConv] = await Promise.all([
      apiFetch<Player[]>(`/api/players?series_id=${encodeURIComponent(m.series_id)}`, { authToken: accessToken }),
      apiFetch<Series[]>('/api/series', { authToken: accessToken }),
      apiFetch<Convocation>(`/api/matches/${matchId}/convocation`, { authToken: accessToken }).catch(() => null as Convocation | null),
    ])
    setPlayers(pl)
    setSeries(seriesList.find((s) => s.id === m.series_id) ?? null)
    if (maybeConv) {
      setConv(maybeConv)
      const st = await apiFetch<ConvStatus>(`/api/convocations/${maybeConv.id}/status`, { authToken: accessToken })
      setStatus(st)
    } else {
      setConv(null)
      setStatus(null)
    }
  }

  useEffect(() => {
    loadAll().catch((e: unknown) => setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, matchId])

  useEffect(() => {
    if (match) {
      setOurGoalsEdit(match.our_goals ?? '')
      setOpponentGoalsEdit(match.opponent_goals ?? '')
    }
  }, [match])

  useEffect(() => {
    if (!accessToken || !conv) return
    const t = setInterval(() => {
      apiFetch<ConvStatus>(`/api/convocations/${conv.id}/status`, { authToken: accessToken })
        .then(setStatus)
        .catch(() => {})
    }, 5000)
    return () => clearInterval(t)
  }, [accessToken, conv])

  const statusByPlayerId = useMemo(() => {
    const m: Record<string, { status: AttendanceStatus; comment?: string | null }> = {}
    if (!status?.lines) return m
    for (const l of status.lines) m[l.player_id] = { status: l.status, comment: l.comment }
    return m
  }, [status])

  const allPlayersWithStatus = useMemo(() => {
    return players.map((p) => {
      const st = statusByPlayerId[p.id]
      const status: AttendanceStatus = st ? st.status : 'pending'
      return { ...p, status, comment: st?.comment }
    })
  }, [players, statusByPlayerId])

  const groupedByStatus = useMemo(() => {
    const confirmed = allPlayersWithStatus.filter((p) => p.status === 'confirmed')
    const pending = allPlayersWithStatus.filter((p) => p.status === 'pending')
    const declined = allPlayersWithStatus.filter((p) => p.status === 'declined')
    return { confirmed, pending, declined }
  }, [allPlayersWithStatus])

  const whatsappText = useMemo(() => {
    if (!match || !status) return ''
    const confirmed = status.lines.filter((l) => l.status === 'confirmed').map((l) => `- ${l.player_name}`).join('\n')
    const declined = status.lines.filter((l) => l.status === 'declined').map((l) => `- ${l.player_name}`).join('\n')
    const pending = status.lines.filter((l) => l.status === 'pending').map((l) => `- ${l.player_name}`).join('\n')
    const locationLine = [match.venue, match.field_number ? `cancha ${match.field_number}` : null].filter(Boolean).join(' · ')
    const shortLink = publicLink ?? ''
    return [
      `Salesianos FC - Partido en puerta`,
      ``,
      `vs ${match.opponent}`,
      `${match.match_date} - Citación ${match.call_time}`,
      ...(locationLine ? [locationLine, ''] : []),
      `Confirmá si vas (link corto):`,
      shortLink,
      ``,
      `Van (${status.confirmed_count})`,
      confirmed || '(ninguno)',
      ``,
      `No pueden (${status.declined_count})`,
      declined || '(ninguno)',
      ``,
      `Pendientes (${status.pending_count})`,
      pending || '(ninguno)',
    ].join('\n')
  }, [match, status, publicLink])

  if (!match) {
    return (
      <div className="space-y-4">
        <PageHeader title="Detalle del partido" />
        <div className="flex flex-col items-center justify-center py-12">
          <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Detalle del partido">
        <Link to="/matches" className="sf-btn sf-btn-secondary">
          Volver a partidos
        </Link>
      </PageHeader>
      {/* Cabecera del partido */}
      <div className="sf-card overflow-hidden rounded-xl border border-slate-200 p-4 dark:border-slate-600">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {series ? (
              <SeriesBadge seriesId={series.id} name={series.name} color={series.color} />
            ) : null}
            <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">vs {match.opponent}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
              <span>{match.match_date} · citación {match.call_time}</span>
              {(match.venue || match.field_number) ? (
                <span>
                  {[match.venue, match.field_number ? `cancha ${match.field_number}` : null].filter(Boolean).join(' · ')}
                </span>
              ) : null}
              {match.our_goals != null && match.opponent_goals != null ? (
                <>
                  <span
                    className={
                      'font-semibold ' +
                      (match.our_goals > match.opponent_goals
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : match.our_goals < match.opponent_goals
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500 dark:text-slate-400')
                    }
                  >
                    {match.our_goals}-{match.opponent_goals}
                  </span>
                  <span className={'sf-badge ' + (match.our_goals > match.opponent_goals ? 'sf-badge-emerald' : match.our_goals < match.opponent_goals ? 'sf-badge-rose' : 'sf-badge-amber')}>
                    {match.our_goals > match.opponent_goals ? 'Ganado' : match.our_goals < match.opponent_goals ? 'Perdido' : 'Empate'}
                  </span>
                </>
              ) : match.result ? (
                <span className="font-medium text-slate-800 dark:text-slate-200">Resultado: {match.result}</span>
              ) : null}
            </div>
          </div>
          {conv ? (
            <div className="flex flex-wrap gap-2">
              <button className="sf-btn sf-btn-secondary px-3 py-2 text-sm" onClick={() => publicLink && copyText(publicLink)}>
                Copiar link
              </button>
              <a className="sf-btn sf-btn-primary px-3 py-2 text-sm font-medium" href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
              <button className="sf-btn sf-btn-secondary px-3 py-2 text-sm" onClick={() => copyText(whatsappText)}>
                Copiar resumen
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div> : null}

      {/* Resultado del encuentro: solo para partidos con estado "jugado" */}
      {canManage && match && match.status === 'jugado' ? (
        <div className="sf-card rounded-xl border border-slate-200 p-4 dark:border-slate-600">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Resultado del encuentro</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Nuestros goles y goles del rival. Se mostrará Ganado, Empate o Perdido según el marcador.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block text-sm text-slate-700 dark:text-slate-300">
              Nuestros goles
              <input
                className="mt-1 sf-input w-20"
                type="number"
                min={0}
                max={99}
                value={ourGoalsEdit === '' ? '' : ourGoalsEdit}
                onChange={(e) => setOurGoalsEdit(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
              />
            </label>
            <span className="mb-2 text-lg font-semibold text-slate-400 dark:text-slate-500">–</span>
            <label className="block text-sm text-slate-700 dark:text-slate-300">
              Goles rival
              <input
                className="mt-1 sf-input w-20"
                type="number"
                min={0}
                max={99}
                value={opponentGoalsEdit === '' ? '' : opponentGoalsEdit}
                onChange={(e) => setOpponentGoalsEdit(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
              />
            </label>
            {ourGoalsEdit !== '' && opponentGoalsEdit !== '' ? (
              <span className={'mb-2 sf-badge ' + (ourGoalsEdit > opponentGoalsEdit ? 'sf-badge-emerald' : ourGoalsEdit < opponentGoalsEdit ? 'sf-badge-rose' : 'sf-badge-amber')}>
                {ourGoalsEdit > opponentGoalsEdit ? 'Ganado' : ourGoalsEdit < opponentGoalsEdit ? 'Perdido' : 'Empate'}
              </span>
            ) : null}
            <button
              className="sf-btn sf-btn-primary"
              disabled={savingResult}
              onClick={async () => {
                if (!accessToken || !matchId) return
                setSavingResult(true)
                setError(null)
                try {
                  const our = ourGoalsEdit === '' ? null : Number(ourGoalsEdit)
                  const opp = opponentGoalsEdit === '' ? null : Number(opponentGoalsEdit)
                  const updated = await apiFetch<Match>(`/api/matches/${matchId}`, {
                    method: 'PATCH',
                    authToken: accessToken,
                    body: JSON.stringify({
                      our_goals: our,
                      opponent_goals: opp,
                      result: our != null && opp != null ? `${our}-${opp}` : null,
                    }),
                  })
                  setMatch(updated)
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
                } finally {
                  setSavingResult(false)
                }
              }}
            >
              {savingResult ? 'Guardando…' : 'Guardar resultado'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Convocatoria: todos los jugadores están convocados, confirman si asisten */}
      {canManage ? (
        <div className="sf-card rounded-xl border border-slate-200 p-4 dark:border-slate-600">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Todos los jugadores de la serie están convocados. Crean o actualizan la convocatoria para generar el link y que confirmen si asisten.
          </p>
          <button
            className="mt-3 sf-btn sf-btn-primary"
            disabled={saving || players.length === 0}
            onClick={async () => {
              if (!accessToken || !matchId) return
              setSaving(true)
              setError(null)
              try {
                const allPlayerIds = players.map((p) => p.id)
                const c = await apiFetch<Convocation>(`/api/matches/${matchId}/convocation`, {
                  method: 'POST',
                  authToken: accessToken,
                  body: JSON.stringify({ invited_player_ids: allPlayerIds }),
                })
                setConv(c)
                const st = await apiFetch<ConvStatus>(`/api/convocations/${c.id}/status`, { authToken: accessToken })
                setStatus(st)
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : ERROR_MENSAJE_ES)
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving ? 'Guardando…' : conv ? 'Actualizar convocatoria' : 'Crear convocatoria'}
          </button>
        </div>
      ) : null}

      {/* Link corto de convocatoria */}
      {conv ? (
        <div className="sf-card rounded-xl border border-slate-200 p-4 dark:border-slate-600">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Link corto de confirmación</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Compartí este link para que confirmen asistencia (copia o envialo por WhatsApp).</p>
          <a
            href={publicLink ?? '#'}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block break-all rounded-md bg-slate-50 px-3 py-2 font-mono text-sm text-primary underline decoration-primary/60 hover:decoration-primary dark:bg-slate-800 dark:text-primary"
          >
            {publicLink}
          </a>
        </div>
      ) : null}

      {/* Lista de todos los jugadores con su estado de confirmación */}
      <div className="sf-card rounded-xl border border-slate-200 p-4 dark:border-slate-600">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Confirmaciones{series ? ` · ${series.name}` : ''}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Lista completa de jugadores de la serie. Indican si asisten o no.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-700 dark:bg-emerald-900/20">
            <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Asisten ({groupedByStatus.confirmed.length})</h3>
            <ul className="mt-2 space-y-1.5">
              {groupedByStatus.confirmed.length === 0 ? (
                <li className="text-sm text-slate-500 dark:text-slate-400">Ninguno</li>
              ) : (
                groupedByStatus.confirmed.map((p) => (
                  <li key={p.id} className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {p.first_name} {p.last_name}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">Pendientes ({groupedByStatus.pending.length})</h3>
            <ul className="mt-2 space-y-1.5">
              {groupedByStatus.pending.length === 0 ? (
                <li className="text-sm text-slate-500 dark:text-slate-400">Ninguno</li>
              ) : (
                groupedByStatus.pending.map((p) => (
                  <li key={p.id} className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {p.first_name} {p.last_name}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-700 dark:bg-rose-900/20">
            <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-200">No pueden ({groupedByStatus.declined.length})</h3>
            <ul className="mt-2 space-y-1.5">
              {groupedByStatus.declined.length === 0 ? (
                <li className="text-sm text-slate-500 dark:text-slate-400">Ninguno</li>
              ) : (
                groupedByStatus.declined.map((p) => (
                  <li key={p.id} className="block">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.first_name} {p.last_name}</span>
                    {p.comment ? <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{p.comment}</p> : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

