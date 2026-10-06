import { useState } from 'react'
import { Button, Icon } from '@/shared/ui'
import { env } from '@/shared/config'
import { cn } from '@/shared/lib'
import { useTranslation } from '@/shared/i18n'
import { startSpotifyLogin } from '../model/auth'

export function SpotifyIcon({ className }: { className?: string }) {
  return <Icon name="spotify-glyph" className={cn('size-5', className)} />
}

export function LoginButton({
  size = 'lg',
  short = false,
  variant,
  label,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  /** "Log in" instead of "Log in with Spotify" – for tight headers (the icon still says Spotify) */
  short?: boolean
  variant?: 'primary' | 'outline'
  /** replaces the default "Log in with Spotify" text */
  label?: string
  className?: string
}) {
  const [pending, setPending] = useState(false)
  // the built-in app only – a user's own Client ID goes through StartOptions
  const configured = env.spotifyClientId.length > 0
  const { t } = useTranslation()
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={pending || !configured}
      title={configured ? undefined : t('auth.missingClientId')}
      onClick={() => {
        setPending(true)
        void startSpotifyLogin().catch(() => setPending(false))
      }}
    >
      <SpotifyIcon />
      {pending ? t('actions.redirecting') : (label ?? t(short ? 'actions.loginShort' : 'actions.login'))}
    </Button>
  )
}
