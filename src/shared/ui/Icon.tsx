import { iconSvg, type IconName } from '../assets/icons'
import { cn } from '../lib/cn'
import { useSkin } from '../theme'

/**
 * An icon from `shared/assets/icons/*.svg`, drawn in the active skin's version of it. Size it with
 * `className` (`size-4`…); it takes the surrounding text colour.
 */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  const skin = useSkin()
  return (
    <span
      aria-hidden
      className={cn('inline-block size-4 shrink-0 [&>svg]:size-full', className)}
      // our own files, bundled at build time
      dangerouslySetInnerHTML={{ __html: iconSvg(name, skin) }}
    />
  )
}
