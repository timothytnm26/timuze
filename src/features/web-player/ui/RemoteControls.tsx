import { useTranslation } from '@/shared/i18n'
import { cn } from '@/shared/lib'
import { useRemoteControl } from '../model/remote'
import { iconButton, PlayIcon, SkipIcon } from './icons'

/** ⏮ ⏯ ⏭ for the user's active Spotify device, with the reason when Spotify refuses. */
export function RemoteControls({ playing, className }: { playing: boolean; className?: string }) {
  const { t } = useTranslation('features/web-player')
  const { run, error, dismiss } = useRemoteControl()

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="flex items-center gap-1">
        <button type="button" className={iconButton} onClick={() => run('previous')} aria-label={t('previous')}>
          <SkipIcon back />
        </button>
        <button
          type="button"
          onClick={() => run(playing ? 'pause' : 'play')}
          aria-label={playing ? t('pause') : t('play')}
          className={cn(iconButton, 'size-10 bg-brand text-canvas hover:bg-brand-strong hover:text-canvas')}
        >
          <PlayIcon playing={playing} />
        </button>
        <button type="button" className={iconButton} onClick={() => run('next')} aria-label={t('next')}>
          <SkipIcon />
        </button>
      </div>
      {error && (
        <button type="button" role="alert" onClick={dismiss} className="cursor-pointer text-center text-[11px] leading-snug text-danger">
          {t(`errors.${error}`)}
        </button>
      )}
    </div>
  )
}
