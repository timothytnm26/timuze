import type { Stream, StreamSource } from './types'

/** Two records of the same song that start within this window are one play. */
const WINDOW_MS = 90_000

/** Better data wins: measured play length, album and URI beat guessed ones. */
const PRIORITY: Record<StreamSource, number> = { spotify: 0, apple: 1, youtube: 2, lastfm: 3 }

/** Lower-case, no accents, no "(feat. …)" / "[Remastered]" / "- 2011 Remaster" noise, letters and digits only. */
export const normalizeName = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[([].*?[)\]]/g, ' ')
    .replace(/\s-\s.*(remaster|version|edit|mix|live).*$/, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '')

/** "A" vs "A, B" (album artist vs credited artists) still match. */
const sameArtist = (a: string, b: string) => a === b || (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a)))

/** Exports record the *end* of a play; Last.fm and Takeout record the start. */
const startOf = (s: Stream) => (s.estimated ? s.ts : s.ts - s.ms)

const source = (s: Stream): StreamSource => s.source ?? 'spotify'

/**
 * Collapses the same play seen by two different sources (e.g. the Spotify export and Last.fm
 * scrobbles of Spotify). Plays inside one source are left alone – replaying a song is real.
 * Runs at read time, so deleting an import brings the other source's plays back.
 */
export function dedupeAcrossSources(streams: Stream[]): { streams: Stream[]; removed: number } {
  const byQuality = [...streams].sort(
    (a, b) => Number(Boolean(a.estimated)) - Number(Boolean(b.estimated)) || PRIORITY[source(a)] - PRIORITY[source(b)],
  )
  const kept = new Map<string, { s: Stream; start: number; artist: string }[]>()
  const out: Stream[] = []

  for (const s of byQuality) {
    const key = normalizeName(s.track)
    const start = startOf(s)
    const artist = normalizeName(s.artist)
    const bucket = kept.get(key) ?? []
    const dup = bucket.some(
      (k) => source(k.s) !== source(s) && Math.abs(k.start - start) <= WINDOW_MS && sameArtist(k.artist, artist),
    )
    if (dup) {
      // keep the better record but not lose the cover only the dropped one had
      const winner = bucket.find((k) => source(k.s) !== source(s) && Math.abs(k.start - start) <= WINDOW_MS && sameArtist(k.artist, artist))
      // the records are the store's private copies, so mutating the survivor is safe
      if (winner && !winner.s.cover && s.cover) winner.s.cover = s.cover
      continue
    }
    bucket.push({ s, start, artist })
    kept.set(key, bucket)
    out.push(s)
  }
  return { streams: out.sort((a, b) => a.ts - b.ts), removed: streams.length - out.length }
}
