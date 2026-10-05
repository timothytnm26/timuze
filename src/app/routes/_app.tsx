import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/shared/api'
import { AppShell } from '@/widgets/app-shell'

/** Pathless layout – guards every authenticated page. */
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ location }) => {
    // Streams only needs the user's own export files, so it works without a Spotify login
    const guestOk = location.pathname.replace(/\/$/, '').endsWith('/history')
    if (!isAuthenticated() && !guestOk) throw redirect({ to: '/' })
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})
