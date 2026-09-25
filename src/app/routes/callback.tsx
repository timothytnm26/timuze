import { createFileRoute } from '@tanstack/react-router'
import { CallbackPage } from '@/pages/callback'

type CallbackSearch = { code?: string; state?: string; error?: string }

export const Route = createFileRoute('/callback')({
  validateSearch: (s: Record<string, unknown>): CallbackSearch => ({
    code: typeof s.code === 'string' ? s.code : undefined,
    state: typeof s.state === 'string' ? s.state : undefined,
    error: typeof s.error === 'string' ? s.error : undefined,
  }),
  component: function Callback() {
    const search = Route.useSearch()
    return <CallbackPage {...search} />
  },
})
