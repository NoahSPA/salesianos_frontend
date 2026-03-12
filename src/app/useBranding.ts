import { useContext } from 'react'
import { BrandingContext } from './branding-context'

export function useBranding() {
  const ctx = useContext(BrandingContext)
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider')
  return ctx
}
