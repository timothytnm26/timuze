import { safeStorage } from '../lib/storage'

const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:5173'

export const env = {
  spotifyClientId: (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined) ?? '',
  spotifyRedirectUri:
    // BASE_URL ends with a slash: `/` locally, `/timuze/` on GitHub Pages
    (import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string | undefined) || `${origin}${import.meta.env.BASE_URL}callback`,
  spotifyAuthUrl: 'https://accounts.spotify.com/authorize',
  spotifyTokenUrl: 'https://accounts.spotify.com/api/token',
  spotifyApiUrl: 'https://api.spotify.com/v1',
  /** Public (not secret) Last.fm API key – read-only calls need no signature. Users can paste their own instead. */
  lastfmApiKey: (import.meta.env.VITE_LASTFM_API_KEY as string | undefined) ?? '',
  lastfmApiUrl: 'https://ws.audioscrobbler.com/2.0/',
  /** Spotify has no artist country – it is looked up on MusicBrainz (CORS-enabled, ~1 req/s). */
  musicBrainzApiUrl: 'https://musicbrainz.org/ws/2',
} as const

export const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-top-read',
  'user-read-recently-played',
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-library-read',
  'user-follow-read',
  'playlist-read-private',
  // Web Playback SDK (landing-page turntable) – needs Spotify Premium
  'streaming',
  'user-read-email',
  'user-modify-playback-state',
] as const

/** Sessions granted before these scopes existed must log in again to play music. */
export const PLAYBACK_SCOPES = ['streaming', 'user-modify-playback-state'] as const

const CUSTOM_CLIENT_ID_KEY = 'timuze.spotifyClientId'

/** Client ID a user pasted from their own Spotify app (lives in this browser only). */
export const getCustomSpotifyClientId = () => safeStorage.get<string>(CUSTOM_CLIENT_ID_KEY) ?? ''

export const setCustomSpotifyClientId = (id: string) =>
  id ? safeStorage.set(CUSTOM_CLIENT_ID_KEY, id) : safeStorage.remove(CUSTOM_CLIENT_ID_KEY)

/**
 * The Client ID in use: the user's own if they pasted one, else the built-in one.
 * A refresh token only works with the Client ID that issued it, so login, callback and refresh all read this.
 */
export const getSpotifyClientId = () => getCustomSpotifyClientId() || env.spotifyClientId

export const isSpotifyConfigured = () => getSpotifyClientId().length > 0
