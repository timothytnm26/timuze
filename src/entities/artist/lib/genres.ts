import type { Artist } from '../model/types'

/**
 * Weighted genre share from a ranked artist list (rank 1 weighs most).
 * `genres` may be empty for some apps/artists – returns [] in that case.
 */
export const aggregateGenres = (artists: Artist[], top = 10) => {
  const scores = new Map<string, number>()
  artists.forEach((a, i) => {
    const w = 1 / Math.sqrt(i + 1)
    a.genres?.forEach((g) => scores.set(g, (scores.get(g) ?? 0) + w))
  })
  const total = [...scores.values()].reduce((s, v) => s + v, 0)
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([genre, score]) => ({ genre, score, share: total ? score / total : 0 }))
}

/** Artist id → genres, for tagging tracks/albums (Spotify only puts genres on full artist objects). */
export const genreIndex = (artists: Artist[]) =>
  new Map(artists.filter((a) => a.genres?.length).map((a) => [a.id, a.genres!]))

/** Union of the known genres of the given artists. */
export const genresOf = (artists: { id: string }[], index: Map<string, string[]>) => {
  const out = new Set<string>()
  artists.forEach((a) => index.get(a.id)?.forEach((g) => out.add(g)))
  return out
}
