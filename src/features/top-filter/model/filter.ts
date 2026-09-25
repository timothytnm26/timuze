import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { artistQueries, genreIndex } from '@/entities/artist'
import type { TimeRange } from '@/shared/api'

/** `?genre=` / `?country=` – any non-empty string, the widgets decide what matches. */
export const parseFilter = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined)

export const validateGenreSearch = (search: Record<string, unknown>): { genre?: string } => ({
  genre: parseFilter(search.genre),
})

export const validateCountrySearch = (search: Record<string, unknown>): { country?: string } => ({
  country: parseFilter(search.country),
})

/** How many items carry each value, most common first. */
export const countValues = (tagged: Iterable<string>[]) => {
  const counts = new Map<string, number>()
  tagged.forEach((values) => {
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  })
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

/**
 * Genres per artist id for tagging tracks/albums, from the top 99 artists of the same range
 * (the only genre source Spotify gives us). Artists outside that list stay untagged.
 */
export function useGenreIndex(range: TimeRange, enabled: boolean) {
  const q = useQuery({ ...artistQueries.top(range, 99), enabled })
  const index = useMemo(() => genreIndex(q.data ?? []), [q.data])
  return { index, isPending: enabled && q.isPending }
}
