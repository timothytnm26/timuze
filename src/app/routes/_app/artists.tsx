import { createFileRoute } from '@tanstack/react-router'
import { parseTimeRange, validateTimeRangeSearch } from '@/features/time-range'
import { validateCountrySearch } from '@/features/top-filter'
import { artistQueries } from '@/entities/artist'
import { TopArtistsPage } from '@/pages/top-artists'

export const Route = createFileRoute('/_app/artists')({
  validateSearch: (search: Record<string, unknown>) => ({ ...validateTimeRangeSearch(search), ...validateCountrySearch(search) }),
  loaderDeps: ({ search }) => ({ range: parseTimeRange(search.range) }),
  loader: ({ context: { queryClient }, deps: { range } }) => void queryClient.prefetchQuery(artistQueries.top(range, 99)),
  component: function Page() {
    const search = Route.useSearch()
    const range = parseTimeRange(search.range)
    const navigate = Route.useNavigate()
    return (
      <TopArtistsPage
        range={range}
        onRangeChange={(r) => void navigate({ search: (prev) => ({ ...prev, range: r }) })}
        country={search.country ?? null}
        onCountryChange={(v) => void navigate({ search: (prev) => ({ ...prev, country: v ?? undefined }), replace: true })}
      />
    )
  },
})
