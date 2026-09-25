import * as THREE from 'three'
import {
  canvasTexture,
  contactShadow,
  decal,
  makeMaterial,
  skinFont,
  slab,
  whenFontsReady,
  type DeckAction,
  type HeroModel,
} from '../build'
import { buildRecord, buildTonearm, drawGrooves, handTurn, platterSpin, RPM33 } from '../deck'
import type { Look } from '../looks'

/**
 * Retro – a 50s–70s console / suitcase player: lacquered walnut, a cream deck plate, brass and brushed chrome,
 * a flip switch and knurled knobs, a VU meter whose needle swings lazily, a script badge, dust in the sunlight –
 * and a brass flower horn rising from the back. A deep cabinet with cloth grilles and a radio dial on its front,
 * seen from above and a little to the side.
 */
const C = {
  wood: '#5a3a22',
  cream: '#efe3c8',
  brass: '#b08d57',
  wine: '#7a2430',
  moss: '#4f5b3a',
  ink: '#2b1a10',
}

const W = 3.4
const D = 3.3
const H = 0.8
const TOP = H / 2
const PLATE = TOP + 0.02
const PLATTER = new THREE.Vector2(-0.45, -0.3)
const PLATTER_R = 1.1
const PLATTER_H = 0.08
const RECORD_R = 1.02
const LABEL = 0.6
const ROW = 1.25
const SWITCH_X = -1.35
const KNOBS: [DeckAction, number][] = [
  ['prev', -0.95],
  ['next', -0.6],
]
const VU = { x: 0.35, z: 1.2, w: 0.85, d: 0.5 }
/** how the cabinet is seen: tipped back from face-on, turned a little */
const TILT = 0.82
const YAW = 0.34
/** the horn: neck foot on the plate, throat, bell axis */
const HORN = {
  foot: new THREE.Vector3(0.38, 0, -1.42),
  throat: new THREE.Vector3(0.1, 1.55, -1.5),
  axis: new THREE.Vector3(-0.42, 0.72, 0.55).normalize(),
  length: 1.45,
  mouth: 0.95,
  petals: 8,
}

/** Walnut grain: wavy darker streaks over the base colour. */
function woodTexture() {
  const { ctx, tex } = canvasTexture(512, 512)
  ctx.fillStyle = C.wood
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 90; i++) {
    const y0 = Math.random() * 512
    const amp = 4 + Math.random() * 14
    const freq = 0.004 + Math.random() * 0.01
    ctx.strokeStyle = Math.random() < 0.7 ? `rgba(30,16,8,${0.12 + Math.random() * 0.25})` : `rgba(140,96,60,${0.1 + Math.random() * 0.15})`
    ctx.lineWidth = 0.6 + Math.random() * 2.2
    ctx.beginPath()
    for (let x = 0; x <= 512; x += 8) ctx.lineTo(x, y0 + Math.sin(x * freq + i) * amp + Math.sin(x * 0.031) * 2)
    ctx.stroke()
  }
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(0.45, 0.45)
  return tex
}

/** Knurled knob outline: a disc with fine teeth. */
function knurl(r: number, teeth = 22) {
  const s = new THREE.Shape()
  for (let i = 0; i <= teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2
    const rr = i % 2 ? r : r * 0.9
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  return s
}

/**
 * Flower horn along +z from its throat at the origin: an exponential flare cut into fluted petals (creased at the
 * seams, scalloped at the rim, the lip curling back), darkening towards the throat.
 */
function hornGeometry(length: number, mouth: number, petals: number, throat = 0.06) {
  const U = 96
  const V = 48
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const dark = new THREE.Color('#2a1808')
  const lit = new THREE.Color('#ffffff')
  const c = new THREE.Color()
  for (let v = 0; v <= V; v++) {
    const s = v / V
    const curl = THREE.MathUtils.smoothstep(s, 0.82, 1)
    const r = throat + (mouth - throat) * s ** 2.8 + mouth * 0.12 * curl
    for (let u = 0; u <= U; u++) {
      const a = (u / U) * Math.PI * 2
      const petal = Math.abs(Math.cos((petals * a) / 2))
      const rr = r * (1 + 0.05 * s ** 2 * (petal - 0.6))
      const z = length * s - length * 0.07 * curl ** 2 - length * 0.045 * (1 - petal) * s ** 8
      pos.push(Math.cos(a) * rr, Math.sin(a) * rr, z)
      c.copy(dark).lerp(lit, THREE.MathUtils.smoothstep(s, 0.05, 0.6) * (0.75 + 0.25 * petal))
      col.push(c.r, c.g, c.b)
    }
  }
  for (let v = 0; v < V; v++)
    for (let u = 0; u < U; u++) {
      const a = v * (U + 1) + u
      const b = a + U + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

/** Cabinet front: two cloth grilles and a backlit radio dial between them, on a transparent canvas over the walnut. */
function drawFront(ctx: CanvasRenderingContext2D, w: number, h: number, unitsW: number) {
  const k = w / unitsW
  ctx.clearRect(0, 0, w, h)
  for (const side of [-1, 1]) {
    const cx = w / 2 + side * 1.08 * k
    const cy = h / 2
    const r = 0.22 * k
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = '#3a2718'
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    // woven cloth
    ctx.strokeStyle = 'rgba(210,170,110,0.18)'
    ctx.lineWidth = 1
    for (let i = -r; i < r; i += 3) {
      ctx.beginPath()
      ctx.moveTo(cx + i, cy - r)
      ctx.lineTo(cx + i, cy + r)
      ctx.moveTo(cx - r, cy + i)
      ctx.lineTo(cx + r, cy + i)
      ctx.stroke()
    }
    const shade = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r)
    shade.addColorStop(0, 'rgba(255,220,160,0.08)')
    shade.addColorStop(1, 'rgba(0,0,0,0.45)')
    ctx.fillStyle = shade
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    ctx.restore()
  }
  // dial window
  const dw = 0.86 * k
  const dh = 0.2 * k
  const dx = w / 2 - dw / 2
  const dy = h / 2 - dh / 2 - 0.04 * k
  ctx.fillStyle = C.brass
  ctx.beginPath()
  ctx.roundRect(dx - 5, dy - 5, dw + 10, dh + 10, 10)
  ctx.fill()
  const glow = ctx.createLinearGradient(0, dy, 0, dy + dh)
  glow.addColorStop(0, '#f6e7c4')
  glow.addColorStop(1, '#e2c48c')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.roundRect(dx, dy, dw, dh, 6)
  ctx.fill()
  ctx.fillStyle = C.ink
  ctx.font = `700 ${dh * 0.3}px ${skinFont('mono')}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const marks = ['54', '60', '70', '80', '100', '130', '160']
  marks.forEach((m, i) => {
    const x = dx + dw * (0.08 + (i / (marks.length - 1)) * 0.84)
    ctx.fillText(m, x, dy + dh * 0.36)
    ctx.fillRect(x - 1, dy + dh * 0.62, 2, dh * 0.22)
  })
  ctx.fillStyle = C.wine
  ctx.fillRect(dx + dw * 0.41, dy + dh * 0.1, 3, dh * 0.8)
  ctx.fillStyle = C.brass
  ctx.font = `700 ${0.07 * k}px ${skinFont('mono')}`
  ctx.fillText('AM  ·  FM  ·  PHONO', w / 2, dy + dh + 0.09 * k)
}

export function buildRetroDeck(look: Look): HeroModel {
  const m = {
    wood: makeMaterial({ color: '#ffffff', roughness: 0.55, clearcoat: 0.6 }, look, { map: woodTexture() }),
    brass: makeMaterial({ color: C.brass, roughness: 0.34, metalness: 1 }, look),
    chrome: makeMaterial({ color: '#d4d2cc', roughness: 0.38, metalness: 1 }, look),
    bakelite: makeMaterial({ color: '#1a1210', roughness: 0.4, clearcoat: 0.4 }, look),
    cream: makeMaterial({ color: C.cream, roughness: 0.6 }, look),
    moss: makeMaterial({ color: C.moss, roughness: 0.95 }, look),
    wine: makeMaterial({ color: C.wine, roughness: 0.5 }, look),
  }
  const group = new THREE.Group()
  group.rotation.set(TILT, YAW, 0)
  group.scale.setScalar(2.4 / Math.max(W, D))
  group.position.y = -0.62
  const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => {
    o.position.set(x, y, z)
    group.add(o)
    return o
  }

  // ---- cabinet: lacquered walnut, cream deck plate with its printing, brass hinges ----
  at(new THREE.Mesh(slab(look, W, D, H, 0.12, 0.03), m.wood), 0, 0, 0)
  const pw = W - 0.26
  const pd = D - 0.26
  at(new THREE.Mesh(slab(look, pw, pd, 0.03, 0.05), m.cream), 0, TOP + 0.005, 0)
  const face = canvasTexture(1024, Math.round((1024 * pd) / pw))
  const toPx = (x: number, z: number) => [((x + pw / 2) / pw) * face.canvas.width, ((z + pd / 2) / pd) * face.canvas.height] as const
  const drawFace = () => {
    const { ctx, canvas } = face
    const k = canvas.width / pw
    ctx.fillStyle = C.cream
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // double pin-stripe
    ctx.strokeStyle = C.brass
    ctx.lineWidth = 3
    ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28)
    ctx.lineWidth = 1
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48)
    ctx.fillStyle = C.ink
    ctx.textAlign = 'center'
    ctx.font = `700 ${0.075 * k}px ${skinFont('mono')}`
    const [sx, sy] = toPx(SWITCH_X, ROW)
    ctx.fillText('PLAY', sx, sy - 0.2 * k)
    ctx.fillText('STOP', sx, sy + 0.26 * k)
    const [kx, ky] = toPx((KNOBS[0]![1] + KNOBS[1]![1]) / 2, ROW)
    ctx.fillText('<  TRACK  >', kx, ky + 0.26 * k)
    const [vx, vy] = toPx(VU.x, VU.z)
    ctx.font = `700 ${0.06 * k}px ${skinFont('mono')}`
    ctx.fillText('33 · 45 · 78  RPM', vx, vy - (VU.d / 2 + 0.06) * k)
    face.tex.needsUpdate = true
  }
  drawFace()
  whenFontsReady(drawFace)
  at(new THREE.Mesh(decal(pw - 0.02, pd - 0.02), makeMaterial({ color: '#ffffff', roughness: 0.62 }, look, { map: face.tex })), 0, PLATE + 0.001, 0)
  for (const x of [-1, 1]) at(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.1), m.brass), x * (W / 2 - 0.6), TOP + 0.05, -D / 2 + 0.06)

  // ---- cabinet front: grilles with brass rings, the radio dial; turned feet, a shadow ----
  const fw = W - 0.3
  const fh = H - 0.16
  const front = canvasTexture(1024, Math.round((1024 * fh) / fw))
  const paintFront = () => {
    drawFront(front.ctx, front.canvas.width, front.canvas.height, fw)
    front.tex.needsUpdate = true
  }
  paintFront()
  whenFontsReady(paintFront)
  at(new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), makeMaterial({ color: '#ffffff', roughness: 0.6 }, look, { map: front.tex })), 0, 0, D / 2 + 0.002)
    .material.transparent = true
  for (const side of [-1, 1]) {
    const ring = at(new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.022, 10, look.segments), m.brass), side * 1.08, 0, D / 2 + 0.01)
    ring.raycast = () => {}
  }
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      const foot = at(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.14, look.segments), m.brass), x * (W / 2 - 0.3), -TOP - 0.07, z * (D / 2 - 0.3))
      foot.raycast = () => {}
    }
  group.add(contactShadow(W, D, -TOP - 0.14, 0.7))

  // ---- platter: brass rim, moss rubber mat, record, spindle ----
  const platter = at(new THREE.Group(), PLATTER.x, PLATE, PLATTER.y)
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(PLATTER_R, PLATTER_R, PLATTER_H, look.segments * 3), m.brass)
  plate.position.y = PLATTER_H / 2
  platter.add(plate)
  const mat = new THREE.Mesh(new THREE.CylinderGeometry(1.07, 1.07, 0.012, look.segments * 3), m.moss)
  mat.position.y = PLATTER_H + 0.006
  platter.add(mat)
  const { record, setCover } = buildRecord(look, {
    radius: RECORD_R,
    label: LABEL,
    face: makeMaterial({ color: '#6a6258', roughness: 0.8 }, look),
    edge: m.bakelite,
    // warm fine rings you can see as it turns, and two darker gaps between tracks
    vinyl: (ctx, size) => drawGrooves(ctx, size, { disc: '#140e0a', label: LABEL, line: 'rgba(255,230,190,0.17)', gaps: 'rgba(0,0,0,0.85)', step: size / 140 }),
    placeholder: (ctx, size) => {
      ctx.fillStyle = C.wine
      ctx.fillRect(0, 0, size, size)
      ctx.strokeStyle = C.brass
      ctx.lineWidth = size * 0.012
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = C.cream
      ctx.textAlign = 'center'
      ctx.font = `italic 700 ${size * 0.13}px ${skinFont('display')}`
      ctx.fillText('Timuze', size / 2, size * 0.36)
      ctx.font = `700 ${size * 0.05}px ${skinFont('mono')}`
      ctx.fillText('HIGH FIDELITY · 78', size / 2, size * 0.72)
    },
  })
  record.position.y = PLATTER_H + 0.022
  platter.add(record)
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 12), m.chrome)
  spindle.position.y = PLATTER_H + 0.06
  platter.add(spindle)

  // ---- arm: brass tube, chrome weight, a big bakelite headshell; it trembles in the groove ----
  const arm = buildTonearm(look, {
    platter: PLATTER,
    recordR: RECORD_R,
    innerR: RECORD_R * LABEL + 0.06,
    pivot: new THREE.Vector2(1.3, -0.95),
    len: 1.7,
    height: PLATE + 0.32,
    surface: PLATE,
    playRadius: 0.92,
    tube: 0.036,
    shell: 1.45,
    tremble: true,
    mats: { tube: m.brass, weight: m.chrome, shell: m.bakelite, cartridge: m.cream, base: m.brass },
  })
  group.add(arm.group)

  // ---- flip switch: play / stop ----
  at(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.03, look.segments), m.chrome), SWITCH_X, PLATE + 0.015, ROW)
  const lever = at(new THREE.Group(), SWITCH_X, PLATE + 0.04, ROW)
  const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.016, 0.22, 16), m.chrome)
  bat.position.y = 0.11
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 12), m.chrome)
  tip.position.y = 0.22
  lever.add(bat, tip, new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), m.chrome))
  // generous hit area around the small lever
  const switchHit = at(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.3, 12), new THREE.MeshBasicMaterial({ visible: false })), SWITCH_X, PLATE + 0.15, ROW)
  ;[switchHit, ...lever.children].forEach((o) => (o.userData.action = 'toggle'))

  // ---- knurled knobs: track back / forward, each click turns them a notch ----
  const knobs = KNOBS.map(([action, x]) => {
    const knob = at(new THREE.Group(), x, PLATE, ROW)
    const geo = new THREE.ExtrudeGeometry(knurl(0.14), { depth: 0.1, bevelEnabled: false, curveSegments: 1 })
    geo.rotateX(-Math.PI / 2)
    knob.add(new THREE.Mesh(geo, m.chrome))
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, look.segments), m.cream)
    cap.position.y = 0.11
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.01, 0.08), m.wine)
    mark.position.set(0, 0.122, -0.05)
    knob.add(cap, mark)
    knob.traverse((o) => (o.userData.action = action))
    return { knob, action, angle: 0 }
  })

  // ---- VU meter: brass bezel, backlit cream dial, a needle that swings slowly ----
  at(new THREE.Mesh(slab(look, VU.w, VU.d, 0.05, 0.05), m.brass), VU.x, PLATE + 0.025, VU.z)
  const dial = canvasTexture(512, Math.round((512 * (VU.d - 0.1)) / (VU.w - 0.1)))
  const drawDial = () => {
    const { ctx, canvas } = dial
    const cw = canvas.width
    const ch = canvas.height
    ctx.fillStyle = C.cream
    ctx.fillRect(0, 0, cw, ch)
    const cx = cw / 2
    const cy = ch * 1.15
    const r = ch * 0.95
    for (let i = 0; i <= 12; i++) {
      const a = -Math.PI / 2 - 0.8 + (i / 12) * 1.6
      const red = i >= 9
      ctx.strokeStyle = red ? C.wine : C.ink
      ctx.lineWidth = i % 3 ? 2 : 4
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
      ctx.lineTo(cx + Math.cos(a) * (r - (i % 3 ? 14 : 24)), cy + Math.sin(a) * (r - (i % 3 ? 14 : 24)))
      ctx.stroke()
    }
    ctx.strokeStyle = C.wine
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.arc(cx, cy, r - 4, -Math.PI / 2 + 0.8 * 0.5, -Math.PI / 2 + 0.8)
    ctx.stroke()
    ctx.fillStyle = C.ink
    ctx.textAlign = 'center'
    ctx.font = `italic 700 ${ch * 0.22}px ${skinFont('display')}`
    ctx.fillText('VU', cx, ch * 0.78)
    dial.tex.needsUpdate = true
  }
  drawDial()
  whenFontsReady(drawDial)
  const dialMat = makeMaterial({ color: '#ffffff', roughness: 0.7 }, look, {
    map: dial.tex,
    emissive: '#ffb45e',
    emissiveIntensity: 0,
  }) as THREE.MeshStandardMaterial
  at(new THREE.Mesh(decal(VU.w - 0.1, VU.d - 0.1), dialMat), VU.x, PLATE + 0.051, VU.z)
  const needle = at(new THREE.Group(), VU.x, PLATE + 0.056, VU.z + (VU.d - 0.1) / 2 + 0.03)
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.004, 0.36), m.bakelite)
  blade.position.z = -0.18
  needle.add(blade)

  // ---- script badge, plated brass ----
  const badge = canvasTexture(512, 160)
  const drawBadge = () => {
    const { ctx, canvas } = badge
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `italic 800 110px ${skinFont('display')}`
    ctx.fillText('Timuze', canvas.width / 2, canvas.height / 2)
    badge.tex.needsUpdate = true
  }
  drawBadge()
  whenFontsReady(drawBadge)
  const badgeMat = makeMaterial({ color: C.brass, roughness: 0.25, metalness: 1 }, look, { map: badge.tex })
  badgeMat.alphaTest = 0.5
  at(new THREE.Mesh(decal(0.8, 0.25), badgeMat), 1.2, PLATE + 0.002, 1.36)

  // ---- flower horn: a brass neck up from the plate, bending into a fluted bell ----
  const hornGeo = hornGeometry(HORN.length, HORN.mouth, HORN.petals)
  const hornMat = makeMaterial({ color: C.brass, roughness: 0.3, metalness: 1 }, look) as THREE.MeshStandardMaterial
  hornMat.vertexColors = true
  hornMat.side = THREE.DoubleSide
  const horn = at(new THREE.Mesh(hornGeo, hornMat), HORN.throat.x, PLATE + HORN.throat.y, HORN.throat.z)
  horn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), HORN.axis)
  const foot = HORN.foot.clone().setY(PLATE)
  const throat = HORN.throat.clone().setY(PLATE + HORN.throat.y)
  const neck = new THREE.CatmullRomCurve3([
    foot,
    foot.clone().add(new THREE.Vector3(0, 0.45, 0)),
    foot.clone().lerp(throat, 0.5).add(new THREE.Vector3(0.05, 0.25, -0.2)),
    throat.clone().addScaledVector(HORN.axis, -0.3),
    throat.clone().addScaledVector(HORN.axis, 0.02),
  ])
  const neckMesh = at(new THREE.Mesh(new THREE.TubeGeometry(neck, 48, 0.06, 16), m.brass), 0, 0, 0)
  const collar = at(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.08, look.segments), m.brass), foot.x, PLATE + 0.04, foot.z)
  ;[horn, neckMesh, collar].forEach((o) => (o.raycast = () => {}))

  // ---- dust in the sunlight ----
  const DUST = 70
  const dustPos = new Float32Array(DUST * 3)
  const seeds = Array.from({ length: DUST }, () => Math.random())
  for (let i = 0; i < DUST; i++) dustPos.set([(Math.random() - 0.5) * W, TOP + 0.2 + Math.random() * 1.6, (Math.random() - 0.5) * D], i * 3)
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const mote = canvasTexture(32, 32)
  const g = mote.ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  g.addColorStop(0, 'rgba(255,240,210,1)')
  g.addColorStop(1, 'rgba(255,240,210,0)')
  mote.ctx.fillStyle = g
  mote.ctx.fillRect(0, 0, 32, 32)
  const dustMat = new THREE.PointsMaterial({
    size: 0.05,
    map: mote.tex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  dust.raycast = () => {}
  group.add(dust)

  // a touch under 33⅓ with a little wow – an old motor
  const spin = platterSpin(RPM33 * 0.96)
  let playing = false
  let level = 0
  let leverAngle = 0.6
  let backlight = 0

  // ---- turn it by hand: drag the body (not a control or the arm) to spin it about its own up axis ----
  const turn = handTurn(group, YAW)

  return {
    group,
    sync(s) {
      if (s.playing !== playing) {
        playing = s.playing
        arm.setPlaying(playing)
      }
      setCover(s.track?.image)
    },
    grab: (ray, part) => (turn.owns(part) ? turn.grab(ray) : arm.grab(ray)),
    drag: (ray) => (turn.active ? turn.drag(ray) : arm.drag(ray)),
    release(moved) {
      if (!turn.active) return arm.release(moved)
      turn.release(moved)
      return null
    },
    update({ dt, t, beat, calm, reducedMotion, tap, hovered }) {
      turn.update(dt, reducedMotion)
      platter.rotation.y = spin(dt, playing, reducedMotion, reducedMotion ? 0 : Math.sin(t * 1.3) * 0.03)
      arm.update(dt, t, calm, reducedMotion)

      // flip switch snaps over, knobs turn a notch per click
      const leverTarget = playing ? -0.6 : 0.6
      leverAngle = reducedMotion ? leverTarget : THREE.MathUtils.damp(leverAngle, leverTarget, 18, dt)
      lever.rotation.x = leverAngle
      knobs.forEach((k) => {
        if (tap === k.action) k.angle += k.action === 'next' ? -Math.PI / 6 : Math.PI / 6
        k.knob.rotation.y = reducedMotion ? k.angle : THREE.MathUtils.damp(k.knob.rotation.y, k.angle, 10, dt)
        k.knob.position.y = PLATE - (hovered === k.action ? 0.01 : 0)
      })

      // VU: lazy needle, warm backlight while playing
      const wobble = Math.sin(t * 2.3) * 0.08 + Math.sin(t * 5.1) * 0.05
      const target = playing ? 0.45 + beat * 0.35 + wobble : 0
      level = reducedMotion ? target : THREE.MathUtils.damp(level, target, 3, dt)
      needle.rotation.y = 0.8 - level * 1.6
      backlight = THREE.MathUtils.damp(backlight, playing ? 0.35 : 0, 2, dt)
      dialMat.emissiveIntensity = backlight

      // dust drifts up and sideways through the light, wrapping around
      dust.visible = !reducedMotion && !calm
      if (dust.visible) {
        for (let i = 0; i < DUST; i++) {
          const s = seeds[i]!
          dustPos[i * 3] = dustPos[i * 3]! + Math.sin(t * 0.3 + s * 20) * 0.04 * dt
          const z = dustPos[i * 3 + 2]! - (0.03 + s * 0.05) * dt
          dustPos[i * 3 + 2] = z < -D / 2 ? D / 2 : z
        }
        dustGeo.attributes.position!.needsUpdate = true
        dustMat.opacity = 0.35 + Math.sin(t * 0.7) * 0.15
      }
    },
  }
}
