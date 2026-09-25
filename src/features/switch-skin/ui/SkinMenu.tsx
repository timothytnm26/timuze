import { useTranslation } from '@/shared/i18n'
import { cn, onRadioGroupKeyDown } from '@/shared/lib'
import { loadAllSkinFonts, setSkin, SKINS, useSkin, type Skin } from '@/shared/theme'
import { Island } from '@/shared/ui'

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

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-4.5 shrink-0', className)} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3Z" />
      <circle cx="7.5" cy="11" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
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
      trigger={() => (
        <>
          <PaletteIcon />
          <Swatch skin={skin} className="max-sm:hidden" />
          <span className="sr-only">{`${label}: ${t(`skins.${skin}.name`)}`}</span>
        </>
      )}
    >
      {() => (
        <>
          <p className="px-2 pt-1 text-xs text-ink-faint">{label}</p>
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
            <span className="block text-xs leading-snug text-ink-muted">{t(`skins.${s}.description`)}</span>
          </span>
          {s === skin ? (
            <svg viewBox="0 0 12 10" className="size-3.5 shrink-0 text-brand" aria-hidden>
              <path d="M1 5.5l3.5 3L11 1" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          ) : (
            <Swatch skin={s} />
          )}
        </button>
      ))}
    </div>
  )
}
