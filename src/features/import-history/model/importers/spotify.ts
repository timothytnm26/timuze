import { mergeStreams, parseStreamingFile, type Stream } from '@/entities/stream-history'
import { collectTextFiles } from './files'
import type { Importer } from './types'

const isHistoryJson = (name: string) =>
  /\.json$/i.test(name) && /(streaming_?history|endsong)/i.test(name.split('/').pop() ?? '')

export const spotifyImporter: Importer = {
  source: 'spotify',
  accept: '.json,.zip,application/json,application/zip',
  async read(files) {
    const found = await collectTextFiles(files, isHistoryJson)
    let streams: Stream[] = []
    for (const f of found) streams = mergeStreams(streams, parseStreamingFile(JSON.parse(f.text)))
    return { streams, files: found.map((f) => f.name) }
  },
}
