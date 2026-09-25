const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:5173'

export const env = {
  spotifyClientId: (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined) ?? '',
  spotifyRedirectUri:
    (import.meta.env.VITE_SPOTIFY_REDIRECT_URI as string | undefined) ?? `${origin}/callback`,
  spotifyAuthUrl: 'https://accounts.spotify.com/authorize',
  spotifyTokenUrl: 'https://accounts.spotify.com/api/token',
  spotifyApiUrl: 'https://api.spotify.com/v1',
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

export const isSpotifyConfigured = () => env.spotifyClientId.length > 0
