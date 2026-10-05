/**
 * Ids for items rebuilt from imported history. They carry the names themselves
 * (`local:a:<artist>::<album>`), so an id alone is enough to look an item up again later.
 */
const enc = encodeURIComponent
const dec = decodeURIComponent

export const artistId = (artist: string) => `local:ar:${enc(artist)}`
export const trackId = (artist: string, track: string) => `local:t:${enc(artist)}::${enc(track)}`
export const albumId = (artist: string, album: string) => `local:a:${enc(artist)}::${enc(album)}`
/** A track without a known album stands alone; it must not show up as an "album". */
export const noAlbumId = (artist: string, track: string) => `local:s:${enc(artist)}::${enc(track)}`

export const parseAlbumId = (id: string) => {
  const m = /^local:a:(.+)::(.+)$/.exec(id)
  return m ? { artist: dec(m[1]!), album: dec(m[2]!) } : null
}

export const isStandaloneAlbumId = (id: string) => id.startsWith('local:s:')
export const isLocalId = (id: string) => id.startsWith('local:')
export const isItunesAlbumId = (id: string) => id.startsWith('itunes:')
export const itunesAlbumId = (collectionId: number) => `itunes:${collectionId}`

export const lastfmCoverUrl = (cover: string) => `https://lastfm.freetls.fastly.net/i/u/300x300/${cover}`
const lfm = (...parts: string[]) => parts.map((p) => encodeURIComponent(p).replace(/%20/g, '+')).join('/')
export const lastfmArtistUrl = (artist: string) => `https://www.last.fm/music/${lfm(artist)}`
export const lastfmTrackUrl = (artist: string, track: string) => `https://www.last.fm/music/${lfm(artist, '_', track)}`
export const lastfmAlbumUrl = (artist: string, album: string) => `https://www.last.fm/music/${lfm(artist, album)}`
