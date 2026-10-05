import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { playStore } from '@/entities/stream-history'
import { addMetaListener } from '@/entities/local-library'
import { invalidateLocalQueries, queryClient } from './queryClient'
import { router } from './router'

export function AppProviders() {
  useEffect(() => {
    // imports changed → rebuild top lists; iTunes answers arrived → covers and genres fill in
    const stopMeta = addMetaListener(invalidateLocalQueries)
    const stopStore = playStore.subscribe(invalidateLocalQueries)
    return () => {
      stopMeta()
      stopStore()
    }
  }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
