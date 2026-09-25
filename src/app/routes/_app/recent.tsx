import { createFileRoute } from '@tanstack/react-router'
import { trackQueries } from '@/entities/track'
import { RecentPage } from '@/pages/recent'

export const Route = createFileRoute('/_app/recent')({
  loader: ({ context: { queryClient } }) => void queryClient.prefetchQuery(trackQueries.recent()),
  component: RecentPage,
})
