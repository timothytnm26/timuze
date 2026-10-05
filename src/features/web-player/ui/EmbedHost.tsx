import { cn } from '@/shared/lib'
import { registerEmbedHost } from '../model/embeds'
import { usePlayer } from '../model/store'

/**
 * The visible box the YouTube / Spotify embeds play in (their terms want the player on screen).
 * Present all the time but only shown while one of them is the source.
 */
export function EmbedHost({ className }: { className?: string }) {
  const source = usePlayer((s) => s.source)
  return (
    <div
      ref={registerEmbedHost}
      className={cn(
        'panel overflow-hidden rounded-xl border-line bg-black',
        source === 'youtube' ? 'h-40 w-72' : source === 'embed' ? 'h-20 w-72' : 'hidden',
        className,
      )}
    />
  )
}
