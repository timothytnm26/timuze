// labels shared with other screens live in `common`, the rest in this widget's namespace
export const NAV = [
  { to: '/dashboard', label: 'widgets/app-shell:nav.dashboard', icon: '◉' },
  { to: '/artists', label: 'common:labels.artists', icon: '✦' },
  { to: '/tracks', label: 'common:labels.tracks', icon: '♪' },
  { to: '/albums', label: 'common:labels.albums', icon: '◫' },
  { to: '/recent', label: 'widgets/app-shell:nav.recent', icon: '↺' },
  { to: '/history', label: 'common:labels.streams', icon: '▤' },
  { to: '/rank', label: 'widgets/app-shell:nav.rank', icon: '⇅' },
] as const
