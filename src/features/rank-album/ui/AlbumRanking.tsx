import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Album, AlbumTrack } from '@/entities/album'
import { INTL_LOCALE, isLocale, Trans, useTranslation } from '@/shared/i18n'
import { cn } from '@/shared/lib'
import { useSkin } from '@/shared/theme'
import { Cover, LogoMark } from '@/shared/ui'
import type { ShareTheme } from '../lib/palette'
import { themeVars, useShareStyle } from '../model/useShareStyle'
import { GripIcon, RankList } from './RankList'
import { ShareRanking } from './ShareRanking'

const byTrackNumber = (a: AlbumTrack, b: AlbumTrack) => a.disc_number - b.disc_number || a.track_number - b.track_number

/** The share image's backdrop in CSS: the theme's canvas, the photo, and the skin's decoration. */
function cardBackdrop(skin: string, theme: ShareTheme): CSSProperties {
  const mix = (v: string, pct: number) => `color-mix(in oklab, var(${v}) ${pct}%, transparent)`
  const layers = ['var(--rk-photo)']
  if (skin === 'glass')
    layers.unshift(
      `radial-gradient(70% 45% at 5% 0%, ${mix('--rk-accent', 38)}, transparent 70%)`,
      `radial-gradient(60% 40% at 100% 28%, ${mix('--rk-secondary', 34)}, transparent 70%)`,
      `radial-gradient(80% 45% at 50% 110%, ${mix('--rk-accent', 22)}, transparent 70%)`,
    )
  if (skin === 'retro') layers.unshift(`radial-gradient(120% 60% at 50% -10%, ${mix('--rk-accent', 20)}, transparent 70%)`)
  if (skin === 'pixel') layers.unshift('radial-gradient(rgb(255 255 255 / 0.07) 1.5px, transparent 1.6px) 0 0 / 12px 12px')
  return { background: `${layers.join(', ')}, ${theme.canvas}` }
}

/**
 * One album's ranking, edited on a card drawn like the share image – its layout, the colour
 * detected on the cover, the ranking's title and the tapering list – so what you arrange is what
 * you post (the accent / photo picks happen in the share sheet). Tracks can be left out: they
 * drop to "Not ranked" below the card (in album order) and stay out of the image. Lives only in
 * memory – key it by album id so a new album starts fresh.
 */
export function AlbumRanking({ album, onChangeAlbum }: { album: Album; onChangeAlbum?: () => void }) {
  const { t, i18n } = useTranslation('features/rank-album')
  const skin = useSkin()
  const titleBox = useRef<HTMLTextAreaElement>(null)
  const style = useShareStyle(album)
  const all = album.tracks.items
  const [ranked, setRanked] = useState(all)
  const [excluded, setExcluded] = useState<AlbumTrack[]>([])
  const defaultTitle = t('image.titleDefault', { album: album.name })
  const [title, setTitle] = useState(defaultTitle)

  const untouched = excluded.length === 0 && ranked.every((track, i) => track.id === all[i]?.id)
  const lang = i18n.resolvedLanguage
  // top right of the card / image: the day it was ranked
  const today = useMemo(
    () => new Intl.DateTimeFormat(isLocale(lang) ? INTL_LOCALE[lang] : undefined, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
    [lang],
  )
  const labels = useMemo(
    () => ({ eyebrow: today, title: title.trim() || defaultTitle, footer: t('image.footer') }),
    [today, title, defaultTitle, t],
  )

  // the title box grows with its text, like the heading it stands in for
  useLayoutEffect(() => {
    const el = titleBox.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [title, style.defaultTheme])

  const remove = (track: AlbumTrack) => {
    setRanked((r) => r.filter((x) => x.id !== track.id))
    setExcluded((e) => [...e, track].sort(byTrackNumber))
  }
  const addBack = (track: AlbumTrack) => {
    setExcluded((e) => e.filter((x) => x.id !== track.id))
    setRanked((r) => [...r, track])
  }
  const reset = () => {
    setRanked(all)
    setExcluded([])
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-ink-muted">
          <Trans
            t={t}
            i18nKey="instructions"
            components={{
              grip: <GripIcon className="mx-0.5 inline h-4 w-2.5 -translate-y-px" />,
              x: (
                <svg viewBox="0 0 12 12" className="mx-0.5 inline size-3 -translate-y-px" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              ),
            }}
          />
        </p>
        <div className="flex items-center gap-4 text-sm">
          {onChangeAlbum && (
            <button type="button" onClick={onChangeAlbum} className="cursor-pointer text-brand underline-offset-4 hover:underline">
              {t('changeAlbum')}
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            disabled={untouched}
            className="cursor-pointer text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:pointer-events-none disabled:opacity-40"
          >
            {t('reset')}
          </button>
        </div>
      </div>

      {/* the editor card – laid out like the image it turns into, in the cover's detected colour */}
      {style.defaultTheme && (
        <div
          style={{ ...themeVars(style.defaultTheme), ...cardBackdrop(skin, style.defaultTheme) }}
          className={cn(
            'relative mx-auto w-full max-w-xl overflow-hidden rounded-card px-4 pt-5 pb-6 text-(--rk-ink) [--rk-scale:1] sm:px-7 sm:pt-7 sm:[--rk-scale:1.12]',
            skin === 'retro' && 'grain',
            (skin === 'minimal' || skin === 'pixel') && 'ring-1 ring-(--rk-line)',
          )}
        >
          {skin === 'retro' && <div aria-hidden className="pointer-events-none absolute inset-2 rounded-[inherit] border-2 border-(--rk-line)" />}

          <header className="relative flex items-center justify-between gap-3">
            <span className="flex shrink-0 items-center gap-1 font-display text-lg font-bold sm:text-xl">
              <LogoMark className="size-5 text-(--rk-accent) sm:size-6" />
              timuze
            </span>
            <span className="min-w-0 truncate font-mono text-xs tracking-wide text-(--rk-accent) uppercase sm:text-sm">{today}</span>
          </header>

          <div className="relative mt-5 flex items-center gap-4 sm:mt-7 sm:gap-5">
            <Cover images={album.images} alt="" size={300} rounded="xl" className="size-24 shrink-0 shadow-[0_18px_40px_-14px_rgb(0_0_0/0.7)] sm:size-32" />
            <div className="min-w-0 flex-1">
              {/* the ranking's title – edited in place; cleared, it falls back to the default */}
              <label>
                <span className="sr-only">{t('titleLabel')}</span>
                <textarea
                  ref={titleBox}
                  value={title}
                  onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
                  placeholder={defaultTitle}
                  maxLength={80}
                  rows={1}
                  className="block w-full resize-none overflow-hidden rounded-lg bg-transparent font-display text-2xl leading-[1.04] font-extrabold text-balance outline-none placeholder:text-(--rk-muted) hover:bg-(--rk-line)/40 focus:bg-(--rk-line)/40 sm:text-4xl"
                />
              </label>
              <p className="mt-1.5 truncate text-sm font-semibold text-(--rk-accent) sm:text-base">{album.artists.map((a) => a.name).join(', ')}</p>
            </div>
          </div>

          <div className="relative mt-5 rounded-2xl border border-(--rk-line) bg-(--rk-surface) px-1.5 py-2 sm:mt-7 sm:px-3 sm:py-3">
            {ranked.length ? (
              <RankList tracks={ranked} onReorder={setRanked} onRemove={remove} />
            ) : (
              <p className="px-3 py-8 text-center text-sm text-(--rk-muted)">{t('empty')}</p>
            )}
          </div>

          <footer className={cn('relative mt-5 flex items-center font-mono text-xs text-(--rk-faint)', skin === 'minimal' ? 'justify-between' : 'justify-center')}>
            {skin === 'minimal' && <span className="h-1 w-12 bg-(--rk-accent)" aria-hidden />}
            {t('image.footer')}
          </footer>
        </div>
      )}

      {excluded.length > 0 && (
        <section className="mx-auto w-full max-w-xl">
          <h3 className="font-display text-lg font-semibold">
            {t('excluded')} <span className="text-ink-faint">· {excluded.length}</span>
          </h3>
          <p className="mt-0.5 text-sm text-ink-muted">{t('excludedHint')}</p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {excluded.map((track) => (
              <li key={track.id} className="panel flex items-center gap-3 rounded-xl border-line bg-surface py-2 pr-2 pl-3">
                <span className="w-16 shrink-0 font-mono text-xs text-ink-faint">{t('trackNo', { n: track.track_number })}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{track.name}</span>
                  <span className="block truncate text-xs text-ink-muted">{track.artists.map((a) => a.name).join(', ')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => addBack(track)}
                  aria-label={t('add', { track: track.name })}
                  className="shrink-0 cursor-pointer rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-brand hover:text-brand"
                >
                  + {t('addBack')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* phones: stays in reach at the bottom while scrolling a long list */}
      <div className="sticky bottom-24 z-10 flex justify-center lg:bottom-6">
        <ShareRanking album={album} ranked={ranked} labels={labels} style={style} />
      </div>
    </section>
  )
}
