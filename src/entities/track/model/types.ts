import type { SpotifyExternalUrls } from '@/shared/api'
import type { SimplifiedAlbum } from '@/entities/album/@x/track'
import type { SimplifiedArtist } from '@/entities/artist/@x/track'

export interface Track {
  id: string
  name: string
  uri: string
  duration_ms: number
  explicit: boolean
  track_number: number
  album: SimplifiedAlbum
  artists: SimplifiedArtist[]
  external_urls: SpotifyExternalUrls
  preview_url?: string | null
  popularity?: number
}

export interface PlayHistory {
  track: Track
  played_at: string
  context: { type: string; uri: string } | null
}

export interface SavedTrack {
  added_at: string
  track: Track
}

export interface CurrentlyPlaying {
  is_playing: boolean
  progress_ms: number | null
  item: Track | null
  currently_playing_type: 'track' | 'episode' | 'ad' | 'unknown'
}
