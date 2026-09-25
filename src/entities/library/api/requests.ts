import { spotifyGet, type CursorPaging, type Paging } from '@/shared/api'
import type { LibrarySummary, SimplifiedPlaylist } from '../model/types'

/** Totals only – limit=1 keeps the payload tiny. */
export const getLibrarySummary = async (): Promise<LibrarySummary> => {
  const [tracks, albums, following, playlists] = await Promise.all([
    spotifyGet<Paging<unknown>>('/me/tracks', { limit: 1 }),
    spotifyGet<Paging<unknown>>('/me/albums', { limit: 1 }),
    spotifyGet<{ artists: CursorPaging<unknown> }>('/me/following', { type: 'artist', limit: 1 }),
    spotifyGet<Paging<SimplifiedPlaylist>>('/me/playlists', { limit: 50 }),
  ])
  return {
    savedTracks: tracks.total,
    savedAlbums: albums.total,
    followedArtists: following.artists.total ?? 0,
    playlists: playlists.total,
    playlistItems: playlists.items,
  }
}
