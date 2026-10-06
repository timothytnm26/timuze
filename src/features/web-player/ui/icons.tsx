import { cn } from '@/shared/lib'
import { Icon } from '@/shared/ui'

export function PlayIcon({ playing }: { playing: boolean }) {
  return <Icon name={playing ? 'pause' : 'play'} />
}

export function SkipIcon({ back }: { back?: boolean }) {
  return <Icon name="skip" className={cn(back && 'rotate-180')} />
}

export const iconButton =
  'grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40'
