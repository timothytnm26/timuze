import { idb } from '@/shared/lib'
import { normalizeName } from '@/entities/stream-history'

/**
 * iTunes Search API – public, CORS-enabled, no key. Gives what exports lack: cover art,
 * genre, release date, track length and album tracklists. It is rate limited (~20 requests/min),
 * so lookups are queued, spaced out and cached for good.
 */
const BASE = 'https://itunes.apple.com'
const CACHE_KEY = 'itunes-meta'
const RECHECK_MISS_MS = 7 * 86_400_000
const MIN_GAP_MS = 1200
const MAX_GAP_MS = 15_000

export interface TrackMeta {
  cover?: string
  album?: string
  genre?: string
  releaseDate?: string
  durationMs?: number
  trackCount?: number
  /** nothing matched – not retried for a week */
  miss?: boolean
  /** looked up at, epoch ms */
  t: number
}

export interface ItunesItem {
  wrapperType: 'track' | 'collection' | 'artist'
  trackId?: number
  collectionId?: number
  artistId?: number
  trackName?: string
  collectionName?: string
  artistName: string
  artworkUrl100?: string
  primaryGenreName?: string
  releaseDate?: string
  trackTimeMillis?: number
  trackCount?: number
  trackNumber?: number
  discNumber?: number
  trackExplicitness?: string
  collectionViewUrl?: string
  trackViewUrl?: string
  collectionType?: string
}

/** 100x100 → a size the UI can use; the CDN serves any square size. */
export const itunesArtwork = (url: string | undefined, size = 300) => url?.replace(/\d+x\d+bb/, `${size}x${size}bb`)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

let cache: Record<string, TrackMeta> = {}
let loaded: Promise<void> | null = null
export const loadMetaCache = () =>
  (loaded ??= idb.get<Record<string, TrackMeta>>(CACHE_KEY).then((c) => {
    cache = { ...c, ...cache }
  }))

let persistTimer: ReturnType<typeof setTimeout> | undefined
const persist = () => {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => void idb.set(CACHE_KEY, cache), 1500)
}

export const metaKey = (artist: string, track: string) => `${normalizeName(artist)}|${normalizeName(track)}`
export const getMeta = (artist: string, track: string): TrackMeta | undefined => cache[metaKey(artist, track)]

const fresh = (m: TrackMeta | undefined) => !!m && (!m.miss || Date.now() - m.t < RECHECK_MISS_MS)

class RateLimited extends Error {}

const search = async (params: Record<string, string>): Promise<ItunesItem[]> => {
  const res = await fetch(`${BASE}/search?${new URLSearchParams({ media: 'music', ...params })}`)
  if (res.status === 403 || res.status === 429) throw new RateLimited()
  if (!res.ok) throw new Error(`iTunes ${res.status}`)
  return ((await res.json()) as { results: ItunesItem[] }).results
}

const same = (a: string, b: string) => {
  const x = normalizeName(a)
  const y = normalizeName(b)
  return !!x && !!y && (x === y || (Math.min(x.length, y.length) >= 4 && (x.includes(y) || y.includes(x))))
}

const fetchMeta = async (artist: string, track: string): Promise<TrackMeta> => {
  const results = await search({ term: `${artist} ${track}`, entity: 'song', limit: '8' })
  const hit = results.find((r) => r.trackName && same(r.artistName, artist) && same(r.trackName, track))
  if (!hit) return { miss: true, t: Date.now() }
  return {
    cover: itunesArtwork(hit.artworkUrl100),
    album: hit.collectionName,
    genre: hit.primaryGenreName,
    releaseDate: hit.releaseDate,
    durationMs: hit.trackTimeMillis,
    trackCount: hit.trackCount,
    t: Date.now(),
  }
}

// ---- background queue -------------------------------------------------------------------------

const queue: { artist: string; track: string }[] = []
const queued = new Set<string>()
let running = false
let gap = MIN_GAP_MS
let onProgress: (() => void) | undefined

/** Called (batched) whenever new metadata arrived, so queries built on it can refresh. */
export const setMetaListener = (fn: () => void) => {
  onProgress = fn
}

async function run() {
  running = true
  let pending = 0
  while (queue.length) {
    const item = queue.shift()!
    const key = metaKey(item.artist, item.track)
    try {
      cache[key] = await fetchMeta(item.artist, item.track)
      queued.delete(key)
      pending++
      gap = Math.max(MIN_GAP_MS, gap * 0.85)
    } catch (e) {
      if (e instanceof RateLimited) {
        queue.unshift(item)
        gap = Math.min(MAX_GAP_MS, gap * 2)
      } else {
        // offline or a server hiccup – drop it, the next visit queues it again
        queued.delete(key)
      }
    }
    if (pending >= 5 || (pending > 0 && !queue.length)) {
      pending = 0
      persist()
      onProgress?.()
    }
    if (queue.length) await sleep(gap)
  }
  running = false
}

/** Queue lookups for plays whose cover, genre… are unknown. Earlier items are looked up first. */
export async function enqueueMeta(items: { artist: string; track: string }[]) {
  await loadMetaCache()
  for (const it of items) {
    const key = metaKey(it.artist, it.track)
    if (fresh(cache[key]) || queued.has(key)) continue
    queued.add(key)
    queue.push(it)
  }
  if (!running && queue.length) void run()
}

// ---- albums (React Query caches these, no queue needed) ----------------------------------------

export const searchItunesAlbums = (term: string, limit = 10) =>
  search({ term, entity: 'album', limit: String(limit) }).then((r) => r.filter((x) => x.wrapperType === 'collection'))

export async function lookupItunesAlbum(collectionId: string) {
  const res = await fetch(`${BASE}/lookup?${new URLSearchParams({ id: collectionId, entity: 'song' })}`)
  if (!res.ok) throw new Error(`iTunes ${res.status}`)
  const results = ((await res.json()) as { results: ItunesItem[] }).results
  return {
    collection: results.find((r) => r.wrapperType === 'collection'),
    tracks: results.filter((r) => r.wrapperType === 'track'),
  }
}

export const sameName = same
