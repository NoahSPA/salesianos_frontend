import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch } from './api'

export type Role = 'admin' | 'delegado' | 'tesorero' | 'jugador'

export type Me = {
  id: string
  username: string
  role: Role
  active: boolean
}

type AuthState = {
  me: Me | null
  accessToken: string | null
  ready: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthCtx = createContext<AuthState | null>(null)

export function AuthProvider(props: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [ready, setReady] = useState(false)

  async function login(username: string, password: string) {
    const tok = await apiFetch<{ access_token: string } & { expires_in_seconds: number }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) },
    )
    setAccessToken(tok.access_token)
    const meData = await apiFetch<Me>('/api/auth/me', { authToken: tok.access_token })
    setMe(meData)
  }

  async function refresh() {
    const tok = await apiFetch<{ access_token: string } & { expires_in_seconds: number }>(
      '/api/auth/refresh',
      { method: 'POST' },
    )
    setAccessToken(tok.access_token)
    const meData = await apiFetch<Me>('/api/auth/me', { authToken: tok.access_token })
    setMe(meData)
  }

  async function logout() {
    try {
      await apiFetch<void>('/api/auth/logout', { method: 'POST' })
    } finally {
      setAccessToken(null)
      setMe(null)
    }
  }

  useEffect(() => {
    // Boot silencioso: si hay refresh cookie, rehidrata sesión
    refresh()
      .catch(() => {
        // No autenticado o sin cookie → ok
      })
      .finally(() => setReady(true))
  }, [])

  const value = useMemo<AuthState>(
    () => ({ me, accessToken, ready, login, logout, refresh }),
    [me, accessToken, ready],
  )

  return <AuthCtx.Provider value={value}>{props.children}</AuthCtx.Provider>
}

// Hook compartido con el provider en el mismo archivo (patrón contexto)
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('AuthProvider missing')
  return ctx
}

