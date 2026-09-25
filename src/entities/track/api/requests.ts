import { fetchUpTo99, spotifyGet, type CursorPaging, type TimeRange } from '@/shared/api'
import type { CurrentlyPlaying, PlayHistory, Track } from '../model/types'

export const getTopTracks = (range: TimeRange, count: number) =>
  fetchUpTo99<Track>('/me/top/tracks', { time_range: range }, count)

/** Spotify only exposes the last 50 plays. */
export const getRecentlyPlayed = (limit = 50) =>
  spotifyGet<CursorPaging<PlayHistory>>('/me/player/recently-played', { limit })

/** `null` (HTTP 204) when nothing is playing. */
export const getCurrentlyPlaying = () =>
  spotifyGet<CurrentlyPlaying | null>('/me/player/currently-playing')
