import { createFileRoute } from '@tanstack/react-router'
import type { StreamSource } from '@/entities/stream-history'
import { HistoryPage } from '@/pages/history'

const SOURCES: StreamSource[] = ['spotify', 'youtube', 'apple', 'lastfm']

export const Route = createFileRoute('/_app/history')({
  // ?source=lastfm&user=name – lets the landing page open the import screen already filled in
  validateSearch: (search: Record<string, unknown>): { source?: StreamSource; user?: string } => ({
    ...(SOURCES.includes(search.source as StreamSource) && { source: search.source as StreamSource }),
    ...(typeof search.user === 'string' && search.user.trim() && { user: search.user.trim() }),
  }),
  component: function History() {
    const { source, user } = Route.useSearch()
    return <HistoryPage initialSource={source} initialUsername={user} />
  },
})
