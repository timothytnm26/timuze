import { fetchUpTo99, type TimeRange } from '@/shared/api'
import type { Artist } from '../model/types'

export const getTopArtists = (range: TimeRange, count: number) =>
  fetchUpTo99<Artist>('/me/top/artists', { time_range: range }, count)
