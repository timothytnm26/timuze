import { useStore } from '@tanstack/react-store'
import { sessionStore } from '@/shared/api'

export const useSession = () => useStore(sessionStore, (s) => s)
