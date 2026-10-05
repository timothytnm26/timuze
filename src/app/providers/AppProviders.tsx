import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { playStore } from '@/entities/stream-history'
import { setMetaListener } from '@/entities/local-library'
import { invalidateLocalQueries, queryClient } from './queryClient'
import { router } from './router'

export function AppProviders() {
  useEffect(() => {
    // imports changed → rebuild top lists; iTunes answers arrived → covers and genres fill in
    setMetaListener(invalidateLocalQueries)
    return playStore.subscribe(invalidateLocalQueries)
  }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
