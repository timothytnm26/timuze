import type { PlayerTrack } from '@/entities/local-library'

/**
 * Embedded players for the turntable when nobody is logged in: YouTube (whole song, from the video id in
 * a Takeout export) and Spotify (30-second clip, from the track id in a Spotify export). Both are driven
 * through their own iframe APIs, so the deck can play/pause/seek and show their state.
 */

export interface PlaybackInfo {
  playing: boolean
  /** ms */
  position: number
  duration: number
}

export interface EngineHooks {
  onPlayback(info: PlaybackInfo): void
  onEnded(): void
  onError(): void
}

export interface Engine {
  /** Start the track; rejects when it can't be played (the caller tries the next way). */
  load(track: PlayerTrack): Promise<void>
  toggle(): void
  seek(ms: number): void
  pause(): void
  /** Remove the player from the page. */
  destroy(): void
}

let host: HTMLElement | null = null
/** The visible box the iframes live in – providers require their players to be on screen. */
export const registerEmbedHost = (el: HTMLElement | null) => {
  host = el
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** The box is shown by a state change that React applies a moment later. */
async function waitForHost() {
  for (let i = 0; i < 50; i++) {
    if (host && host.clientWidth > 0) return host
    await sleep(50)
  }
  throw new Error('embed host not visible')
}

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onerror = () => reject(new Error(`could not load ${src}`))
    if (src.includes('youtube')) {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        resolve()
      }
    } else s.onload = () => resolve()
    document.head.appendChild(s)
  })

// ---- YouTube ----------------------------------------------------------------------------------

interface YtPlayer {
  loadVideoById(id: string): void
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  destroy(): void
}
interface YtApi {
  Player: new (el: HTMLElement, opts: object) => YtPlayer
}
declare global {
  interface Window {
    YT?: YtApi
    onYouTubeIframeAPIReady?: () => void
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void
  }
}

let ytApi: Promise<YtApi> | null = null
const loadYouTube = () =>
  (ytApi ??= window.YT?.Player
    ? Promise.resolve(window.YT)
    : loadScript('https://www.youtube.com/iframe_api').then(() => window.YT!))

export function createYoutubeEngine(hooks: EngineHooks): Engine {
  let player: YtPlayer | null = null
  let wrapper: HTMLElement | null = null
  let timer: ReturnType<typeof setInterval> | undefined

  const info = (playing: boolean): PlaybackInfo => ({
    playing,
    position: (player?.getCurrentTime() ?? 0) * 1000,
    duration: (player?.getDuration() ?? 0) * 1000,
  })

  const mount = async () => {
    const box = await waitForHost()
    const api = await loadYouTube()
    wrapper = document.createElement('div')
    wrapper.className = 'size-full'
    box.appendChild(wrapper)
    const el = document.createElement('div')
    wrapper.appendChild(el)
    return new Promise<YtPlayer>((resolve, reject) => {
      const p: YtPlayer = new api.Player(el, {
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => resolve(p),
          onStateChange: (e: { data: number }) => {
            if (e.data === 0) hooks.onEnded()
            else if (e.data === 1 || e.data === 2) hooks.onPlayback(info(e.data === 1))
          },
          // 101 / 150: the owner doesn't allow embedding – the caller falls back
          onError: () => (player ? hooks.onError() : reject(new Error('youtube error'))),
        },
      })
    })
  }

  return {
    async load(track) {
      if (!track.youtubeId) throw new Error('no youtube id')
      player ??= await mount()
      player.loadVideoById(track.youtubeId)
      clearInterval(timer)
      timer = setInterval(() => player?.getPlayerState() === 1 && hooks.onPlayback(info(true)), 500)
    },
    toggle: () => (player?.getPlayerState() === 1 ? player.pauseVideo() : player?.playVideo()),
    seek: (ms) => player?.seekTo(Math.max(0, player.getCurrentTime() + ms / 1000), true),
    pause: () => player?.pauseVideo(),
    destroy() {
      clearInterval(timer)
      player?.destroy()
      wrapper?.remove()
      player = null
      wrapper = null
    },
  }
}

// ---- Spotify ----------------------------------------------------------------------------------

interface SpotifyController {
  loadUri(uri: string): void
  play(): void
  togglePlay(): void
  pause(): void
  seek(seconds: number): void
  destroy(): void
  addListener(event: string, cb: (e: { data: { isPaused: boolean; duration: number; position: number } }) => void): void
}
interface SpotifyIframeApi {
  createController(el: HTMLElement, opts: { uri: string; width: string; height: number }, cb: (c: SpotifyController) => void): void
}

let spotifyApi: Promise<SpotifyIframeApi> | null = null
const loadSpotify = () =>
  (spotifyApi ??= new Promise<SpotifyIframeApi>((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve
    loadScript('https://open.spotify.com/embed/iframe-api/v1').catch(reject)
  }))

export function createSpotifyEngine(hooks: EngineHooks): Engine {
  let controller: SpotifyController | null = null
  let wrapper: HTMLElement | null = null
  let last: PlaybackInfo = { playing: false, position: 0, duration: 0 }

  const mount = async (uri: string) => {
    const box = await waitForHost()
    const api = await loadSpotify()
    wrapper = document.createElement('div')
    wrapper.className = 'size-full'
    box.appendChild(wrapper)
    const el = document.createElement('div')
    wrapper.appendChild(el)
    return new Promise<SpotifyController>((resolve) => {
      api.createController(el, { uri, width: '100%', height: 80 }, (c) => {
        c.addListener('ready', () => c.play())
        c.addListener('playback_update', (e) => {
          const { isPaused, duration, position } = e.data
          // the clip finished and wound back to the start
          if (isPaused && position === 0 && last.playing && duration > 0 && last.position >= duration - 1500) hooks.onEnded()
          last = { playing: !isPaused, position, duration }
          hooks.onPlayback(last)
        })
        resolve(c)
      })
    })
  }

  return {
    async load(track) {
      if (!track.spotifyId) throw new Error('no spotify id')
      const uri = `spotify:track:${track.spotifyId}`
      if (!controller) controller = await mount(uri)
      else {
        controller.loadUri(uri)
        controller.play()
      }
    },
    toggle: () => controller?.togglePlay(),
    seek: (ms) => controller?.seek(Math.max(0, (last.position + ms) / 1000)),
    pause: () => controller?.pause(),
    destroy() {
      controller?.destroy()
      wrapper?.remove()
      controller = null
      wrapper = null
    },
  }
}
