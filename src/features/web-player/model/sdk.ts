/** Minimal typings for the Spotify Web Playback SDK (https://sdk.scdn.co/spotify-player.js). */
export interface SdkTrack {
  uri: string
  name: string
  duration_ms: number
  album: { name: string; images: { url: string }[] }
  artists: { name: string }[]
}

export interface SdkState {
  paused: boolean
  position: number
  duration: number
  track_window: { current_track: SdkTrack | null }
}

type ErrorListener = (e: { message: string }) => void

export interface SdkPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  activateElement(): Promise<void>
  togglePlay(): Promise<void>
  nextTrack(): Promise<void>
  previousTrack(): Promise<void>
  seek(positionMs: number): Promise<void>
  addListener(event: 'ready' | 'not_ready', cb: (e: { device_id: string }) => void): boolean
  addListener(event: 'player_state_changed', cb: (s: SdkState | null) => void): boolean
  addListener(
    event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error',
    cb: ErrorListener,
  ): boolean
}

interface SdkNamespace {
  Player: new (opts: { name: string; getOAuthToken: (cb: (token: string) => void) => void; volume?: number }) => SdkPlayer
}

declare global {
  interface Window {
    Spotify?: SdkNamespace
    onSpotifyWebPlaybackSDKReady?: () => void
  }
}

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js'
let loading: Promise<SdkNamespace> | null = null

/** Injects the SDK script once; resolves when `window.Spotify` is usable. */
export const loadSdk = () =>
  (loading ??= new Promise<SdkNamespace>((resolve, reject) => {
    if (window.Spotify) return resolve(window.Spotify)
    window.onSpotifyWebPlaybackSDKReady = () => resolve(window.Spotify!)
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onerror = () => {
      loading = null
      reject(new Error('sdk'))
    }
    document.head.append(script)
  }))
