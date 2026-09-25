import { spotifyGet } from '@/shared/api'
import type { CurrentUser } from '../model/types'

export const getMe = () => spotifyGet<CurrentUser>('/me')
