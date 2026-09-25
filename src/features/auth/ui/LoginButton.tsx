import { useState } from 'react'
import { Button } from '@/shared/ui'
import { isSpotifyConfigured } from '@/shared/config'
import { cn } from '@/shared/lib'
import { useTranslation } from '@/shared/i18n'
import { startSpotifyLogin } from '../model/auth'

export function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5', className)} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.4a.62.62 0 0 1-.86.2c-2.35-1.44-5.3-1.76-8.79-.97a.62.62 0 1 1-.28-1.21c3.81-.87 7.08-.5 9.72 1.12.3.18.39.57.21.86Zm1.22-2.72a.78.78 0 0 1-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 1 1-.45-1.49c3.63-1.1 8.15-.57 11.23 1.33.37.22.48.7.26 1.07Zm.1-2.83C14.7 8.94 9.38 8.77 6.3 9.7a.94.94 0 1 1-.54-1.8c3.53-1.07 9.4-.87 13.1 1.33a.94.94 0 0 1-.96 1.62Z" />
    </svg>
  )
}

export function LoginButton({
  size = 'lg',
  short = false,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  /** "Log in" instead of "Log in with Spotify" – for tight headers (the icon still says Spotify) */
  short?: boolean
  className?: string
}) {
  const [pending, setPending] = useState(false)
  const configured = isSpotifyConfigured()
  const { t } = useTranslation()
  return (
    <Button
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
      {pending ? t('actions.redirecting') : t(short ? 'actions.loginShort' : 'actions.login')}
    </Button>
  )
}
