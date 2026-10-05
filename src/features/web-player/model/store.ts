import { createStore, useStore } from '@tanstack/react-store'

export type PlayerError = 'login' | 'scope' | 'premium' | 'auth' | 'unsupported' | 'playback' | 'remotePremium' | 'noDevice' | 'noPreview'

export interface NowPlayingTrack {
  name: string
  artists: string
  image?: string
}

export interface PlayerState {
  status: 'idle' | 'connecting' | 'ready' | 'error'
  playing: boolean
  track: NowPlayingTrack | null
  /** ms, as of `updatedAt` – interpolate while playing */
  position: number
  duration: number
  updatedAt: number
  error: PlayerError | null
  /** name of the Spotify Connect device playing when it isn't this tab (phone, desktop app…), else null */
  device: string | null
  /** what is playing: Spotify (login), without a login a YouTube / Spotify embed or an iTunes preview, or what Last.fm says is being scrobbled */
  source: 'spotify' | 'preview' | 'youtube' | 'embed' | 'lastfm' | null
}

const initial: PlayerState = {
  status: 'idle',
  playing: false,
  track: null,
  position: 0,
  duration: 0,
  updatedAt: 0,
  error: null,
  device: null,
  source: null,
}

export const playerStore = createStore<PlayerState>(initial)
export const usePlayer = <T = PlayerState>(select: (s: PlayerState) => T = (s) => s as T) => useStore(playerStore, select)

export const patch = (p: Partial<PlayerState>) => playerStore.setState((s) => ({ ...s, ...p }))
export const fail = (error: PlayerError) => patch({ status: 'error', playing: false, error })
export { initial as initialPlayerState }
