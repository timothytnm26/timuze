import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Game2048Thumbnail, useTiers } from '@/features/game-2048'
import { useTranslation } from '@/shared/i18n'
import { Icon } from '@/shared/ui'
import { PageHeader } from '@/widgets/page-header'

/** 2048's picture is its board wearing the user's own top albums. */
function Thumbnail2048() {
  const { tiers } = useTiers('albums', 'medium_term')
  return <Game2048Thumbnail tiers={tiers} className="w-[66%] max-w-64" />
}

/**
 * The games on offer. A new game is one entry here, a route under `/play/<id>` and its strings in
 * `pages/play` (`games.<id>`).
 */
const GAMES = [{ id: '2048', to: '/play/2048', thumbnail: <Thumbnail2048 /> }] as const satisfies readonly { id: '2048'; to: '/play/2048'; thumbnail: ReactNode }[]

export function PlayPage() {
  const { t } = useTranslation('pages/play')
  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {GAMES.map((g) => (
          <Link
            key={g.id}
            to={g.to}
            className="group panel flex flex-col overflow-hidden rounded-card border-line bg-surface transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-brand/60"
          >
            <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-gradient-to-br from-brand-soft via-surface-2 to-surface p-5">{g.thumbnail}</div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div>
                <h2 className="font-display text-xl font-bold">{t(`games.${g.id}.title`)}</h2>
                <p className="mt-1 text-sm text-ink-muted">{t(`games.${g.id}.description`)}</p>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {([`games.${g.id}.tag1`, `games.${g.id}.tag2`] as const).map((k) => (
                  <li key={k} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-muted">
                    {t(k)}
                  </li>
                ))}
              </ul>
              <span className="mt-auto inline-flex items-center gap-2 pt-1 text-sm font-semibold text-brand">
                {t('playNow')}
                <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                  →
                </span>
              </span>
            </div>
          </Link>
        ))}

        {/* room for what comes next */}
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-line p-6 text-center text-ink-muted">
          <Icon name="gamepad" className="size-8" />
          <p className="font-display text-lg font-semibold text-ink">{t('soon.title')}</p>
          <p className="text-sm">{t('soon.body')}</p>
        </div>
      </div>
    </>
  )
}
