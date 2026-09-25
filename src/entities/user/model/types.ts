import type { SpotifyExternalUrls, SpotifyImage } from '@/shared/api'

/** `country`, `product`, `followers`, `email` are no longer returned for Dev-Mode apps (Feb 2026). */
export interface CurrentUser {
  id: string
  display_name: string | null
  images: SpotifyImage[]
  external_urls: SpotifyExternalUrls
  uri: string
  country?: string
  product?: string
  followers?: { total: number }
}
