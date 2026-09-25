import type { Stream } from './types'

/** A play counts as a "stream" at ≥ 30 s – same threshold Spotify uses for royalties. */
export const STREAM_THRESHOLD_MS = 30_000

export interface RankedEntry {
  key: string
  name: string
  artist?: string
  streams: number
  ms: number
}

export interface HistoryStats {
  totalStreams: number
  totalMs: number
  uniqueTracks: number
  uniqueArtists: number
  firstTs: number
  lastTs: number
  topArtists: RankedEntry[]
  topTracks: RankedEntry[]
  topAlbums: RankedEntry[]
  byMonth: { key: string; year: number; month: number; ms: number; streams: number }[]
  heat: number[][]
  byPlatform: { platform: string; ms: number }[]
  skipRate: number
  topDay: { date: string; ms: number } | null
  longestStreakDays: number
}

const rank = (map: Map<string, RankedEntry>, top: number) =>
  [...map.values()].sort((a, b) => b.streams - a.streams || b.ms - a.ms).slice(0, top)

export const availableYears = (streams: Stream[]) =>
  [...new Set(streams.map((s) => new Date(s.ts).getFullYear()))].sort((a, b) => b - a)

export const computeHistoryStats = (all: Stream[], year?: number, top = 100): HistoryStats => {
  const streams = year ? all.filter((s) => new Date(s.ts).getFullYear() === year) : all

  const artists = new Map<string, RankedEntry>()
  const tracks = new Map<string, RankedEntry>()
  const albums = new Map<string, RankedEntry>()
  const months = new Map<string, HistoryStats['byMonth'][number]>()
  const platforms = new Map<string, number>()
  const days = new Map<string, number>()
  const heat = Array.from({ length: 7 }, () => Array<number>(24).fill(0))

  let totalMs = 0
  let totalStreams = 0
  let skipped = 0

  for (const s of streams) {
    totalMs += s.ms
    const d = new Date(s.ts)
    const counted = s.ms >= STREAM_THRESHOLD_MS
    if (counted) totalStreams++
    if (s.skipped) skipped++

    const bump = (map: Map<string, RankedEntry>, key: string, name: string, artist?: string) => {
      const e = map.get(key) ?? { key, name, artist, streams: 0, ms: 0 }
      e.ms += s.ms
      if (counted) e.streams++
      map.set(key, e)
    }
    bump(artists, s.artist, s.artist)
    bump(tracks, s.uri ?? `${s.track}|${s.artist}`, s.track, s.artist)
    if (s.album) bump(albums, `${s.album}|${s.artist}`, s.album, s.artist)

    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const m = months.get(mk) ?? { key: mk, year: d.getFullYear(), month: d.getMonth(), ms: 0, streams: 0 }
    m.ms += s.ms
    if (counted) m.streams++
    months.set(mk, m)

    const row = heat[d.getDay()]
    if (row) row[d.getHours()] = (row[d.getHours()] ?? 0) + s.ms

    if (s.platform) platforms.set(s.platform, (platforms.get(s.platform) ?? 0) + s.ms)
    const dk = d.toISOString().slice(0, 10)
    days.set(dk, (days.get(dk) ?? 0) + s.ms)
  }

  // longest streak of consecutive days with any listening
  const sortedDays = [...days.keys()].sort()
  let longest = 0
  let run = 0
  let prev = 0
  for (const dk of sortedDays) {
    const t = Date.parse(dk)
    run = prev && t - prev === 86_400_000 ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = t
  }
  const topDayEntry = [...days.entries()].sort((a, b) => b[1] - a[1])[0]

  return {
    totalStreams,
    totalMs,
    uniqueTracks: tracks.size,
    uniqueArtists: artists.size,
    firstTs: streams[0]?.ts ?? 0,
    lastTs: streams.at(-1)?.ts ?? 0,
    topArtists: rank(artists, top),
    topTracks: rank(tracks, top),
    topAlbums: rank(albums, top),
    byMonth: [...months.values()].sort((a, b) => a.key.localeCompare(b.key)),
    heat,
    byPlatform: [...platforms.entries()].map(([platform, ms]) => ({ platform, ms })).sort((a, b) => b.ms - a.ms),
    skipRate: streams.length ? skipped / streams.length : 0,
    topDay: topDayEntry ? { date: topDayEntry[0], ms: topDayEntry[1] } : null,
    longestStreakDays: longest,
  }
}
