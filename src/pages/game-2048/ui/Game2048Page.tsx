import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { TimeRange } from '@/shared/api'
import { Board, Legend, useGame2048, useTiers, WIN_VALUE, type GameMode } from '@/features/game-2048'
import { TimeRangeSwitch, useTimeRangeLabel } from '@/features/time-range'
import { useTranslation } from '@/shared/i18n'
import { Button, buttonClass, Card, ErrorState, Segmented, Skeleton } from '@/shared/ui'
import { PageHeader } from '@/widgets/page-header'

function Score({ label, value, gain, big }: { label: string; value: number; gain?: { amount: number; key: number }; big?: boolean }) {
  return (
    <div
      className={
        big
          ? 'panel relative flex-[2] rounded-2xl border-brand/60 bg-brand-soft px-4 py-2.5 text-center shadow-[0_0_28px_-8px_var(--skin-brand)]'
          : 'panel relative flex-1 rounded-2xl border-line bg-surface px-4 py-2.5 text-center'
      }
    >
      <p className={big ? 'text-xs font-semibold tracking-[0.18em] text-brand uppercase' : 'text-[11px] tracking-wide text-ink-muted uppercase'}>{label}</p>
      {/* re-keyed on every change so the number bumps */}
      <p
        key={value}
        className={big ? 'font-display text-5xl leading-tight font-extrabold text-brand tabular-nums' : 'font-display text-2xl font-bold tabular-nums'}
        style={{ animation: 'tile-bump 250ms ease-out' }}
      >
        {value}
      </p>
      {gain && gain.amount > 0 && (
        <span key={gain.key} aria-hidden className="pointer-events-none absolute top-2 right-4 font-display text-lg font-extrabold text-brand" style={{ animation: 'score-float 800ms ease-out forwards' }}>
          +{gain.amount}
        </span>
      )}
    </div>
  )
}

/** The board's overlays: the 2048 banner (once) and the game-over card. */
function Overlay({ title, body, actions }: { title: string; body: string; actions: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-[inherit] bg-canvas/80 p-6 text-center backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <h2 className="font-display text-3xl font-extrabold">{title}</h2>
        <p className="text-sm text-ink-muted">{body}</p>
        <div className="flex flex-wrap justify-center gap-2">{actions}</div>
      </div>
    </div>
  )
}

export function Game2048Page({
  mode,
  onModeChange,
  range,
  onRangeChange,
}: {
  mode: GameMode
  onModeChange: (m: GameMode) => void
  range: TimeRange
  onRangeChange: (r: TimeRange) => void
}) {
  const { t } = useTranslation('pages/game-2048')
  const rangeLabel = useTimeRangeLabel()
  const { game, best, keepGoing, play, restart, dismissWin } = useGame2048()

  // eleven top items: every tile value gets one, the highest value the user's number one
  const { tiers, query: q } = useTiers(mode, range)

  const top = tiers[0]

  // points gained by the latest move, floated off the score card
  const lastScore = useRef(game.score)
  const [gain, setGain] = useState({ amount: 0, key: 0 })
  useEffect(() => {
    if (game.score > lastScore.current) setGain({ amount: game.score - lastScore.current, key: Date.now() })
    lastScore.current = game.score
  }, [game.score])

  const scores = (
    <div className="flex items-stretch gap-2">
      <Score label={t('score')} value={game.score} gain={gain} big />
      <Score label={t('best')} value={best} />
      <Button variant="outline" className="h-auto self-stretch rounded-2xl" onClick={restart}>
        {t('newGame')}
      </Button>
    </div>
  )

  return (
    <>
      <Link to="/play" className={buttonClass('ghost', 'sm', '-ml-3 mb-2')}>
        ← {t('back')}
      </Link>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} action={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label={t('mode.label')}
              value={mode}
              onChange={onModeChange}
              options={[
                { value: 'albums', label: t('mode.albums') },
                { value: 'artists', label: t('mode.artists') },
              ]}
            />
            <TimeRangeSwitch value={range} onChange={onRangeChange} />
          </div>
        }
      />

      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <Skeleton className="mx-auto aspect-square w-full max-w-md rounded-card" />
      ) : (
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
          {/* the board column is as wide as the board, so everything in it lines up with the frame */}
          <section className="mx-auto flex w-full max-w-md flex-col gap-4">
            {scores}
            <Board state={game} tiers={tiers} onMove={play} ariaLabel={t('board')}>
              {game.won && !keepGoing && !game.over && (
                <Overlay
                  title={t('win.title', { value: WIN_VALUE })}
                  body={t('win.body', { name: top?.name ?? '', value: WIN_VALUE })}
                  actions={
                    <>
                      <Button onClick={dismissWin}>{t('win.keepGoing')}</Button>
                      <Button variant="outline" onClick={restart}>
                        {t('newGame')}
                      </Button>
                    </>
                  }
                />
              )}
              {game.over && <Overlay title={t('over.title')} body={t('over.body', { score: game.score })} actions={<Button onClick={restart}>{t('newGame')}</Button>} />}
            </Board>
            <p className="text-center text-sm text-ink-muted">{t('hint')}</p>
          </section>
          <aside className="lg:sticky lg:top-24">
            <Legend tiers={tiers} subtitle={t('legend.subtitle', { range: rangeLabel(range) })} />
          </aside>
        </div>
      )}
      {/* nothing to build tiles from */}
      {!q.isPending && !q.isError && tiers.length === 0 && (
        <Card className="mt-6 text-center text-sm text-ink-muted">{t('empty')}</Card>
      )}
    </>
  )
}
