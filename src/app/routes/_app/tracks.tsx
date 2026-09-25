import { createFileRoute } from '@tanstack/react-router'
import { parseTimeRange, validateTimeRangeSearch } from '@/features/time-range'
import { validateGenreSearch } from '@/features/top-filter'
import { trackQueries } from '@/entities/track'
import { TopTracksPage } from '@/pages/top-tracks'

export const Route = createFileRoute('/_app/tracks')({
  validateSearch: (search: Record<string, unknown>) => ({ ...validateTimeRangeSearch(search), ...validateGenreSearch(search) }),
  loaderDeps: ({ search }) => ({ range: parseTimeRange(search.range) }),
  loader: ({ context: { queryClient }, deps: { range } }) => void queryClient.prefetchQuery(trackQueries.top(range, 99)),
  component: function Page() {
    const search = Route.useSearch()
    const range = parseTimeRange(search.range)
    const navigate = Route.useNavigate()
    return (
      <TopTracksPage
        range={range}
        onRangeChange={(r) => void navigate({ search: (prev) => ({ ...prev, range: r }) })}
        genre={search.genre ?? null}
        onGenreChange={(v) => void navigate({ search: (prev) => ({ ...prev, genre: v ?? undefined }), replace: true })}
      />
    )
  },
})
