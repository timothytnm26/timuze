import { env } from '@/shared/config'
import { safeStorage } from '@/shared/lib'

/** Spotify artist id → ISO 3166-1 alpha-2 country (`null` = not on MusicBrainz / no country). */
export type ArtistCountries = Record<string, string | null>

interface CacheEntry {
  c: string | null
  /** checked at, epoch ms */
  t: number
}

interface MbUrl {
  resource: string
  relations?: { artist?: { country?: string | null } }[]
}

const KEY = 'timuze.artistCountries'
/** Countries rarely change – only misses are re-checked (someone may have added the artist since). */
const RECHECK_MISS_MS = 7 * 86_400_000
/** Keeps the request line well under the usual 8 KB limit. */
const CHUNK = 40
const GAP_MS = 1100

// MusicBrainz asks for ≤ 1 request/s – slots are reserved synchronously so parallel callers queue up
let nextSlot = 0
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const waitForSlot = () => {
  const at = Math.max(Date.now(), nextSlot)
  nextSlot = at + GAP_MS
  return sleep(at - Date.now())
}

const spotifyUrl = (id: string) => `https://open.spotify.com/artist/${id}`
const idFromUrl = (url: string) => /\/artist\/([A-Za-z0-9]+)/.exec(url)?.[1]

/** One URL lookup resolves up to 100 Spotify links → linked MusicBrainz artists (with country). */
async function lookupChunk(ids: string[], attempt = 0): Promise<ArtistCountries> {
  await waitForSlot()
  const url = new URL(`${env.musicBrainzApiUrl}/url`)
  ids.forEach((id) => url.searchParams.append('resource', spotifyUrl(id)))
  url.searchParams.set('inc', 'artist-rels')
  url.searchParams.set('fmt', 'json')

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (res.status === 503 && attempt < 2) return lookupChunk(ids, attempt + 1)

  const out: ArtistCountries = Object.fromEntries(ids.map((id) => [id, null]))
  // 404 = none of the links are known
  if (res.status === 404) return out
  if (!res.ok) throw new Error(`MusicBrainz ${res.status}`)

  const data = (await res.json()) as MbUrl | { urls: MbUrl[] }
  const urls = 'urls' in data ? data.urls : [data]
  urls.forEach((u) => {
    const id = idFromUrl(u.resource)
    const country = u.relations?.find((r) => r.artist?.country)?.artist?.country
    if (id && id in out) out[id] = country ?? null
  })
  return out
}

/** Countries for the given Spotify artists – cached in localStorage so repeat visits make no requests. */
export async function getArtistCountries(ids: string[]): Promise<ArtistCountries> {
  const cache = safeStorage.get<Record<string, CacheEntry>>(KEY) ?? {}
  const now = Date.now()
  const fresh = (e: CacheEntry | undefined) => e && (e.c !== null || now - e.t < RECHECK_MISS_MS)
  const missing = ids.filter((id) => !fresh(cache[id]))

  for (let i = 0; i < missing.length; i += CHUNK) {
    const found = await lookupChunk(missing.slice(i, i + CHUNK))
    Object.entries(found).forEach(([id, c]) => (cache[id] = { c, t: now }))
    safeStorage.set(KEY, cache)
  }
  return Object.fromEntries(ids.map((id) => [id, cache[id]?.c ?? null]))
}
