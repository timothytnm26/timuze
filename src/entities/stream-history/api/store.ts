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
  /** Called after every write, so derived data (local top lists…) can refresh. */
  subscribe(listener: () => void): () => void
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

const listeners = new Set<() => void>()
/** Merging and de-duplicating every play is O(n log n), and several queries read it at once. */
let memo: Promise<StreamHistory | null> | null = null
const changed = () => {
  memo = null
  listeners.forEach((l) => l())
}

const buildHistory = async (): Promise<StreamHistory | null> => {
  const imports = await loadImports()
  if (!imports.length) return null
  let streams: Stream[] = []
  for (const r of imports) streams = mergeStreams(streams, r.streams.map((s) => ({ ...s, source: s.source ?? r.source })))
  const deduped = dedupeAcrossSources(streams)
  const bySource: StreamHistory['bySource'] = {}
  for (const s of streams) (bySource[s.source ?? 'spotify'] ??= []).push(s)
  return {
    importedAt: Math.max(...imports.map((r) => r.importedAt)),
    files: imports.flatMap((r) => r.files),
    streams: deduped.streams,
    duplicates: deduped.removed,
    bySource,
    imports: imports.map(({ streams: s, ...rest }) => ({ ...rest, count: s.length })),
  }
}

export const idbPlayStore: PlayStore = {
  getHistory() {
    memo ??= buildHistory()
    return memo
  },
  async addImport(record) {
    await saveImports([...(await loadImports()), record])
    changed()
  },
  async deleteImport(id) {
    await saveImports((await loadImports()).filter((r) => r.id !== id))
    changed()
  },
  async clear() {
    await saveImports([])
    changed()
  },
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export const playStore: PlayStore = idbPlayStore
