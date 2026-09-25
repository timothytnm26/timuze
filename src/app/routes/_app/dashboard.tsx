import { createFileRoute } from '@tanstack/react-router'
import { parseTimeRange, validateTimeRangeSearch } from '@/features/time-range'
import { artistQueries } from '@/entities/artist'
import { trackQueries } from '@/entities/track'
import { userQueries } from '@/entities/user'
import { DashboardPage } from '@/pages/dashboard'

export const Route = createFileRoute('/_app/dashboard')({
  validateSearch: validateTimeRangeSearch,
  loaderDeps: ({ search }) => ({ range: parseTimeRange(search.range) }),
  loader: ({ context: { queryClient: qc }, deps: { range } }) => {
    // fire-and-forget prefetch: widgets render skeletons while these resolve
    void qc.prefetchQuery(userQueries.me())
    void qc.prefetchQuery(artistQueries.top(range, 50))
    void qc.prefetchQuery(trackQueries.top(range, 50))
    void qc.prefetchQuery(trackQueries.recent())
  },
  component: function Dashboard() {
    const range = parseTimeRange(Route.useSearch().range)
    const navigate = Route.useNavigate()
    return <DashboardPage range={range} onRangeChange={(r) => void navigate({ search: { range: r } })} />
  },
})
