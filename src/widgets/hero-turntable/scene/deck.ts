import * as THREE from 'three'
import { canvasTexture, coverLoader, drawCover, flat, type DeckAction } from './build'
import type { Look } from './looks'

/** 33⅓ rpm */
export const RPM33 = (100 / 3 / 60) * Math.PI * 2

export interface RecordOptions {
  radius: number
  /** label radius as a share of the record – the cover art goes here */
  label: number
  face: THREE.Material
  edge: THREE.Material
  /** draws the vinyl side (grooves) into a square canvas – the cap UVs span all of it */
  vinyl(ctx: CanvasRenderingContext2D, size: number): void
  /** label without cover art */
  placeholder(ctx: CanvasRenderingContext2D, size: number): void
  vinylPx?: number
  labelPx?: number
  /** hard pixels (pixel skin) */
  nearest?: boolean
}

/** Record: vinyl side + a big label showing the cover art, unlit so the art keeps its colours. */
export function buildRecord(look: Look, o: RecordOptions) {
  const vinylPx = o.vinylPx ?? 1024
  const vinyl = canvasTexture(vinylPx, vinylPx, o.nearest)
  o.vinyl(vinyl.ctx, vinylPx)
  const face = o.face as THREE.MeshStandardMaterial
  face.map = vinyl.tex
  const record = new THREE.Mesh(new THREE.CylinderGeometry(o.radius, o.radius, 0.02, look.segments * 3), [o.edge, face, face])

  const px = o.labelPx ?? 512
  const art = canvasTexture(px, px, o.nearest)
  const draw = (cover: HTMLImageElement | null) => {
    art.ctx.clearRect(0, 0, px, px)
    if (cover) drawCover(art.ctx, cover, 0, 0, px, px)
    else o.placeholder(art.ctx, px)
    art.tex.needsUpdate = true
  }
  draw(null)
  // CircleGeometry's +y ends up at −z (up on screen): the art is upright
  const label = new THREE.Mesh(
    new THREE.CircleGeometry(o.radius * o.label, look.segments * 3).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: art.tex, toneMapped: false }),
  )
  label.position.y = 0.012
  record.add(label)
  return { record, setCover: coverLoader(draw) }
}

/** Concentric grooves between the label and the rim, with a couple of wider gaps between "tracks". */
export function drawGrooves(
  ctx: CanvasRenderingContext2D,
  size: number,
  o: { disc: string; label: number; line: string; gaps?: string; step?: number; dashed?: boolean },
) {
  const c = size / 2
  const k = size / 1024
  ctx.fillStyle = o.disc
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = o.line
  ctx.lineWidth = Math.max(1, 1.5 * k)
  let i = 0
  for (let r = c * o.label * 1.04; r < c * 0.97; r += o.step ?? size / 180) {
    ctx.beginPath()
    // staggered, broken rings (pixel skin): each ring starts somewhere else
    if (o.dashed) ctx.arc(c, c, r, i * 1.3, i * 1.3 + Math.PI * 1.4)
    else ctx.arc(c, c, r, 0, Math.PI * 2)
    ctx.stroke()
    i++
  }
  if (!o.gaps) return
  ctx.strokeStyle = o.gaps
  ctx.lineWidth = Math.max(2, 4 * k)
  ;[0.74, 0.87].forEach((f) => {
    ctx.beginPath()
    ctx.arc(c, c, c * f, 0, Math.PI * 2)
    ctx.stroke()
  })
}

export interface ArmOptions {
  /** record centre and radius (x, z on the deck) */
  platter: THREE.Vector2
  recordR: number
  /** innermost groove the stylus may reach (distance from the spindle) */
  innerR: number
  pivot: THREE.Vector2
  len: number
  /** height of the arm above the deck origin */
  height: number
  /** deck top the base stands on */
  surface: number
  /** yaw while parked on its rest, just outside the record */
  rest?: number
  /** groove the stylus drops into when playback starts from elsewhere */
  playRadius: number
  mats: { tube: THREE.Material; weight: THREE.Material; shell: THREE.Material; cartridge: THREE.Material; base: THREE.Material }
  tube?: number
  /** headshell size (retro has a big one) */
  shell?: number
  /** swing speed when not dragged */
  swing?: number
  /** the stylus trembles in the groove (retro) */
  tremble?: boolean
  /** plain round pivot instead of the gimbal ball + lift lever (minimal) */
  plain?: boolean
}

/** a released arm only waits this long (s) for playback to follow before it returns */
const PENDING = 4
/** how far the arm is raised while it swings */
const LIFT = 0.08

/**
 * Tonearm: yaw (swing) → pitch (lift) → arm. Drag it onto the record to play, back to the rest to stop;
 * a plain click toggles. Parts carry `userData.grab`.
 */
export function buildTonearm(look: Look, o: ArmOptions) {
  const seg = look.segments
  const restAngle = o.rest ?? 0.05
  const tubeR = o.tube ?? 0.03
  const shellK = o.shell ?? 1
  const group = new THREE.Group()

  const base = new THREE.Mesh(flat(look, new THREE.CylinderGeometry(0.24, 0.26, 0.06, seg)), o.mats.base)
  base.position.set(o.pivot.x, o.surface + 0.03, o.pivot.y)
  base.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, (o.height - o.surface) * 2 - 0.06, 16), o.mats.base))
  group.add(base)
  const yaw = new THREE.Group()
  yaw.position.set(o.pivot.x, o.height, o.pivot.y)
  yaw.rotation.y = restAngle
  group.add(yaw)
  const pitch = new THREE.Group()
  yaw.add(pitch)
  pitch.add(
    new THREE.Mesh(
      o.plain ? new THREE.CylinderGeometry(0.09, 0.09, 0.08, seg) : new THREE.SphereGeometry(0.1, 16, 12),
      o.mats.weight,
    ),
  )
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(tubeR, tubeR, o.len + 0.3, 16), o.mats.tube)
  tube.rotation.x = Math.PI / 2
  tube.position.z = (o.len - 0.3) / 2
  pitch.add(tube)
  const weight = new THREE.Mesh(flat(look, new THREE.CylinderGeometry(0.12, 0.12, 0.2, seg)), o.mats.weight)
  weight.rotation.x = Math.PI / 2
  weight.position.z = -0.35
  pitch.add(weight)
  // headshell, angled towards the spindle (the arm's one bend), cartridge underneath
  const shell = new THREE.Group()
  shell.position.z = o.len
  shell.rotation.y = -0.35
  shell.scale.setScalar(shellK)
  pitch.add(shell)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.26), o.mats.shell)
  head.position.set(0, -0.05, 0.02)
  shell.add(head)
  const cart = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.14), o.mats.cartridge)
  cart.position.set(0, -0.11, 0.02)
  shell.add(cart)
  const stylus = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 6), o.mats.tube)
  stylus.rotation.x = Math.PI
  stylus.position.set(0, -0.172, 0.06)
  shell.add(stylus)
  if (!o.plain) {
    const lift = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.03), o.mats.tube)
    lift.position.set(0.12, -0.04, 0.02)
    shell.add(lift)
  }
  // rest post the arm parks on
  const postH = o.height - o.surface - 0.03
  const rest = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, postH, 12), o.mats.base)
  rest.position.set(o.pivot.x + Math.sin(restAngle) * 1.2, o.surface + postH / 2, o.pivot.y + Math.cos(restAngle) * 1.2)
  group.add(rest)

  pitch.traverse((p) => (p.userData.grab = true))

  /** Yaw at which the stylus sits `radius` from the spindle (the arm swings inward = negative yaw). */
  const angleFor = (radius: number) => {
    const tip = new THREE.Vector2()
    for (let a = 0; a > -Math.PI / 2; a -= 0.002) {
      tip.set(o.pivot.x + Math.sin(a) * o.len, o.pivot.y + Math.cos(a) * o.len)
      if (tip.distanceTo(o.platter) <= radius) return a
    }
    return -0.6
  }
  const PLAY_ANGLE = angleFor(o.playRadius)
  /** past this (inward) the stylus is over the record */
  const ON_RECORD = angleFor(o.recordR - 0.03)
  const INNER = angleFor(o.innerR)
  const clampArm = (a: number) => THREE.MathUtils.clamp(a, INNER, restAngle + 0.02)

  let playing = false
  let clock = 0
  // where the arm was dropped – stays there while playing
  let dropAngle: number | null = null
  // after a release, hold the arm where the user put it until playback follows
  let pending: { angle: number; playing: boolean; until: number } | null = null
  let dragging = false
  let dragAngle = restAngle
  let grabOffset = 0

  const inverse = new THREE.Matrix4()
  const local = new THREE.Ray()
  const point = new THREE.Vector3()
  /** arm yaw under the pointer, on the arm's horizontal plane (in the deck's space) */
  const angleAt = (ray: THREE.Ray) => {
    const deck = group.parent!
    deck.updateWorldMatrix(true, false)
    local.copy(ray).applyMatrix4(inverse.copy(deck.matrixWorld).invert())
    if (Math.abs(local.direction.y) < 1e-4) return null
    const t = (o.height - local.origin.y) / local.direction.y
    if (t < 0) return null
    local.at(t, point)
    return Math.atan2(point.x - o.pivot.x, point.z - o.pivot.y)
  }

  return {
    group,
    setPlaying(next: boolean) {
      playing = next
      if (pending?.playing === next) pending = null
      if (!next) dropAngle = null
    },
    grab(ray: THREE.Ray) {
      dragging = true
      dragAngle = yaw.rotation.y
      const a = angleAt(ray)
      grabOffset = a === null ? 0 : dragAngle - a
    },
    drag(ray: THREE.Ray) {
      const a = angleAt(ray)
      if (a !== null) dragAngle = clampArm(a + grabOffset)
    },
    release(moved: boolean): DeckAction | null {
      dragging = false
      // a plain click on the arm toggles: rest → default groove, record → rest
      const onRecord = moved ? dragAngle <= ON_RECORD : yaw.rotation.y > ON_RECORD
      const angle = onRecord ? (moved ? dragAngle : PLAY_ANGLE) : restAngle
      dropAngle = onRecord ? angle : null
      pending = { angle, playing: onRecord, until: clock + PENDING }
      return onRecord !== playing ? 'toggle' : null
    },
    update(dt: number, t: number, calm: boolean, reducedMotion: boolean) {
      clock += dt
      if (pending && clock > pending.until) pending = null
      // follows the hand while dragged (lifted), otherwise swings to where playback says and drops
      const target = dragging ? dragAngle : (pending?.angle ?? (playing ? (dropAngle ?? PLAY_ANGLE) : restAngle))
      if (reducedMotion && !dragging) {
        yaw.rotation.y = target
        pitch.rotation.x = 0
        return
      }
      yaw.rotation.y = THREE.MathUtils.damp(yaw.rotation.y, target, dragging ? 20 : (o.swing ?? (calm ? 4 : 2.4)), dt)
      const lifted = dragging ? 1 : Math.min(1, Math.abs(yaw.rotation.y - target) * 8)
      pitch.rotation.x = THREE.MathUtils.damp(pitch.rotation.x, -LIFT * lifted, o.swing ? o.swing * 2 : 10, dt)
      // riding the groove: a faint mechanical tremble
      if (o.tremble && playing && !dragging && lifted < 0.05) {
        yaw.rotation.y += Math.sin(t * 41) * 0.0012 + Math.sin(t * 13.7) * 0.0008
        pitch.rotation.x += Math.sin(t * 57) * 0.002
      }
    },
  }
}

/** Platter speed: spins up / coasts down; the record is what the eye follows, so it turns even with reduced motion. */
export function platterSpin(rpm = RPM33) {
  let speed = 0
  let angle = 0
  return (dt: number, playing: boolean, reducedMotion: boolean, wobble = 0) => {
    speed = reducedMotion ? (playing ? rpm : 0) : THREE.MathUtils.damp(speed, playing ? rpm : 0, playing ? 2.5 : 1.2, dt)
    angle -= speed * (1 + wobble) * dt
    return angle
  }
}

/**
 * Turn a deck by hand about its own up axis: every part that isn't a control or already grabbable becomes a
 * `grab = 'turn'` handle. Only `rotation.y` changes – the tilt stays, so the deck is always seen from above and its
 * underside never shows. Let go mid-swing and it coasts to a stop. Call after the whole deck is built.
 */
export function handTurn(group: THREE.Group, yaw0: number, rate = 1.4) {
  group.traverse((o) => {
    if (!o.userData.action && !o.userData.grab) o.userData.grab = 'turn'
  })
  // pointer x on the plane through the deck's centre, facing the camera
  const facing = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const hitX = (ray: THREE.Ray) => ray.intersectPlane(facing, new THREE.Vector3())?.x ?? null
  let yaw = yaw0
  /** rad / s left over when it's let go */
  let speed = 0
  let turn: { x: number; yaw: number; lastYaw: number; lastT: number } | null = null
  return {
    /** a drag of the deck itself is in progress */
    get active() {
      return turn !== null
    },
    owns: (part: THREE.Object3D) => part.userData.grab === 'turn',
    grab(ray: THREE.Ray) {
      const x = hitX(ray)
      speed = 0
      turn = x === null ? null : { x, yaw, lastYaw: yaw, lastT: performance.now() }
    },
    drag(ray: THREE.Ray) {
      const x = hitX(ray)
      if (!turn || x === null) return
      const now = performance.now()
      const next = turn.yaw + (x - turn.x) * rate
      const dt = (now - turn.lastT) / 1000
      if (dt > 0) speed = THREE.MathUtils.lerp(speed, (next - turn.lastYaw) / dt, 0.5)
      turn.lastYaw = yaw = next
      turn.lastT = now
    },
    release(moved: boolean) {
      // a plain click on the body does nothing; held still before letting go → no coasting
      if (!turn || !moved || performance.now() - turn.lastT > 80) speed = 0
      turn = null
    },
    update(dt: number, reducedMotion: boolean) {
      if (!turn) {
        if (reducedMotion) speed = 0
        yaw += speed * dt
        speed = THREE.MathUtils.damp(speed, 0, 4, dt)
      }
      group.rotation.y = yaw
    },
  }
}
