import { i18n } from '@/shared/i18n'
import { normalizeName, playStore, STREAM_THRESHOLD_MS } from '@/entities/stream-history'
import type { Album, AlbumTrack, SimplifiedAlbum } from '@/entities/album/@x/local-library'
import type { SimplifiedArtist } from '@/entities/artist/@x/local-library'
import {
  itunesArtwork,
  lookupItunesAlbum,
  sameName,
  searchItunesAlbums,
  type ItunesItem,
} from './itunes'
import { isItunesAlbumId, itunesAlbumId, lastfmAlbumUrl, lastfmCoverUrl, parseAlbumId, trackId } from '../lib/ids'

const artistOf = (c: ItunesItem): SimplifiedArtist => ({
  id: `itunes:artist:${c.artistId ?? c.artistName}`,
  name: c.artistName,
  uri: `itunes:artist:${c.artistId ?? c.artistName}`,
  external_urls: { spotify: '' },
})

const toAlbum = (c: ItunesItem): SimplifiedAlbum => ({
  id: itunesAlbumId(c.collectionId!),
  name: c.collectionName ?? '',
  uri: `itunes:album:${c.collectionId}`,
  album_type: 'album',
  release_date: c.releaseDate?.slice(0, 10) ?? '',
  total_tracks: c.trackCount ?? 0,
  images: [300, 600].map((size) => ({ url: itunesArtwork(c.artworkUrl100, size)!, width: size, height: size })),
  artists: [artistOf(c)],
  external_urls: { spotify: c.collectionViewUrl ?? '' },
})

const asPaging = (items: AlbumTrack[]) => ({ items, total: items.length, limit: items.length, offset: 0, next: null, previous: null })

/** Album search for the ranking page, over the iTunes catalogue. */
export const searchLocalAlbums = async (query: string) =>
  (await searchItunesAlbums(query)).filter((c) => c.collectionId && c.collectionName).map(toAlbum)

async function fromItunes(collectionId: string): Promise<Album | null> {
  const { collection, tracks } = await lookupItunesAlbum(collectionId)
  if (!collection?.collectionId) return null
  const artist = artistOf(collection)
  const items = tracks
    .map((t, i): AlbumTrack => ({
      id: `itunes:t:${t.trackId}`,
      name: t.trackName ?? '',
      uri: `itunes:track:${t.trackId}`,
      duration_ms: t.trackTimeMillis ?? 0,
      track_number: t.trackNumber ?? i + 1,
      disc_number: t.discNumber ?? 1,
      explicit: t.trackExplicitness === 'explicit',
      artists: [artist],
    }))
    .sort((a, b) => a.disc_number - b.disc_number || a.track_number - b.track_number)
  return { ...toAlbum(collection), tracks: asPaging(items) }
}

/** No catalogue match – rank the tracks of that album the user has actually played. */
async function fromHistory(artist: string, album: string): Promise<Album | null> {
  const history = await playStore.getHistory()
  if (!history) return null
  const plays = new Map<string, { name: string; streams: number; cover?: string }>()
  let name = album
  for (const s of history.streams) {
    if (s.ms < STREAM_THRESHOLD_MS || !s.album || !sameName(s.artist, artist) || normalizeName(s.album) !== normalizeName(album)) continue
    name = s.album
    const key = normalizeName(s.track)
    const e = plays.get(key) ?? { name: s.track, streams: 0 }
    e.streams++
    e.cover ??= s.cover
    plays.set(key, e)
  }
  if (!plays.size) return null
  const ref: SimplifiedArtist = { id: `local:ar:${artist}`, name: artist, uri: `local:artist:${artist}`, external_urls: { spotify: '' } }
  const ranked = [...plays.values()].sort((a, b) => b.streams - a.streams)
  const items = ranked.map((t, i): AlbumTrack => ({
    id: trackId(artist, t.name),
    name: t.name,
    uri: `local:track:${artist}:${t.name}`,
    duration_ms: 0,
    track_number: i + 1,
    disc_number: 1,
    explicit: false,
    artists: [ref],
  }))
  const cover = ranked.find((t) => t.cover)?.cover
  return {
    id: `local:a:${encodeURIComponent(artist)}::${encodeURIComponent(album)}`,
    name,
    uri: `local:album:${artist}:${album}`,
    album_type: 'album',
    release_date: '',
    total_tracks: items.length,
    images: cover ? [{ url: lastfmCoverUrl(cover), width: 300, height: 300 }] : [],
    artists: [ref],
    external_urls: { spotify: lastfmAlbumUrl(artist, album) },
    tracks: asPaging(items),
  }
}

/** Tracklist for an `itunes:` id, or for a `local:a:` id found in the user's history (iTunes first, then their own plays). */
export async function getLocalAlbum(id: string): Promise<Album> {
  if (isItunesAlbumId(id)) {
    const album = await fromItunes(id.slice('itunes:'.length))
    if (album) return album
  } else {
    const ref = parseAlbumId(id)
    if (ref) {
      const hits = await searchItunesAlbums(`${ref.artist} ${ref.album}`, 8).catch(() => [])
      const hit = hits.find((c) => c.collectionId && c.collectionName && sameName(c.artistName, ref.artist) && sameName(c.collectionName, ref.album))
      const album = (hit && (await fromItunes(String(hit.collectionId)))) || (await fromHistory(ref.artist, ref.album))
      if (album) return album
    }
  }
  throw new Error(i18n.t('errors.albumNotFound'))
}
