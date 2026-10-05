import { cn } from '../lib/cn'

/** Simplified brand marks for the services timuze can read from. */
type IconProps = { className?: string }

export function LastfmIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#d51007" />
      <text x="16" y="22" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="18" letterSpacing="-1.2" fill="#fff">
        as
      </text>
    </svg>
  )
}

export function YoutubeMusicIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#f00" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#fff" strokeWidth="1.6" />
      <path d="M13.5 11.8v8.4l7-4.2z" fill="#fff" />
    </svg>
  )
}

export function AppleMusicIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <defs>
        <linearGradient id="apple-music-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fa5c70" />
          <stop offset="1" stopColor="#f01545" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#apple-music-bg)" />
      <path d="M21.5 7.5v11.2a2.7 2.7 0 1 1-1.6-2.5V10.6l-7 1.5v8.6a2.7 2.7 0 1 1-1.6-2.5V9.8z" fill="#fff" />
    </svg>
  )
}

export function SpotifyMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#1db954" />
      <path
        d="M8.5 12.2c5-1.4 11.3-1 15.3 1.5M9.3 16.3c4.2-1.1 9.2-.7 12.6 1.4M10.2 20.2c3.4-.8 7-.5 9.8 1.2"
        fill="none"
        stroke="#000"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  )
}
