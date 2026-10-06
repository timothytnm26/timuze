import type { SpotifyImage } from '@/shared/api'

/** One of the user's top items standing for a tile value. */
export interface Tier {
  id: string
  name: string
  subtitle?: string
  images: SpotifyImage[]
  /** 1 = their number one */
  rank: number
}

/** 2 … 2048: eleven values, so the board shows the top eleven. */
export const LEVELS = 11

export const levelOf = (value: number) => Math.round(Math.log2(value))

/** The biggest tile (2048) is the user's number one, 1024 their number two… – the rarest tile is the best. */
export const tierFor = (value: number, tiers: Tier[]): Tier | undefined => tiers[Math.max(0, LEVELS - levelOf(value))]
