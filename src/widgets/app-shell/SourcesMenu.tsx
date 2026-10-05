import { Link } from '@tanstack/react-router'
import { AppleMusicIcon, Island, LastfmIcon, SpotifyMark, YoutubeMusicIcon } from '@/shared/ui'
import { useTranslation } from '@/shared/i18n'
import type { Identity, SourceKind } from './model/identity'

const ICONS: Record<SourceKind, typeof SpotifyMark> = {
  buddy: SpotifyMark,
  own: SpotifyMark,
  spotifyFile: SpotifyMark,
  lastfm: LastfmIcon,
  youtube: YoutubeMusicIcon,
  apple: AppleMusicIcon,
}

/** "+" next to the account line → island listing every source in play; the first one is what the header shows. */
export function SourcesMenu({ identity }: { identity: Identity }) {
  const { t } = useTranslation(['widgets/app-shell', 'common'])
  return (
    <Island
      label={t('sources.title')}
      placement="top"
      align="start"
      triggerClassName="size-5 h-5 justify-center rounded-full px-0 text-sm leading-none"
      panelClassName="w-64"
      trigger={() => (
        <>
          <span aria-hidden>+</span>
          <span className="sr-only">{t('sources.open')}</span>
        </>
      )}
    >
      {(close) => (
        <>
          <p className="px-2 pt-1 font-mono text-[10px] tracking-[0.15em] text-ink-faint uppercase">{t('sources.title')}</p>
          <ul className="flex flex-col gap-0.5">
            {identity.sources.map((s, i) => {
              const Icon = ICONS[s.kind]
              return (
                <li key={s.kind} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <Icon className="size-7 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{t(`identity.${s.kind}`)}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {[s.detail, s.count ? t('common:units.plays', { count: s.count }) : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {i === 0 && <span className="text-[10px] text-brand">{t('sources.shown')}</span>}
                </li>
              )
            })}
          </ul>
          <Link
            to="/history"
            search={{}}
            onClick={close}
            className="rounded-xl px-3 py-2 text-center text-sm font-medium text-brand hover:bg-surface"
          >
            {t('sources.manage')}
          </Link>
        </>
      )}
    </Island>
  )
}
