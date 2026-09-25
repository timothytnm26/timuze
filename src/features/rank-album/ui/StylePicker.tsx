import { useRef, useState } from 'react'
import { useTranslation } from '@/shared/i18n'
import { cn, onRadioGroupKeyDown } from '@/shared/lib'
import { Button } from '@/shared/ui'
import { themeFrom } from '../lib/palette'
import type { useShareStyle } from '../model/useShareStyle'

/** Accent swatches from the cover + the background photo – they restyle the editor card and the image alike. */
export function StylePicker({ style, className }: { style: ReturnType<typeof useShareStyle>; className?: string }) {
  const { t } = useTranslation('features/rank-album')
  const fileInput = useRef<HTMLInputElement>(null)
  const [failed, setFailed] = useState(false)
  const { palette, chosen, setAccent, background, setBackgroundFile } = style

  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-3', className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-xs text-ink-faint">
          {t('share.accent')}
          {palette && <> · {palette.detected ? t('share.fromCover') : t('share.stock')}</>}
        </p>
        <div role="radiogroup" aria-label={t('share.accent')} onKeyDown={onRadioGroupKeyDown} className="flex flex-wrap gap-2">
          {palette?.swatches.map((c, i) => {
            const selected = c === chosen
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={t('share.swatch', { n: i + 1 })}
                tabIndex={selected ? undefined : -1}
                onClick={() => setAccent(c)}
                style={{ background: themeFrom(c, palette.dominant).accent }}
                className={cn(
                  'size-8 cursor-pointer rounded-full ring-offset-2 ring-offset-canvas transition-transform active:scale-90',
                  selected ? 'ring-2 ring-ink' : 'ring-1 ring-line hover:scale-110',
                )}
              />
            )
          })}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-ink-faint">{t('share.background')}</p>
        <div className="flex items-center gap-1.5">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              e.target.value = ''
              setFailed(false)
              if (file) setBackgroundFile(file).catch(() => setFailed(true))
            }}
          />
          <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
            {background ? t('share.changeBackground') : t('share.pickBackground')}
          </Button>
          {background && (
            <Button variant="ghost" size="sm" onClick={() => void setBackgroundFile(null)}>
              {t('share.removeBackground')}
            </Button>
          )}
        </div>
        {failed && <p className="text-xs text-danger">{t('share.failed')}</p>}
      </div>
    </div>
  )
}
