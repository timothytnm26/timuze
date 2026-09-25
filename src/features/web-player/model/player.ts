import { createStore, useStore } from '@tanstack/react-store'
import { getTopTracks } from '@/entities/track'
import { getAccessToken, sessionStore, SpotifyApiError, spotifyGet, spotifySend } from '@/shared/api'
import { PLAYBACK_SCOPES } from '@/shared/config'
import { loadSdk, type SdkPlayer, type SdkState } from './sdk'

export type PlayerError = 'login' | 'scope' | 'premium' | 'auth' | 'unsupported' | 'playback' | 'remotePremium' | 'noDevice'

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
}

/**
 * Playback for the turntable – lives for the whole tab, so music keeps going across routes.
 * Whatever the user already has open (Spotify app, open.spotify.com, a speaker…) keeps priority: while
 * another device holds playback the controls drive it through the Web API. Only when nothing is
 * playing does timuze start its own in-browser player (Web Playback SDK).
 */
export const playerStore = createStore<PlayerState>(initial)
export const usePlayer = <T = PlayerState>(select: (s: PlayerState) => T = (s) => s as T) => useStore(playerStore, select)

const patch = (p: Partial<PlayerState>) => playerStore.setState((s) => ({ ...s, ...p }))
const fail = (error: PlayerError) => patch({ status: 'error', playing: false, error })

let sdk: SdkPlayer | null = null
let deviceId: string | null = null

const onState = (s: SdkState | null) => {
  const t = s?.track_window.current_track
  if (!s || !t) return
  // a paused SDK while another device plays is stale – a playing one means this tab took over again
  if (remote && s.paused) return
  remote = false
  patch({
    status: 'ready',
    error: null,
    device: null,
    playing: !s.paused,
    position: s.position,
    duration: s.duration,
    updatedAt: Date.now(),
    track: { name: t.name, artists: t.artists.map((a) => a.name).join(', '), image: t.album.images[0]?.url },
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Continue what the user was listening to elsewhere, otherwise start their recent top tracks. */
async function startOn(id: string) {
  const current = await spotifyGet<{ item: unknown } | null>('/me/player').catch(() => null)
  const play = async () => {
    if (current?.item) {
      await spotifySend('PUT', '/me/player', { body: { device_ids: [id], play: true } })
      return
    }
    const top = await getTopTracks('short_term', 50)
    await spotifySend('PUT', '/me/player/play', { params: { device_id: id }, body: { uris: top.map((t) => t.uri) } })
  }
  // a freshly registered device can 404 for a moment
  await play().catch(async () => {
    await sleep(1200)
    await play()
  })
}

async function connect() {
  patch({ status: 'connecting', error: null })
  let Spotify
  try {
    Spotify = await loadSdk()
  } catch {
    return fail('unsupported')
  }
  const player = new Spotify.Player({
    name: 'timuze web player',
    getOAuthToken: (cb) => void getAccessToken().then(cb),
    volume: 0.6,
  })
  sdk = player
  player.addListener('ready', ({ device_id }) => {
    deviceId = device_id
    void startOn(device_id).catch(() => fail('playback'))
  })
  player.addListener('not_ready', () => (deviceId = null))
  player.addListener('player_state_changed', onState)
  player.addListener('initialization_error', () => fail('unsupported'))
  player.addListener('authentication_error', () => fail('auth'))
  player.addListener('account_error', () => fail('premium'))
  player.addListener('playback_error', () => fail('playback'))
  if (!(await player.connect())) fail('unsupported')
}

// ---- Spotify Connect: another device holding playback ----

interface PlaybackState {
  device: { id: string | null; name: string } | null
  is_playing: boolean
  progress_ms: number | null
  item: { name: string; duration_ms: number; artists: { name: string }[]; album: { images: { url: string }[] } } | null
}

/** another device is playing – actions go to the Web API instead of the SDK */
let remote = false
/** `/me/player` answered at least once, so we know whether to leave playback alone */
let checked = false

const livePosition = (s: PlayerState) => Math.min(s.duration, s.position + (s.playing ? Date.now() - s.updatedAt : 0))

async function pollPlayback() {
  if (sessionStore.state.mode !== 'spotify') return
  // a failed poll keeps what we have
  const p = await spotifyGet<PlaybackState | null>('/me/player').catch(() => undefined)
  if (p === undefined) return
  checked = true
  const elsewhere = p?.device && p.device.id !== deviceId && p.item
  if (elsewhere) {
    remote = true
    return playerStore.setState((s) => ({
      ...s,
      // a shown error stays until dismissed
      status: s.status === 'error' ? 'error' : 'ready',
      device: p.device!.name,
      playing: p.is_playing,
      position: p.progress_ms ?? 0,
      duration: p.item!.duration_ms,
      updatedAt: Date.now(),
      track: { name: p.item!.name, artists: p.item!.artists.map((a) => a.name).join(', '), image: p.item!.album.images[0]?.url },
    }))
  }
  // the other device let go (or this tab took over) – drop its leftovers, the SDK reports its own state
  if (remote) {
    remote = false
    playerStore.setState((s) => ({ ...initial, status: s.error ? 'error' : sdk ? 'ready' : 'idle', error: s.error }))
  }
}

let watchers = 0
let pollTimer: ReturnType<typeof setInterval> | undefined

/** Keep up with playback on the user's other devices while something shows it. Returns the unsubscribe. */
export function watchPlayback() {
  if (++watchers === 1) {
    void pollPlayback()
    pollTimer = setInterval(() => document.hidden || void pollPlayback(), 5000)
  }
  return () => {
    if (--watchers === 0) clearInterval(pollTimer)
  }
}

const remoteError = (e: unknown): PlayerError => {
  const status = e instanceof SpotifyApiError ? e.status : 0
  return status === 403 ? 'remotePremium' : status === 404 ? 'noDevice' : status === 401 ? 'scope' : 'playback'
}

/** A Web API player command; the state is re-read once Spotify caught up (also undoing an optimistic patch that failed). */
async function remoteCommand(method: 'PUT' | 'POST', path: string, params?: Record<string, number>) {
  try {
    await spotifySend(method, path, { params })
    if (playerStore.state.error) patch({ status: 'ready', error: null })
  } catch (e) {
    patch({ status: 'error', error: remoteError(e) })
  }
  setTimeout(() => void pollPlayback(), 700)
}

const reset = () => {
  sdk?.disconnect()
  sdk = null
  deviceId = null
  remote = false
  checked = false
  playerStore.setState(() => initial)
}

/** The play button on the turntable. Must run inside the click handler (browser autoplay rules). */
export function togglePlayback() {
  const { mode, scope } = sessionStore.state
  const s = playerStore.state

  if (mode === 'anonymous') return fail('login')
  if (!PLAYBACK_SCOPES.every((sc) => scope?.split(' ').includes(sc))) return fail('scope')

  if (remote) {
    patch({ playing: !s.playing, position: livePosition(s), updatedAt: Date.now() })
    return void remoteCommand('PUT', s.playing ? '/me/player/pause' : '/me/player/play')
  }
  // not sure yet whether another device is playing – find out before taking playback over
  if (!sdk && !checked) return void pollPlayback().then(() => (remote ? togglePlayback() : connect()))

  if (!sdk) {
    // unlocks audio on Safari / mobile – only allowed synchronously in a user gesture
    return void connect()
  }
  void sdk.activateElement()
  if (!s.track && deviceId) return void startOn(deviceId).catch(() => fail('playback'))
  void sdk.togglePlay()
}

export function skipTrack(direction: 1 | -1 = 1) {
  if (remote) return void remoteCommand('POST', direction === 1 ? '/me/player/next' : '/me/player/previous')
  if (!sdk || !playerStore.state.track) return togglePlayback()
  void (direction === 1 ? sdk.nextTrack() : sdk.previousTrack())
}

/** Jump the playhead by `ms` (negative = back), clamped to the track. */
export function seekBy(ms: number) {
  const s = playerStore.state
  if (!s.track || !s.duration) return
  const position = Math.round(Math.min(Math.max(livePosition(s) + ms, 0), s.duration - 500))
  // shown right away; the SDK's state event (or the next poll) confirms it
  patch({ position, updatedAt: Date.now() })
  if (remote) return void remoteCommand('PUT', '/me/player/seek', { position_ms: position })
  void sdk?.seek(position)
}

/** Clear a shown error (e.g. after the user dismisses it). */
export const dismissPlayerError = () => patch({ status: sdk ? 'ready' : 'idle', error: null })

// logging out tears the player down
let lastMode = sessionStore.state.mode
sessionStore.subscribe((state) => {
  if (state.mode !== lastMode) reset()
  lastMode = state.mode
})
