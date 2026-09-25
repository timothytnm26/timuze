import { env, SPOTIFY_SCOPES } from '@/shared/config'
import { createCodeChallenge, randomString, safeStorage } from '@/shared/lib'
import { clearSession, storeTokens, type TokenResponse } from '@/shared/api'
import { i18n } from '@/shared/i18n'

const VERIFIER_KEY = 'timuze.pkce.verifier'
const STATE_KEY = 'timuze.pkce.state'
const RETURN_KEY = 'timuze.returnTo'

/** Step 1 – redirect to Spotify's consent screen (Authorization Code + PKCE, no backend needed). */
export async function startSpotifyLogin(returnTo = '/dashboard') {
  const verifier = randomString(64)
  const state = randomString(16)
  safeStorage.set(VERIFIER_KEY, verifier)
  safeStorage.set(STATE_KEY, state)
  safeStorage.set(RETURN_KEY, returnTo)

  const url = new URL(env.spotifyAuthUrl)
  url.search = new URLSearchParams({
    client_id: env.spotifyClientId,
    response_type: 'code',
    redirect_uri: env.spotifyRedirectUri,
    code_challenge_method: 'S256',
    code_challenge: await createCodeChallenge(verifier),
    scope: SPOTIFY_SCOPES.join(' '),
    state,
  }).toString()
  window.location.assign(url.toString())
}

/** Step 2 – exchange `?code=` for tokens on /callback. Returns the path to go back to. */
export async function completeSpotifyLogin(params: { code?: string; state?: string; error?: string }) {
  const t = (key: 'accessDenied' | 'missingCode' | 'stateMismatch' | 'tokenExchangeFailed') => i18n.t(`errors.${key}`)
  if (params.error) throw new Error(params.error === 'access_denied' ? t('accessDenied') : params.error)
  const verifier = safeStorage.get<string>(VERIFIER_KEY)
  const expectedState = safeStorage.get<string>(STATE_KEY)
  if (!params.code || !verifier) throw new Error(t('missingCode'))
  if (expectedState && params.state !== expectedState) throw new Error(t('stateMismatch'))

  const res = await fetch(env.spotifyTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: env.spotifyRedirectUri,
      client_id: env.spotifyClientId,
      code_verifier: verifier,
    }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error_description?: string }
    throw new Error(body.error_description ?? t('tokenExchangeFailed'))
  }
  storeTokens((await res.json()) as TokenResponse)
  safeStorage.remove(VERIFIER_KEY)
  safeStorage.remove(STATE_KEY)
  const returnTo = safeStorage.get<string>(RETURN_KEY) ?? '/dashboard'
  safeStorage.remove(RETURN_KEY)
  return returnTo
}

export const logout = () => clearSession()
