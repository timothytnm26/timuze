import { createStore } from '@tanstack/react-store'
import { safeStorage } from '../lib/storage'

export interface SessionState {
  mode: 'anonymous' | 'spotify'
  accessToken: string | null
  refreshToken: string | null
  /** epoch ms */
  expiresAt: number | null
  scope: string | null
}

const KEY = 'timuze.session'

const ANONYMOUS: SessionState = {
  mode: 'anonymous',
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  scope: null,
}

const saved = safeStorage.get<SessionState>(KEY)
// anything but a Spotify session (e.g. the retired demo mode) starts signed out
const initial: SessionState = saved?.mode === 'spotify' ? saved : ANONYMOUS

/** App-wide auth session (TanStack Store), persisted to localStorage. */
export const sessionStore = createStore<SessionState>(initial)

sessionStore.subscribe((state) => safeStorage.set(KEY, state))

export const setSession = (patch: Partial<SessionState>) =>
  sessionStore.setState((prev) => ({ ...prev, ...patch }))

export const clearSession = () => sessionStore.setState(() => ANONYMOUS)

export const isAuthenticated = () => sessionStore.state.mode !== 'anonymous'
