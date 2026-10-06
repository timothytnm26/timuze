import { createStore, useStore } from '@tanstack/react-store'
import { iconSvg } from '../assets/icons'
import { safeStorage } from '../lib/storage'
import { DEFAULT_SKIN, isSkin, SKIN_MANIFEST, SKINS, type Skin } from './config'

// index.html reads the same key to set `data-skin` before the first paint
const STORAGE_KEY = 'timuze.skin'

const detectSkin = (): Skin => {
  const saved = safeStorage.get<string>(STORAGE_KEY)
  return isSkin(saved) ? saved : DEFAULT_SKIN
}

/** Active skin (TanStack Store), persisted to localStorage. */
export const skinStore = createStore<Skin>(detectSkin())

const loadedFonts = new Set<Skin>()

/** Injects the skin's Google Fonts stylesheet once. */
export const loadSkinFonts = (skin: Skin) => {
  const { fonts } = SKIN_MANIFEST[skin]
  if (!fonts || loadedFonts.has(skin) || typeof document === 'undefined') return
  loadedFonts.add(skin)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?${fonts}&display=swap`
  document.head.append(link)
}

/** For live previews – e.g. when the skin menu opens. */
export const loadAllSkinFonts = () => SKINS.forEach(loadSkinFonts)

/** The tab icon: the skin's own logo drawing on its canvas colour, in its brand colour. */
const faviconFor = (skin: Skin) => {
  const inner = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(iconSvg('logo', skin))?.[1] ?? ''
  const brand = getComputedStyle(document.documentElement).getPropertyValue('--skin-brand').trim() || '#1ed760'
  const crisp = skin === 'pixel' ? ' shape-rendering="crispEdges"' : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="${skin === 'pixel' ? 0 : 8}" fill="${SKIN_MANIFEST[skin].themeColor}"/><g fill="${brand}"${crisp} transform="translate(4 4)">${inner}</g></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const applySkin = (skin: Skin) => {
  if (typeof document === 'undefined') return
  loadSkinFonts(skin)
  document.documentElement.dataset.skin = skin
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SKIN_MANIFEST[skin].themeColor)
  document.querySelector('link[rel="icon"]')?.setAttribute('href', faviconFor(skin))
}

applySkin(skinStore.state)
skinStore.subscribe((skin) => {
  applySkin(skin)
  safeStorage.set(STORAGE_KEY, skin)
})

export const setSkin = (skin: Skin) => skinStore.setState(() => skin)
export const getSkin = (): Skin => skinStore.state
export const useSkin = () => useStore(skinStore, (s) => s)
