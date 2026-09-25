import { spotifyGet, type Params } from './client'
import type { Paging } from './types'

/**
 * Spotify caps `limit` at 50 and some endpoints (e.g. /me/top) cap `offset` at 49,
 * so up to 99 items are read as two pages: offset 0 + offset 49 (first item dropped).
 */
export const fetchUpTo99 = async <T,>(path: string, params: Params, count: number) => {
  const page = (limit: number, offset: number) => spotifyGet<Paging<T>>(path, { ...params, limit, offset })

  const first = await page(Math.min(50, count), 0)
  if (count <= 50 || !first.next) return first.items
  const second = await page(Math.min(50, count - 49), 49)
  return [...first.items, ...second.items.slice(1)]
}
