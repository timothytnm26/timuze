/** Normalised play record from a Spotify privacy-data export. */
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
}

export interface StreamHistory {
  importedAt: number
  files: string[]
  streams: Stream[]
}
