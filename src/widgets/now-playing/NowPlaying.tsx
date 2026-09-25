import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trackQueries, type Track } from '@/entities/track';
import { RemoteControls } from '@/features/web-player';
import { useTranslation } from '@/shared/i18n';
import { cn, formatDuration } from '@/shared/lib';
import { Cover } from '@/shared/ui';

function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn('w-[3px] rounded-full bg-brand', playing ? 'animate-pulse' : 'h-1')} style={playing ? { height: `${[60, 100, 40][i]}%`, animationDelay: `${i * 0.15}s` } : undefined} />
      ))}
    </span>
  );
}

/**
 * The cover as a spinning record. Always a true circle – `rounded-full` follows the skin
 * (square in minimal/pixel), and a spinning square looks broken. The round, clipping wrapper also
 * keeps the rotating image's corners from widening the layout (a turned square's box grows ~41%).
 */
function Vinyl({ track, playing, size = 64, className }: { track: Track; playing: boolean; size?: number; className?: string }) {
  return (
    <span className={cn('relative block shrink-0 overflow-hidden rounded-[50%] ring-1 ring-line', className)}>
      <Cover images={track.album.images} alt="" size={size} className={cn('size-full animate-spin-slow rounded-[50%]', !playing && '[animation-play-state:paused]')} />
      {/* <span className="absolute top-1/2 left-1/2 size-[0%] -translate-1/2 rounded-[50%] bg-canvas ring-1 ring-line" aria-hidden /> */}
    </span>
  );
}

/** Playhead between polls: the last reported progress plus the time since, while playing. */
function useProgress(progress: number, duration: number, playing: boolean, reportedAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [playing]);
  return Math.min(duration, progress + (playing ? Math.max(0, now - reportedAt) : 0));
}

/**
 * What the user is playing on Spotify, on any device. `card` (sidebar) adds the playhead and
 * transport controls; the default pill is a compact link for top bars.
 */
export function NowPlaying({ variant = 'pill', className }: { variant?: 'pill' | 'card'; className?: string }) {
  const { t } = useTranslation('features/web-player');
  const { data, dataUpdatedAt } = useQuery(trackQueries.nowPlaying());
  const track = data?.item;
  const playing = !!data?.is_playing;
  const at = useProgress(data?.progress_ms ?? 0, track?.duration_ms ?? 0, playing, dataUpdatedAt);
  if (!track) return null;

  const artists = track.artists.map((a) => a.name).join(', ');

  if (variant === 'pill')
    return (
      <a href={track.external_urls.spotify} target="_blank" rel="noreferrer" className={cn('flex max-w-xs items-center gap-2.5 rounded-full border border-line bg-surface py-1 pr-4 pl-1 transition-colors hover:border-ink-faint', className)}>
        <Vinyl track={track} playing={playing} className="size-7" />
        <span className="min-w-0 text-xs leading-tight">
          <span className="block truncate font-semibold">{track.name}</span>
          <span className="block truncate text-ink-muted">{track.artists[0]?.name}</span>
        </span>
        <Equalizer playing={playing} />
      </a>
    );

  return (
    <section aria-label={t('nowPlaying')} className={cn('panel rounded-2xl border-line bg-surface p-3', className)}>
      <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-ink-faint uppercase">
        <Equalizer playing={playing} />
        {playing ? t('nowPlaying') : t('paused')}
      </p>
      <Vinyl track={track} playing={playing} size={300} className="aspect-square w-full" />
      <div className="mt-3 leading-snug">
        <a href={track.external_urls.spotify} target="_blank" rel="noreferrer" title={t('openInSpotify')} className="block text-sm font-semibold text-balance break-words underline-offset-2 hover:underline">
          {track.name}
        </a>
        <p className="mt-0.5 text-xs text-balance break-words text-ink-muted">{artists}</p>
      </div>
      <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-ink-faint tabular-nums">
        <span>{formatDuration(at)}</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-brand" style={{ width: `${track.duration_ms ? (at / track.duration_ms) * 100 : 0}%` }} />
        </div>
        <span>{formatDuration(track.duration_ms)}</span>
      </div>
      <RemoteControls playing={playing} className="mt-1.5" />
    </section>
  );
}
