import { useEffect, useState, type ReactNode } from 'react'
import { useStore } from '@tanstack/react-store'
import { sessionStore } from '@/shared/api'
import { Trans, useTranslation } from '@/shared/i18n'
import { cn, formatDuration } from '@/shared/lib'
import { Cover } from '@/shared/ui'
import { dismissPlayerError, skipTrack, togglePlayback, usePlayer } from '../model/player'
import { iconButton, PlayIcon, SkipIcon } from './icons'

/** Live position – interpolated between SDK updates. */
function useProgress() {
  const { playing, position, duration, updatedAt } = usePlayer()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [playing])
  const at = Math.min(duration, playing ? position + Math.max(0, now - updatedAt) : position)
  return { at, duration }
}

/**
 * Status + transport controls for the in-browser player.
 * `loginAction` is rendered when the user has to (re-)connect Spotify (features don't import each other).
 */
export function PlayerCard({ loginAction, className }: { loginAction?: ReactNode; className?: string }) {
  const { t } = useTranslation('features/web-player')
  const mode = useStore(sessionStore, (s) => s.mode)
  const { status, playing, track, error, device } = usePlayer()
  const { at, duration } = useProgress()

  let body: ReactNode
  if (error) {
    const needsLogin = error === 'login' || error === 'scope' || error === 'auth'
    body = (
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm">{t(`errors.${error}`)}</p>
        <div className="flex flex-wrap items-center gap-2">
          {needsLogin && loginAction}
          <button type="button" onClick={dismissPlayerError} className="cursor-pointer text-xs text-ink-muted underline-offset-4 hover:text-ink hover:underline">
            {t('dismiss')}
          </button>
        </div>
      </div>
    )
  } else if (track) {
    body = (
      <>
        <Cover images={track.image ? [{ url: track.image, width: null, height: null }] : []} alt="" rounded="lg" className="size-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{track.name}</p>
          <p className="truncate text-xs text-ink-muted">
            {track.artists}
            {device && <span className="text-ink-faint"> · {t('onDevice', { device })}</span>}
          </p>
          <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] text-ink-faint tabular-nums">
            <span>{formatDuration(at)}</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-brand" style={{ width: `${duration ? (at / duration) * 100 : 0}%` }} />
            </div>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      </>
    )
  } else {
    body = (
      <p className="min-w-0 flex-1 text-sm text-ink-muted">
        {status === 'connecting' ? (
          t('connecting')
        ) : (
          <Trans
            t={t}
            i18nKey={mode === 'anonymous' ? 'hintAnonymous' : 'hint'}
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
        )}
      </p>
    )
  }

  return (
    <div
      aria-live="polite"
      className={cn('panel flex w-full max-w-sm items-center gap-3 rounded-2xl border-line bg-surface/90 p-3 backdrop-blur-xl glass:bg-surface', className)}
    >
      {body}
      {!error && (
        <div className="flex shrink-0 items-center">
          {track && (
            <button type="button" className={iconButton} onClick={() => skipTrack(-1)} aria-label={t('previous')}>
              <SkipIcon back />
            </button>
          )}
          <button
            type="button"
            onClick={togglePlayback}
            disabled={status === 'connecting'}
            aria-label={playing ? t('pause') : t('play')}
            className={cn(iconButton, 'size-10 bg-brand text-canvas hover:bg-brand-strong hover:text-canvas')}
          >
            <PlayIcon playing={playing} />
          </button>
          {track && (
            <button type="button" className={iconButton} onClick={() => skipTrack(1)} aria-label={t('next')}>
              <SkipIcon />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
