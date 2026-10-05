import { useTranslation } from '@/shared/i18n'
import { StartLink } from './StartLink'

/** Landing-page call to action – every way in lives on /login. */
export function StartButton() {
  const { t } = useTranslation('features/auth')
  return (
    <div className="flex flex-col gap-2">
      <StartLink className="self-start" />
      <p className="text-xs text-ink-faint">{t('start.hint')}</p>
    </div>
  )
}
