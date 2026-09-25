import * as THREE from 'three'
import { canvasTexture, flat, livePosition, makeMaterial, type DeckState, type DeckAction, type HeroModel } from '../build'
import { buildRecord, buildTonearm, drawGrooves, platterSpin } from '../deck'
import type { Look } from '../looks'

/**
 * Pixel – the turntable as a CRT sprite: an 8-colour neon palette, ordered dithering instead of materials,
 * bevelled early-GUI buttons, a bitmap marquee with a blinking cursor, block progress, stepped EQ bars,
 * pixel notes floating up, and a record that turns in 8 frames.
 */
const P = {
  black: '#07050c',
  deep: '#140d22',
  purple: '#2a1a44',
  grey: '#5a4d7a',
  light: '#c8c0e0',
  magenta: '#ff3ea5',
  cyan: '#3ee6ff',
  yellow: '#ffd23e',
  white: '#f4f0ff',
}

const W = 3.3
const D = 3.2
const H = 0.3
const TOP = H / 2
const PLATTER = new THREE.Vector2(-0.4, -0.38)
const PLATTER_R = 1.1
const PLATTER_H = 0.09
const RECORD_R = 1.02
const LABEL = 0.6
/** frames per turn of the record */
const SPIN_FRAMES = 8
const BUTTONS: [DeckAction, number, number][] = [
  ['toggle', -1.3, 0.36],
  ['prev', -0.88, 0.3],
  ['next', -0.52, 0.3],
]
const ROW = 1.0
const EQ = { x: 0.95, z: 1.02, cols: 6, rows: 5, cell: 0.075 }
const PROGRESS = { x: 0.8, z: 1.14, blocks: 8, cell: 0.09 }

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/** Deck top: a 4×4 Bayer-dithered fade from purple to deep, with a one-texel neon outline. */
function plinthTexture() {
  const size = 128
  const { ctx, tex } = canvasTexture(size, size, true)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const k = y / size
      ctx.fillStyle = k * 16 > BAYER[(y % 4) * 4 + (x % 4)]! + 2 ? P.deep : P.purple
      ctx.fillRect(x, y, 1, 1)
    }
  ctx.strokeStyle = P.cyan
  ctx.strokeRect(1.5, 1.5, size - 3, size - 3)
  return tex
}

/** 16×16 pixel icons, drawn as rows of '#'. */
const ICONS: Record<string, string[]> = {
  play: ['.....#', '.....##', '.....###', '.....####', '.....###', '.....##', '.....#'],
  pause: ['....##.##', '....##.##', '....##.##', '....##.##', '....##.##', '....##.##', '....##.##'],
  next: ['....#..#..#', '....##.##.#', '....#####.#', '....##.##.#', '....#..#..#'],
  prev: ['....#..#..#', '....#.##.##', '....#.#####', '....#.##.##', '....#..#..#'],
}

/** Early-GUI button face: light top-left edge, dark bottom-right (swapped when pressed), pixel icon. */
function drawButton(ctx: CanvasRenderingContext2D, icon: string, down: boolean, hot: boolean) {
  ctx.fillStyle = P.light
  ctx.fillRect(0, 0, 16, 16)
  ctx.fillStyle = down ? P.grey : P.white
  ctx.fillRect(0, 0, 16, 1)
  ctx.fillRect(0, 0, 1, 16)
  ctx.fillStyle = down ? P.white : P.grey
  ctx.fillRect(1, 14, 14, 1)
  ctx.fillRect(14, 1, 1, 14)
  ctx.fillStyle = P.black
  ctx.fillRect(0, 15, 16, 1)
  ctx.fillRect(15, 0, 1, 16)
  ctx.fillStyle = hot ? P.magenta : P.black
  const rows = ICONS[icon]!
  const oy = Math.floor((16 - rows.length) / 2) + (down ? 1 : 0)
  rows.forEach((row, y) => [...row].forEach((c, x) => c === '#' && ctx.fillRect(x + (down ? 1 : 0), y + oy, 1, 1)))
}

/** 8×8 eighth-note sprite. */
function noteTexture(color: string) {
  const { ctx, tex } = canvasTexture(8, 8, true)
  ctx.fillStyle = color
  ;['...###', '...#.#', '...#..', '...#..', '...#..', '.###..', '####..', '.##...'].forEach((row, y) =>
    [...row].forEach((c, x) => c === '#' && ctx.fillRect(x, y, 1, 1)),
  )
  return tex
}

/** 3×5 bitmap font – rows of 3 bits, top to bottom. */
const FONT: Record<string, number[]> = {
  A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4],
  G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4], Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5],
  S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2], U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7],
  0: [7, 5, 5, 5, 7], 1: [2, 6, 2, 2, 7], 2: [6, 1, 2, 4, 7], 3: [6, 1, 2, 1, 6], 4: [5, 5, 7, 1, 1], 5: [7, 4, 6, 1, 6],
  6: [3, 4, 7, 5, 7], 7: [7, 1, 2, 2, 2], 8: [7, 5, 7, 5, 7], 9: [7, 5, 7, 1, 6],
  '-': [0, 0, 7, 0, 0], '.': [0, 0, 0, 0, 2], ',': [0, 0, 0, 2, 4], ':': [0, 2, 0, 2, 0], '!': [2, 2, 2, 0, 2],
  '?': [6, 1, 2, 0, 2], "'": [2, 2, 0, 0, 0], '&': [2, 5, 2, 5, 3], '/': [1, 1, 2, 4, 4], '(': [1, 2, 2, 2, 1],
  ')': [4, 2, 2, 2, 4], '>': [4, 2, 1, 2, 4], '+': [0, 2, 7, 2, 0],
}

/** Draws `text` in the 3×5 font, 4 px per character; accents are dropped, anything unknown becomes a "?". */
function drawPixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.fillStyle = color
  const plain = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'D').toUpperCase()
  ;[...plain].forEach((ch, i) => {
    const rows = ch === ' ' ? null : (FONT[ch] ?? FONT['?']!)
    rows?.forEach((bits, ry) => {
      for (let rx = 0; rx < 3; rx++) if (bits & (4 >> rx)) ctx.fillRect(x + i * 4 + rx, y + ry, 1, 1)
    })
  })
}

export function buildPixelDeck(look: Look): HeroModel {
  const toon = (color: string, extra = {}) => makeMaterial({ color, roughness: 1 }, look, extra)
  const m = {
    body: toon('#ffffff', { map: plinthTexture() }),
    deep: toon(P.deep),
    cyan: toon(P.cyan),
    light: toon(P.light),
    grey: toon(P.grey),
    magenta: toon(P.magenta),
    yellow: toon(P.yellow),
  }
  const group = new THREE.Group()
  group.rotation.x = Math.PI / 2
  group.scale.setScalar(3.9 / W)
  const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => {
    o.position.set(x, y, z)
    group.add(o)
    return o
  }
  const box = (w: number, h: number, d: number, mat: THREE.Material | THREE.Material[]) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)

  // plinth: sides flat deep, top dithered
  at(box(W, H, D, [m.deep, m.deep, m.body, m.deep, m.deep, m.deep]), 0, 0, 0)

  // ---- platter: cyan ring, record in 8 frames ----
  const platter = at(new THREE.Group(), PLATTER.x, TOP, PLATTER.y)
  const plate = new THREE.Mesh(flat(look, new THREE.CylinderGeometry(PLATTER_R, PLATTER_R, PLATTER_H, 24)), m.cyan)
  plate.position.y = PLATTER_H / 2
  platter.add(plate)
  const { record, setCover } = buildRecord(look, {
    radius: RECORD_R,
    label: LABEL,
    face: toon('#ffffff'),
    edge: m.deep,
    nearest: true,
    vinylPx: 128,
    labelPx: 32,
    vinyl: (ctx, size) =>
      drawGrooves(ctx, size, { disc: P.black, label: LABEL, line: '#4a1a3a', step: size / 30, dashed: true }),
    placeholder: (ctx, size) => {
      ctx.fillStyle = P.magenta
      ctx.fillRect(0, 0, size, size)
      // a few pixels of "label art" – off-centre so the frames read as a spin
      ctx.fillStyle = P.yellow
      ctx.fillRect(size * 0.44, size * 0.12, size * 0.12, size * 0.25)
      ctx.fillStyle = P.white
      ctx.fillRect(size * 0.3, size * 0.62, 2, 2)
      ctx.fillRect(size * 0.62, size * 0.66, 2, 2)
    },
  })
  record.position.y = PLATTER_H + 0.01
  platter.add(record)
  const spindle = box(0.06, 0.12, 0.06, m.light)
  spindle.position.y = PLATTER_H + 0.06
  platter.add(spindle)

  // ---- chunky arm ----
  const arm = buildTonearm(look, {
    platter: PLATTER,
    recordR: RECORD_R,
    innerR: RECORD_R * LABEL + 0.06,
    pivot: new THREE.Vector2(1.25, -0.98),
    len: 1.6,
    height: TOP + 0.3,
    surface: TOP,
    playRadius: 0.9,
    tube: 0.045,
    mats: { tube: m.light, weight: m.grey, shell: m.magenta, cartridge: m.yellow, base: m.grey },
  })
  group.add(arm.group)

  // ---- bevelled buttons ----
  const buttons = BUTTONS.map(([action, x, s]) => {
    const face = canvasTexture(16, 16, true)
    const top = new THREE.MeshBasicMaterial({ map: face.tex })
    const mesh = at(box(s, 0.08, s, [m.grey, m.grey, top, m.grey, m.grey, m.grey]), x, TOP + 0.04, ROW)
    mesh.userData.action = action
    const state = { action, mesh, face, icon: action === 'toggle' ? 'play' : action, key: '' }
    return state
  })
  const paintButton = (b: (typeof buttons)[number], down: boolean, hot: boolean) => {
    const key = `${b.icon}${down}${hot}`
    if (key === b.key) return
    b.key = key
    drawButton(b.face.ctx, b.icon, down, hot)
    b.face.tex.needsUpdate = true
    b.mesh.position.y = TOP + (down ? 0.02 : 0.04)
  }

  // ---- stepped EQ bars ----
  const eqColors = [m.cyan, m.cyan, m.yellow, m.yellow, m.magenta]
  const eq = Array.from({ length: EQ.cols }, (_, c) =>
    Array.from({ length: EQ.rows }, (_, r) => {
      const cell = at(box(EQ.cell * 0.8, 0.03, EQ.cell * 0.8, eqColors[r]!), EQ.x + c * EQ.cell * 1.2, TOP + 0.015, EQ.z - r * EQ.cell)
      cell.visible = false
      return cell
    }),
  )

  // ---- block progress bar ----
  const blocks = Array.from({ length: PROGRESS.blocks }, (_, i) =>
    at(box(PROGRESS.cell * 0.8, 0.03, PROGRESS.cell * 1.4, m.grey), PROGRESS.x + i * PROGRESS.cell, TOP + 0.015, PROGRESS.z),
  )

  // ---- bitmap marquee with a blinking cursor (3×5 font, one texel per screen pixel) ----
  const CHARS = 20
  const text = canvasTexture(4 * (CHARS + 2), 7, true)
  const MARQUEE_W = 1.8
  const marquee = at(
    new THREE.Mesh(
      new THREE.PlaneGeometry(MARQUEE_W, (MARQUEE_W * text.canvas.height) / text.canvas.width).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: text.tex, transparent: true }),
    ),
    -1.52 + MARQUEE_W / 2,
    TOP + 0.002,
    1.36,
  )
  marquee.raycast = () => {}
  let title = 'INSERT DISC'
  let textKey = ''
  const paintText = (offset: number, cursor: boolean) => {
    const loop = title.length > CHARS ? title.length + 3 : 0
    const shown = loop ? (title + '   ' + title).slice(offset % loop, (offset % loop) + CHARS) : title
    const key = `${shown}|${cursor}`
    if (key === textKey) return
    textKey = key
    const { ctx, canvas } = text
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawPixelText(ctx, '>', 0, 1, P.yellow)
    drawPixelText(ctx, shown, 8, 1, P.cyan)
    if (cursor) {
      ctx.fillStyle = P.yellow
      ctx.fillRect(Math.min(canvas.width - 3, 8 + shown.length * 4), 1, 3, 5)
    }
    text.tex.needsUpdate = true
  }

  // ---- pixel notes floating up from the record ----
  const noteTex = [noteTexture(P.magenta), noteTexture(P.cyan), noteTexture(P.yellow)]
  const notes = noteTex.map((map, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true }))
    s.scale.setScalar(0.28)
    s.visible = false
    s.userData.phase = i / noteTex.length
    group.add(s)
    return s
  })

  const spin = platterSpin()
  let state: DeckState | null = null
  let playing = false

  return {
    group,
    sync(s) {
      state = s
      if (s.playing !== playing) {
        playing = s.playing
        arm.setPlaying(playing)
      }
      title = s.track ? `${s.track.name} - ${s.track.artists}`.toUpperCase() : 'INSERT DISC'
      buttons[0]!.icon = playing ? 'pause' : 'play'
      setCover(s.track?.image)
    },
    grab: (ray) => arm.grab(ray),
    drag: (ray) => arm.drag(ray),
    release: (moved) => arm.release(moved),
    update({ dt, t, beat, beatLevel, calm, reducedMotion, hovered, pressed, flash }) {
      const step = (Math.PI * 2) / SPIN_FRAMES
      platter.rotation.y = Math.round(spin(dt, playing, reducedMotion) / step) * step
      arm.update(dt, t, calm, reducedMotion)

      buttons.forEach((b) => paintButton(b, pressed === b.action && flash > 0.3, hovered === b.action))
      paintText(Math.floor(t * 4), Math.floor(t * 2) % 2 === 0)

      // EQ: column heights in whole blocks, re-rolled a few times a second
      const frame = Math.floor(t * 8)
      eq.forEach((col, c) => {
        const noise = Math.abs(Math.sin(frame * 12.9898 + c * 78.233) * 43758.5453) % 1
        const h = playing ? Math.round(beatLevel * (1 + noise * 3 + beat * 1.5)) : 0
        col.forEach((cell, r) => (cell.visible = r < h))
      })

      const progress = state && state.duration ? livePosition(state) / state.duration : 0
      blocks.forEach((b, i) => (b.material = i < Math.round(progress * PROGRESS.blocks) ? m.cyan : m.grey))

      // notes rise over the record in coarse steps and blink out at the top
      notes.forEach((n, i) => {
        n.visible = playing && !reducedMotion
        if (!n.visible) return
        const p = (t * 0.35 + (n.userData.phase as number)) % 1
        const q = Math.round(p * 10) / 10
        n.position.set(PLATTER.x - 0.6 + i * 0.6 + Math.round(Math.sin(q * 6 + i) * 2) * 0.06, TOP + 0.5, PLATTER.y + 0.5 - q * 1.6)
        n.material.opacity = q > 0.8 ? 0 : 1
      })
    },
  }
}
