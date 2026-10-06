import { createFileRoute } from '@tanstack/react-router'
import { parseTimeRange, validateTimeRangeSearch } from '@/features/time-range'
import type { GameMode } from '@/features/game-2048'
import { artistQueries } from '@/entities/artist'
import { trackQueries } from '@/entities/track'
import { Game2048Page } from '@/pages/game-2048'

export const Route = createFileRoute('/_app/play/2048')({
  validateSearch: (search: Record<string, unknown>): { range?: ReturnType<typeof parseTimeRange>; mode?: GameMode } => ({
    ...validateTimeRangeSearch(search),
    ...(search.mode === 'artists' && { mode: 'artists' as const }),
  }),
  loaderDeps: ({ search }) => ({ range: parseTimeRange(search.range), mode: search.mode ?? 'albums' }),
  loader: ({ context: { queryClient: qc }, deps: { range, mode } }) => {
    void (mode === 'artists' ? qc.prefetchQuery(artistQueries.top(range, 50)) : qc.prefetchQuery(trackQueries.top(range, 99)))
  },
  component: function Game() {
    const search = Route.useSearch()
    const navigate = Route.useNavigate()
    return (
      <Game2048Page
        mode={search.mode ?? 'albums'}
        onModeChange={(m) => void navigate({ search: (prev) => ({ ...prev, mode: m === 'artists' ? m : undefined }), replace: true })}
        range={parseTimeRange(search.range)}
        onRangeChange={(r) => void navigate({ search: (prev) => ({ ...prev, range: r }) })}
      />
    )
  },
})
