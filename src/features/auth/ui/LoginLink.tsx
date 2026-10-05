import { Link } from '@tanstack/react-router'
import { buttonClass } from '@/shared/ui'
import { cn } from '@/shared/lib'
import { useTranslation } from '@/shared/i18n'
import { SpotifyIcon } from './LoginButton'

/** Opens the /login page, where every way in (Last.fm, files, Spotify) is explained. */
export function LoginLink({
  size = 'lg',
  short = false,
  variant = 'primary',
  icon = false,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  short?: boolean
  variant?: 'primary' | 'outline'
  /** show the Spotify mark – only where the login really is Spotify-only (the turntable) */
  icon?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <Link to="/login" className={buttonClass(variant, size, cn(className))}>
      {icon && <SpotifyIcon />}
      {t(short ? 'actions.loginShort' : 'actions.login')}
    </Link>
  )
}
