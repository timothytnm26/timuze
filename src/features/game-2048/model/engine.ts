/** 2048 on a 4×4 board – pure rules, no UI. */

export const SIZE = 4
export const WIN_VALUE = 2048

export type Direction = 'left' | 'right' | 'up' | 'down'

export interface Tile {
  /** stays the same while the tile slides, so the UI can animate it */
  id: number
  value: number
  row: number
  col: number
  /** born from a merge in the last move */
  merged?: boolean
  /** spawned by the last move */
  fresh?: boolean
}

export interface GameState {
  tiles: Tile[]
  /** tiles swallowed by a merge in the last move – shown sliding into the survivor, then gone */
  ghosts: Tile[]
  score: number
  nextId: number
  /** reached 2048 (the game goes on) */
  won: boolean
  /** no move left */
  over: boolean
}

type Rand = () => number

const emptyCells = (tiles: Tile[]) => {
  const taken = new Set(tiles.map((t) => t.row * SIZE + t.col))
  return Array.from({ length: SIZE * SIZE }, (_, i) => i).filter((i) => !taken.has(i))
}

/** A 2 (90%) or a 4 (10%) in a random free cell – or nothing when the board is full. */
function spawn(state: GameState, rand: Rand): GameState {
  const free = emptyCells(state.tiles)
  if (!free.length) return state
  const cell = free[Math.floor(rand() * free.length)]!
  const tile: Tile = { id: state.nextId, value: rand() < 0.9 ? 2 : 4, row: Math.floor(cell / SIZE), col: cell % SIZE, fresh: true }
  return { ...state, tiles: [...state.tiles, tile], nextId: state.nextId + 1 }
}

export function newGame(rand: Rand = Math.random): GameState {
  const empty: GameState = { tiles: [], ghosts: [], score: 0, nextId: 1, won: false, over: false }
  return spawn(spawn(empty, rand), rand)
}

/** Cells of line `i`, ordered from the wall the tiles slide towards. */
const line = (dir: Direction, i: number): [number, number][] =>
  Array.from({ length: SIZE }, (_, k) => {
    switch (dir) {
      case 'left':
        return [i, k]
      case 'right':
        return [i, SIZE - 1 - k]
      case 'up':
        return [k, i]
      case 'down':
        return [SIZE - 1 - k, i]
    }
  })

/** Slide and merge. `moved` is false when nothing changed (then nothing is spawned either). */
export function move(state: GameState, dir: Direction, rand: Rand = Math.random): { state: GameState; moved: boolean } {
  const byCell = new Map(state.tiles.map((t) => [t.row * SIZE + t.col, t]))
  const next: Tile[] = []
  const ghosts: Tile[] = []
  let gained = 0
  let moved = false

  for (let i = 0; i < SIZE; i++) {
    const cells = line(dir, i)
    const tiles = cells.map(([r, c]) => byCell.get(r * SIZE + c)).filter((t): t is Tile => !!t)
    let slot = 0
    for (let k = 0; k < tiles.length; k++) {
      const tile = tiles[k]!
      const [row, col] = cells[slot]!
      const partner = tiles[k + 1]
      if (partner && partner.value === tile.value) {
        // two equal tiles become one; the second slides into the first's cell and is dropped
        const value = tile.value * 2
        gained += value
        next.push({ ...tile, value, row, col, merged: true, fresh: false })
        ghosts.push({ ...partner, row, col })
        if (tile.row !== row || tile.col !== col || partner.row !== row || partner.col !== col) moved = true
        k++
      } else {
        next.push({ ...tile, row, col, merged: false, fresh: false })
        if (tile.row !== row || tile.col !== col) moved = true
      }
      slot++
    }
  }

  if (!moved) return { state, moved: false }
  const base: GameState = {
    ...state,
    tiles: next,
    ghosts,
    score: state.score + gained,
    won: state.won || next.some((t) => t.value >= WIN_VALUE),
  }
  const withTile = spawn(base, rand)
  return { state: { ...withTile, over: !canMove(withTile.tiles) }, moved: true }
}

export function canMove(tiles: Tile[]) {
  if (emptyCells(tiles).length) return true
  const at = new Map(tiles.map((t) => [t.row * SIZE + t.col, t.value]))
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const v = at.get(r * SIZE + c)
      if (v === at.get(r * SIZE + c + 1) && c + 1 < SIZE) return true
      if (v === at.get((r + 1) * SIZE + c) && r + 1 < SIZE) return true
    }
  return false
}
