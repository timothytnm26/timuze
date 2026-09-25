import { i18n } from '@/shared/i18n'
import type { Stream } from './types'

/** "Extended streaming history" export (Streaming_History_Audio_*.json) */
interface ExtendedRow {
  ts: string
  ms_played: number
  platform?: string
  master_metadata_track_name: string | null
  master_metadata_album_artist_name: string | null
  master_metadata_album_album_name: string | null
  spotify_track_uri: string | null
  skipped?: boolean | null
}

/** Basic "Account data" export (StreamingHistory_music_*.json) */
interface BasicRow {
  endTime: string
  artistName: string
  trackName: string
  msPlayed: number
}

const isExtended = (r: unknown): r is ExtendedRow => typeof r === 'object' && r !== null && 'ms_played' in r
const isBasic = (r: unknown): r is BasicRow => typeof r === 'object' && r !== null && 'msPlayed' in r

/**
 * Brand names are kept as-is; generic buckets are stored as language-neutral ids
 * (`cast`, `other`) and translated at display time – see `PLATFORM_IDS`.
 */
const simplifyPlatform = (p?: string) => {
  if (!p) return null
  const s = p.toLowerCase()
  if (s.includes('ios') || s.includes('iphone')) return 'iOS'
  if (s.includes('android')) return 'Android'
  if (s.includes('windows')) return 'Windows'
  if (s.includes('os x') || s.includes('osx') || s.includes('mac')) return 'macOS'
  if (s.includes('linux')) return 'Linux'
  if (s.includes('web') || s.includes('chrome') || s.includes('browser')) return 'Web'
  if (s.includes('cast') || s.includes('tv') || s.includes('speaker') || s.includes('partner')) return 'cast'
  return 'other'
}

/** Language-neutral platform ids, plus the Vietnamese labels older imports stored in IndexedDB. */
export const PLATFORM_IDS: Record<string, 'cast' | 'other'> = { cast: 'cast', other: 'other', 'Loa / TV': 'cast', Khác: 'other' }

/** Parse one export file; podcast / video rows (no track name) are dropped. */
export const parseStreamingFile = (json: unknown): Stream[] => {
  if (!Array.isArray(json)) throw new Error(i18n.t('errors.invalidHistoryFile'))
  const out: Stream[] = []
  for (const r of json) {
    if (isExtended(r)) {
      if (!r.master_metadata_track_name || !r.master_metadata_album_artist_name) continue
      out.push({
        ts: Date.parse(r.ts),
        ms: r.ms_played,
        track: r.master_metadata_track_name,
        artist: r.master_metadata_album_artist_name,
        album: r.master_metadata_album_album_name,
        uri: r.spotify_track_uri,
        platform: simplifyPlatform(r.platform),
        skipped: Boolean(r.skipped),
      })
    } else if (isBasic(r)) {
      out.push({
        // basic export uses "YYYY-MM-DD HH:mm" in UTC
        ts: Date.parse(`${r.endTime.replace(' ', 'T')}Z`),
        ms: r.msPlayed,
        track: r.trackName,
        artist: r.artistName,
        album: null,
        uri: null,
        platform: null,
        skipped: false,
      })
    }
  }
  return out
}

/** Dedupe streams across overlapping files (same ts + track). */
export const mergeStreams = (a: Stream[], b: Stream[]) => {
  const seen = new Set(a.map((s) => `${s.ts}|${s.track}`))
  const merged = [...a]
  for (const s of b) {
    const k = `${s.ts}|${s.track}`
    if (!seen.has(k)) {
      seen.add(k)
      merged.push(s)
    }
  }
  return merged.sort((x, y) => x.ts - y.ts)
}
