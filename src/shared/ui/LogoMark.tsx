import { cn } from '../lib/cn'
import { Icon } from './Icon'

/** The timuze mark – `assets/icons/logo.svg` (a "t" drawn as a note), redrawn per skin where the skin has its own. */
export function LogoMark({ className }: { className?: string }) {
  return <Icon name="logo" className={cn('size-6 shrink-0 text-brand', className)} />
}
