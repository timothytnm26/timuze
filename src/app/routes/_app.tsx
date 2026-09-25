import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/shared/api'
import { AppShell } from '@/widgets/app-shell'

/** Pathless layout – guards every authenticated page. */
export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    if (!isAuthenticated()) throw redirect({ to: '/' })
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})
