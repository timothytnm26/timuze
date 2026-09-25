import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { INTL_LOCALE, isLocale, type Locale } from './config'

/** Locale-bound formatters for numbers, dates and listening durations. */
export const createFormatters = (locale: Locale, t: TFunction<'common'>) => {
  const tag = INTL_LOCALE[locale]
  const nf = new Intl.NumberFormat(tag)
  const rtf = new Intl.RelativeTimeFormat(tag, { numeric: 'auto' })
  const toDate = (d: Date | string | number) => (d instanceof Date ? d : new Date(d))

  return {
    number: (n: number) => nf.format(Math.round(n)),
    decimal: (n: number, digits = 1) =>
      new Intl.NumberFormat(tag, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n),
    /** 12 345 678 ms → "3 giờ 25 phút" / "3 hr 25 min" / "3時間25分" */
    listeningTime: (ms: number) => {
      const minutes = Math.round(ms / 60000)
      if (minutes < 60) return t('units.minutes', { value: minutes })
      const hours = nf.format(Math.floor(minutes / 60))
      const m = minutes % 60
      return m ? t('units.hoursMinutes', { hours, minutes: m }) : t('units.hours', { hours })
    },
    relative: (date: Date | string) => {
      const diff = (toDate(date).getTime() - Date.now()) / 1000
      const abs = Math.abs(diff)
      if (abs < 60) return rtf.format(Math.round(diff), 'second')
      if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
      if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
      return rtf.format(Math.round(diff / 86400), 'day')
    },
    date: (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) => toDate(d).toLocaleDateString(tag, opts),
    dateTime: (d: Date | string | number) => toDate(d).toLocaleString(tag),
  }
}

export type Formatters = ReturnType<typeof createFormatters>

/** Formatters for the active language – re-created when the language changes. */
export function useFormatters(): Formatters {
  const { t, i18n } = useTranslation('common')
  const lng = i18n.resolvedLanguage
  const locale: Locale = isLocale(lng) ? lng : 'vi'
  return useMemo(() => createFormatters(locale, t), [locale, t])
}
