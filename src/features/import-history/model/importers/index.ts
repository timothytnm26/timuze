import { i18n } from '@/shared/i18n'
import { mergeStreams, type ImportRecord, type StreamSource } from '@/entities/stream-history'
import { appleImporter } from './apple'
import { spotifyImporter } from './spotify'
import type { Importer } from './types'
import { youtubeImporter } from './youtube'

export type FileSource = Exclude<StreamSource, 'lastfm'>

export const IMPORTERS: Record<FileSource, Importer> = {
  spotify: spotifyImporter,
  youtube: youtubeImporter,
  apple: appleImporter,
}

/** Runs one importer over the picked files and returns a record ready for `playStore.addImport`. */
export async function readImport(source: FileSource, files: File[]): Promise<ImportRecord> {
  const { streams, files: used, account } = await IMPORTERS[source].read(files)
  if (!streams.length) throw new Error(i18n.t(`features/import-history:errors.noData.${source}`))
  return {
    id: crypto.randomUUID(),
    source,
    importedAt: Date.now(),
    files: used,
    account,
    streams: mergeStreams([], streams),
  }
}
