import { env } from '@/shared/config'
import type { ImportRecord, Stream } from '@/entities/stream-history'

/** Scrobbles carry no play length, so each one counts as one average-length song. */
const ASSUMED_MS = 3 * 60_000
const PAGE_SIZE = 200
const CONCURRENCY = 4
const RETRIES = 3

export type LastfmErrorCode = 'userNotFound' | 'privateProfile' | 'invalidKey' | 'rateLimit' | 'network'

export class LastfmError extends Error {
  constructor(readonly code: LastfmErrorCode) {
    super(code)
  }
}

interface RecentTracksResponse {
  error?: number
  recenttracks?: {
    track?: {
      name: string
      artist: { '#text': string }
      album?: { '#text': string }
      date?: { uts: string }
      '@attr'?: { nowplaying?: string }
    }[]
    '@attr'?: { totalPages: string }
  }
}

/** Last.fm error codes: https://www.last.fm/api/errorcodes */
const errorCode = (n: number): LastfmErrorCode => {
  if (n === 6) return 'userNotFound'
  if (n === 10 || n === 26) return 'invalidKey'
  if (n === 17) return 'privateProfile'
  if (n === 29) return 'rateLimit'
  return 'network'
}

const fetchPage = async (user: string, apiKey: string, page: number, signal?: AbortSignal) => {
  const url = new URL(env.lastfmApiUrl)
  url.search = new URLSearchParams({
    method: 'user.getrecenttracks',
    user,
    api_key: apiKey,
    format: 'json',
    limit: String(PAGE_SIZE),
    page: String(page),
  }).toString()

  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal })
      const body = (await res.json()) as RecentTracksResponse
      if (body.error) throw new LastfmError(errorCode(body.error))
      return body.recenttracks ?? {}
    } catch (e) {
      if (signal?.aborted) throw e
      const code = e instanceof LastfmError ? e.code : 'network'
      // only transient failures are worth retrying
      if ((code !== 'rateLimit' && code !== 'network') || attempt >= RETRIES) throw e instanceof LastfmError ? e : new LastfmError('network')
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
    }
  }
}

const toStreams = (tracks: NonNullable<RecentTracksResponse['recenttracks']>['track']): Stream[] =>
  (tracks ?? []).flatMap((t) => {
    // the track playing right now has no date yet
    if (!t.date || t['@attr']?.nowplaying) return []
    return [
      {
        ts: Number(t.date.uts) * 1000,
        ms: ASSUMED_MS,
        track: t.name,
        artist: t.artist['#text'],
        album: t.album?.['#text'] || null,
        uri: null,
        platform: null,
        skipped: false,
        source: 'lastfm' as const,
        estimated: true,
      },
    ]
  })

/** Downloads a user's whole scrobble history (public profile + API key, no login). */
export async function fetchLastfmHistory(opts: {
  username: string
  apiKey: string
  onProgress?: (done: number, total: number) => void
  signal?: AbortSignal
}): Promise<ImportRecord> {
  const { username, apiKey, onProgress, signal } = opts
  const first = await fetchPage(username, apiKey, 1, signal)
  const total = Number(first['@attr']?.totalPages ?? 1)
  const streams = toStreams(first.track)
  let done = 1
  onProgress?.(done, total)

  // a small pool of workers pulls the remaining pages in order
  let next = 2
  const worker = async () => {
    while (next <= total) {
      const page = next++
      streams.push(...toStreams((await fetchPage(username, apiKey, page, signal)).track))
      onProgress?.(++done, total)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, Math.max(total - 1, 0)) }, worker))

  const seen = new Set<string>()
  const unique = streams
    .filter((s) => {
      const k = `${s.ts}|${s.track}`
      return !seen.has(k) && seen.add(k)
    })
    .sort((a, b) => a.ts - b.ts)

  return {
    id: crypto.randomUUID(),
    source: 'lastfm',
    importedAt: Date.now(),
    files: [username],
    streams: unique,
  }
}
