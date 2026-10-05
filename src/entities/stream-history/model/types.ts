/** Where a play record came from. Last.fm has no per-play source, so it is its own bucket. */
export type StreamSource = 'spotify' | 'youtube' | 'apple' | 'lastfm'

/** Normalised play record from a privacy-data export. */
export interface Stream {
  /** epoch ms (end of playback) */
  ts: number
  ms: number
  track: string
  artist: string
  album: string | null
  uri: string | null
  platform: string | null
  skipped: boolean
  /** Missing on records stored before multi-source imports – treat as `spotify`. */
  source?: StreamSource
  /** Last.fm cover file name (`<hash>.png`); expand with `lastfmCoverUrl`. */
  cover?: string
  /** `ms` is a guess (the export has no play duration), not a measured value. */
  estimated?: boolean
}

/** One import action (one export, possibly several files) – the unit users can delete. */
export interface ImportRecord {
  id: string
  source: StreamSource
  importedAt: number
  files: string[]
  /** Account name found in the export itself (Spotify's `username`), when there is one. */
  account?: string
  streams: Stream[]
}

export type ImportSummary = Omit<ImportRecord, 'streams'> & { count: number }

/** All imports merged into one chronological list – what the dashboard reads. */
export interface StreamHistory {
  importedAt: number
  files: string[]
  streams: Stream[]
  imports: ImportSummary[]
  /** Plays seen by two sources that were merged into one. */
  duplicates: number
  /** Each source's own plays, before cross-source merging – for looking at one source alone. */
  bySource: Partial<Record<StreamSource, Stream[]>>
}
