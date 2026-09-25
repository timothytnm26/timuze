import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { completeSpotifyLogin } from '@/features/auth'
import { ButtonLink } from '@/shared/ui'
import { useTranslation } from '@/shared/i18n'

export function CallbackPage({ code, state, error }: { code?: string; state?: string; error?: string }) {
  const navigate = useNavigate()
  const started = useRef(false)
  const { t } = useTranslation(['pages/callback', 'common'])
  const m = useMutation({
    mutationFn: completeSpotifyLogin,
    onSuccess: (to) => void navigate({ to, replace: true }),
  })

  useEffect(() => {
    // StrictMode double-invokes effects – an auth code can be used only once
    if (started.current) return
    started.current = true
    m.mutate({ code, state, error })
  }, [code, state, error, m])

  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      {m.isError ? (
        <div className="flex flex-col items-center gap-4">
          <h1 className="font-display text-3xl font-bold">{t('failed')}</h1>
          <p className="max-w-md text-ink-muted">{m.error.message}</p>
          <ButtonLink href={import.meta.env.BASE_URL}>{t('common:actions.backHome')}</ButtonLink>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <div className="flex h-10 items-end gap-1.5" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-2 animate-pulse rounded-full bg-brand"
                style={{ height: `${40 + ((i * 37) % 60)}%`, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
          <p className="text-ink-muted">{t('connecting')}</p>
        </div>
      )}
    </div>
  )
}
