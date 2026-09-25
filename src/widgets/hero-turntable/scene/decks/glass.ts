import * as THREE from 'three'
import {
  canvasTexture,
  coverLoader,
  coverTint,
  decal,
  drawCover,
  glyph,
  icons,
  livePosition,
  skinFont,
  slab,
  spring,
  whenFontsReady,
  type DeckDeps,
  type DeckState,
  type DeckAction,
  type HeroModel,
} from '../build'
import type { Look } from '../looks'

/**
 * Glass – a record made of glass, face-on: a thick clear disc with a rounded rim, fine grooves and the cover art on
 * its label, a glass tonearm swinging in from the top right. Behind it the song's cover floats, half under the disc,
 * so you see it sharp beside the glass and bent, blurred and colour-split through it; a soft glow in the cover's
 * colours lights the whole thing. Below: a hairline progress bar (drag it to seek) and a glass pill with
 * ⏮ · a glass lens with ▶/❚❚ · ⏭. Pointer (or tilt) leans the whole piece a little so the refraction shifts.
 */
/** record centre (x, z), radius, thickness, label radius */
const CENTER = new THREE.Vector2(0, -0.5)
const R = 2.0
const DISC_H = 0.18
const DISC_TOP = DISC_H / 2
const LABEL = 0.75
/** the floating cover: centre, size, depth behind the disc, in-plane tilt */
const COVER = { x: -1.55, z: -1.8, s: 2.1, y: -0.6, tilt: -0.12 }
/** glass tonearm: pivot (x, z), length to the headshell, height above the disc, parked yaw */
const ARM = { pivot: new THREE.Vector2(2.0, -2.42), len: 2.64, y: 0.34, rest: 0.06 }
const BAR = { z: 1.8, from: -1.5, to: 1.5 }
const PILL = { z: 2.4, w: 3.0, d: 0.74, h: 0.12 }
const CONTROLS: { action: DeckAction; x: number; r: number }[] = [
  { action: 'prev', x: -0.85, r: 0.22 },
  { action: 'toggle', x: 0, r: 0.33 },
  { action: 'next', x: 0.85, r: 0.22 },
]
/** no cover yet: the reference's sunset → violet → teal */
const PLACEHOLDER = ['#ff6a3d', '#8a5cc8', '#1ec8a0']
const FALLBACK = '#ff8a4d'

/** Disc with a fully rounded rim, spun around y – the rim is where the glass bends the light most. */
function discGeometry(r: number, h: number, segments: number) {
  const e = h / 2
  const pts = [new THREE.Vector2(0.0001, -e)]
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 12
    pts.push(new THREE.Vector2(r - e + Math.cos(a) * e, Math.sin(a) * e))
  }
  pts.push(new THREE.Vector2(0.0001, e))
  return new THREE.LatheGeometry(pts, segments)
}

/** A flat circle lying on the deck top, its canvas upright on screen. */
const disc = (r: number, segments = 96) => new THREE.CircleGeometry(r, segments).rotateX(-Math.PI / 2)

function placeholderArt(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const g = ctx.createLinearGradient(x, y, x + s, y + s)
  PLACEHOLDER.forEach((c, i) => g.addColorStop(i / (PLACEHOLDER.length - 1), c))
  ctx.fillStyle = g
  ctx.fillRect(x, y, s, s)
}

export function buildGlassDeck(look: Look, deps: DeckDeps): HeroModel {
  const group = new THREE.Group()
  group.rotation.x = Math.PI / 2
  group.scale.setScalar(0.8)
  const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => {
    o.position.set(x, y, z)
    group.add(o)
    return o
  }
  const white = (opacity = 1) => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity, depthWrite: false, toneMapped: false })
  const noHit = (...os: THREE.Object3D[]) => os.forEach((o) => (o.raycast = () => {}))
  let cover: HTMLImageElement | null = null

  // ---- far back: a soft glow in the cover's colours (the cover shrunk to a few pixels, blown up, faded at the edge).
  // Additive and not "transparent", so it's drawn with the opaque pass and the glass refracts it too ----
  const glow = canvasTexture(256, 256)
  const tiny = document.createElement('canvas')
  tiny.width = tiny.height = 10
  const paintGlow = () => {
    const t = tiny.getContext('2d')!
    if (cover) drawCover(t, cover, 0, 0, 10, 10)
    else placeholderArt(t, 0, 0, 10)
    const { ctx } = glow
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, 256, 256)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(tiny, 0, 0, 256, 256)
    ctx.globalCompositeOperation = 'destination-in'
    const fade = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    fade.addColorStop(0, 'rgba(0,0,0,1)')
    fade.addColorStop(0.5, 'rgba(0,0,0,0.55)')
    fade.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = fade
    ctx.fillRect(0, 0, 256, 256)
    glow.tex.needsUpdate = true
  }
  const glowMat = new THREE.MeshBasicMaterial({ map: glow.tex, color: '#b0b0b0', blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  const glowMesh = at(new THREE.Mesh(decal(8, 8), glowMat), 0, -1.6, -0.2)
  noHit(glowMesh)

  // ---- the cover, floating behind and partly under the disc: sharp where it's clear of the glass ----
  const art = canvasTexture(512, 512)
  const paintArt = () => {
    const { ctx } = art
    ctx.clearRect(0, 0, 512, 512)
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(0, 0, 512, 512, 44)
    ctx.clip()
    if (cover) drawCover(ctx, cover, 0, 0, 512, 512)
    else {
      placeholderArt(ctx, 0, 0, 512)
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.font = `700 200px ${skinFont('display')}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('♪', 256, 256)
    }
    ctx.restore()
    art.tex.needsUpdate = true
  }
  // alphaTest keeps it in the opaque pass (so the glass sees it) with its rounded corners cut out
  const coverMesh = at(new THREE.Mesh(decal(COVER.s, COVER.s), new THREE.MeshBasicMaterial({ map: art.tex, alphaTest: 0.5, toneMapped: false })), COVER.x, COVER.y, COVER.z)
  coverMesh.rotation.y = COVER.tilt
  noHit(coverMesh)

  // ---- the record: thick clear glass, grooves, the cover on its label ----
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transmission: 1,
    roughness: 0.22,
    thickness: 0.9,
    ior: 1.5,
    dispersion: 6,
    specularIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  })
  const platter = at(new THREE.Group(), CENTER.x, 0, CENTER.y)
  const record = new THREE.Mesh(discGeometry(R, DISC_H, look.segments * 2), glassMat)
  record.userData.action = 'toggle'
  platter.add(record)

  // fine rings etched into the top, a few brighter ones between "tracks"
  const grooves = canvasTexture(1024, 1024)
  {
    const { ctx } = grooves
    const c = 512
    for (let r = c * (LABEL / R) * 1.08; r < c * 0.94; r += 3.4) {
      ctx.strokeStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.06})`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(c, c, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 2.5
    for (const f of [0.55, 0.7, 0.84]) {
      ctx.beginPath()
      ctx.arc(c, c, c * f, 0, Math.PI * 2)
      ctx.stroke()
    }
    grooves.tex.needsUpdate = true
  }
  const grooveMesh = new THREE.Mesh(disc(R), white(1))
  ;(grooveMesh.material as THREE.MeshBasicMaterial).map = grooves.tex
  grooveMesh.position.y = DISC_TOP + 0.002
  platter.add(grooveMesh)

  // label: the cover art, and a bead near the rim so the spin shows
  const label = canvasTexture(512, 512)
  const paintLabel = () => {
    const { ctx } = label
    if (cover) drawCover(ctx, cover, 0, 0, 512, 512)
    else {
      placeholderArt(ctx, 0, 0, 512)
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = `700 40px ${skinFont('sans')}`
      ctx.textAlign = 'center'
      ctx.letterSpacing = '10px'
      ctx.fillText('SIDE A', 256, 170)
    }
    label.tex.needsUpdate = true
  }
  const labelMesh = new THREE.Mesh(disc(LABEL), new THREE.MeshBasicMaterial({ map: label.tex, toneMapped: false }))
  labelMesh.position.y = DISC_TOP + 0.004
  labelMesh.userData.action = 'toggle'
  platter.add(labelMesh)
  const marker = new THREE.Mesh(disc(0.045, 16), white(0.85))
  marker.position.set(0, DISC_TOP + 0.004, -(R - 0.2))
  platter.add(marker)
  noHit(grooveMesh, marker)

  // light that doesn't turn with the record: two soft wedges on the glass, a band across the label, the rim line,
  // a pearl on the spindle
  const sheen = canvasTexture(512, 512)
  {
    const { ctx } = sheen
    const g = ctx.createConicGradient(-Math.PI / 4, 256, 256)
    for (const [stop, a] of [
      [0, 0],
      [0.06, 0.16],
      [0.14, 0],
      [0.5, 0],
      [0.56, 0.1],
      [0.64, 0],
      [1, 0],
    ] as const)
      g.addColorStop(stop, `rgba(255,255,255,${a})`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(256, 256, 250, 0, Math.PI * 2)
    ctx.arc(256, 256, 256 * (LABEL / R), 0, Math.PI * 2, true)
    ctx.fill()
    sheen.tex.needsUpdate = true
  }
  const sheenMesh = at(new THREE.Mesh(disc(R), white(1)), CENTER.x, DISC_TOP + 0.006, CENTER.y)
  ;(sheenMesh.material as THREE.MeshBasicMaterial).map = sheen.tex
  const band = canvasTexture(256, 256)
  {
    const { ctx } = band
    ctx.beginPath()
    ctx.arc(128, 128, 128, 0, Math.PI * 2)
    ctx.clip()
    ctx.translate(128, 128)
    ctx.rotate(-0.28)
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.fillRect(-160, 18, 320, 34)
    band.tex.needsUpdate = true
  }
  const bandMesh = at(new THREE.Mesh(disc(LABEL), white(1)), CENTER.x, DISC_TOP + 0.008, CENTER.y)
  ;(bandMesh.material as THREE.MeshBasicMaterial).map = band.tex
  const rim = at(new THREE.Mesh(new THREE.TorusGeometry(R - DISC_H * 0.15, 0.008, 8, 160).rotateX(Math.PI / 2), white(0.55)), CENTER.x, DISC_TOP * 0.7, CENTER.y)
  const pearlMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 1 })
  const spindle = at(new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), pearlMat), CENTER.x, DISC_TOP + 0.03, CENTER.y)
  spindle.scale.y = 0.6
  noHit(sheenMesh, bandMesh, rim, spindle)

  // ---- glass tonearm: a clear pivot disc with a pearl, a tinted bar, a glass headshell ----
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    iridescence: 0.4,
    iridescenceIOR: 1.3,
    specularIntensity: 1,
  })
  const pivot = at(new THREE.Group(), ARM.pivot.x, ARM.y, ARM.pivot.y)
  pivot.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, look.segments), lensMat))
  const pivotRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.008, 8, 64).rotateX(Math.PI / 2), white(0.45))
  pivotRing.position.y = 0.03
  const pivotPearl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), pearlMat)
  pivotPearl.position.y = 0.06
  pivot.add(pivotRing, pivotPearl)
  noHit(pivot, pivotRing, pivotPearl)

  const armMat = new THREE.MeshPhysicalMaterial({ color: FALLBACK, emissive: FALLBACK, emissiveIntensity: 0.35, transparent: true, opacity: 0.6, roughness: 0.2, clearcoat: 1 })
  const yaw = at(new THREE.Group(), ARM.pivot.x, ARM.y, ARM.pivot.y)
  yaw.rotation.y = ARM.rest
  const lift = new THREE.Group()
  yaw.add(lift)
  const tube = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, ARM.len - 0.4, 4, 12).rotateX(Math.PI / 2), armMat)
  tube.scale.y = 0.5
  tube.position.z = ARM.len / 2 - 0.02
  const head = new THREE.Group()
  head.position.z = ARM.len
  // bent towards the spindle, the arm's one kink
  head.rotation.y = -0.45
  const shell = new THREE.Mesh(slab(look, 0.3, 0.46, 0.06, 0.1, 0.02), lensMat)
  const shellEdge = new THREE.LineSegments(new THREE.EdgesGeometry(shell.geometry, 40), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4 }))
  head.add(shell, shellEdge)
  lift.add(tube, head)
  lift.traverse((o) => (o.userData.grab = 'arm'))

  /** yaw at which the headshell sits `radius` from the spindle (swinging inward = negative yaw) */
  const angleFor = (radius: number) => {
    const tip = new THREE.Vector2()
    for (let a = 0; a > -Math.PI / 2; a -= 0.002) {
      tip.set(ARM.pivot.x + Math.sin(a) * ARM.len, ARM.pivot.y + Math.cos(a) * ARM.len)
      if (tip.distanceTo(CENTER) <= radius) return a
    }
    return -0.6
  }
  /** first groove → last groove: while playing the arm follows the progress */
  const START = angleFor(R - 0.25)
  const END = angleFor(LABEL + 0.12)
  const ON_RECORD = angleFor(R - 0.05)

  // ---- progress: a hairline track, a bright fill; the row is a drag target ----
  const barW = BAR.to - BAR.from
  const pill = canvasTexture(256, 16)
  pill.ctx.fillStyle = '#ffffff'
  pill.ctx.beginPath()
  pill.ctx.roundRect(0, 0, 256, 16, 8)
  pill.ctx.fill()
  pill.tex.needsUpdate = true
  const trackMat = white(0.22)
  trackMat.map = pill.tex
  const trackMesh = at(new THREE.Mesh(decal(barW, 0.06), trackMat), 0, 0.02, BAR.z)
  const fill = at(new THREE.Mesh(decal(1, 0.06), white(0.95)), 0, 0.024, BAR.z)
  const barHit = at(new THREE.Mesh(decal(barW + 0.2, 0.3), new THREE.MeshBasicMaterial({ visible: false })), 0, 0.03, BAR.z)
  barHit.userData.grab = 'bar'
  noHit(trackMesh, fill)

  // ---- controls: a frosted glass pill with ⏮ · a glass lens with ▶/❚❚ · ⏭ ----
  const pillMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transmission: 1,
    roughness: 0.35,
    thickness: 0.5,
    ior: 1.45,
    specularIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
  })
  const pillMesh = at(new THREE.Mesh(slab(look, PILL.w, PILL.d, PILL.h, PILL.d / 2, 0.05), pillMat), 0, 0, PILL.z)
  noHit(pillMesh)
  const controls = CONTROLS.map((c) => {
    const holder = at(new THREE.Group(), c.x, PILL.h / 2, PILL.z)
    const parts: THREE.Object3D[] = []
    if (c.action === 'toggle') {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(c.r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), lensMat)
      lens.scale.y = 0.28
      const ring = new THREE.Mesh(new THREE.TorusGeometry(c.r, 0.008, 8, 64).rotateX(Math.PI / 2), white(0.4))
      const outer = new THREE.Mesh(new THREE.TorusGeometry(c.r + 0.05, 0.006, 8, 64).rotateX(Math.PI / 2), white(0.25))
      ring.position.y = outer.position.y = 0.004
      parts.push(lens, ring, outer)
    } else parts.push(new THREE.Mesh(new THREE.CircleGeometry(c.r, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false })))
    const icon =
      c.action === 'toggle'
        ? [glyph(icons.play(0.2), white(), 0.01), glyph(icons.pause(0.2), white(), 0.01)]
        : [glyph(icons.skip(0.2), white(), 0.01, c.action === 'prev')]
    icon.forEach((g) => (g.position.y = c.action === 'toggle' ? c.r * 0.28 + 0.01 : 0.01))
    if (c.action === 'toggle') icon[0]!.position.x = 0.025
    holder.add(...parts, ...icon)
    holder.traverse((o) => (o.userData.action = c.action))
    return { ...c, holder, icon, size: { x: 1, v: 0 } }
  })
  const play = controls[1]!
  play.icon[1]!.visible = false

  // ---- a highlight that follows the pointer / tilt ----
  const glint = new THREE.PointLight('#ffffff', 1.4, 0, 1.2)
  glint.position.set(0.8, 1.8, -1.0)
  group.add(glint)
  const aim = new THREE.Vector2(0.4, 0.4)
  const lean = new THREE.Vector2()

  const paintAll = () => {
    paintGlow()
    paintArt()
    paintLabel()
  }
  paintAll()
  whenFontsReady(paintAll)
  const setCover = coverLoader((img) => {
    cover = img
    paintAll()
    const tint = img ? coverTint(img) : new THREE.Color(FALLBACK)
    // the bar picks up the cover's colour, lifted so it still reads as light through glass
    const hsl = { h: 0, s: 0, l: 0 }
    tint.getHSL(hsl)
    tint.setHSL(hsl.h, Math.max(hsl.s, 0.55), THREE.MathUtils.clamp(hsl.l, 0.5, 0.65))
    armMat.color.copy(tint)
    armMat.emissive.copy(tint)
  })

  // ---- pointer on a plane of the deck: the seek bar and the arm ----
  const inverse = new THREE.Matrix4()
  const local = new THREE.Ray()
  const hit = new THREE.Vector3()
  const onPlane = (ray: THREE.Ray, y: number) => {
    group.updateWorldMatrix(true, false)
    local.copy(ray).applyMatrix4(inverse.copy(group.matrixWorld).invert())
    if (Math.abs(local.direction.y) < 1e-4) return null
    const t = (y - local.origin.y) / local.direction.y
    return t < 0 ? null : local.at(t, hit)
  }
  /** 0..1 along the bar under the pointer */
  const barAt = (ray: THREE.Ray) => {
    const p = onPlane(ray, 0.02)
    return p && THREE.MathUtils.clamp((p.x - BAR.from) / barW, 0, 1)
  }
  const armAt = (ray: THREE.Ray) => {
    const p = onPlane(ray, ARM.y)
    return p && Math.atan2(p.x - ARM.pivot.x, p.z - ARM.pivot.y)
  }
  let seeking: number | null = null
  let arm: { angle: number; offset: number } | null = null
  /** after the arm is let go, hold it where it was put until playback follows (s left) */
  let pending: { playing: boolean; left: number } | null = null

  let state: DeckState | null = null
  let playing = false
  let spin = 0
  let angle = 0
  let clock = 0

  return {
    group,
    sync(s) {
      state = s
      if (s.playing !== playing) {
        playing = s.playing
        play.icon[0]!.visible = !playing
        play.icon[1]!.visible = playing
      }
      if (pending?.playing === playing) pending = null
      setCover(s.track?.image)
    },
    grab(ray, part) {
      if (part.userData.grab === 'arm') {
        const a = armAt(ray)
        arm = { angle: yaw.rotation.y, offset: a === null ? 0 : yaw.rotation.y - a }
      } else seeking = barAt(ray)
    },
    drag(ray) {
      if (arm) {
        const a = armAt(ray)
        if (a !== null) arm.angle = THREE.MathUtils.clamp(a + arm.offset, END, ARM.rest + 0.02)
        return
      }
      const k = barAt(ray)
      if (k !== null) seeking = k
    },
    release(moved) {
      if (arm) {
        // dropped on the record → play; back off it → stop; a plain click flips it
        const onRecord = moved ? arm.angle <= ON_RECORD : yaw.rotation.y > ON_RECORD
        arm = null
        pending = { playing: onRecord, left: 4 }
        return onRecord !== playing ? 'toggle' : null
      }
      if (seeking !== null && state?.duration) deps.onSeek(seeking * state.duration - livePosition(state))
      seeking = null
      return null
    },
    pointer(x, y) {
      aim.set(x, y)
    },
    update({ dt, t, calm, reducedMotion, hovered, tap }) {
      clock += dt
      // progress (the fill follows the hand while seeking)
      const dur = state?.duration ?? 0
      const k = seeking ?? (state && dur ? livePosition(state) / dur : 0)
      fill.scale.x = Math.max(0.0001, k * barW)
      fill.position.x = BAR.from + (k * barW) / 2

      // the record: spins up / coasts down, turns even with reduced motion – it's what the eye follows
      const rpm = (100 / 3 / 60) * Math.PI * 2
      spin = reducedMotion ? (playing ? rpm : 0) : THREE.MathUtils.damp(spin, playing ? rpm : 0, playing ? 2.5 : 1.2, dt)
      angle -= spin * dt
      platter.rotation.y = angle

      // the arm: in the hand, held where it was dropped, or where playback says (riding inward with the progress)
      if (pending && (pending.left -= dt) <= 0) pending = null
      const onRecord = pending ? pending.playing : playing
      const target = arm ? arm.angle : onRecord ? THREE.MathUtils.lerp(START, END, k) : ARM.rest
      yaw.rotation.y = reducedMotion && !arm ? target : THREE.MathUtils.damp(yaw.rotation.y, target, arm ? 20 : calm ? 5 : 3, dt)
      // it lifts towards you while it swings
      const lifted = arm ? 1 : Math.min(1, Math.abs(yaw.rotation.y - target) * 8)
      lift.position.y = THREE.MathUtils.damp(lift.position.y, lifted * 0.12, 10, dt)
      lift.scale.setScalar(1 + lift.position.y * 0.25)

      // controls: the lens bulges on a spring when pressed, everything swells a little on hover
      controls.forEach((c) => {
        if (tap === c.action) c.size.v += 6
        const target = hovered === c.action ? 1.08 : 1
        if (reducedMotion) c.size.x = target
        else spring(c.size, target, dt, 260, 14)
        c.holder.scale.set(c.size.x, 1 + (c.size.x - 1) * 0.5, c.size.x)
      })

      // lean with the pointer; the cover drifts behind the glass so what shows through the rim keeps moving
      lean.x = THREE.MathUtils.damp(lean.x, aim.x, 3, dt)
      lean.y = THREE.MathUtils.damp(lean.y, aim.y, 3, dt)
      if (!reducedMotion) {
        group.rotation.x = Math.PI / 2 - lean.y * 0.07
        group.rotation.z = lean.x * 0.08
      }
      const drift = reducedMotion ? 0 : clock
      coverMesh.position.set(
        COVER.x + Math.sin(drift * 0.5) * 0.06 - lean.x * 0.18,
        COVER.y,
        COVER.z + Math.cos(drift * 0.4) * 0.07 + lean.y * 0.14,
      )
      coverMesh.rotation.y = COVER.tilt + Math.sin(drift * 0.3) * 0.03

      // highlight: follows the pointer, drifts on its own otherwise
      const wander = reducedMotion ? 0 : Math.sin(t * 0.4) * 0.15
      glint.position.x = THREE.MathUtils.damp(glint.position.x, aim.x * R + wander, 4, dt)
      glint.position.z = THREE.MathUtils.damp(glint.position.z, CENTER.y - aim.y * R, 4, dt)
    },
  }
}
