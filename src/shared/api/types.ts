/**
 * Generic Spotify Web API shapes shared by every entity.
 * Domain objects (Artist, Track, Album, CurrentUser, Playlist…) live in their own
 * `entities/*` slice – `shared` only knows about transport-level structures.
 */
export interface SpotifyImage {
  url: string
  width: number | null
  height: number | null
}

export interface SpotifyExternalUrls {
  spotify: string
}

export interface Paging<T> {
  items: T[]
  total: number
  limit: number
  offset: number
  next: string | null
  previous: string | null
}

export interface CursorPaging<T> {
  items: T[]
  limit: number
  next: string | null
  cursors: { after?: string; before?: string } | null
  total?: number
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term'

export interface TokenResponse {
  access_token: string
  token_type: 'Bearer'
  scope: string
  expires_in: number
  refresh_token?: string
}
