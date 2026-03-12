/* eslint-disable react-refresh/only-export-components -- router y RequireAuth en el mismo archivo por conveniencia */
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { useAuth } from './auth'
import { DashboardPage } from '../pages/Dashboard'
import { LoginPage } from '../pages/Login'
import { SeriesPage } from '../pages/Series'
import { PublicConfirmPage } from '../pages/PublicConfirm'
import { TournamentsPage } from '../pages/Tournaments'
import { PlayersPage } from '../pages/Players'
import { MatchesPage } from '../pages/Matches'
import { MatchDetailPage } from '../pages/MatchDetail'
import { RivalsPage } from '../pages/Rivals'
import { AdminUsersPage } from '../pages/AdminUsers'
import { AdminAuditPage } from '../pages/AdminAudit'
import { AdminBrandingPage } from '../pages/AdminBranding'
import { TreasuryPage } from '../pages/Treasury'

function RequireAuth(props: { children: React.ReactNode }) {
  const { me, ready } = useAuth()
  if (!ready) return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-900">
      <div className="sf-loading-spinner" role="status" aria-label="Cargando" />
    </div>
  )
  if (!me) return <Navigate to="/login" replace />
  return <>{props.children}</>
}

export const router = createBrowserRouter([
  {
    path: '/c/:publicLinkId',
    element: <PublicConfirmPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'series', element: <SeriesPage /> },
      { path: 'tournaments', element: <TournamentsPage /> },
      { path: 'players', element: <PlayersPage /> },
      { path: 'rivals', element: <RivalsPage /> },
      { path: 'matches', element: <MatchesPage /> },
      { path: 'matches/:matchId', element: <MatchDetailPage /> },
      { path: 'treasury', element: <TreasuryPage /> },
      { path: 'admin/users', element: <AdminUsersPage /> },
      { path: 'admin/audit', element: <AdminAuditPage /> },
      { path: 'admin/branding', element: <AdminBrandingPage /> },
    ],
  },
])

