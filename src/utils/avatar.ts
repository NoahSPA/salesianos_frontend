/**
 * Devuelve la URL del avatar del jugador.
 * Si tiene avatar_file_id (GridFS), usa el endpoint de la API.
 * Si tiene avatar_url (externo), usa esa URL.
 */
import { API_BASE } from '../app/api'

export type PlayerWithAvatar = {
  id: string
  avatar_file_id?: string | null
  avatar_url?: string | null
}

export function getPlayerAvatarUrl(player: PlayerWithAvatar): string | null {
  if (player.avatar_file_id) {
    return `${API_BASE}/api/players/${player.id}/avatar?v=${encodeURIComponent(player.avatar_file_id)}`
  }
  const url = player.avatar_url?.trim()
  return url || null
}
