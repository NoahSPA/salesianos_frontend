import { useCallback, useEffect, useMemo, useState } from 'react'
import { API_BASE, apiFetch } from './api'
import { BrandingContext } from './branding-context'
import type { Branding } from './branding-utils'
import { getBrandingLogoUrl } from './branding-utils'

const DEFAULT_PRIMARY = '#006600'

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.match(/^#?([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/)
  if (!m) return null
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

function derivePrimaryVars(hex: string): Record<string, string> {
  const rgb = hexToRgb(hex)
  if (!rgb) return {}
  const { r, g, b } = rgb
  const darker = {
    r: Math.max(0, Math.floor(r * 0.85)),
    g: Math.max(0, Math.floor(g * 0.85)),
    b: Math.max(0, Math.floor(b * 0.85)),
  }
  return {
    '--color-primary': hex,
    '--color-primary-hover': `rgb(${darker.r}, ${darker.g}, ${darker.b})`,
    '--color-primary-light': `rgba(${r}, ${g}, ${b}, 0.14)`,
    '--color-primary-focus': `rgba(${r}, ${g}, ${b}, 0.4)`,
  }
}

const DEFAULT_APP_NAME = 'Salesianos FC'

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<Branding>('/api/settings/branding')
      setBranding(data)
      const hex = data?.primary_color || DEFAULT_PRIMARY
      const vars = derivePrimaryVars(hex)
      const root = document.documentElement
      Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
    } catch {
      setBranding(null)
      const root = document.documentElement
      ;['--color-primary', '--color-primary-hover', '--color-primary-light', '--color-primary-focus'].forEach((k) =>
        root.style.removeProperty(k)
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const fileId = branding?.logo_file_id
    const base = API_BASE?.startsWith('http')
      ? API_BASE.replace(/\/$/, '')
      : (typeof window !== 'undefined' ? window.location.origin : '') + ((API_BASE || '').replace(/\/$/, '') || '')

    if (fileId && base) {
      const favicon32 = `${base}/api/settings/favicon?size=32&v=${encodeURIComponent(fileId)}`
      const favicon16 = `${base}/api/settings/favicon?size=16&v=${encodeURIComponent(fileId)}`
      const ogImageUrl = `${base}/api/settings/og-image?v=${encodeURIComponent(fileId)}`
      const apple180 = `${base}/api/settings/app-icon?size=180&v=${encodeURIComponent(fileId)}`

      const existing32 = document.querySelector('link[rel="icon"][data-dynamic-favicon="32"]')
      const existing16 = document.querySelector('link[rel="icon"][data-dynamic-favicon="16"]')
      if (existing32) existing32.setAttribute('href', favicon32)
      else {
        const link32 = document.createElement('link')
        link32.rel = 'icon'
        link32.type = 'image/png'
        link32.sizes = '32x32'
        link32.href = favicon32
        link32.setAttribute('data-dynamic-favicon', '32')
        document.head.appendChild(link32)
      }
      if (existing16) existing16.setAttribute('href', favicon16)
      else {
        const link16 = document.createElement('link')
        link16.rel = 'icon'
        link16.type = 'image/png'
        link16.sizes = '16x16'
        link16.href = favicon16
        link16.setAttribute('data-dynamic-favicon', '16')
        document.head.appendChild(link16)
      }

      const existingApple = document.querySelector(
        'link[rel="apple-touch-icon"][data-dynamic-app-icon="1"]'
      ) as HTMLLinkElement | null
      if (existingApple) existingApple.href = apple180
      else {
        const linkApple = document.createElement('link')
        linkApple.rel = 'apple-touch-icon'
        linkApple.sizes = '180x180'
        linkApple.href = apple180
        linkApple.setAttribute('data-dynamic-app-icon', '1')
        document.head.appendChild(linkApple)
      }

      const manifestHref = `${base}/api/settings/manifest.webmanifest?v=${encodeURIComponent(fileId)}`
      const existingManifest = document.querySelector(
        'link[rel="manifest"][data-dynamic-manifest="1"]'
      ) as HTMLLinkElement | null
      if (existingManifest) existingManifest.href = manifestHref
      else {
        const linkManifest = document.createElement('link')
        linkManifest.rel = 'manifest'
        linkManifest.href = manifestHref
        linkManifest.setAttribute('data-dynamic-manifest', '1')
        document.head.appendChild(linkManifest)
      }

      let metaOg = document.querySelector('meta[property="og:image"]')
      if (!metaOg) {
        metaOg = document.createElement('meta')
        metaOg.setAttribute('property', 'og:image')
        document.head.appendChild(metaOg)
      }
      metaOg.setAttribute('content', ogImageUrl)

      let metaTw = document.querySelector('meta[name="twitter:image"]')
      if (!metaTw) {
        metaTw = document.createElement('meta')
        metaTw.setAttribute('name', 'twitter:image')
        document.head.appendChild(metaTw)
      }
      metaTw.setAttribute('content', ogImageUrl)
    } else {
      document.querySelectorAll('link[data-dynamic-favicon]').forEach((el) => el.remove())
      const apple = document.querySelector('link[rel="apple-touch-icon"][data-dynamic-app-icon="1"]')
      if (apple) apple.remove()
      const manifestDynamic = document.querySelector('link[rel="manifest"][data-dynamic-manifest="1"]')
      if (manifestDynamic) manifestDynamic.remove()
      const metaOg = document.querySelector('meta[property="og:image"]')
      const metaTw = document.querySelector('meta[name="twitter:image"]')
      if (metaOg?.getAttribute('content')?.includes('/api/settings/og-image')) metaOg.remove()
      if (metaTw?.getAttribute('content')?.includes('/api/settings/og-image')) metaTw.remove()
    }
  }, [branding?.logo_file_id])

  const logoUrl = useMemo(() => getBrandingLogoUrl(branding), [branding])
  const appName = branding?.app_name?.trim() || DEFAULT_APP_NAME

  const value = useMemo(
    () => ({ branding, loading, logoUrl, appName, refresh }),
    [branding, loading, logoUrl, appName, refresh]
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}
