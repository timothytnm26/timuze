import type { Stream } from '@/entities/stream-history'
import { parseCsv } from './csv'
import { collectTextFiles } from './files'
import type { Importer } from './types'

const pick = (row: Record<string, string>, keys: string[]) => {
  for (const k of keys) if (row[k]) return row[k]
  return ''
}

/** "Date Played" is YYYYMMDD in the daily-tracks file. */
const parseTs = (v: string) => {
  if (/^\d{8}$/.test(v)) return Date.parse(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T12:00:00Z`)
  return Date.parse(v)
}

const parseRows = (csv: string): Stream[] => {
  const out: Stream[] = []
  for (const r of parseCsv(csv)) {
    const ts = parseTs(pick(r, ['event end timestamp', 'event start timestamp', 'date played']))
    const ms = Number(pick(r, ['play duration milliseconds']))
    let track = pick(r, ['song name', 'title'])
    let artist = pick(r, ['artist name'])
    if (!track) {
      // daily-tracks file only has "Artist - Song"
      const desc = pick(r, ['track description'])
      const i = desc.indexOf(' - ')
      if (i > 0) {
        artist = desc.slice(0, i)
        track = desc.slice(i + 3)
      }
    }
    if (!track || !artist || Number.isNaN(ts) || !(ms > 0)) continue
    out.push({
      ts,
      ms,
      track,
      artist,
      album: pick(r, ['album name']) || null,
      uri: null,
      platform: null,
      skipped: false,
      source: 'apple',
    })
  }
  return out
}

const isPlayFile = (n: string) => /play.*(activity|history|tracks).*\.csv$/i.test(n.split('/').pop() ?? '')

export const appleImporter: Importer = {
  source: 'apple',
  accept: '.csv,.zip,text/csv,application/zip',
  async read(files) {
    const found = await collectTextFiles(files, isPlayFile)
    const streams: Stream[] = []
    const used: string[] = []
    for (const f of found) {
      const rows = parseRows(f.text)
      if (rows.length) {
        streams.push(...rows)
        used.push(f.name)
      }
    }
    return { streams: streams.sort((a, b) => a.ts - b.ts), files: used }
  },
}
