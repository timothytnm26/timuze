import { useQuery } from '@tanstack/react-query'
import { useStore } from '@tanstack/react-store'
import { sessionStore } from '@/shared/api'
import { getCustomSpotifyAppName, getCustomSpotifyClientId } from '@/shared/config'
import { streamHistoryQueries, type StreamSource } from '@/entities/stream-history'
import { userQueries, type CurrentUser } from '@/entities/user'

/**
 * What the header says about the user, in priority order:
 * 1. buddy – logged in through timuze's own Spotify app (Spotify name and photo)
 * 2. own – logged in through the user's own Spotify app (Spotify name and photo)
 * 3. lastfm – no Spotify login; the Last.fm username
 * 4. spotifyFile – the account named in an imported Spotify export
 * 5. youtube, 6. apple – imported data that carries no name
 */
export type SourceKind = 'buddy' | 'own' | 'lastfm' | 'spotifyFile' | 'youtube' | 'apple'

export interface SourceEntry {
  kind: SourceKind
  /** Last.fm username, Spotify export account… */
  detail?: string
  /** plays imported from it (none for the Spotify login) */
  count?: number
}

export interface Identity {
  /** the highest-priority source – what the header shows */
  kind: SourceKind
  user: CurrentUser
  /** Signed in with Spotify – the only case with a session to log out of. */
  spotify: boolean
  /** every source in play, highest priority first */
  sources: SourceEntry[]
}

const ORDER: StreamSource[] = ['lastfm', 'spotify', 'youtube', 'apple']
const KIND: Record<StreamSource, SourceKind> = { lastfm: 'lastfm', spotify: 'spotifyFile', youtube: 'youtube', apple: 'apple' }

/** `null` while loading, or when there is neither a Spotify login nor imported data. */
export function useIdentity(): Identity | null {
  const spotify = useStore(sessionStore, (s) => s.mode !== 'anonymous')
  const me = useQuery(userQueries.me())
  const history = useQuery(streamHistoryQueries.all())
  if (!me.data) return null

  const sources: SourceEntry[] = []
  if (spotify) sources.push({ kind: getCustomSpotifyClientId() ? 'own' : 'buddy' })
  const imports = history.data?.imports ?? []
  for (const source of ORDER) {
    const mine = imports.filter((i) => i.source === source)
    if (!mine.length) continue
    sources.push({
      kind: KIND[source],
      detail: source === 'lastfm' ? mine[0]?.files[0] : mine.find((i) => i.account)?.account,
      count: mine.reduce((s, i) => s + i.count, 0),
    })
  }
  const first = sources[0]
  return first ? { kind: first.kind, user: me.data, spotify, sources } : null
}

/** The name the user gave their own Spotify app – only while logged in through it. */
export function useAppName(): string {
  const spotify = useStore(sessionStore, (s) => s.mode !== 'anonymous')
  return spotify && getCustomSpotifyClientId() ? getCustomSpotifyAppName() : ''
}
