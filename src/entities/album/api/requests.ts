import { spotifyGet, type Paging } from '@/shared/api'
import type { Album, AlbumTrack, SimplifiedAlbum } from '../model/types'

/** Dev-Mode apps may ask for at most 10 search results per page. */
export const searchAlbums = async (query: string) => {
  const res = await spotifyGet<{ albums: Paging<SimplifiedAlbum> }>('/search', { q: query, type: 'album', limit: 10 })
  return res.albums.items
}

/** The album with its whole tracklist – long albums come in pages of 50. */
export async function getAlbum(id: string): Promise<Album> {
  const album = await spotifyGet<Album>(`/albums/${id}`)
  const items = [...album.tracks.items]
  while (items.length < album.tracks.total) {
    const page = await spotifyGet<Paging<AlbumTrack>>(`/albums/${id}/tracks`, { limit: 50, offset: items.length })
    if (!page.items.length) break
    items.push(...page.items)
  }
  return { ...album, tracks: { ...album.tracks, items, next: null } }
}
