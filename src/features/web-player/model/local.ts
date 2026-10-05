import { addMetaListener, hasLocalHistory, lastfmNowPlaying, localPlayerTracks, type PlayerTrack } from '@/entities/local-library'
import { createSpotifyEngine, createYoutubeEngine, type Engine, type EngineHooks, type PlaybackInfo } from './embeds'
import { fail, initialPlayerState, patch, playerStore, type PlayerState } from './store'

/**
 * The turntable without a Spotify login. It shows the cover of the user's most played track; if Last.fm
 * says something is being scrobbled it shows that instead (no sound). Pressing play starts their top
 * tracks, each in the best way its export allows: the YouTube video (whole song), else the Spotify embed
 * (30 s), else iTunes' public 30-second preview. A way that fails hands over to the next one.
 */

type Kind = 'youtube' | 'spotify' | 'preview'
type Queued = PlayerTrack

const SOURCE: Record<Kind, NonNullable<PlayerState['source']>> = { youtube: 'youtube', spotify: 'embed', preview: 'preview' }

/** a silent clip – playing it inside the click unlocks the audio element for the later, async start */
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
const NOW_PLAYING_EVERY_MS = 30_000
const WAIT_FOR_PREVIEWS_MS = 20_000

const kindsOf = (t: PlayerTrack): Kind[] => [t.youtubeId && 'youtube', t.spotifyId && 'spotify', t.previewUrl && 'preview'].filter(Boolean) as Kind[]

let queue: Queued[] = []
let index = 0
let remainingKinds: Kind[] = []
let active: { kind: Kind; engine: Engine } | null = null
const engines: Partial<Record<Kind, Engine>> = {}
let previewActive = false
let idleTrack: PlayerTrack | null = null
let timer: ReturnType<typeof setInterval> | undefined
let generation = 0
let stopMeta: (() => void) | undefined
let audio: HTMLAudioElement | null = null

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const asTrack = (t: PlayerTrack) => ({ name: t.name, artists: t.artists, image: t.image })

// ---- the three ways to play -------------------------------------------------------------------

const hooks: EngineHooks = {
  onPlayback: (info: PlaybackInfo) => patch({ playing: info.playing, position: info.position, duration: info.duration, updatedAt: Date.now(), status: 'ready', error: null }),
  onEnded: () => void playIndex(index + 1),
  onError: () => void playWith(remainingKinds, queue[index]),
}

const audioEngine = (): Engine => {
  const a = audio ?? (audio = new Audio())
  a.preload = 'auto'
  a.onplaying = () => patch({ playing: true, status: 'ready', error: null })
  a.onpause = () => patch({ playing: false })
  a.ontimeupdate = () => hooks.onPlayback({ playing: !a.paused, position: a.currentTime * 1000, duration: (a.duration || 30) * 1000 })
  a.onended = hooks.onEnded
  a.onerror = hooks.onError
  return {
    async load(t) {
      a.src = t.previewUrl!
      await a.play()
    },
    toggle: () => (a.paused ? void a.play().catch(() => fail('playback')) : a.pause()),
    seek: (ms) => void (a.currentTime = Math.min(Math.max(a.currentTime + ms / 1000, 0), (a.duration || 30) - 0.5)),
    pause: () => a.pause(),
    destroy: () => {
      a.pause()
      a.removeAttribute('src')
    },
  }
}

const engineFor = (kind: Kind) =>
  (engines[kind] ??= kind === 'youtube' ? createYoutubeEngine(hooks) : kind === 'spotify' ? createSpotifyEngine(hooks) : audioEngine())

/** Try each way in turn for this track; when none works, move on to the next track. */
async function playWith(kinds: Kind[], track: Queued | undefined): Promise<void> {
  if (!track) return fail('noPreview')
  const [kind, ...rest] = kinds
  if (!kind) return void (queue.length > 1 ? playIndex(index + 1) : fail('noPreview'))
  remainingKinds = rest
  // everything else stays quiet
  for (const [k, e] of Object.entries(engines)) if (k !== kind) e.pause()
  patch({ track: asTrack(track), position: 0, duration: 0, updatedAt: Date.now(), device: null, source: SOURCE[kind] })
  try {
    const engine = engineFor(kind)
    active = { kind, engine }
    await engine.load(track)
  } catch {
    await playWith(rest, track)
  }
}

async function refreshQueue() {
  queue = (await localPlayerTracks(30)).filter((t) => kindsOf(t).length)
}

async function playIndex(i: number) {
  await refreshQueue()
  if (!queue.length) return fail('noPreview')
  index = ((i % queue.length) + queue.length) % queue.length
  const track = queue[index]!
  await playWith(kindsOf(track), track)
}

/** Embeds work from the ids in the export straight away; iTunes previews come in at its own pace. */
async function waitForPlayable(gen: number) {
  const until = Date.now() + WAIT_FOR_PREVIEWS_MS
  while (gen === generation && Date.now() < until) {
    await refreshQueue()
    if (queue.length) return true
    await sleep(1000)
  }
  return false
}

// ---- idle state, Last.fm now-playing ----------------------------------------------------------

function showIdle() {
  if (previewActive || !idleTrack) return
  patch({ status: 'ready', playing: false, track: asTrack(idleTrack), position: 0, duration: 0, updatedAt: Date.now(), error: null, device: null, source: 'preview' })
}

async function pollNowPlaying() {
  if (previewActive) return
  const now = await lastfmNowPlaying()
  if (now === undefined || previewActive) return
  if (now) {
    patch({ status: 'ready', playing: true, track: asTrack(now), position: 0, duration: 0, updatedAt: Date.now(), error: null, device: 'Last.fm', source: 'lastfm' })
  } else if (playerStore.state.source === 'lastfm') showIdle()
}

/** Called while the hero is on screen and nobody is logged in. Returns the stop function. */
export function startLocalWatch() {
  const gen = ++generation
  void (async () => {
    if (!(await hasLocalHistory())) return
    const tracks = await localPlayerTracks(12)
    if (gen !== generation) return
    idleTrack = tracks[0] ?? null
    showIdle()
    // the cover often arrives after the first look at the history (iTunes answers one by one)
    let refreshing = false
    stopMeta = addMetaListener(() => {
      if (previewActive || refreshing || idleTrack?.image) return
      refreshing = true
      void localPlayerTracks(12)
        .then((next) => {
          if (gen !== generation || previewActive) return
          idleTrack = next[0] ?? idleTrack
          if (playerStore.state.source === 'preview' && !playerStore.state.playing) showIdle()
        })
        .finally(() => (refreshing = false))
    })
    void pollNowPlaying()
    timer = setInterval(() => document.hidden || void pollNowPlaying(), NOW_PLAYING_EVERY_MS)
  })()
  return () => stopLocal()
}

export function stopLocal() {
  generation++
  clearInterval(timer)
  stopMeta?.()
  stopMeta = undefined
  // the embeds live in a box that goes away with the page
  for (const e of Object.values(engines)) e.destroy()
  for (const k of Object.keys(engines) as Kind[]) delete engines[k]
  active = null
  queue = []
  index = 0
  remainingKinds = []
  previewActive = false
  idleTrack = null
}

// ---- controls ---------------------------------------------------------------------------------

/** The play button without a login. Runs inside the click handler. */
export function toggleLocal() {
  if (previewActive && active) return active.engine.toggle()
  const gen = generation
  void (async () => {
    if (!(await hasLocalHistory())) return fail('login')
    patch({ status: 'connecting', error: null })
    if (!(await waitForPlayable(gen))) return fail('noPreview')
    previewActive = true
    await playIndex(0)
  })()
  // unlock audio for Safari / mobile: only a play() started by the gesture itself counts
  const a = audio ?? (audio = new Audio())
  a.src = SILENT
  void a.play().catch(() => undefined)
}

export function skipLocal(direction: 1 | -1) {
  if (!previewActive) return toggleLocal()
  void playIndex(index + direction)
}

export function seekLocal(ms: number) {
  if (previewActive) active?.engine.seek(ms)
}

export const resetLocalState = () => playerStore.setState(() => initialPlayerState)
