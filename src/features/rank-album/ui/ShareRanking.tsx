import { useEffect, useRef, useState } from 'react'
import type { Album, AlbumTrack } from '@/entities/album'
import { useTranslation } from '@/shared/i18n'
import { cn, gsap, prefersReducedMotion } from '@/shared/lib'
import { tune, useSkin } from '@/shared/theme'
import { Button, buttonClass } from '@/shared/ui'
import { renderShareImage, SHARE_HEIGHT, SHARE_WIDTH, type ShareImageLabels } from '../lib/shareImage'
import type { useShareStyle } from '../model/useShareStyle'
import { StylePicker } from './StylePicker'

const slug = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 40) || 'album'

/**
 * "Create image" → a sheet with the live, story-sized image of the ranking as arranged in the
 * editor, plus the image's options: the accent (from the cover's palette, the detected colour by
 * default) and an optional background photo. Phones share it through the system share sheet
 * (Instagram → Story / Feed); elsewhere it downloads.
 */
export function ShareRanking({
  album,
  ranked,
  labels,
  style,
}: {
  album: Album
  ranked: AlbumTrack[]
  labels: ShareImageLabels
  style: ReturnType<typeof useShareStyle>
}) {
  const theme = style.theme
  const background = style.background?.bitmap ?? null
  const { t } = useTranslation('features/rank-album')
  const skin = useSkin()
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)
  const [failed, setFailed] = useState(false)

  // rendered while the sheet is open; a stale render never overwrites a newer one
  useEffect(() => {
    if (!open || !theme) return
    let alive = true
    setRendering(true)
    setFailed(false)
    renderShareImage(album, ranked, labels, { theme, background })
      .then((blob) => {
        if (!alive) return
        const next = new File([blob], `timuze-${slug(album.name)}.png`, { type: 'image/png' })
        setFile(next)
        setUrl(URL.createObjectURL(next))
      })
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setRendering(false))
    return () => {
      alive = false
    }
    // the skin only changes the style, but that is part of the image too
  }, [open, theme, background, album, ranked, labels, skin])

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  const canShare = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })

  const show = () => {
    setOpen(true)
    const el = dialog.current
    if (!el) return
    el.showModal()
    if (!prefersReducedMotion()) gsap.from(el, tune({ y: 60, autoAlpha: 0, duration: 0.45, ease: 'expo.out' }))
  }

  const share = async () => {
    if (!file) return
    try {
      await navigator.share({ files: [file], title: album.name })
    } catch {
      /* dismissed */
    }
  }

  return (
    <>
      <Button onClick={show} disabled={ranked.length === 0 || !theme}>
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
        {t('share.create')}
      </Button>

      <dialog
        ref={dialog}
        aria-label={t('share.title')}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="panel m-0 mt-auto max-h-dvh w-full max-w-none overflow-y-auto overscroll-contain rounded-t-3xl border-line bg-surface-2 p-4 text-ink backdrop:bg-canvas/70 backdrop:backdrop-blur-sm sm:m-auto sm:w-108 sm:rounded-3xl sm:p-5 glass:bg-canvas/85"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">{t('share.title')}</h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="cursor-pointer rounded-full px-3 py-1 text-sm text-ink-muted hover:bg-surface hover:text-ink"
          >
            {t('share.close')}
          </button>
        </div>

        <div className="relative mx-auto aspect-9/16 h-[52dvh] max-w-full overflow-hidden rounded-2xl bg-surface ring-1 ring-line sm:h-[58dvh]">
          {url && (
            <img
              src={url}
              alt={t('share.preview', { album: album.name })}
              width={SHARE_WIDTH}
              height={SHARE_HEIGHT}
              className={cn('size-full object-contain transition-opacity', rendering && 'opacity-60')}
            />
          )}
          {!url && <p className="absolute inset-0 grid place-items-center text-sm text-ink-muted">{t('share.creating')}</p>}
        </div>
        {failed && <p className="mt-2 text-center text-sm text-danger">{t('share.failed')}</p>}

        <StylePicker style={style} className="mt-4" />

        <div className={cn('mt-4 grid gap-2', canShare && 'grid-cols-2')}>
          {canShare && (
            <Button className="whitespace-nowrap" onClick={() => void share()} disabled={rendering}>
              {t('share.share')}
            </Button>
          )}
          {url && file && (
            <a
              href={url}
              download={file.name}
              aria-disabled={rendering}
              className={buttonClass(canShare ? 'outline' : 'primary', 'md', cn('whitespace-nowrap', rendering && 'pointer-events-none opacity-50'))}
            >
              {t('share.download')}
            </a>
          )}
        </div>
        {!canShare && <p className="mt-3 text-center text-xs text-ink-muted">{t('share.desktopHint')}</p>}
      </dialog>
    </>
  )
}
