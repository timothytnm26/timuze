import { createStore, useStore } from '@tanstack/react-store'
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

const applySkin = (skin: Skin) => {
  if (typeof document === 'undefined') return
  loadSkinFonts(skin)
  document.documentElement.dataset.skin = skin
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SKIN_MANIFEST[skin].themeColor)
}

applySkin(skinStore.state)
skinStore.subscribe((skin) => {
  applySkin(skin)
  safeStorage.set(STORAGE_KEY, skin)
})

export const setSkin = (skin: Skin) => skinStore.setState(() => skin)
export const getSkin = (): Skin => skinStore.state
export const useSkin = () => useStore(skinStore, (s) => s)
