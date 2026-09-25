import { createFileRoute } from '@tanstack/react-router'
import { albumQueries } from '@/entities/album'
import { trackQueries } from '@/entities/track'
import { RankPage } from '@/pages/rank'

export const Route = createFileRoute('/_app/rank')({
  validateSearch: (search: Record<string, unknown>): { album?: string } =>
    typeof search.album === 'string' && search.album ? { album: search.album } : {},
  loaderDeps: ({ search }) => ({ album: search.album }),
  loader: ({ context: { queryClient: qc }, deps: { album } }) => {
    void (album ? qc.prefetchQuery(albumQueries.detail(album)) : qc.prefetchQuery(trackQueries.recent()))
  },
  component: function Rank() {
    const { album } = Route.useSearch()
    const navigate = Route.useNavigate()
    return <RankPage albumId={album} onAlbumChange={(id) => void navigate({ search: id ? { album: id } : {} })} />
  },
})
