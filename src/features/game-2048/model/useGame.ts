import { useCallback, useState } from 'react'
import { safeStorage } from '@/shared/lib'
import { move, newGame, type Direction, type GameState } from './engine'

const KEY = 'timuze.2048'

interface Saved {
  game: GameState
  best: number
  /** the 2048 banner was dismissed for this game */
  keepGoing: boolean
}

const load = (): Saved => {
  const saved = safeStorage.get<Saved>(KEY)
  // an unreadable save (older format, edited by hand) just starts a new game
  if (saved?.game?.tiles && Array.isArray(saved.game.tiles) && typeof saved.best === 'number') return saved
  return { game: newGame(), best: 0, keepGoing: false }
}

/** The running game, its best score, and what to do about it – kept in the browser so a reload carries on. */
export function useGame2048() {
  const [saved, setSaved] = useState<Saved>(load)

  const update = useCallback((next: Saved) => {
    safeStorage.set(KEY, next)
    setSaved(next)
  }, [])

  const play = useCallback(
    (dir: Direction) =>
      setSaved((prev) => {
        if (prev.game.over) return prev
        const { state, moved } = move(prev.game, dir)
        if (!moved) return prev
        const next = { ...prev, game: state, best: Math.max(prev.best, state.score) }
        safeStorage.set(KEY, next)
        return next
      }),
    [],
  )

  const restart = useCallback(() => update({ game: newGame(), best: saved.best, keepGoing: false }), [update, saved.best])
  const keepGoing = useCallback(() => update({ ...saved, keepGoing: true }), [update, saved])

  return { game: saved.game, best: saved.best, keepGoing: saved.keepGoing, play, restart, dismissWin: keepGoing }
}
