import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/shared/ui'
import { env, getCustomSpotifyAppName, getCustomSpotifyClientId } from '@/shared/config'
import { Trans, useTranslation } from '@/shared/i18n'
import { startSpotifyLogin } from '../model/auth'

const STEPS = [1, 2, 3, 4] as const
const NOTES = [1] as const

const field =
  'w-full rounded-xl border border-line bg-surface px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none'

function Option({ badge, title, children }: { badge: string; title: string; children: ReactNode }) {
  return (
    <section className="panel flex flex-col gap-4 rounded-card border-line bg-surface p-5 sm:p-6">
      <div>
        <p className="font-mono text-xs tracking-[0.2em] text-brand uppercase">{badge}</p>
        <h2 className="mt-1 font-display text-xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

/** Plain text link to timuze's own app – only the "buddies" the project owner added can use it. */
function BuddyLink() {
  const { t } = useTranslation(['features/auth', 'common'])
  const [pending, setPending] = useState(false)
  const configured = env.spotifyClientId.length > 0
  return (
    <button
      type="button"
      disabled={pending || !configured}
      title={configured ? undefined : t('common:auth.missingClientId')}
      onClick={() => {
        setPending(true)
        void startSpotifyLogin().catch(() => setPending(false))
      }}
      className="cursor-pointer self-start text-sm text-brand underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? t('common:actions.redirecting') : t('login.buddy.cta')}
    </button>
  )
}

/** Spotify login: the user's own app, with a plain link to the shared timuze app below it. */
export function SpotifyLoginOptions() {
  const { t } = useTranslation('features/auth')
  const [clientId, setClientId] = useState(getCustomSpotifyClientId)
  const [appName, setAppName] = useState(getCustomSpotifyAppName)
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)

  const submitOwn = (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    void startSpotifyLogin('/dashboard', clientId, appName).catch(() => setPending(false))
  }

  const copyUri = async () => {
    try {
      await navigator.clipboard.writeText(env.spotifyRedirectUri)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked – the URI is selectable on screen */
    }
  }

  const rich = {
    b: <b className="text-ink" />,
    code: <code />,
    ext: <a className="text-brand underline-offset-2 hover:underline" href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" />,
  }

  return (
    <div className="flex flex-col gap-6">
      <Option badge={t('login.own.badge')} title={t('login.own.title')}>
        <p className="text-sm text-ink-muted">{t('login.own.body')}</p>
        <form onSubmit={submitOwn} className="flex flex-col gap-4 text-sm">
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-ink-muted marker:text-brand">
            {STEPS.map((n) => (
              <li key={n}>
                <Trans t={t} i18nKey={`login.own.step${n}`} components={rich} />
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2/60 px-3 py-2">
            <code className="min-w-0 flex-1 text-xs break-all select-all">{env.spotifyRedirectUri}</code>
            <Button variant="ghost" size="sm" onClick={() => void copyUri()}>
              {copied ? t('login.own.copied') : t('login.own.copy')}
            </Button>
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-medium">{t('login.own.clientId')}</span>
            <input
              className={field}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="0123456789abcdef0123456789abcdef"
              pattern="[0-9a-fA-F]{32}"
              title={t('login.own.clientIdFormat')}
              autoComplete="off"
              spellCheck={false}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">{t('login.own.appName')}</span>
            <input
              className={field.replace('font-mono ', '')}
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder={t('login.own.appNamePlaceholder')}
              maxLength={24}
              autoComplete="off"
            />
            <span className="text-xs text-ink-faint">{t('login.own.appNameHint')}</span>
          </label>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-xs text-ink-faint">
            {NOTES.map((n) => (
              <li key={n}>{t(`login.own.note${n}`)}</li>
            ))}
          </ul>
          <Button type="submit" size="md" className="self-start" disabled={pending}>
            {pending ? t('login.redirecting') : t('login.own.submit')}
          </Button>
        </form>
      </Option>

      <BuddyLink />
    </div>
  )
}
