import { useEffect, useRef } from 'react'
import { playerStore, seekBy, skipTrack, togglePlayback } from '@/features/web-player'
import { prefersReducedMotion, ScrollTrigger } from '@/shared/lib'
import { motionStyle, type Skin } from '@/shared/theme'
import { createTurntableScene } from './scene/scene'

/** The three.js part of the hero – its own chunk, loaded lazily. */
export default function TurntableCanvas({ skin, label, onError }: { skin: Skin; label: string; onError: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let scene: ReturnType<typeof createTurntableScene>
    try {
      scene = createTurntableScene(canvas, {
        skin,
        motion: motionStyle(),
        reducedMotion: prefersReducedMotion(),
        onAction: (a) => (a === 'toggle' ? togglePlayback() : skipTrack(a === 'next' ? 1 : -1)),
        onSeek: seekBy,
      })
    } catch {
      onError()
      return
    }

    const sync = (s: typeof playerStore.state) => scene.sync(s)
    sync(playerStore.state)
    const sub = playerStore.subscribe(sync)

    const trigger = ScrollTrigger.create({
      trigger: canvas.closest('[data-hero]') ?? canvas,
      start: 'top top',
      end: 'bottom top',
      onUpdate: (self) => scene.setScroll(self.progress),
    })

    return () => {
      sub.unsubscribe()
      trigger.kill()
      scene.dispose()
    }
  }, [skin, onError])

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      // soft edges instead of a hard cut where the deck sinks out of the canvas;
      // retro: a sun-faded sepia cast, pixel: CRT glow + colour fringing on the upscaled sprite
      className="absolute inset-0 size-full touch-pan-y select-none [mask-image:linear-gradient(to_bottom,black_88%,transparent)] retro:[filter:sepia(0.18)_saturate(1.1)_contrast(1.04)] pixel:[image-rendering:pixelated] pixel:[filter:drop-shadow(2px_0_rgb(255_62_165/0.55))_drop-shadow(-2px_0_rgb(62_230_255/0.55))_drop-shadow(0_0_14px_rgb(62_230_255/0.25))]"
    />
  )
}
