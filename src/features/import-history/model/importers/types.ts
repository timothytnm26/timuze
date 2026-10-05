import type { Stream, StreamSource } from '@/entities/stream-history'

export interface Importer {
  source: Exclude<StreamSource, 'lastfm'>
  /** `accept` attribute of the file picker */
  accept: string
  read(files: File[]): Promise<{ streams: Stream[]; files: string[]; account?: string }>
}
