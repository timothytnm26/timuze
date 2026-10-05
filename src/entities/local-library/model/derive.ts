import { i18n } from '@/shared/i18n'
import type { TimeRange } from '@/shared/api'
import type { SpotifyImage } from '@/shared/api'
import { normalizeName, playStore, STREAM_THRESHOLD_MS, type Stream, type StreamHistory } from '@/entities/stream-history'
import type { Artist, SimplifiedArtist } from '@/entities/artist/@x/local-library'
import type { PlayHistory, Track } from '@/entities/track/@x/local-library'
import type { SimplifiedAlbum } from '@/entities/album/@x/local-library'
import type { CurrentUser } from '@/entities/user/@x/local-library'
import { enqueueMeta, getMeta, loadMetaCache } from '../api/itunes'
import type { PlayerTrack } from '../api/player'
import {
  albumId,
  artistId,
  lastfmAlbumUrl,
  lastfmArtistUrl,
  lastfmCoverUrl,
  lastfmTrackUrl,
  noAlbumId,
  trackId,
} from '../lib/ids'

/**
 * Rebuilds the Spotify-shaped data the pages already know (top artists/tracks, recent plays, the user)
 * from the history a user imported, so every page works the same without a Spotify login.
 */

const DAY = 86_400_000
/** Same spans Spotify uses for its three time ranges. */
const RANGE_DAYS: Record<TimeRange, number> = { short_term: 28, medium_term: 183, long_term: 365 }
/** Plays assumed to last this long when neither the export nor iTunes knows. */
const FALLBACK_DURATION_MS = 180_000

interface TrackAgg {
  track: string
  artist: string
  album: string | null
  cover?: string
  /** ids the exports carry, for embedding the real recording */
  spotifyId?: string
  youtubeId?: string
  streams: number
  ms: number
}

interface ArtistAgg {
  name: string
  streams: number
  ms: number
  tracks: TrackAgg[]
}

interface Index {
  tracks: TrackAgg[]
  artists: ArtistAgg[]
}

/** `watch?v=<id>` from a Takeout `titleUrl`. */
const youtubeIdOf = (uri: string) => {
  try {
    return new URL(uri).searchParams.get('v') ?? undefined
  } catch {
    return undefined
  }
}

const byPlays = (a: { streams: number; ms: number }, b: { streams: number; ms: number }) => b.streams - a.streams || b.ms - a.ms

function buildIndex(streams: Stream[]): Index {
  const tracks = new Map<string, TrackAgg>()
  const artists = new Map<string, ArtistAgg>()
  for (const s of streams) {
    // skipped plays say nothing about taste
    if (s.ms < STREAM_THRESHOLD_MS) continue
    const ak = normalizeName(s.artist)
    let artist = artists.get(ak)
    if (!artist) artists.set(ak, (artist = { name: s.artist, streams: 0, ms: 0, tracks: [] }))
    artist.streams++
    artist.ms += s.ms

    const tk = `${ak}|${normalizeName(s.track)}`
    let t = tracks.get(tk)
    if (!t) {
      tracks.set(tk, (t = { track: s.track, artist: artist.name, album: null, streams: 0, ms: 0 }))
      artist.tracks.push(t)
    }
    t.streams++
    t.ms += s.ms
    t.album ??= s.album
    t.cover ??= s.cover
    if (s.uri) {
      t.spotifyId ??= /^spotify:track:(\w+)$/.exec(s.uri)?.[1]
      t.youtubeId ??= youtubeIdOf(s.uri)
    }
  }
  const sortedArtists = [...artists.values()].sort(byPlays)
  sortedArtists.forEach((a) => a.tracks.sort(byPlays))
  return { tracks: [...tracks.values()].sort(byPlays), artists: sortedArtists }
}

const indexes = new WeakMap<StreamHistory, Map<TimeRange, Index>>()

/** The window ends at the latest play, not today – an export from last year still has "recent" plays. */
function indexFor(history: StreamHistory, range: TimeRange): Index {
  let perRange = indexes.get(history)
  if (!perRange) indexes.set(history, (perRange = new Map()))
  let idx = perRange.get(range)
  if (!idx) {
    const end = history.streams.at(-1)?.ts ?? 0
    const from = end - RANGE_DAYS[range] * DAY
    perRange.set(range, (idx = buildIndex(history.streams.filter((s) => s.ts >= from))))
  }
  return idx
}

const images = (url?: string): SpotifyImage[] => (url ? [{ url, width: 300, height: 300 }] : [])
const coverOf = (t: TrackAgg) => (t.cover ? lastfmCoverUrl(t.cover) : getMeta(t.artist, t.track)?.cover)

const toArtistRef = (name: string): SimplifiedArtist => ({
  id: artistId(name),
  name,
  uri: `local:artist:${name}`,
  external_urls: { spotify: lastfmArtistUrl(name) },
})

function toTrack(t: TrackAgg): Track {
  const meta = getMeta(t.artist, t.track)
  const albumName = t.album ?? meta?.album ?? null
  const artist = toArtistRef(t.artist)
  const cover = images(coverOf(t))
  const album: SimplifiedAlbum = albumName
    ? {
        id: albumId(t.artist, albumName),
        name: albumName,
        uri: `local:album:${t.artist}:${albumName}`,
        album_type: 'album',
        release_date: meta?.releaseDate?.slice(0, 10) ?? '',
        // the album picker hides one-track "albums" – unknown counts must not be mistaken for singles
        total_tracks: meta?.trackCount ?? 10,
        images: cover,
        artists: [artist],
        external_urls: { spotify: lastfmAlbumUrl(t.artist, albumName) },
      }
    : {
        id: noAlbumId(t.artist, t.track),
        name: t.track,
        uri: `local:single:${t.artist}:${t.track}`,
        album_type: 'single',
        release_date: meta?.releaseDate?.slice(0, 10) ?? '',
        total_tracks: 1,
        images: cover,
        artists: [artist],
        external_urls: { spotify: lastfmTrackUrl(t.artist, t.track) },
      }
  return {
    id: trackId(t.artist, t.track),
    name: t.track,
    uri: `local:track:${t.artist}:${t.track}`,
    duration_ms: meta?.durationMs ?? FALLBACK_DURATION_MS,
    explicit: false,
    track_number: 0,
    album,
    artists: [artist],
    external_urls: { spotify: lastfmTrackUrl(t.artist, t.track) },
  }
}

/** Most common iTunes genre among the artist's looked-up tracks. */
const genresOf = (a: ArtistAgg) => {
  const counts = new Map<string, number>()
  for (const t of a.tracks) {
    const g = getMeta(t.artist, t.track)?.genre
    if (g) counts.set(g.toLowerCase(), (counts.get(g.toLowerCase()) ?? 0) + t.streams)
  }
  return [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 2).map(([g]) => g)
}

function toArtist(a: ArtistAgg): Artist {
  // Last.fm and iTunes have no artist photos – the cover of their most played track stands in
  const cover = a.tracks.map(coverOf).find(Boolean)
  return { ...toArtistRef(a.name), images: images(cover), genres: genresOf(a) }
}

const lookupItems = (t: TrackAgg) => ({ artist: t.artist, track: t.track })

export async function localTopTracks(range: TimeRange, count: number): Promise<Track[]> {
  const [history] = await Promise.all([playStore.getHistory(), loadMetaCache()])
  if (!history) return []
  const top = indexFor(history, range).tracks.slice(0, count)
  void enqueueMeta(top.map(lookupItems))
  return top.map(toTrack)
}

export async function localTopArtists(range: TimeRange, count: number): Promise<Artist[]> {
  const [history] = await Promise.all([playStore.getHistory(), loadMetaCache()])
  if (!history) return []
  const top = indexFor(history, range).artists.slice(0, count)
  // one track per artist is enough for a photo stand-in and a genre
  void enqueueMeta(top.flatMap((a) => a.tracks.slice(0, 1).map(lookupItems)))
  return top.map(toArtist)
}

export async function localRecentPlays(limit = 50): Promise<PlayHistory[]> {
  const [history] = await Promise.all([playStore.getHistory(), loadMetaCache()])
  if (!history) return []
  const plays = history.streams.filter((s) => s.ms >= STREAM_THRESHOLD_MS).slice(-limit).reverse()
  const aggs = plays.map((s): [Stream, TrackAgg] => [s, { track: s.track, artist: s.artist, album: s.album, cover: s.cover, streams: 1, ms: s.ms }])
  void enqueueMeta(aggs.map(([, t]) => lookupItems(t)))
  return aggs.map(([s, t]) => ({ track: toTrack(t), played_at: new Date(s.ts).toISOString(), context: null }))
}

export async function localUser(): Promise<CurrentUser> {
  const history = await playStore.getHistory()
  // Last.fm username first, then the account named in a Spotify export, then a neutral label
  const lastfm = history?.imports.find((i) => i.source === 'lastfm')?.files[0]
  const account = history?.imports.find((i) => i.account)?.account
  return {
    id: 'local',
    display_name: lastfm ?? account ?? i18n.t('listener.name'),
    images: [],
    external_urls: { spotify: '' },
    uri: 'local:user',
  }
}

/**
 * The user's top tracks of the last month of their history (or of the year, if that month is empty), with whatever
 * can play them: a YouTube video id, a Spotify track id and/or a 30-second iTunes preview (looked up in the background).
 */
export async function localPlayerTracks(count: number): Promise<PlayerTrack[]> {
  const [history] = await Promise.all([playStore.getHistory(), loadMetaCache()])
  if (!history) return []
  let top = indexFor(history, 'short_term').tracks.slice(0, count)
  if (!top.length) top = indexFor(history, 'long_term').tracks.slice(0, count)
  void enqueueMeta(top.map(lookupItems))
  return top.map((t) => ({
    name: t.track,
    artists: t.artist,
    image: coverOf(t),
    previewUrl: getMeta(t.artist, t.track)?.previewUrl,
    youtubeId: t.youtubeId,
    spotifyId: t.spotifyId,
  }))
}
