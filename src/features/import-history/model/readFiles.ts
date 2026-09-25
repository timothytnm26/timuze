import { unzipSync, strFromU8 } from 'fflate'
import { mergeStreams, parseStreamingFile, type Stream } from '@/entities/stream-history'
import { i18n } from '@/shared/i18n'

const isHistoryJson = (name: string) =>
  /\.json$/i.test(name) && /(streaming_?history|endsong)/i.test(name.split('/').pop() ?? '')

/**
 * Reads .json and .zip files from a Spotify privacy-data export entirely in the browser.
 * Nothing is uploaded anywhere.
 */
export async function readStreamingFiles(files: File[]) {
  let streams: Stream[] = []
  const used: string[] = []

  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
        filter: (f) => isHistoryJson(f.name),
      })
      for (const [name, bytes] of Object.entries(entries)) {
        streams = mergeStreams(streams, parseStreamingFile(JSON.parse(strFromU8(bytes))))
        used.push(name.split('/').pop() ?? name)
      }
    } else if (/\.json$/i.test(file.name)) {
      streams = mergeStreams(streams, parseStreamingFile(JSON.parse(await file.text())))
      used.push(file.name)
    }
  }
  if (!streams.length) throw new Error(i18n.t('features/import-history:errors.noData'))
  return { streams, files: used }
}
