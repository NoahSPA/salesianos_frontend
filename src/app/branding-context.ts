import { createContext } from 'react'
import type { Branding } from './branding-utils'

export type BrandingContextValue = {
  branding: Branding | null
  loading: boolean
  logoUrl: string
  appName: string
  refresh: () => Promise<void>
}

export const BrandingContext = createContext<BrandingContextValue | null>(null)
