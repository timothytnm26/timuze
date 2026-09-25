import { Cover } from '@/shared/ui'
import { cn } from '@/shared/lib'
import type { CurrentUser } from '../model/types'

export function UserAvatar({ user, className }: { user: CurrentUser; className?: string }) {
  const name = user.display_name ?? user.id
  if (!user.images.length)
    return (
      <div className={cn('grid size-9 place-items-center rounded-full bg-accent font-bold text-canvas', className)}>
        {name.charAt(0).toUpperCase()}
      </div>
    )
  return <Cover images={user.images} alt={name} size={64} rounded="full" className={cn('size-9', className)} />
}
