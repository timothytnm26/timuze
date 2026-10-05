import { idb } from '@/shared/lib'
import { dedupeAcrossSources } from '../model/dedupe'
import { mergeStreams } from '../model/parse'
import type { ImportRecord, Stream, StreamHistory } from '../model/types'

/**
 * Storage boundary for imported plays. Today it is IndexedDB; a backend-synced
 * implementation can replace it without touching the UI.
 */
export interface PlayStore {
  /** All imports merged and de-duplicated, or `null` when nothing was imported. */
  getHistory(): Promise<StreamHistory | null>
  addImport(record: ImportRecord): Promise<void>
  deleteImport(id: string): Promise<void>
  clear(): Promise<void>
}

const IMPORTS_KEY = 'play-imports'
/** Single-blob format used before multi-source imports. */
const LEGACY_KEY = 'stream-history'

interface LegacyHistory {
  importedAt: number
  files: string[]
  streams: Stream[]
}

const loadImports = async (): Promise<ImportRecord[]> => {
  const stored = await idb.get<ImportRecord[]>(IMPORTS_KEY)
  if (stored) return stored
  const legacy = await idb.get<LegacyHistory>(LEGACY_KEY)
  if (!legacy) return []
  return [{ id: 'legacy', source: 'spotify', importedAt: legacy.importedAt, files: legacy.files, streams: legacy.streams }]
}

const saveImports = async (imports: ImportRecord[]) => {
  if (imports.length) await idb.set(IMPORTS_KEY, imports)
  else await idb.del(IMPORTS_KEY)
  // migration done – the legacy blob would otherwise resurrect deleted data
  await idb.del(LEGACY_KEY)
}

export const idbPlayStore: PlayStore = {
  async getHistory() {
    const imports = await loadImports()
    if (!imports.length) return null
    let streams: Stream[] = []
    for (const r of imports) streams = mergeStreams(streams, r.streams.map((s) => ({ ...s, source: s.source ?? r.source })))
    const deduped = dedupeAcrossSources(streams)
    return {
      importedAt: Math.max(...imports.map((r) => r.importedAt)),
      files: imports.flatMap((r) => r.files),
      streams: deduped.streams,
      duplicates: deduped.removed,
      imports: imports.map(({ streams: s, ...rest }) => ({ ...rest, count: s.length })),
    }
  },
  async addImport(record) {
    await saveImports([...(await loadImports()), record])
  },
  async deleteImport(id) {
    await saveImports((await loadImports()).filter((r) => r.id !== id))
  },
  async clear() {
    await saveImports([])
  },
}

export const playStore: PlayStore = idbPlayStore
