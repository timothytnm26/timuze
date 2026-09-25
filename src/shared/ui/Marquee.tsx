import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

/** Infinite horizontal marquee (CSS keyframes defined in the Tailwind theme). */
export function Marquee({ children, className, reverse }: { children: ReactNode; className?: string; reverse?: boolean }) {
  return (
    <div className={cn('group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]', className)}>
      <div
        className={cn(
          'flex w-max animate-marquee gap-4 group-hover:[animation-play-state:paused]',
          reverse && '[animation-direction:reverse]',
        )}
      >
        {children}
        <div className="contents" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  )
}
