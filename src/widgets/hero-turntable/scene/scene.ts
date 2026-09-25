import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { MotionStyle, Skin } from '@/shared/theme'
import { disposeObject, type DeckDeps, type DeckState, type DeckAction, type HeroModel } from './build'
import { buildGlassDeck } from './decks/glass'
import { buildMinimalDeck } from './decks/minimal'
import { buildPixelDeck } from './decks/pixel'
import { buildRetroDeck } from './decks/retro'
import { LOOKS, type DeckKind, type Look } from './looks'

const DECKS: Record<DeckKind, (look: Look, deps: DeckDeps) => HeroModel> = {
  minimal: buildMinimalDeck,
  retro: buildRetroDeck,
  pixel: buildPixelDeck,
  glass: buildGlassDeck,
}

export interface SceneOptions {
  skin: Skin
  motion: MotionStyle
  reducedMotion: boolean
  /** Called synchronously inside the pointerup handler (needed to unlock audio). */
  onAction: (action: DeckAction) => void
  /** jump the playhead by `ms` (the glass skin's record scrub) */
  onSeek: (ms: number) => void
}

export interface TurntableScene {
  /** playback state – drives the record, arm, cover art, titles, progress … */
  sync(state: DeckState): void
  /** 0 → hero fully in view, 1 → scrolled past it */
  setScroll(progress: number): void
  dispose(): void
}

/** Target resolution (CSS px across) for the pixel skin before it is scaled up. */
const PIXEL_WIDTH = 220
/** The pixel skin renders like a sprite: ~10 fps. */
const STEPPED_FPS = 10
const CAMERA_Z = 9.2

/** px the pointer may travel before a press counts as a drag, not a click */
const DRAG_SLOP = 5

const easeOutBack = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2
const quantize = (v: number, steps: number) => Math.round(v * steps) / steps

export function createTurntableScene(canvas: HTMLCanvasElement, opts: SceneOptions): TurntableScene {
  const look = LOOKS[opts.skin]
  const { motion, reducedMotion } = opts
  const calm = motion === 'calm'
  const stepped = motion === 'stepped'

  // throws when WebGL is unavailable – the caller falls back to the static hero
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !look.pixelated, powerPreference: 'low-power' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = look.pixelated ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envMap = look.lights.env > 0 ? pmrem.fromScene(new RoomEnvironment(), 0.04).texture : null
  scene.environment = envMap
  scene.environmentIntensity = look.lights.env

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50)
  camera.position.set(0, 0, CAMERA_Z)

  scene.add(new THREE.HemisphereLight(look.lights.key, look.lights.ambient, look.pixelated ? 1.6 : 0.9))
  const key = new THREE.DirectionalLight(look.lights.key, look.lights.keyIntensity)
  key.position.set(3, 4, 5)
  scene.add(key)
  const rim = new THREE.DirectionalLight(look.lights.rim, 2.2)
  rim.position.set(-4, 2, -3)
  scene.add(rim)

  // rig = scroll + intro transform; each deck sets its own viewing angle (minimal and retro can be turned by hand)
  const rig = new THREE.Group()
  scene.add(rig)

  const deck = DECKS[look.deck](look, { onSeek: opts.onSeek })
  rig.add(deck.group)

  // ---- state ----
  let playing = false
  let scroll = 0
  let scrollSmooth = 0
  let press: { id: number; x: number; y: number; moved: boolean; part: boolean } | null = null
  let hovered: DeckAction | null = null
  let pressed: DeckAction | null = null
  let tap: DeckAction | null = null
  let pressFlash = 0
  let lastTime = 0
  let elapsed = 0
  let intro = reducedMotion ? 1 : 0
  let beatLevel = 0

  // ---- sizing ----
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas
    if (!w || !h) return
    renderer.setPixelRatio(look.pixelated ? Math.min(1, PIXEL_WIDTH / w) : Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    // keep the deck fitting narrow (portrait) containers
    camera.position.z = CAMERA_Z / Math.min(1, camera.aspect)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  // ---- interaction: press a control or grab a part (tonearm) ----
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const aim = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    return raycaster.ray
  }
  // first hit on the whole model, so nothing can be clicked through another part
  const hit = (e: PointerEvent) => {
    aim(e)
    return raycaster.intersectObject(deck.group, true).find((i) => i.object.visible)?.object ?? null
  }
  const actionOf = (o: THREE.Object3D | null) => (o?.userData.action as DeckAction | undefined) ?? null
  const cursorFor = (o: THREE.Object3D | null) => (actionOf(o) ? 'pointer' : o?.userData.grab ? 'grab' : '')

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    const o = hit(e)
    const part = !!o?.userData.grab && !!deck.grab
    if (part) deck.grab!(raycaster.ray, o!)
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, part }
    canvas.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    deck.pointer?.(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    if (!press || press.id !== e.pointerId) {
      if (!press) {
        const o = hit(e)
        hovered = actionOf(o)
        canvas.style.cursor = cursorFor(o)
      }
      return
    }
    if (!press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > DRAG_SLOP) press.moved = true
    if (press.moved) {
      hovered = null
      if (press.part) {
        canvas.style.cursor = 'grabbing'
        deck.drag?.(aim(e))
      }
    }
  }
  const end = (e: PointerEvent, cancelled: boolean) => {
    if (!press || press.id !== e.pointerId) return
    const { moved, part } = press
    press = null
    let action: DeckAction | null = null
    if (part) action = deck.release!(moved)
    else if (!moved) action = actionOf(hit(e))
    canvas.style.cursor = cursorFor(hit(e))
    if (action && !cancelled) {
      pressFlash = 1
      pressed = tap = action
      opts.onAction(action)
    }
  }
  const onUp = (e: PointerEvent) => end(e, false)
  const onCancel = (e: PointerEvent) => end(e, true)
  const onCanvasLeave = () => {
    if (press) return
    hovered = null
    canvas.style.cursor = ''
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onCancel)
  canvas.addEventListener('pointerleave', onCanvasLeave)
  // phones: the tilt moves the glass skin's highlight like the pointer does
  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma === null || e.beta === null) return
    deck.pointer?.(THREE.MathUtils.clamp(e.gamma / 35, -1, 1), THREE.MathUtils.clamp((45 - e.beta) / 35, -1, 1))
  }
  if (deck.pointer) window.addEventListener('deviceorientation', onTilt)

  // ---- loop (paused while off-screen or in a background tab) ----
  let visible = true
  const io = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting
    if (visible) start()
  })
  io.observe(canvas)
  const onVisibility = () => !document.hidden && start()
  document.addEventListener('visibilitychange', onVisibility)

  let raf = 0
  let lastFrame = 0
  const damp = (current: number, target: number, lambda: number, dt: number) =>
    THREE.MathUtils.damp(current, target, lambda, dt)

  const frame = (now: number) => {
    raf = 0
    if (!visible || document.hidden) return
    raf = requestAnimationFrame(frame)
    if (stepped && now - lastFrame < 1000 / STEPPED_FPS) return
    lastFrame = now

    const dt = Math.min((now - (lastTime || now)) / 1000, 0.1)
    lastTime = now
    elapsed += dt
    const t = stepped ? quantize(elapsed, STEPPED_FPS) : elapsed

    // intro pop
    if (intro < 1) intro = Math.min(1, intro + dt / (calm ? 0.5 : 1.3))
    const introScale = calm ? 0.92 + 0.08 * intro : easeOutBack(intro)

    // scroll: sink and shrink as the hero leaves the viewport – no turning
    scrollSmooth = reducedMotion ? scroll : damp(scrollSmooth, scroll, 6, dt)
    const p = stepped ? quantize(scrollSmooth, 16) : scrollSmooth
    rig.position.set(0, -p * (calm || reducedMotion ? 0.4 : 1.1), 0)
    rig.scale.setScalar(Math.max(0.01, introScale * (1 - p * (calm ? 0.1 : 0.3))))

    // playback: the model's own animation (bass pulse, LEDs, record, tonearm …)
    const beat = playing && !reducedMotion ? Math.abs(Math.sin(t * Math.PI * 2.05)) ** 6 : 0
    beatLevel = damp(beatLevel, playing ? 1 : 0, 4, dt)
    // controls: each deck shows hover / press its own way
    deck.update({ dt, t, beat, beatLevel, calm, reducedMotion, hovered, pressed, tap, flash: pressFlash })
    tap = null
    pressFlash = Math.max(0, pressFlash - dt * 4)

    renderer.render(scene, camera)
  }
  const start = () => {
    if (!raf) {
      // don't count the time spent paused
      lastTime = 0
      raf = requestAnimationFrame(frame)
    }
  }
  start()

  return {
    sync(state) {
      playing = state.playing
      deck.sync(state)
    },
    setScroll(progress) {
      scroll = progress
    },
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onCancel)
      canvas.removeEventListener('pointerleave', onCanvasLeave)
      window.removeEventListener('deviceorientation', onTilt)
      disposeObject(scene)
      envMap?.dispose()
      pmrem.dispose()
      renderer.dispose()
    },
  }
}
