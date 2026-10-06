import type { IconName } from '@/shared/assets/icons'

// labels shared with other screens live in `common`, the rest in this widget's namespace
export const NAV = [
  { to: '/dashboard', label: 'widgets/app-shell:nav.dashboard', icon: 'overview' },
  { to: '/artists', label: 'common:labels.artists', icon: 'artists' },
  { to: '/tracks', label: 'common:labels.tracks', icon: 'tracks' },
  { to: '/albums', label: 'common:labels.albums', icon: 'albums' },
  { to: '/recent', label: 'widgets/app-shell:nav.recent', icon: 'recent' },
  { to: '/history', label: 'common:labels.streams', icon: 'streams' },
  { to: '/rank', label: 'widgets/app-shell:nav.rank', icon: 'rank' },
] as const satisfies readonly { to: string; label: string; icon: IconName }[]
