import { UserAvatar } from '@/entities/user'
import { LoginLink, LogoutButton } from '@/features/auth'
import { useTranslation } from '@/shared/i18n'
import { Island } from '@/shared/ui'
import type { Identity } from './model/identity'
import { SourcesList } from './SourcesMenu'

/**
 * The account on a phone, where the sidebar isn't: the avatar opens who you are, every source in play,
 * and log out (Spotify) or log in (imported history only).
 */
export function AccountMenu({ identity }: { identity: Identity }) {
  const { t } = useTranslation(['widgets/app-shell', 'common'])
  const name = identity.user.display_name ?? identity.user.id
  return (
    <Island
      label={t('account')}
      align="end"
      triggerClassName="size-9 justify-center rounded-full p-0"
      panelClassName="w-72"
      flyer={<UserAvatar user={identity.user} className="size-9" />}
      trigger={(_, flyer) => (
        <>
          {flyer}
          <span className="sr-only">{t('account')}</span>
        </>
      )}
    >
      {(close, anchor) => (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
            {/* the avatar from the button lands here */}
            {anchor(<UserAvatar user={identity.user} className="size-11" />)}
            <div className="min-w-0">
              <p className="truncate font-display font-semibold">{name}</p>
              <p className="truncate text-xs text-ink-muted">{t(`identity.${identity.kind}`)}</p>
            </div>
          </div>
          <SourcesList identity={identity} onNavigate={close} />
          <div className="border-t border-line/60 pt-1.5">
            {identity.spotify ? <LogoutButton className="w-full justify-start px-3" /> : <LoginLink size="sm" variant="outline" className="w-full" />}
          </div>
        </>
      )}
    </Island>
  )
}
