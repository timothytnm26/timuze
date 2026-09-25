import { getLocale, LOCALES, LOCALE_NAMES, setLocale, useTranslation } from '@/shared/i18n'
import { cn, onRadioGroupKeyDown } from '@/shared/lib'
import { Island } from '@/shared/ui'

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-4.5 shrink-0', className)} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z" />
    </svg>
  )
}

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
      trigger={() => (
        <>
          <GlobeIcon />
          <span className="font-mono text-xs max-sm:hidden" aria-hidden>
            {LOCALE_NAMES[locale].short}
          </span>
          <span className="sr-only">{`${label}: ${LOCALE_NAMES[locale].native}`}</span>
        </>
      )}
    >
      {() => (
        <>
          <p className="px-2 pt-1 text-xs text-ink-faint">{label}</p>
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
                  <svg viewBox="0 0 12 10" className="size-3.5 shrink-0 text-brand" aria-hidden>
                    <path d="M1 5.5l3.5 3L11 1" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </Island>
  )
}
