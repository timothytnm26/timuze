import { useTranslation } from '@/shared/i18n'
import { cn, onRadioGroupKeyDown } from '@/shared/lib'
import { loadAllSkinFonts, setSkin, SKINS, useSkin, type Skin } from '@/shared/theme'
import { Icon, Island } from '@/shared/ui'

/** brand · accent · ink dots, drawn in the given skin's own colors */
export function Swatch({ skin, className }: { skin: Skin; className?: string }) {
  return (
    <span data-skin={skin} className={cn('flex shrink-0 -space-x-1', className)} aria-hidden>
      {['bg-brand', 'bg-accent', 'bg-ink'].map((c) => (
        <span key={c} className={cn('size-3 rounded-full ring-2 ring-canvas', c)} />
      ))}
    </span>
  )
}

/**
 * Palette pill → island of live skin samples. Every option carries its own `data-skin`, so it
 * renders in that skin (canvas, fonts, corners, panel) whatever skin the page is in. Picking one
 * keeps the island open, so skins can be compared side by side.
 */
export function SkinMenu({
  className,
  placement,
  align,
}: {
  className?: string
  placement?: 'top' | 'bottom'
  align?: 'start' | 'end'
}) {
  const { t } = useTranslation()
  const skin = useSkin()
  const label = t('labels.skin')

  return (
    <Island
      label={label}
      placement={placement}
      align={align}
      className={className}
      triggerClassName="px-2.5 sm:pr-3"
      panelClassName="w-80"
      // fonts for the live previews
      onOpen={loadAllSkinFonts}
      flyer={
        <>
          <Icon name="palette" className="size-4.5" />
          <Swatch skin={skin} className="max-sm:hidden" />
        </>
      }
      trigger={(_, flyer) => (
        <>
          {flyer}
          <span className="sr-only">{`${label}: ${t(`skins.${skin}.name`)}`}</span>
        </>
      )}
    >
      {(_, anchor) => (
        <>
          {/* the palette and swatches from the button land here */}
          <p className="flex items-center gap-2 px-2 pt-1 text-xs text-ink-faint">
            {anchor()}
            {label}
          </p>
          <SkinOptions />
        </>
      )}
    </Island>
  )
}

/** One live-sample radio per skin, arrow keys move (and pick) like a native radio group. */
function SkinOptions() {
  const { t } = useTranslation()
  const skin = useSkin()

  return (
    <div role="radiogroup" aria-label={t('labels.skin')} onKeyDown={onRadioGroupKeyDown} className="flex flex-col gap-1.5">
      {SKINS.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={s === skin}
          // roving tabindex: a radiogroup is a single tab stop
          tabIndex={s === skin ? undefined : -1}
          data-skin={s}
          onClick={() => setSkin(s)}
          className={cn(
            'skin-backdrop panel flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 text-left font-sans text-ink outline-offset-0 transition-[border-color]',
            s === skin ? 'border-brand' : 'border-line hover:border-ink-faint',
          )}
        >
          <span className="panel grid size-11 shrink-0 place-items-center rounded-lg border-line bg-surface font-display text-xl font-bold text-brand">
            Aa
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display font-semibold">{t(`skins.${s}.name`)}</span>
          </span>
          {s === skin ? (
            <Icon name="check" className="size-3.5 shrink-0 text-brand" />
          ) : (
            <Swatch skin={s} />
          )}
        </button>
      ))}
    </div>
  )
}
