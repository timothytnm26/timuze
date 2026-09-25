import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { safeStorage } from '../lib/storage'
import { isLocale, LOCALES, type Locale } from './config'
import { en } from './locales/en'
import { ja } from './locales/ja'
import { vi } from './locales/vi'

const STORAGE_KEY = 'timuze.locale'

/** Saved choice → browser languages → English. */
const detectLocale = (): Locale => {
  const saved = safeStorage.get<string>(STORAGE_KEY)
  if (isLocale(saved)) return saved
  const langs = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : []
  for (const lang of langs) {
    const base = lang.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
  }
  return 'en'
}

const syncDocument = (lng: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng
}

i18n.on('languageChanged', (lng) => {
  syncDocument(lng)
  if (isLocale(lng)) safeStorage.set(STORAGE_KEY, lng)
})

// Resources are bundled (3 small locales), so init is synchronous – no Suspense/flash of keys.
void i18n.use(initReactI18next).init({
  resources: { vi, en, ja },
  lng: detectLocale(),
  fallbackLng: 'vi',
  supportedLngs: LOCALES,
  ns: Object.keys(vi),
  defaultNS: 'common',
  initAsync: false,
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
})

export const setLocale = (locale: Locale) => void i18n.changeLanguage(locale)
export const getLocale = (): Locale => (isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'vi')

export { i18n }
