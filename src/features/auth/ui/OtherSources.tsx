import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AppleMusicIcon, Button, buttonClass, LastfmIcon, SpotifyMark, YoutubeMusicIcon } from '@/shared/ui'
import { safeStorage } from '@/shared/lib'
import { Trans, useTranslation } from '@/shared/i18n'
import type { StreamSource } from '@/entities/stream-history'

const field =
  'w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none'

/** Same key the Last.fm importer uses, so the username typed here is already there on the import screen. */
const LASTFM_USER_KEY = 'lastfm-username'

const FILE_SOURCES: { source: Exclude<StreamSource, 'lastfm'>; icon: ReactNode }[] = [
  { source: 'youtube', icon: <YoutubeMusicIcon className="size-10" /> },
  { source: 'apple', icon: <AppleMusicIcon className="size-10" /> },
  { source: 'spotify', icon: <SpotifyMark className="size-10" /> },
]

/** Every way in that needs no Spotify login: Last.fm first, then data-export files. */
export function OtherSources() {
  const { t } = useTranslation('features/auth')
  const navigate = useNavigate()
  const [username, setUsername] = useState(() => safeStorage.get<string>(LASTFM_USER_KEY) ?? '')

  const continueLastfm = (e: FormEvent) => {
    e.preventDefault()
    const user = username.trim()
    safeStorage.set(LASTFM_USER_KEY, user)
    void navigate({ to: '/history', search: { source: 'lastfm', user } })
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={continueLastfm} className="panel flex flex-col gap-3 rounded-card border-brand/40 bg-surface p-5 ring-1 ring-brand/20 sm:p-6">
        <div className="flex items-center gap-3">
          <LastfmIcon className="size-11" />
          <div>
            <h3 className="font-display text-lg font-bold">{t('login.others.lastfm.title')}</h3>
            <p className="text-xs text-brand">{t('login.others.lastfm.badge')}</p>
          </div>
        </div>
        <p className="text-sm text-ink-muted">{t('login.others.lastfm.body')}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className={field}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('login.others.lastfm.placeholder')}
            aria-label={t('login.others.lastfm.placeholder')}
            autoComplete="off"
            spellCheck={false}
            required
          />
          <Button type="submit" size="md" className="shrink-0">
            {t('login.others.lastfm.cta')}
          </Button>
        </div>
        <p className="text-xs text-ink-faint">
          <Trans
            t={t}
            i18nKey="login.others.lastfm.hint"
            components={{ ext: <a className="text-brand underline-offset-2 hover:underline" href="https://www.last.fm/settings/privacy" target="_blank" rel="noreferrer" /> }}
          />
        </p>
      </form>

      <p className="mt-2 text-xs tracking-wide text-ink-faint uppercase">{t('login.others.filesTitle')}</p>
      <ul className="flex flex-col gap-3">
        {FILE_SOURCES.map(({ source, icon }) => (
          <li key={source} className="panel flex items-center gap-4 rounded-card border-line bg-surface p-4">
            {icon}
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-semibold">{t(`login.others.files.${source}.title`)}</h3>
              <p className="text-xs text-ink-muted">{t(`login.others.files.${source}.body`)}</p>
            </div>
            <Link to="/history" search={{ source }} className={buttonClass('outline', 'sm', 'shrink-0')}>
              {t('login.others.filesCta')}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-faint">{t('login.others.filesHint')}</p>
    </div>
  )
}
