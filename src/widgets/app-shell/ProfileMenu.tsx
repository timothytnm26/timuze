import { Link } from '@tanstack/react-router'
import { UserAvatar } from '@/entities/user'
import { LogoutButton, StartLink } from '@/features/auth'
import { useTranslation } from '@/shared/i18n'
import { cn } from '@/shared/lib'
import { Island } from '@/shared/ui'
import { useIdentity } from './model/identity'
import { NAV } from './nav'

/**
 * Signed in with Spotify: avatar pill → island with the dashboard tabs and log out.
 * Imported data only: a pill with their name that opens the dashboard.
 * Neither: the Get started button.
 */
export function ProfileMenu({ className }: { className?: string }) {
  const identity = useIdentity()
  const { t } = useTranslation(['widgets/app-shell', 'common'])

  if (!identity) return <StartLink size="sm" className={className} />

  const me = identity.user
  const name = me.display_name ?? me.id

  if (!identity.spotify)
    return (
      <Link
        to="/dashboard"
        className={cn('flex h-10 items-center gap-2 rounded-full border border-line bg-surface py-0.5 pr-3 pl-0.5 text-sm font-medium hover:border-ink-faint', className)}
      >
        <UserAvatar user={me} className="size-8" />
        <span className="hidden max-w-32 truncate sm:block">{name}</span>
        <span className="sr-only">{t('openDashboard')}</span>
      </Link>
    )

  return (
    <Island
      label={t('account')}
      className={className}
      triggerClassName="pl-0.5 pr-0.5 sm:pr-3"
      panelClassName="w-72"
      flyer={<UserAvatar user={me} className="size-8" />}
      trigger={(open, flyer) => (
        <>
          {flyer}
          <span className="hidden max-w-32 truncate sm:block">{name}</span>
          <svg viewBox="0 0 10 6" className={cn('hidden size-2.5 transition-transform sm:block', open && 'rotate-180')} aria-hidden>
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span className="sr-only">{t('account')}</span>
        </>
      )}
    >
      {(close, anchor) => (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
            {/* the avatar from the pill lands here */}
            {anchor(<UserAvatar user={me} className="size-11" />)}
            <div className="min-w-0">
              <p className="truncate font-display font-semibold">{name}</p>
              <p className="truncate text-xs text-ink-muted">{t(`identity.${identity.kind}`)}</p>
            </div>
          </div>
          <nav className="flex flex-col gap-0.5" aria-label={t('nav.main')}>
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={close}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <span className="w-4 text-center text-brand">{n.icon}</span>
                {t(n.label)}
              </Link>
            ))}
          </nav>
          <div className="border-t border-line/60 pt-1.5">
            <LogoutButton className="w-full justify-start px-3" />
          </div>
        </>
      )}
    </Island>
  )
}
