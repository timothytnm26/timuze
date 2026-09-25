import * as THREE from 'three';
import { canvasTexture, contactShadow, decal, glyph, icons, makeMaterial, roundedRect, skinFont, slab, whenFontsReady, type DeckState, type HeroModel } from '../build';
import { buildRecord, buildTonearm, drawGrooves, handTurn, platterSpin } from '../deck';
import type { Look } from '../looks';

/**
 * Minimalism – less but better: a thin, perfectly square slab with even rounded corners, matte anodized aluminium,
 * a straight arm with one bend, a single button, a dot of an LED, the track in dots of light shining through the body itself,
 * tiny lowercase type and a clear acrylic lid – click it to open or close, or drag it by hand. Seen from above and a little to the side, like a product shot.
 */
const C = {
  ivory: '#f4f2ee',
  grey: '#c9c6c0',
  charcoal: '#1e1e1e',
  /** the one accent – the skin's green */
  accent: '#1ed760',
};

const SIZE = 3.2;
const H = 0.12;
const TOP = H / 2;
const PLATTER = new THREE.Vector2(-0.25, -0.1);
const PLATTER_R = 1.1;
const PLATTER_H = 0.06;
const RECORD_R = 1.04;
const LABEL = 0.9;
const BUTTON = new THREE.Vector2(-1.3, 1.3);
/** dot-matrix strip right of the LED – its left edge sits just past the LED, it grows to the right */
const SCREEN = { x: 0.3, y: 1.3, z: 1.3, w: 2, d: 0.3 };
/** room around the strip so its glow fades out on the body instead of stopping at an edge */
const SCREEN_PAD = 0.14;
const LED = new THREE.Vector2(BUTTON.x + 0.4, BUTTON.y);
/** clear lid: wall height, how far it's propped open (rad), where its hinge line sits */
const LID_H = 0.3;
const LID_OPEN = 1.22;
const HINGE = new THREE.Vector3(0, TOP + 0.01, -SIZE / 2 + 0.01);
/** how the deck is seen: tipped back from face-on, turned a little */
const TILT = 0.6;
const YAW = -0.32;

/** note canvas: the 128 px drawing plus room on every side for its glow */
const NOTE_PX = 128;
const NOTE_GLOW = 24;

/**
 * A white note on a transparent canvas – eighth (♪) or two beamed eighths (♫) – drawn as shapes, not a font glyph,
 * with a soft halo baked around it; the sprite's colour tints both.
 */
function noteTexture(beamed: boolean) {
  const shape = document.createElement('canvas');
  shape.width = shape.height = NOTE_PX;
  const ctx = shape.getContext('2d')!;
  ctx.fillStyle = ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 7;
  const head = (x: number, y: number) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 17, 12, -0.4, 0, Math.PI * 2);
    ctx.fill();
  };
  if (beamed) {
    head(36, 98);
    head(94, 86);
    ctx.beginPath();
    ctx.moveTo(50, 96);
    ctx.lineTo(50, 26);
    ctx.moveTo(108, 84);
    ctx.lineTo(108, 14);
    ctx.stroke();
    // the beam
    ctx.beginPath();
    ctx.moveTo(46, 22);
    ctx.lineTo(112, 10);
    ctx.lineTo(112, 26);
    ctx.lineTo(46, 38);
    ctx.fill();
  } else {
    head(56, 96);
    ctx.beginPath();
    ctx.moveTo(70, 94);
    ctx.lineTo(70, 16);
    ctx.stroke();
    // the flag
    ctx.beginPath();
    ctx.moveTo(70, 16);
    ctx.bezierCurveTo(78, 40, 104, 44, 96, 76);
    ctx.bezierCurveTo(96, 56, 84, 50, 70, 46);
    ctx.fill();
  }
  const size = NOTE_PX + NOTE_GLOW * 2;
  const out = canvasTexture(size, size);
  const o = out.ctx;
  // halo only (the shape is drawn off-canvas, its shadow falls back in place), wide then tight, then the note
  o.shadowColor = '#ffffff';
  o.shadowOffsetX = size;
  for (const [blur, alpha] of [
    [NOTE_GLOW, 0.8],
    [NOTE_GLOW * 0.4, 0.9],
  ] as const) {
    o.shadowBlur = blur;
    o.globalAlpha = alpha;
    o.drawImage(shape, NOTE_GLOW - size, NOTE_GLOW);
  }
  o.shadowBlur = o.shadowOffsetX = 0;
  o.globalAlpha = 1;
  o.drawImage(shape, NOTE_GLOW, NOTE_GLOW);
  out.tex.needsUpdate = true;
  return out.tex;
}

export function buildMinimalDeck(look: Look): HeroModel {
  const m = {
    body: makeMaterial({ color: C.ivory, roughness: 0.75 }, look),
    alu: makeMaterial({ color: C.grey, roughness: 0.42, metalness: 0.8 }, look),
    charcoal: makeMaterial({ color: C.charcoal, roughness: 0.55, metalness: 0.2 }, look),
    ivory: makeMaterial({ color: C.ivory, roughness: 0.6 }, look),
  };
  /** root: the deck (tilted, turnable) plus what floats around it facing the camera – notes, sound rings */
  const root = new THREE.Group();
  const group = new THREE.Group();
  root.add(group);
  group.rotation.set(TILT, YAW, 0);
  group.scale.setScalar(2.6 / SIZE);
  group.position.y = -0.55;
  const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => {
    o.position.set(x, y, z);
    group.add(o);
    return o;
  };

  at(new THREE.Mesh(slab(look, SIZE, SIZE, H, 0.26, 0.02), m.body), 0, 0, 0);
  // low feet lift the slab off its shadow
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const)
    at(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.06, look.segments), m.charcoal), x * (SIZE / 2 - 0.35), -TOP - 0.03, z * (SIZE / 2 - 0.35));
  group.add(contactShadow(SIZE, SIZE, -TOP - 0.06, 0.6));

  // ---- platter: bare aluminium disc, record, spindle ----
  const platter = at(new THREE.Group(), PLATTER.x, TOP, PLATTER.y);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(PLATTER_R, PLATTER_R, PLATTER_H, look.segments * 4), m.alu);
  plate.position.y = PLATTER_H / 2;
  platter.add(plate);
  const { record, setCover } = buildRecord(look, {
    radius: RECORD_R,
    label: LABEL,
    face: makeMaterial({ color: '#6a6a6a', roughness: 0.85 }, look),
    edge: m.charcoal,
    // fine rings you can see as it turns, and two darker gaps between tracks
    vinyl: (ctx, size) => drawGrooves(ctx, size, { disc: '#101010', label: LABEL, line: 'rgba(255,255,255,0.16)', gaps: 'rgba(0,0,0,0.85)', step: size / 140 }),
    placeholder: (ctx, size) => {
      ctx.fillStyle = C.grey;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = C.charcoal;
      ctx.font = `500 ${size * 0.06}px ${skinFont('sans')}`;
      ctx.textAlign = 'center';
      ctx.fillText('timuze', size / 2, size * 0.36);
      // the accent, once – off-centre so the spin shows
      ctx.fillStyle = C.ivory;
      ctx.beginPath();
      ctx.arc(size / 2, size * 0.7, size * 0.025, 0, Math.PI * 2);
      ctx.fill();
    },
  });
  record.position.y = PLATTER_H + 0.01;
  platter.add(record);
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 16), m.alu);
  spindle.position.y = PLATTER_H + 0.04;
  platter.add(spindle);

  // ---- arm: thin, straight, one bend; it lowers slowly ----
  const arm = buildTonearm(look, {
    platter: PLATTER,
    recordR: RECORD_R,
    innerR: RECORD_R * LABEL + 0.06,
    pivot: new THREE.Vector2(1.2, -0.95),
    len: 1.6,
    height: TOP + 0.26,
    surface: TOP,
    playRadius: 0.92,
    tube: 0.018,
    plain: true,
    swing: 1.8,
    mats: { tube: m.charcoal, weight: m.alu, shell: m.charcoal, cartridge: m.charcoal, base: m.alu },
  });
  group.add(arm.group);

  // ---- the single button, a dot of light, tiny lowercase type ----
  const buttonMat = makeMaterial({ color: C.charcoal, roughness: 0.5 }, look) as THREE.MeshStandardMaterial;
  const button = at(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, look.segments), buttonMat), BUTTON.x, TOP + 0.015, BUTTON.y);
  const play = at(glyph(icons.play(0.07), m.ivory, 0.006), BUTTON.x + 0.008, TOP + 0.033, BUTTON.y);
  const pause = at(glyph(icons.pause(0.07), m.ivory, 0.006), BUTTON.x, TOP + 0.033, BUTTON.y);
  pause.visible = false;
  [button, play, pause].forEach((o) => (o.userData.action = 'toggle'));

  const led = new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.25 });
  at(new THREE.Mesh(new THREE.CircleGeometry(0.022, 16).rotateX(-Math.PI / 2), led), LED.x, TOP + 0.0015, LED.y);
  // a soft round falloff: the LED's halo on the body and the light it throws onto the lid
  const soft = canvasTexture(64, 64);
  const falloff = soft.ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  falloff.addColorStop(0, 'rgba(255,255,255,1)');
  falloff.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  falloff.addColorStop(1, 'rgba(255,255,255,0)');
  soft.ctx.fillStyle = falloff;
  soft.ctx.fillRect(0, 0, 64, 64);
  const glowMat = () => new THREE.MeshBasicMaterial({ map: soft.tex, color: C.accent, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const ledHalo = at(new THREE.Mesh(decal(0.3, 0.3), glowMat()), LED.x, TOP + 0.001, LED.y);
  ledHalo.raycast = () => {};

  const type = canvasTexture(512, 64);
  at(new THREE.Mesh(decal(1, 0.125), new THREE.MeshBasicMaterial({ map: type.tex, transparent: true })), 0.98, TOP + 0.001, 1.3);

  // ---- dot-matrix strip: title over artist, green dots lit straight through the ivory – no screen, no frame, nothing
  // drawn where no dot is lit; a long title scrolls a column at a time. The halo is its own layer so it can flare while playing ----
  const PX = 1024 / 1.18;
  const PAD = Math.round(SCREEN_PAD * PX);
  const TW = Math.round(SCREEN.w * PX);
  const TH = Math.round(SCREEN.d * PX);
  const lcd = canvasTexture(TW + PAD * 2, TH + PAD * 2);
  const halo = canvasTexture(lcd.canvas.width, lcd.canvas.height);
  const PITCH = 7;
  const dots = document.createElement('canvas');
  dots.width = lcd.canvas.width;
  dots.height = lcd.canvas.height;
  const text = dots.cloneNode() as HTMLCanvasElement;
  const dctx = dots.getContext('2d')!;
  dctx.fillStyle = '#ffffff';
  for (let y = PITCH / 2; y < dots.height; y += PITCH)
    for (let x = PITCH / 2; x < dots.width; x += PITCH) {
      dctx.beginPath();
      dctx.arc(x, y, PITCH * 0.36, 0, Math.PI * 2);
      dctx.fill();
    }
  let track: DeckState['track'] = null;
  let lcdKey = '';
  const paintLcd = (column: number) => {
    const tctx = text.getContext('2d')!;
    const title = track?.name ?? 'timuze';
    const artist = track?.artists ?? 'drop the needle to play';
    tctx.font = `600 ${PITCH * 11}px ${skinFont('sans')}`;
    const room = TW - PITCH * 4;
    const titleW = tctx.measureText(title).width;
    // long titles loop: title + gap + title, stepping one dot column at a time
    const loop = titleW > room ? titleW + PITCH * 12 : 0;
    const shift = loop ? Math.floor((column * PITCH) % loop) : 0;
    const key = `${title}|${artist}|${shift}`;
    if (key === lcdKey) return;
    lcdKey = key;
    tctx.clearRect(0, 0, text.width, text.height);
    tctx.save();
    tctx.beginPath();
    tctx.rect(PAD, PAD, TW, TH);
    tctx.clip();
    tctx.fillStyle = '#ffffff';
    tctx.textBaseline = 'alphabetic';
    tctx.fillText(title, PAD + PITCH * 2 - shift, PAD + PITCH * 13);
    if (loop) tctx.fillText(title, PAD + PITCH * 2 - shift + loop, PAD + PITCH * 13);
    tctx.globalAlpha = 0.55;
    tctx.font = `500 ${PITCH * 8}px ${skinFont('sans')}`;
    tctx.fillText(artist.length > 60 ? artist.slice(0, 59) + '…' : artist, PAD + PITCH * 2, PAD + PITCH * 26);
    tctx.restore();
    // keep only whole dots: text ∩ dot grid
    tctx.globalCompositeOperation = 'destination-in';
    tctx.drawImage(dots, 0, 0);
    // a scrolling title fades in and out at the ends rather than being cut off
    if (loop) {
      const fade = tctx.createLinearGradient(PAD, 0, PAD + TW, 0);
      const f = (PITCH * 5) / TW;
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(f, '#000');
      fade.addColorStop(1 - f, '#000');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      tctx.fillStyle = fade;
      tctx.fillRect(0, 0, text.width, text.height);
    }
    // tint the lit dots green
    tctx.globalCompositeOperation = 'source-in';
    tctx.fillStyle = C.accent;
    tctx.fillRect(0, 0, text.width, text.height);
    tctx.globalCompositeOperation = 'source-over';

    // the dots themselves, with the faintest bleed into the ivory
    const { ctx, canvas } = lcd;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.shadowColor = C.accent;
    ctx.shadowBlur = PITCH * 0.8;
    ctx.drawImage(text, 0, 0);
    ctx.shadowBlur = 0;
    lcd.tex.needsUpdate = true;

    // the flare: only the blurred light (the shape is drawn off-canvas, its shadow falls back in place)
    const h = halo.ctx;
    h.clearRect(0, 0, canvas.width, canvas.height);
    h.shadowColor = C.accent;
    h.shadowOffsetX = canvas.width;
    for (const [blur, alpha] of [
      [PITCH * 9, 0.9],
      [PITCH * 3.5, 1],
      [PITCH * 1.5, 0.8],
    ] as const) {
      h.shadowBlur = blur;
      h.globalAlpha = alpha;
      h.drawImage(text, -canvas.width, 0);
    }
    h.globalAlpha = 1;
    h.shadowBlur = 0;
    h.shadowOffsetX = 0;
    halo.tex.needsUpdate = true;
  };
  paintLcd(0);
  whenFontsReady(() => ((lcdKey = ''), paintLcd(0)));
  const stripW = SCREEN.w + SCREEN_PAD * 2;
  const stripD = SCREEN.d + SCREEN_PAD * 2;
  const haloMat = new THREE.MeshBasicMaterial({ map: halo.tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const haloMesh = at(new THREE.Mesh(decal(stripW, stripD), haloMat), SCREEN.x, TOP + 0.001, SCREEN.z);
  const lcdMesh = at(new THREE.Mesh(decal(stripW, stripD), new THREE.MeshBasicMaterial({ map: lcd.tex, transparent: true, depthWrite: false, toneMapped: false })), SCREEN.x, TOP + 0.0015, SCREEN.z);
  lcdMesh.renderOrder = 1;
  haloMesh.raycast = lcdMesh.raycast = () => {};

  // ---- clear acrylic lid on two hinges at the back: a click opens / closes it, a drag swings it by hand ----
  const acrylic = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.12,
    roughness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const lidOutline = roundedRect(SIZE - 0.02, SIZE - 0.02, 0.26);
  const walls = new THREE.ExtrudeGeometry(lidOutline, { depth: LID_H, bevelEnabled: false, curveSegments: look.segments / 4 });
  walls.rotateX(-Math.PI / 2);
  const lidTop = new THREE.ShapeGeometry(lidOutline, look.segments / 4).rotateX(-Math.PI / 2);
  lidTop.translate(0, LID_H, 0);
  const lid = at(new THREE.Group(), HINGE.x, HINGE.y, HINGE.z);
  const lidBody = new THREE.Group();
  // hinge line = the lid's back edge
  lidBody.position.z = SIZE / 2;
  // caps (group 0) are the open bottom and the top – drawn separately; only the walls here
  lidBody.add(new THREE.Mesh(walls, [new THREE.MeshBasicMaterial({ visible: false }), acrylic]), new THREE.Mesh(lidTop, acrylic));
  // the cut acrylic edges catch the light
  const edgeMat = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(walls, 30), edgeMat);
  edges.raycast = () => {};
  lidBody.add(edges);
  // the strip's and the LED's light caught on the underside of the lid top – only when it's shut, or nearly
  const lidZ = (z: number) => z - (HINGE.z + SIZE / 2);
  const lidTextMat = new THREE.MeshBasicMaterial({ map: halo.tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const lidText = new THREE.Mesh(decal(stripW * 1.15, stripD * 1.4), lidTextMat);
  lidText.position.set(SCREEN.x, LID_H - 0.004, lidZ(SCREEN.z));
  const lidLed = new THREE.Mesh(decal(0.5, 0.5), glowMat());
  lidLed.position.set(LED.x, LID_H - 0.004, lidZ(LED.y));
  for (const o of [lidText, lidLed]) {
    o.raycast = () => {};
    o.renderOrder = 3;
    lidBody.add(o);
  }
  lid.add(lidBody);
  lid.rotation.x = -LID_OPEN;
  lid.traverse((o) => (o.userData.grab = 'lid'));
  lid.renderOrder = 2;
  for (const x of [-1, 1]) at(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.08), m.alu), x * 0.9, TOP + 0.035, -SIZE / 2 + 0.03);

  /** lid angle (0 = shut), where it's heading, and the drag in progress */
  let lidAngle = LID_OPEN;
  let lidTarget = LID_OPEN;
  /** `from` = the grab's ray until the first move tells a lid swing (vertical) from a turn (sideways) */
  let lidDrag: { r: number; phase: number; from: THREE.Ray | null } | null = null;
  const lidRay = new THREE.Raycaster();
  const localRay = (ray: THREE.Ray) => ray.clone().applyMatrix4(group.matrixWorld.clone().invert());
  // a lid point `r` from the hinge, `a` up from flat, in the deck's own space
  const lidPoint = (r: number, a: number) => new THREE.Vector3(0, Math.sin(a) * r, Math.cos(a) * r).add(HINGE);
  const lidGrab = (ray: THREE.Ray) => {
    lidRay.ray.copy(ray);
    const p = lidRay.intersectObject(lid, true)[0]?.point;
    const q = p ? group.worldToLocal(p.clone()).sub(HINGE) : new THREE.Vector3(0, 0, SIZE);
    lidDrag = { r: Math.max(0.3, Math.hypot(q.y, q.z)), phase: Math.atan2(q.y, q.z) - lidAngle, from: ray.clone() };
  };
  // pointer on the plane through the deck's centre, facing the camera
  const facing = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const onFacing = (ray: THREE.Ray) => ray.intersectPlane(facing, new THREE.Vector3());
  // the angle that brings the grabbed point closest to the pointer ray
  const lidDragTo = (ray: THREE.Ray) => {
    if (!lidDrag) return;
    // shut, the lid covers the whole body – a sideways drag on it turns the deck instead
    if (lidDrag.from) {
      const a = onFacing(lidDrag.from);
      const b = onFacing(ray);
      if (a && b && Math.abs(b.x - a.x) > Math.abs(b.y - a.y)) {
        turn.grab(lidDrag.from);
        turn.drag(ray);
        lidDrag = null;
        return;
      }
      lidDrag.from = null;
    }
    const r = localRay(ray);
    let best = lidAngle;
    let bestD = Infinity;
    for (let i = 0; i <= 64; i++) {
      const a = (LID_OPEN * i) / 64;
      const d = r.distanceSqToPoint(lidPoint(lidDrag.r, a + lidDrag.phase));
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    lidAngle = lidTarget = best;
  };

  // ---- turn it by hand: drag the body (not a control, the arm or the lid) to spin it about its own up axis ----
  const turn = handTurn(group, YAW);

  const spin = platterSpin();
  let playing = false;
  let glow = 0;
  /** 0 → 1 as playback starts: how strongly the dots flare */
  let flare = 0;
  let ledLevel = 0.25;
  let scrolled = 0;
  const base = new THREE.Color(C.charcoal);
  const lit = new THREE.Color('#4a4a4a');

  // ---- decor behind the player: thin sound rings spreading out while it plays, two faint still ones otherwise ----
  const ringMat = (opacity: number) => new THREE.MeshBasicMaterial({ color: '#8f8b85', transparent: true, opacity, depthWrite: false });
  const ringGeo = new THREE.RingGeometry(0.994, 1, 160);
  const RINGS_AT = new THREE.Vector3(0, -0.25, -1.8);
  const stillRings = [1.75, 2.35].map((r) => {
    const o = new THREE.Mesh(ringGeo, ringMat(0));
    o.scale.setScalar(r);
    o.position.copy(RINGS_AT);
    o.raycast = () => {};
    root.add(o);
    return o;
  });
  /** a new ring every RIPPLE s, each lives RIPPLES × RIPPLE s */
  const RIPPLE = 1.1;
  const RIPPLES = 4;
  const ripples = Array.from({ length: RIPPLES }, () => {
    const o = new THREE.Mesh(ringGeo, ringMat(0));
    o.position.copy(RINGS_AT);
    o.raycast = () => {};
    root.add(o);
    return o;
  });
  let rippleClock = 0;
  /** 0 → 1 as playback starts, back as it stops */
  let alive = 0;

  // ---- notes floating up off the spinning record while it plays ----
  const noteTex = [noteTexture(false), noteTexture(true)];
  const NOTE_PALE = new THREE.Color('#b8ffd2');
  const notes = Array.from({ length: 14 }, () => {
    // added light, like the LED and the dot strip: it glows on the dark page
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex[0], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    sprite.visible = false;
    sprite.raycast = () => {};
    root.add(sprite);
    return { sprite, age: 0, life: 1, from: new THREE.Vector3(), drift: 0, sway: 0, size: 0.15, spin: 0 };
  });
  let noteClock = 0;
  const spot = new THREE.Vector3();
  const emit = () => {
    const n = notes.find((n) => !n.sprite.visible);
    if (!n) return;
    // somewhere on the record, near its rim, in the deck's own space → the root's
    const a = Math.random() * Math.PI * 2;
    const r = RECORD_R * (0.75 + Math.random() * 0.2);
    group.updateWorldMatrix(true, false);
    spot.set(PLATTER.x + Math.cos(a) * r, TOP + PLATTER_H + 0.05, PLATTER.y + Math.sin(a) * r).applyMatrix4(group.matrixWorld);
    root.worldToLocal(n.from.copy(spot));
    const m = n.sprite.material;
    m.map = noteTex[Math.random() < 0.35 ? 1 : 0]!;
    // the accent green, some a touch paler so they don't all look stamped
    m.color.set(C.accent).lerp(NOTE_PALE, Math.random() * 0.4);
    n.age = 0;
    n.life = 2.6 + Math.random() * 1.2;
    // lean away from the record's centre, sideways
    n.drift = Math.cos(a) * (0.25 + Math.random() * 0.2);
    n.sway = Math.random() * Math.PI * 2;
    // the canvas has glow room around the note: scale up so the note itself keeps its size
    n.size = (0.12 + Math.random() * 0.07) * ((NOTE_PX + NOTE_GLOW * 2) / NOTE_PX);
    n.spin = (Math.random() - 0.5) * 0.6;
    n.sprite.visible = true;
  };
  return {
    group: root,
    sync(s) {
      if (s.playing !== playing) {
        playing = s.playing;
        arm.setPlaying(playing);
        play.visible = !playing;
        pause.visible = playing;
      }
      if (s.track?.name !== track?.name || s.track?.artists !== track?.artists) track = s.track;
      setCover(s.track?.image);
    },
    grab: (ray, part) =>
      turn.owns(part) ? turn.grab(ray)
      : part.userData.grab === 'lid' ? lidGrab(ray)
      : arm.grab(ray),
    drag: (ray) =>
      turn.active ? turn.drag(ray)
      : lidDrag ? lidDragTo(ray)
      : arm.drag(ray),
    release(moved) {
      if (turn.active) {
        turn.release(moved);
        return null;
      }
      if (!lidDrag) return arm.release(moved);
      lidDrag = null;
      // a click flips it; a drag settles to whichever end is nearer
      lidTarget =
        moved ?
          lidAngle > LID_OPEN / 2 ?
            LID_OPEN
          : 0
        : lidTarget > 0 ? 0
        : LID_OPEN;
      return null;
    },
    update({ dt, t, calm, reducedMotion, hovered, flash }) {
      turn.update(dt, reducedMotion);
      platter.rotation.y = spin(dt, playing, reducedMotion);
      if (!lidDrag) lidAngle = reducedMotion ? lidTarget : THREE.MathUtils.damp(lidAngle, lidTarget, 5, dt);
      lid.rotation.x = -lidAngle;
      arm.update(dt, t, calm, reducedMotion);
      // hover only lifts the brightness a little
      glow = THREE.MathUtils.damp(glow, hovered === 'toggle' ? 1 : 0, 8, dt);
      buttonMat.color.copy(base).lerp(lit, Math.max(0, glow * 0.6 - flash * 0.5));
      flare = THREE.MathUtils.damp(flare, playing ? 1 : 0, 3, dt);
      // playing: the LED blinks (a soft on / off, ~1 Hz); reduced motion keeps it steadily lit
      const blink = reducedMotion ? 1 : THREE.MathUtils.smoothstep(Math.sin(t * Math.PI * 2 * 0.9), -0.3, 0.3);
      ledLevel = THREE.MathUtils.damp(ledLevel, playing ? 0.15 + 0.85 * blink : 0.25, playing ? 25 : 3, dt);
      led.opacity = ledLevel;
      const ledGlow = flare * ledLevel;
      (ledHalo.material as THREE.MeshBasicMaterial).opacity = ledGlow * 0.9;
      haloMat.opacity = 0.25 + flare * 0.6;
      // the lid only catches it when shut or close to it
      const near = 1 - THREE.MathUtils.smoothstep(lidAngle, 0.04, 0.5);
      lidTextMat.opacity = flare * near * 0.45;
      (lidLed.material as THREE.MeshBasicMaterial).opacity = ledGlow * near * 0.55;
      // the strip scrolls ~20 dot columns a second, only while playing
      if (playing && !reducedMotion) scrolled += dt * 20;
      paintLcd(Math.floor(scrolled));

      // notes: one every ~⅓ s while playing (fewer when calm), none with reduced motion; each rises, sways, fades
      if (playing && !reducedMotion) {
        noteClock -= dt;
        if (noteClock <= 0) {
          emit();
          noteClock = (calm ? 0.7 : 0.34) * (0.7 + Math.random() * 0.6);
        }
      }
      for (const n of notes) {
        if (!n.sprite.visible) continue;
        n.age += dt;
        const k = n.age / n.life;
        if (k >= 1 || reducedMotion) {
          n.sprite.visible = false;
          continue;
        }
        n.sprite.position.set(n.from.x + n.drift * n.age + Math.sin(n.age * 2.2 + n.sway) * 0.08, n.from.y + 0.55 * n.age - 0.04 * n.age * n.age, n.from.z + 0.2 * n.age);
        n.sprite.scale.setScalar(n.size * (0.6 + 0.4 * Math.min(1, k * 4)));
        n.sprite.material.rotation = n.spin * n.age + Math.sin(n.age * 2.2 + n.sway) * 0.25;
        n.sprite.material.opacity = Math.min(1, k * 6) * (1 - THREE.MathUtils.smoothstep(k, 0.55, 1)) * 0.9;
      }

      // sound rings: spread out and fade while playing; the still pair shows only when it's quiet
      alive =
        reducedMotion ?
          playing ? 1
          : 0
        : THREE.MathUtils.damp(alive, playing ? 1 : 0, 1.5, dt);
      if (!reducedMotion) rippleClock += dt * alive;
      ripples.forEach((o, i) => {
        const k = reducedMotion ? 0.3 + i * 0.15 : ((rippleClock / RIPPLE + i) % RIPPLES) / RIPPLES;
        o.scale.setScalar(1.3 + k * 1.6);
        o.material.opacity = alive * 0.35 * Math.min(1, k * 5) * (1 - k) ** 1.5;
      });
      stillRings.forEach((o) => (o.material.opacity = (1 - alive) * 0.14));
    },
  };
}
