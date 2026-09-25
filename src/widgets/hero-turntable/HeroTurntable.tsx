import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react'
import { PlayerCard, watchPlayback } from '@/features/web-player'
import { useTranslation } from '@/shared/i18n'
import { useSkin } from '@/shared/theme'
import { LOOKS } from './scene/looks'

const TurntableCanvas = lazy(() => import('./TurntableCanvas'))

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * Landing hero visual: a record player drawn in the skin's style (retro console, pixel sprite, minimal slab, glass record),
 * minimal and retro seen at an angle like a product shot, pixel and glass face-on. Mirrors (and drives) whatever the user is
 * playing on Spotify – on another device if one is active, else the in-browser player it starts.
 * `fallback` is shown without WebGL; `loginAction` when the user has to (re-)connect Spotify.
 */
export function HeroTurntable({ fallback, loginAction }: { fallback: ReactNode; loginAction?: ReactNode }) {
  const { t } = useTranslation('widgets/hero-turntable')
  const skin = useSkin()
  const [failed, setFailed] = useState(() => !hasWebGL())
  const onError = useCallback(() => setFailed(true), [])
  useEffect(() => watchPlayback(), [])

  if (failed) return fallback

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4">
      <div className="relative aspect-square w-full">
        <div
          data-decor
          className="pointer-events-none absolute inset-[12%] rounded-full bg-[radial-gradient(circle,var(--skin-brand)_0%,transparent_65%)] opacity-20 blur-3xl"
          aria-hidden
        />
        {/* bleeds past the column so the scroll motion isn't clipped */}
        <div className="absolute -inset-[10%]">
          <Suspense fallback={null}>
            <TurntableCanvas skin={skin} label={t(LOOKS[skin].deck === 'glass' ? 'glassLabel' : 'label')} onError={onError} />
          </Suspense>
          {/* retro: film grain, pixel: CRT scanlines – over the deck only, faded out towards the edges */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[8%] hidden mask-[radial-gradient(closest-side,black_75%,transparent)] retro:block retro:bg-(image:--grain-image) retro:opacity-30 retro:mix-blend-overlay pixel:block pixel:bg-[repeating-linear-gradient(to_bottom,rgb(0_0_0/0.4)_0_2px,transparent_2px_4px)]"
          />
        </div>
      </div>
      <PlayerCard loginAction={loginAction} className="relative z-10" />
    </div>
  )
}
