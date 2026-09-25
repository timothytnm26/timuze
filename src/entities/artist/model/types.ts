import type { SpotifyExternalUrls, SpotifyImage } from '@/shared/api'

export interface SimplifiedArtist {
  id: string
  name: string
  uri: string
  external_urls: SpotifyExternalUrls
}

/**
 * Since the Feb-2026 Dev-Mode changes `popularity` and `followers` are no longer
 * returned for Development-Mode apps, so they are optional and the UI never depends on them.
 */
export interface Artist extends SimplifiedArtist {
  images: SpotifyImage[]
  genres?: string[]
  popularity?: number
  followers?: { total: number }
}
