import { mergeStreams, parseStreamingFile, type Stream } from '@/entities/stream-history'
import { collectTextFiles } from './files'
import type { Importer } from './types'

const isHistoryJson = (name: string) =>
  /\.json$/i.test(name) && /(streaming_?history|endsong)/i.test(name.split('/').pop() ?? '')

/** Every row of the extended export carries the account's `username` (podcasts included). */
const accountOf = (json: unknown) =>
  Array.isArray(json) ? (json.find((r) => typeof r?.username === 'string' && r.username) as { username: string } | undefined)?.username : undefined

export const spotifyImporter: Importer = {
  source: 'spotify',
  accept: '.json,.zip,application/json,application/zip',
  async read(files) {
    const found = await collectTextFiles(files, isHistoryJson)
    let streams: Stream[] = []
    let account: string | undefined
    for (const f of found) {
      const json: unknown = JSON.parse(f.text)
      streams = mergeStreams(streams, parseStreamingFile(json))
      account ??= accountOf(json)
    }
    return { streams, files: found.map((f) => f.name), account }
  },
}
