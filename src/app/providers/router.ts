import { createRouter } from '@tanstack/react-router'
import { routeTree } from '../routeTree.gen'
import { queryClient } from './queryClient'

export const router = createRouter({
  routeTree,
  // `/` locally, `/timuze/` on GitHub Pages – mirrors Vite's `base`
  basepath: import.meta.env.BASE_URL,
  context: { queryClient },
  defaultPreload: 'intent',
  // let TanStack Query own caching; the router just kicks off prefetches
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
