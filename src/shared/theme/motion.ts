import { prefersReducedMotion } from '../lib/gsap'
import { SKIN_MANIFEST, type MotionStyle } from './config'
import { getSkin } from './instance'

export const motionStyle = (): MotionStyle => SKIN_MANIFEST[getSkin()].motion

/** Loops, parallax and scrubbed flourishes – off for calm skins and reduced-motion users. */
export const decorativeMotion = () => !prefersReducedMotion() && motionStyle() !== 'calm'

const CALM = { time: 0.6, stagger: 0.5, distance: 0.35, scale: 0.25 }
const STEPS = 'steps(5)'
const DISTANCE_KEYS = ['x', 'y', 'xPercent', 'yPercent'] as const

/**
 * Re-tunes tween vars for the active skin's motion style. Wrap the vars of every tween:
 * `gsap.from(el, tune({ y: 24, duration: 0.8, ease: 'expo.out' }))`.
 * calm → shorter, closer, no rotation or overshoot · stepped → frame-by-frame · lively → as is.
 */
export function tune<T extends gsap.TweenVars>(vars: T): T {
  const style = motionStyle()
  if (style === 'lively') return vars
  const out: gsap.TweenVars = { ...vars }

  if (style === 'stepped') {
    if (vars.ease !== 'none') out.ease = STEPS
    return out as T
  }

  if (vars.ease !== 'none') out.ease = 'power2.out'
  if (typeof vars.duration === 'number') out.duration = vars.duration * CALM.time
  if (typeof vars.delay === 'number') out.delay = vars.delay * CALM.time
  if (typeof vars.stagger === 'number') out.stagger = vars.stagger * CALM.stagger
  for (const key of DISTANCE_KEYS) {
    const v = vars[key]
    if (typeof v === 'number') out[key] = v * CALM.distance
  }
  if (typeof vars.rotate === 'number') out.rotate = 0
  if (typeof vars.scale === 'number') out.scale = 1 - (1 - vars.scale) * CALM.scale
  return out as T
}
