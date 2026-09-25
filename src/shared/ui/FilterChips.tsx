import { useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { useTranslation } from '../i18n'

export interface FilterChipOption {
  value: string
  label: ReactNode
  count?: number
}

const chip = (active: boolean) =>
  cn(
    'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors',
    'pixel:rounded-none pixel:border-2',
    active
      ? 'border-brand bg-brand text-canvas'
      : 'border-line bg-surface text-ink-muted hover:border-ink-faint hover:text-ink glass:backdrop-blur-xl',
  )

/** Single-select chip row with an "All" chip; long lists collapse behind a "+N" toggle. */
export function FilterChips({
  label,
  allLabel,
  options,
  value,
  onChange,
  max = 12,
  className,
}: {
  label: string
  allLabel: string
  options: FilterChipOption[]
  value: string | null
  onChange: (v: string | null) => void
  max?: number
  className?: string
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const hidden = options.length - max
  // the selected chip always stays visible, even when collapsed
  const shown = expanded || hidden <= 0 ? options : options.filter((o, i) => i < max || o.value === value)

  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="mr-1 font-mono text-xs tracking-[0.15em] text-ink-faint uppercase">{label}</span>
      <button type="button" role="radio" aria-checked={value === null} onClick={() => onChange(null)} className={chip(value === null)}>
        {allLabel}
      </button>
      {shown.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? null : o.value)}
            className={chip(active)}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn('font-mono text-xs tabular-nums', active ? 'text-canvas/70' : 'text-ink-faint')}>{o.count}</span>
            )}
          </button>
        )
      })}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="cursor-pointer px-2 py-1 text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        >
          {expanded ? t('actions.showLess') : t('actions.showMore', { count: hidden })}
        </button>
      )}
    </div>
  )
}
