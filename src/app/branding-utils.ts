import { API_BASE } from './api'

export type Branding = {
  logo_file_id: string | null
  logo_url: string | null
  primary_color: string
  app_name: string
}

export function getBrandingLogoUrl(branding: Branding | null): string {
  if (!branding) return '/logo.png'
  if (branding.logo_file_id)
    return `${API_BASE}/api/settings/logo?v=${encodeURIComponent(branding.logo_file_id)}`
  if (branding.logo_url?.trim()) return branding.logo_url.trim()
  return '/logo.png'
}
