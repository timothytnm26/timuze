import { env } from '@/shared/config'
import { safeStorage } from '@/shared/lib'
import { playStore } from '@/entities/stream-history'
import { lastfmCoverUrl } from '../lib/ids'

/** What the turntable needs to show and play a track. */
export interface PlayerTrack {
  name: string
  artists: string
  image?: string
  /** 30-second iTunes preview, once looked up */
  previewUrl?: string
  /** YouTube video the export points at – plays the whole song */
  youtubeId?: string
  /** Spotify track the export points at – the embed plays a 30-second clip unless the visitor is logged in there */
  spotifyId?: string
}

export const hasLocalHistory = async () => !!(await playStore.getHistory())

// ---- Last.fm "now playing" ----

const PLACEHOLDER_COVER = '2a96cbd8b46e442fc41c2b86b821562f'

/** Username (from the Last.fm import) and API key (built in, or the one the user pasted) – or null. */
async function lastfmAccess() {
  const history = await playStore.getHistory()
  const username = history?.imports.find((i) => i.source === 'lastfm')?.files[0]
  const apiKey = env.lastfmApiKey || safeStorage.get<string>('lastfm-api-key') || ''
  return username && apiKey ? { username, apiKey } : null
}

interface RecentResponse {
  recenttracks?: {
    track?: { name: string; artist: { '#text': string }; image?: { size: string; '#text': string }[]; '@attr'?: { nowplaying?: string } }[]
  }
}

/**
 * The track being scrobbled right now: `null` when nothing is playing, `undefined` when there is no
 * Last.fm account to ask (or the request failed – keep what is shown).
 */
export async function lastfmNowPlaying(): Promise<PlayerTrack | null | undefined> {
  const access = await lastfmAccess()
  if (!access) return undefined
  try {
    const url = new URL(env.lastfmApiUrl)
    url.search = new URLSearchParams({ method: 'user.getrecenttracks', user: access.username, api_key: access.apiKey, format: 'json', limit: '1' }).toString()
    const body = (await (await fetch(url)).json()) as RecentResponse
    const t = body.recenttracks?.track?.[0]
    if (!t || t['@attr']?.nowplaying !== 'true') return null
    const file = (t.image?.find((i) => i.size === 'extralarge') ?? t.image?.at(-1))?.['#text']?.split('/').pop()
    return { name: t.name, artists: t.artist['#text'], image: file && !file.startsWith(PLACEHOLDER_COVER) ? lastfmCoverUrl(file) : undefined }
  } catch {
    return undefined
  }
}
