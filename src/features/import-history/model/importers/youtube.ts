import type { Stream } from '@/entities/stream-history'
import { collectTextFiles } from './files'
import type { Importer } from './types'

/** Takeout has no play duration, so each entry counts as one play of an average-length song. */
const ASSUMED_MS = 3 * 60_000

interface TakeoutRow {
  header?: string
  title?: string
  titleUrl?: string
  subtitles?: { name?: string }[]
  time?: string
}

/** Takeout prefixes titles with a localised "Watched" – strip the ones we know. */
const WATCHED = /^(Watched|Đã xem|Visto|Gesehen|Vu|Просмотрено)\s+/i

const parseRows = (json: unknown): Stream[] => {
  if (!Array.isArray(json)) return []
  const out: Stream[] = []
  for (const r of json as TakeoutRow[]) {
    // `header` is the product name and is not localised – it separates YouTube Music from plain YouTube
    if (r?.header !== 'YouTube Music' || !r.title || !r.time) continue
    const artist = r.subtitles?.[0]?.name?.replace(/\s+-\s+Topic$/i, '')
    const ts = Date.parse(r.time)
    // no channel = the video was deleted or is private, so there is no artist to attribute it to
    if (!artist || Number.isNaN(ts)) continue
    out.push({
      ts,
      ms: ASSUMED_MS,
      track: r.title.replace(WATCHED, ''),
      artist,
      album: null,
      uri: r.titleUrl ?? null,
      platform: null,
      skipped: false,
      source: 'youtube',
      estimated: true,
    })
  }
  return out
}

export const youtubeImporter: Importer = {
  source: 'youtube',
  accept: '.json,.zip,application/json,application/zip',
  async read(files) {
    // folder and file names are translated in Takeout, so match on location and sniff the content instead
    const found = await collectTextFiles(files, (n) => /\.json$/i.test(n))
    const streams: Stream[] = []
    const used: string[] = []
    for (const f of found) {
      let rows: Stream[]
      try {
        rows = parseRows(JSON.parse(f.text))
      } catch {
        continue
      }
      if (rows.length) {
        streams.push(...rows)
        used.push(f.name)
      }
    }
    return { streams: streams.sort((a, b) => a.ts - b.ts), files: used }
  },
}
