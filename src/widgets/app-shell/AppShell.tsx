import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { UserAvatar, userQueries } from '@/entities/user'
import { LogoutButton } from '@/features/auth'
import { LocaleMenu } from '@/features/switch-locale'
import { SkinMenu } from '@/features/switch-skin'
import { cn } from '@/shared/lib'
import { LogoMark } from '@/shared/ui'
import { useTranslation } from '@/shared/i18n'
import { NowPlaying } from '@/widgets/now-playing'
import { NAV } from './nav'

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-1.5 font-display text-xl font-bold tracking-tight', className)}>
      <LogoMark />
      timuze
    </Link>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useQuery(userQueries.me())
  const { t } = useTranslation(['widgets/app-shell', 'common'])

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      {/* sidebar – desktop (z-40: its skin menu must overlay the main column's sticky bars) */}
      <aside className="sticky top-0 z-40 hidden h-dvh flex-col gap-8 border-r border-line/60 px-5 py-7 lg:flex">
        <Logo />
        {/* nav + now playing scroll when the screen is short; the footer below stays put, so the
            skin/language islands opening upward out of it aren't clipped by the scroller */}
        <div className="-mx-2 flex min-h-0 flex-1 flex-col gap-8 overflow-x-hidden overflow-y-auto overscroll-contain px-2 [scrollbar-width:thin]">
          <nav className="flex flex-col gap-1" aria-label={t('nav.main')}>
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                search={(prev: Record<string, unknown>) => prev}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                activeProps={{ className: 'bg-surface text-ink [&>span]:text-brand' }}
              >
                <span className="w-4 text-center">{n.icon}</span>
                {t(n.label)}
              </Link>
            ))}
          </nav>
          <NowPlaying variant="card" className="mt-auto" />
        </div>
        <div className="-mt-5 flex flex-col gap-3">
          <div className="flex gap-2">
            <SkinMenu placement="top" align="start" />
            <LocaleMenu placement="top" align="start" />
          </div>
          {me && (
            <div className="flex items-center gap-3">
              <UserAvatar user={me} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{me.display_name ?? me.id}</p>
                <LogoutButton className="-ml-3 h-6 px-3 text-xs" />
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* top bar – below lg only, the sidebar carries all of this on desktop. Frosting sits on a
            ::before so the header isn't a backdrop root – islands inside it can blur the page too */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line/60 px-4 py-3 before:absolute before:inset-0 before:-z-10 before:bg-canvas/80 before:backdrop-blur-xl sm:px-8 lg:hidden glass:before:bg-canvas/40">
          <Logo />
          <div className="flex items-center gap-3">
            <NowPlaying className="hidden sm:flex" />
            <SkinMenu />
            <LocaleMenu />
            {me && <UserAvatar user={me} />}
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-8 pb-28 sm:px-8 lg:pb-16">{children}</main>
      </div>

      {/* bottom nav – mobile */}
      <nav
        className="fixed inset-x-3 bottom-3 z-40 flex justify-between rounded-2xl border border-line bg-surface/90 px-1 py-1.5 backdrop-blur-xl lg:hidden glass:bg-canvas/50 pixel:border-2"
        aria-label={t('nav.mobile')}
      >
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            search={(prev: Record<string, unknown>) => prev}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] text-ink-muted"
            activeProps={{ className: 'text-brand bg-surface-2' }}
          >
            <span className="text-base leading-none">{n.icon}</span>
            {/* seven tabs on a phone: one line each, cut short rather than wrapped */}
            <span className="max-w-full truncate px-0.5">{t(n.label)}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
