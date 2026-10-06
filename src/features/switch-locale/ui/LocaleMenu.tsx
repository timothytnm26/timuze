import { getLocale, LOCALES, LOCALE_NAMES, setLocale, useTranslation } from '@/shared/i18n'
import { cn, onRadioGroupKeyDown } from '@/shared/lib'
import { Icon, Island } from '@/shared/ui'

/** Globe pill → island listing each language in its own script. The choice is persisted in localStorage. */
export function LocaleMenu({
  className,
  placement,
  align,
}: {
  className?: string
  placement?: 'top' | 'bottom'
  align?: 'start' | 'end'
}) {
  // subscribing via useTranslation re-renders this on `languageChanged`
  const { t } = useTranslation()
  const locale = getLocale()
  const label = t('labels.language')

  return (
    <Island
      label={label}
      placement={placement}
      align={align}
      className={className}
      triggerClassName="px-2.5 sm:pr-3"
      panelClassName="w-56"
      flyer={
        <>
          <Icon name="globe" className="size-4.5" />
          <span className="font-mono text-xs max-sm:hidden" aria-hidden>
            {LOCALE_NAMES[locale].short}
          </span>
        </>
      }
      trigger={(_, flyer) => (
        <>
          {flyer}
          <span className="sr-only">{`${label}: ${LOCALE_NAMES[locale].native}`}</span>
        </>
      )}
    >
      {(_, anchor) => (
        <>
          {/* the globe and code from the button land here */}
          <p className="flex items-center gap-2 px-2 pt-1 text-xs text-ink-faint">
            {anchor()}
            {label}
          </p>
          <div role="radiogroup" aria-label={label} onKeyDown={onRadioGroupKeyDown} className="flex flex-col gap-0.5">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={l === locale}
                lang={l}
                tabIndex={l === locale ? undefined : -1}
                onClick={() => setLocale(l)}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  l === locale ? 'bg-surface text-ink' : 'text-ink-muted hover:bg-surface hover:text-ink',
                )}
              >
                <span className={cn('w-6 font-mono text-xs', l === locale ? 'text-brand' : 'text-ink-faint')}>
                  {LOCALE_NAMES[l].short}
                </span>
                <span className="flex-1">{LOCALE_NAMES[l].native}</span>
                {l === locale && (
                  <Icon name="check" className="size-3.5 shrink-0 text-brand" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </Island>
  )
}
