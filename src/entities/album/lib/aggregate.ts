import type { Track } from '@/entities/track/@x/album'
import type { SimplifiedAlbum } from '../model/types'

export interface TopAlbum {
  album: SimplifiedAlbum
  score: number
  tracks: Track[]
}

/**
 * Spotify has no "top albums" endpoint – derive it from ranked top tracks:
 * each track contributes (N − rank) points to its album.
 */
export const aggregateTopAlbums = (tracks: Track[]): TopAlbum[] => {
  const n = tracks.length
  const map = new Map<string, TopAlbum>()
  tracks.forEach((t, i) => {
    const entry = map.get(t.album.id) ?? { album: t.album, score: 0, tracks: [] }
    entry.score += n - i
    entry.tracks.push(t)
    map.set(t.album.id, entry)
  })
  return [...map.values()].sort((a, b) => b.score - a.score || b.tracks.length - a.tracks.length)
}

/** Release decade distribution of top tracks, e.g. { '2010s': 12, '2020s': 30 } */
export const releaseDecades = (tracks: Track[]) => {
  const counts = new Map<string, number>()
  tracks.forEach((t) => {
    const year = Number(t.album.release_date.slice(0, 4))
    if (!year) return
    const decade = `${Math.floor(year / 10) * 10}s`
    counts.set(decade, (counts.get(decade) ?? 0) + 1)
  })
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))
}
