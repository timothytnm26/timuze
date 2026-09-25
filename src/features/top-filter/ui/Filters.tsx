import { useMemo } from 'react'
import { INTL_LOCALE, isLocale, useTranslation } from '@/shared/i18n'
import { Button, EmptyState, FilterChips, Skeleton } from '@/shared/ui'

type Counts = [string, number][]

/** Keeps a selected value visible (count 0) even when the current range has none of it. */
const withSelected = (options: Counts, value: string | null): Counts =>
  value && !options.some(([v]) => v === value) ? [[value, 0], ...options] : options

export function GenreFilter({ options, value, onChange }: { options: Counts; value: string | null; onChange: (v: string | null) => void }) {
  const { t } = useTranslation('features/top-filter')
  return (
    <FilterChips
      label={t('genre')}
      allLabel={t('all')}
      value={value}
      onChange={onChange}
      options={withSelected(options, value).map(([g, count]) => ({
        value: g,
        label: <span className="capitalize">{g}</span>,
        count,
      }))}
    />
  )
}

/** 'VN' → 🇻🇳 (regional indicator symbols) */
const flag = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))

export function CountryFilter({
  options,
  value,
  onChange,
  isPending,
  isError,
}: {
  options: Counts
  value: string | null
  onChange: (v: string | null) => void
  isPending?: boolean
  isError?: boolean
}) {
  const { t, i18n } = useTranslation('features/top-filter')
  const lng = i18n.resolvedLanguage
  const names = useMemo(() => new Intl.DisplayNames(INTL_LOCALE[isLocale(lng) ? lng : 'vi'], { type: 'region' }), [lng])
  const name = (code: string) => {
    try {
      return names.of(code) ?? code
    } catch {
      return code
    }
  }

  if (isPending)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-xs tracking-[0.15em] text-ink-faint uppercase">{t('country')}</span>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
        <span className="text-xs text-ink-faint">{t('countryLoading')}</span>
      </div>
    )
  if (isError) return <p className="text-sm text-ink-faint">{t('countryUnavailable')}</p>
  if (!options.length && !value) return null

  return (
    <div className="flex flex-col gap-2">
      <FilterChips
        label={t('country')}
        allLabel={t('all')}
        value={value}
        onChange={onChange}
        options={withSelected(options, value).map(([code, count]) => ({
          value: code,
          label: (
            <>
              <span aria-hidden>{flag(code)}</span>
              {name(code)}
            </>
          ),
          count,
        }))}
      />
      <p className="text-xs text-ink-faint">{t('countrySource')}</p>
    </div>
  )
}

export function FilterEmpty({ onClear }: { onClear: () => void }) {
  const { t } = useTranslation('features/top-filter')
  return (
    <EmptyState
      title={t('emptyTitle')}
      description={t('emptyDescription')}
      action={
        <Button variant="outline" size="sm" onClick={onClear}>
          {t('clear')}
        </Button>
      }
    />
  )
}
