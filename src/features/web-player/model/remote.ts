import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { trackQueries, type CurrentlyPlaying } from '@/entities/track'
import { SpotifyApiError, spotifySend } from '@/shared/api'

export type RemoteAction = 'play' | 'pause' | 'next' | 'previous'
export type RemoteError = 'remotePremium' | 'noDevice' | 'scope' | 'playback'

const toRemoteError = (e: unknown): RemoteError => {
  if (!(e instanceof SpotifyApiError)) return 'playback'
  return ({ 401: 'scope', 403: 'remotePremium', 404: 'noDevice' } as const)[e.status as 401 | 403 | 404] ?? 'playback'
}

/**
 * Transport controls for whatever device is playing (Web API, not the in-browser SDK).
 * Play/pause flips the now-playing query right away; every action re-reads it once Spotify caught up.
 * The caller picks play vs pause – by the time the request goes out, the optimistic flip already ran.
 */
export function useRemoteControl() {
  const qc = useQueryClient()
  const { queryKey } = trackQueries.nowPlaying()
  const [error, setError] = useState<RemoteError | null>(null)

  const mutation = useMutation({
    mutationFn: (action: RemoteAction) =>
      spotifySend(action === 'play' || action === 'pause' ? 'PUT' : 'POST', `/me/player/${action}`),
    onMutate: async (action) => {
      setError(null)
      if (action !== 'play' && action !== 'pause') return
      await qc.cancelQueries({ queryKey })
      const prev = qc.getQueryData(queryKey)
      if (!prev) return
      // freeze / resume the bar where it is now, not where the last poll left it
      const since = Date.now() - (qc.getQueryState(queryKey)?.dataUpdatedAt ?? Date.now())
      const progress = (prev.progress_ms ?? 0) + (prev.is_playing ? since : 0)
      const next: CurrentlyPlaying = { ...prev, is_playing: action === 'play', progress_ms: progress }
      qc.setQueryData(queryKey, next)
      return { prev }
    },
    onError: (e, _action, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev)
      setError(toRemoteError(e))
    },
    // Spotify takes a moment to report the new state
    onSettled: () => setTimeout(() => void qc.invalidateQueries({ queryKey }), 700),
  })

  return { run: mutation.mutate, pending: mutation.isPending, error, dismiss: () => setError(null) }
}
