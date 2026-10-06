import { useTranslation } from '@/shared/i18n'
import { Card, CardHeader, Cover } from '@/shared/ui'
import { LEVELS, type Tier } from '../model/tiers'

/** Which picture is which score: 2048 is the user's number one, 1024 their number two… down to 2. */
export function Legend({ tiers, subtitle }: { tiers: Tier[]; subtitle: string }) {
  const { t } = useTranslation('pages/game-2048')
  // biggest score first
  const rows = Array.from({ length: LEVELS }, (_, i) => ({ value: 2 ** (LEVELS - i), tier: tiers[i] }))
  return (
    <Card>
      <CardHeader title={t('legend.title')} subtitle={subtitle} />
      <ul className="grid gap-x-6 gap-y-2 sm:max-lg:grid-cols-2">
        {rows.map(({ value, tier }) => (
          <li key={value} className="flex min-w-0 items-center gap-3">
            <span className="w-12 shrink-0 text-right font-display text-lg font-extrabold tabular-nums text-brand">{value}</span>
            {tier ? <Cover images={tier.images} alt="" size={64} rounded="lg" className="size-10 shrink-0" /> : <span className="size-10 shrink-0 rounded-lg bg-surface-2" />}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{tier?.name ?? '—'}</p>
              <p className="truncate text-xs text-ink-muted">{tier ? [t('legend.rank', { rank: tier.rank }), tier.subtitle].filter(Boolean).join(' · ') : t('legend.empty')}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
