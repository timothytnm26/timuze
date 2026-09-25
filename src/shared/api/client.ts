import { env } from '../config'
import { SpotifyApiError } from './errors'
import { clearSession, sessionStore, setSession } from './session'
import type { TokenResponse } from './types'
import { i18n } from '../i18n'

export type Params = Record<string, string | number | boolean | undefined>

let refreshing: Promise<string> | null = null

export const storeTokens = (t: TokenResponse) =>
  setSession({
    mode: 'spotify',
    accessToken: t.access_token,
    // Spotify may rotate the refresh token – keep the old one if none is returned
    refreshToken: t.refresh_token ?? sessionStore.state.refreshToken,
    expiresAt: Date.now() + t.expires_in * 1000,
    scope: t.scope,
  })

const refreshAccessToken = async (): Promise<string> => {
  const { refreshToken } = sessionStore.state
  if (!refreshToken) throw new SpotifyApiError(401, i18n.t('errors.sessionExpired'))

  const res = await fetch(env.spotifyTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: env.spotifyClientId,
    }),
  })
  if (!res.ok) {
    clearSession()
    throw new SpotifyApiError(401, i18n.t('errors.refreshFailed'))
  }
  const data = (await res.json()) as TokenResponse
  storeTokens(data)
  return data.access_token
}

const getValidToken = async () => {
  const { accessToken, expiresAt } = sessionStore.state
  if (accessToken && expiresAt && expiresAt - 60_000 > Date.now()) return accessToken
  refreshing ??= refreshAccessToken().finally(() => {
    refreshing = null
  })
  return refreshing
}

const buildUrl = (path: string, params?: Params) => {
  const url = new URL(path.startsWith('http') ? path : `${env.spotifyApiUrl}${path}`)
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined) url.searchParams.set(k, String(v))
  })
  return url
}

/**
 * Typed GET against the Spotify Web API.
 * – auto refreshes the access token (PKCE refresh grant)
 * – retries once on 401 and on 429 (honouring Retry-After)
 */
export function spotifyGet<T>(path: string, params: Params = {}): Promise<T> {
  return request<T>(path, params, 0)
}

/** Fresh access token for SDKs that call Spotify themselves (e.g. the Web Playback SDK). */
export const getAccessToken = getValidToken

/** Typed PUT/POST against the Spotify Web API (player controls…). */
export function spotifySend<T = null>(
  method: 'PUT' | 'POST',
  path: string,
  { params = {}, body }: { params?: Params; body?: unknown } = {},
): Promise<T> {
  return request<T>(path, params, 0, { method, body })
}

interface RequestInit {
  method?: 'GET' | 'PUT' | 'POST'
  body?: unknown
}

async function request<T>(path: string, params: Params, attempt: number, init: RequestInit = {}): Promise<T> {
  const token = await getValidToken()
  const res = await fetch(buildUrl(path, params), {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })

  if (res.status === 204) return null as T

  if (res.status === 401 && attempt === 0) {
    setSession({ expiresAt: 0 })
    return request<T>(path, params, attempt + 1, init)
  }

  if (res.status === 429 && attempt < 2) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? '1')
    await new Promise((r) => setTimeout(r, Math.min(retryAfter, 10) * 1000))
    return request<T>(path, params, attempt + 1, init)
  }

  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      message = body.error?.message ?? message
    } catch {
      /* empty body */
    }
    if (res.status === 401) clearSession()
    throw new SpotifyApiError(res.status, message)
  }

  // player commands succeed with 200/202 and an empty or non-JSON body – a success either way,
  // so only JSON is parsed (a parse error here used to surface as a failed command)
  const text = await res.text()
  if (!text || !res.headers.get('Content-Type')?.includes('json')) return null as T
  try {
    return JSON.parse(text) as T
  } catch {
    return null as T
  }
}
