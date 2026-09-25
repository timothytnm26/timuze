import type { Paging, SpotifyExternalUrls, SpotifyImage } from '@/shared/api'
import type { SimplifiedArtist } from '@/entities/artist/@x/album'

export interface SimplifiedAlbum {
  id: string
  name: string
  uri: string
  album_type: 'album' | 'single' | 'compilation'
  release_date: string
  total_tracks: number
  images: SpotifyImage[]
  artists: SimplifiedArtist[]
  external_urls: SpotifyExternalUrls
}

export interface SavedAlbum {
  added_at: string
  album: SimplifiedAlbum
}

/** A track as listed inside an album (no album back-reference). */
export interface AlbumTrack {
  id: string
  name: string
  uri: string
  duration_ms: number
  track_number: number
  disc_number: number
  explicit: boolean
  artists: SimplifiedArtist[]
}

/** `GET /albums/{id}` – `tracks` holds every track (the extra pages are fetched and merged). */
export interface Album extends SimplifiedAlbum {
  tracks: Paging<AlbumTrack>
}
