export const LOCALES = ['vi', 'en', 'ja'] as const
export type Locale = (typeof LOCALES)[number]

/** BCP-47 tags handed to `Intl.*` */
export const INTL_LOCALE: Record<Locale, string> = { vi: 'vi-VN', en: 'en-US', ja: 'ja-JP' }

/** Shown in the language switcher, always in the language itself. */
export const LOCALE_NAMES: Record<Locale, { short: string; native: string }> = {
  vi: { short: 'VI', native: 'Tiếng Việt' },
  en: { short: 'EN', native: 'English' },
  ja: { short: 'JA', native: '日本語' },
}

export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale)
