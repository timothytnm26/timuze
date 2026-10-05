import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react'
import { useStore } from '@tanstack/react-store'
import { EmbedHost, PlayerCard, usePlayer, watchPlayback } from '@/features/web-player'
import { sessionStore } from '@/shared/api'
import { Trans, useTranslation } from '@/shared/i18n'
import { cn } from '@/shared/lib'
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
  const loggedIn = useStore(sessionStore, (s) => s.mode !== 'anonymous')
  const error = usePlayer((s) => s.error)
  const embedded = usePlayer((s) => s.source === 'youtube' || s.source === 'embed')

  if (failed) return fallback

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4">
      <div className="group relative aspect-square w-full">
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
        {/* without a login the card is gone – this tells what the deck can do, on hover (or keyboard focus); below the deck, bottom right, so it never covers it */}
        {/* YouTube / Spotify players for imported tracks – bottom left, clear of the deck */}
        {!loggedIn && <EmbedHost className="absolute top-full left-0 z-10 mt-1" />}
        {!loggedIn && !embedded && (
          <p
            role="tooltip"
            className="panel pointer-events-none absolute top-full right-0 z-10 mt-1 w-[min(24rem,100%)] translate-y-2 rounded-2xl border-line bg-surface/90 px-4 py-3 text-sm text-ink-muted opacity-0 backdrop-blur-xl transition-[opacity,translate] duration-200 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 glass:bg-surface"
          >
            <Trans
              t={t}
              i18nKey="hoverHint"
              components={{
                play: (
                  <span className="mx-0.5 inline-grid size-4 translate-y-0.5 place-items-center rounded-full bg-brand text-canvas">
                    <svg viewBox="0 0 24 24" className="size-2.5" fill="currentColor" aria-label="play">
                      <path d="M7 4.5v15l12-7.5z" />
                    </svg>
                  </span>
                ),
              }}
            />
          </p>
        )}
      </div>
      {/* the controller is for Spotify logins; without one the deck's own buttons do it, and the card only appears to say what went wrong */}
      {(loggedIn || error) && <PlayerCard loginAction={loginAction} className={cn('relative z-10', loggedIn && 'self-end translate-y-3')} />}
    </div>
  )
}
