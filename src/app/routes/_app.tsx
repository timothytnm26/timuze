import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/shared/api'
import { playStore } from '@/entities/stream-history'
import { AppShell } from '@/widgets/app-shell'

/**
 * Pathless layout – guards every app page. Signed in with Spotify, or not: without a login
 * the pages are built from imported history, so they need some – otherwise go import it first.
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ location }) => {
    if (isAuthenticated()) return
    if (location.pathname.replace(/\/$/, '').endsWith('/history')) return
    if (!(await playStore.getHistory())) throw redirect({ to: '/history' })
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})
