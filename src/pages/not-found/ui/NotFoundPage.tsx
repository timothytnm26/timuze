import { Link } from '@tanstack/react-router'
import { buttonClass } from '@/shared/ui'
import { useTranslation } from '@/shared/i18n'

export function NotFoundPage() {
  const { t } = useTranslation(['pages/not-found', 'common'])
  return (
    <div className="grid min-h-[60dvh] place-items-center text-center">
      <div>
        <p className="font-display text-8xl font-extrabold text-brand">404</p>
        <p className="mt-2 text-ink-muted">{t('message')}</p>
        <Link to="/" className={buttonClass('outline', 'md', 'mt-6')}>
          {t('common:actions.backHome')}
        </Link>
      </div>
    </div>
  )
}
