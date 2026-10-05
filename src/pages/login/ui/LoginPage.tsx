import { Link } from '@tanstack/react-router'
import { OtherSources, SpotifyLoginOptions } from '@/features/auth'
import { LocaleMenu } from '@/features/switch-locale'
import { SkinMenu } from '@/features/switch-skin'
import { buttonClass, SpotifyMark } from '@/shared/ui'
import { useTranslation } from '@/shared/i18n'
import { Logo } from '@/widgets/app-shell'

export function LoginPage() {
  const { t } = useTranslation(['features/auth', 'common'])
  return (
    <>
      <header className="border-b border-line/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <Logo />
          <div className="flex items-center gap-2">
            <SkinMenu />
            <LocaleMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-10 pb-20 sm:px-8">
        <div className="flex flex-col gap-3">
          <Link to="/" className={buttonClass('ghost', 'sm', '-ml-3 self-start')}>
            ← {t('common:actions.backHome')}
          </Link>
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{t('login.title')}</h1>
          <p className="max-w-2xl text-ink-muted">{t('login.intro')}</p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-2">
          <section aria-labelledby="spotify-title" className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <SpotifyMark className="size-9" />
              <div>
                <h2 id="spotify-title" className="font-display text-2xl font-bold">
                  {t('login.spotifyColumn.title')}
                </h2>
                <p className="text-sm text-ink-muted">{t('login.spotifyColumn.subtitle')}</p>
              </div>
            </div>
            <SpotifyLoginOptions />
          </section>

          <section aria-labelledby="others-title" className="flex flex-col gap-4">
            <div>
              <h2 id="others-title" className="font-display text-2xl font-bold">
                {t('login.others.title')}
              </h2>
              <p className="text-sm text-ink-muted">{t('login.others.subtitle')}</p>
            </div>
            <OtherSources />
          </section>
        </div>
      </main>
    </>
  )
}
