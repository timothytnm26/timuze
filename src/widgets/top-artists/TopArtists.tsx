import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { artistQueries, ArtistCard, type Artist } from '@/entities/artist'
import { countValues, CountryFilter, FilterEmpty } from '@/features/top-filter'
import type { TimeRange } from '@/shared/api'
import { Cover, ErrorState, Reveal, Skeleton } from '@/shared/ui'
import { cn } from '@/shared/lib'

function Podium({ artists }: { artists: Artist[] }) {
  // visual order 2 – 1 – 3
  const order = [artists[1], artists[0], artists[2]]
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-6">
      {order.map((a, i) => {
        if (!a) return <div key={i} />
        const rank = [2, 1, 3][i] as number
        return (
          <a
            key={a.id}
            href={a.external_urls.spotify}
            target="_blank"
            rel="noreferrer"
            data-reveal
            className="group flex min-w-0 flex-col items-center gap-2 text-center sm:gap-3"
          >
            {/* phones: smaller art so the badge, name and genre all fit under it */}
            <div className={cn('relative sm:w-full', rank === 1 ? 'w-[86%] max-w-64' : 'w-[74%] max-w-48')}>
              <div
                data-decor
                className={cn(
                  'absolute -inset-2 rounded-full opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-60',
                  rank === 1 ? 'bg-brand' : 'bg-accent',
                )}
                aria-hidden
              />
              <Cover images={a.images} alt={a.name} rounded="full" className="relative w-full ring-2 ring-surface sm:ring-4" />
              <span
                className={cn(
                  'absolute -bottom-1.5 left-1/2 grid -translate-x-1/2 place-items-center rounded-full font-display font-bold text-canvas ring-2 ring-canvas sm:-bottom-2 sm:ring-4',
                  rank === 1 ? 'size-8 bg-brand text-base sm:size-12 sm:text-xl' : 'size-7 bg-ink text-sm sm:size-10 sm:text-base',
                )}
              >
                {rank}
              </span>
            </div>
            <div className="mt-1 w-full min-w-0 sm:mt-2">
              <p className={cn('truncate font-display font-bold', rank === 1 ? 'text-base sm:text-2xl' : 'text-sm sm:text-lg')}>
                {a.name}
              </p>
              <p className="truncate text-[11px] text-ink-muted sm:text-xs">{a.genres?.[0] ?? ''}</p>
            </div>
          </a>
        )
      })}
    </div>
  )
}

export function TopArtists({
  range,
  limit = 50,
  podium = true,
  country = null,
  onCountryChange,
}: {
  range: TimeRange
  limit?: number
  podium?: boolean
  /** ISO 3166-1 alpha-2 country filter – only shown when `onCountryChange` is given. */
  country?: string | null
  onCountryChange?: (c: string | null) => void
}) {
  const q = useQuery(artistQueries.top(range, Math.max(limit, 50)))
  const filterable = !!onCountryChange
  const all = useMemo(() => (q.data ?? []).slice(0, limit), [q.data, limit])
  const countries = useQuery({ ...artistQueries.countries(all.map((a) => a.id)), enabled: filterable && all.length > 0 })

  const options = useMemo(() => {
    const map = countries.data
    return map ? countValues(all.map((a) => (map[a.id] ? [map[a.id]!] : []))) : []
  }, [all, countries.data])

  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />
  if (q.isPending)
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-full" />
        ))}
      </div>
    )

  // until countries arrive the unfiltered list is shown, so the page never blanks out
  const list = country && countries.data ? all.filter((a) => countries.data[a.id] === country) : all
  const rest = podium ? list.slice(3) : list
  return (
    <div className="flex flex-col gap-12">
      {filterable && (
        <CountryFilter
          options={options}
          value={country}
          onChange={onCountryChange}
          isPending={countries.isLoading}
          isError={countries.isError}
        />
      )}
      {list.length === 0 && country ? (
        <FilterEmpty onClear={() => onCountryChange?.(null)} />
      ) : (
        <>
          {podium && (
            <Reveal deps={[range, country]} stagger={0.12} y={40}>
              <Podium artists={list} />
            </Reveal>
          )}
          <Reveal
            deps={[range, country]}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            stagger={0.03}
          >
            {rest.map((a, i) => (
              <ArtistCard key={a.id} artist={a} rank={i + (podium ? 4 : 1)} />
            ))}
          </Reveal>
        </>
      )}
    </div>
  )
}
