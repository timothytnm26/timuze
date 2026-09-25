import * as THREE from 'three'
import type { PlayerState } from '@/features/web-player'
import type { Look, MaterialSpec } from './looks'

export type DeckAction = 'toggle' | 'next' | 'prev'

/** What a deck needs to know about playback. */
export type DeckState = Pick<PlayerState, 'playing' | 'track' | 'position' | 'duration' | 'updatedAt'>

/** Per-frame input for a hero model's own animation. */
export interface FrameState {
  dt: number
  /** elapsed seconds (quantized for the stepped motion style) */
  t: number
  /** 0..1 bass pulse, 0 while paused */
  beat: number
  /** eases 0 → 1 when playback starts */
  beatLevel: number
  calm: boolean
  reducedMotion: boolean
  /** control under the pointer */
  hovered: DeckAction | null
  /** control pressed last, with `flash` fading 1 → 0 right after the press */
  pressed: DeckAction | null
  flash: number
  /** control pressed since the previous frame (set for one frame only) */
  tap: DeckAction | null
}

export interface DeckDeps {
  /** jump the playhead by `ms` (negative = back) */
  onSeek(ms: number): void
}

/** The 3D object in the hero – a turntable, styled per skin. Parts with `userData.action` are controls. */
export interface HeroModel {
  group: THREE.Group
  sync(state: DeckState): void
  update(f: FrameState): void
  /** A part with `userData.grab` was pressed – the model takes over the drag. */
  grab?(ray: THREE.Ray, part: THREE.Object3D): void
  /** pointer ray in world space while a grabbed part is dragged */
  drag?(ray: THREE.Ray): void
  /** drag over; `moved` is false for a plain click. Returns what to do with playback. */
  release?(moved: boolean): DeckAction | null
  /** pointer over the canvas, −1..1 on both axes (y up) */
  pointer?(x: number, y: number): void
}

/** Playhead in ms right now, from the last reported position. */
export const livePosition = (s: DeckState) =>
  Math.min(s.duration, s.position + (s.playing && s.updatedAt ? Date.now() - s.updatedAt : 0))

/** Keeps the latest album art for a canvas texture; `draw(null)` when there's none or it can't be drawn. */
export function coverLoader(draw: (img: HTMLImageElement | null) => void) {
  let current: string | undefined
  return (url: string | undefined) => {
    if (url === current) return
    current = url
    if (!url) return draw(null)
    const img = new Image()
    // needed to draw it onto a texture canvas (Spotify's CDN sends CORS headers)
    img.crossOrigin = 'anonymous'
    img.onload = () => current === url && draw(img)
    img.onerror = () => current === url && draw(null)
    img.src = url
  }
}

/** Draws `img` into the square/rect at (x, y, w, h), cropped to fill it. */
export function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height)
  ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s)
}

/** Average colour of the cover – tints the glass skin. */
export function coverTint(img: HTMLImageElement) {
  const c = document.createElement('canvas')
  c.width = c.height = 1
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return new THREE.Color(`rgb(${r}, ${g}, ${b})`)
}

/** Canvas + texture pair; `nearest` keeps hard pixels (pixel skin). */
export function canvasTexture(w: number, h = w, nearest = false) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  if (nearest) {
    tex.magFilter = tex.minFilter = THREE.NearestFilter
    tex.generateMipmaps = false
  }
  return { canvas, ctx: canvas.getContext('2d')!, tex }
}

/** A skin font from the CSS tokens, for text drawn on textures. */
export const skinFont = (token: 'sans' | 'display' | 'mono') =>
  getComputedStyle(document.documentElement).getPropertyValue(`--skin-font-${token}`).trim() || 'sans-serif'

/** Redraws once the page's web fonts are in, so canvas text doesn't stay in the fallback face. */
export const whenFontsReady = (redraw: () => void) => void document.fonts?.ready.then(redraw)

let toonGradient: THREE.DataTexture | null = null
/** 3-step light ramp for the pixel skin's toon shading. */
const getToonGradient = () => {
  if (toonGradient) return toonGradient
  toonGradient = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat)
  toonGradient.minFilter = toonGradient.magFilter = THREE.NearestFilter
  toonGradient.needsUpdate = true
  return toonGradient
}

type Extra = { emissive?: string; emissiveIntensity?: number; map?: THREE.Texture }

export function makeMaterial(spec: MaterialSpec, look: Look, extra: Extra = {}) {
  if (look.pixelated) return new THREE.MeshToonMaterial({ color: spec.color, gradientMap: getToonGradient(), ...extra })
  if (spec.transmission || spec.iridescence || spec.clearcoat)
    return new THREE.MeshPhysicalMaterial({
      color: spec.color,
      roughness: spec.roughness,
      metalness: spec.metalness ?? 0,
      transmission: spec.transmission ?? 0,
      thickness: spec.thickness ?? 0,
      ior: spec.ior ?? 1.45,
      iridescence: spec.iridescence ?? 0,
      iridescenceIOR: 1.3,
      clearcoat: spec.clearcoat ?? 0,
      clearcoatRoughness: 0.2,
      ...extra,
    })
  return new THREE.MeshStandardMaterial({
    color: spec.color,
    roughness: spec.roughness,
    metalness: spec.metalness ?? 0,
    ...extra,
  })
}

export const flat = (look: Look, geo: THREE.BufferGeometry) => (look.pixelated ? geo.toNonIndexed() : geo)

/** Rounded rectangle outline in the XY plane, centred on the origin. */
export function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  r = Math.min(r, w / 2, h / 2)
  if (r <= 0) {
    s.moveTo(-w / 2, -h / 2)
    s.lineTo(w / 2, -h / 2)
    s.lineTo(w / 2, h / 2)
    s.lineTo(-w / 2, h / 2)
    return s
  }
  s.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2)
  s.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI)
  s.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5)
  s.absarc(w / 2 - r, -h / 2 + r, r, Math.PI * 1.5, Math.PI * 2)
  return s
}

/**
 * Deck coordinates: the top faces +y, the front edge is +z (the whole deck is tipped to face the camera, so −z is
 * "up" on screen). Shapes drawn in XY are laid into XZ with their +y pointing to −z, i.e. upright on screen.
 */
export const layFlat = (geo: THREE.BufferGeometry) => geo.rotateX(-Math.PI / 2)

/** w × d slab of height h centred on the origin, corners rounded by r. */
export function slab(look: Look, w: number, d: number, h: number, r: number, bevel = 0) {
  if (r <= 0 && !bevel) return flat(look, new THREE.BoxGeometry(w, h, d))
  const geo = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, d - bevel * 2, Math.max(0, r - bevel)), {
    depth: h - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: Math.max(3, look.segments / 4),
  })
  // extrusion (+z) becomes +y; the shape's y becomes −z
  layFlat(geo).translate(0, -h / 2 + bevel, 0)
  return flat(look, geo)
}

/**
 * Soft contact shadow under a deck seen at an angle: a blurred dark rounded rect lying at `y`,
 * a bit larger than the w × d footprint. Not raycast.
 */
export function contactShadow(w: number, d: number, y: number, opacity = 0.55) {
  const pad = 0.5
  const px = 256
  const { ctx, canvas, tex } = canvasTexture(px, Math.round((px * (d + pad * 2)) / (w + pad * 2)))
  const k = canvas.width / (w + pad * 2)
  ctx.filter = `blur(${pad * k * 0.45}px)`
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.roundRect(pad * k, pad * k, w * k, d * k, 0.2 * k)
  ctx.fill()
  const mesh = new THREE.Mesh(decal(w + pad * 2, d + pad * 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false }))
  mesh.position.y = y
  mesh.raycast = () => {}
  return mesh
}

/** A flat plane lying on the deck top (facing +y), upright on screen. */
export const decal = (w: number, d: number) => layFlat(new THREE.PlaneGeometry(w, d))

/** Extruded glyph lying on the deck, its drawing upright on screen. */
export function glyph(shapes: THREE.Shape[], material: THREE.Material, depth = 0.015, flip = false) {
  const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false })
  geo.center()
  layFlat(geo)
  if (flip) geo.rotateY(Math.PI)
  return new THREE.Mesh(geo, material)
}

export const triangle = (x: number, w: number, h: number) =>
  new THREE.Shape([new THREE.Vector2(x, -h / 2), new THREE.Vector2(x + w, 0), new THREE.Vector2(x, h / 2)])

export const bar = (x: number, w: number, h: number) =>
  new THREE.Shape([
    new THREE.Vector2(x, -h / 2),
    new THREE.Vector2(x + w, -h / 2),
    new THREE.Vector2(x + w, h / 2),
    new THREE.Vector2(x, h / 2),
  ])

/** ▶ / ❚❚ / ⏭ shapes, `s` = overall size */
export const icons = {
  play: (s: number) => [triangle(0, s * 0.86, s)],
  pause: (s: number) => [bar(-s * 0.43, s * 0.3, s * 0.92), bar(s * 0.13, s * 0.3, s * 0.92)],
  skip: (s: number) => [triangle(-s * 0.55, s * 0.5, s * 0.7), triangle(-s * 0.05, s * 0.5, s * 0.7), bar(s * 0.45, s * 0.14, s * 0.7)],
}

/** Underdamped spring step (the glass skin's wobble), sub-stepped so long frames can't blow it up. */
export function spring(state: { x: number; v: number }, target: number, dt: number, stiffness = 180, damping = 12) {
  for (let left = dt; left > 0; left -= 1 / 240) {
    const h = Math.min(left, 1 / 240)
    state.v += (stiffness * (target - state.x) - damping * state.v) * h
    state.x += state.v * h
  }
  return state.x
}

export function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite)) return
    o.geometry.dispose()
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    mats.forEach((m: THREE.Material & Record<string, unknown>) => {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose()
      m.dispose()
    })
  })
}
