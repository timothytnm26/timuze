import type { SpotifyExternalUrls, SpotifyImage } from '@/shared/api'

export interface SimplifiedPlaylist {
  id: string
  name: string
  description: string | null
  images: SpotifyImage[] | null
  owner: { id: string; display_name: string | null }
  public: boolean | null
  collaborative: boolean
  external_urls: SpotifyExternalUrls
  /** Renamed from `tracks` in Feb 2026 – only present on owned/collab playlists */
  items?: { total: number; href: string }
  tracks?: { total: number; href: string }
}

export interface LibrarySummary {
  savedTracks: number
  savedAlbums: number
  followedArtists: number
  playlists: number
  playlistItems: SimplifiedPlaylist[]
}
