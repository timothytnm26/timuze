import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { useTranslation } from '../i18n'
import { Button } from './Button'

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-14 text-center', className)}>
      <div className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-2xl">♫</div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="max-w-md text-sm text-ink-muted">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation()
  const message = error instanceof Error ? error.message : t('errors.generic')
  return (
    <EmptyState
      title={t('errors.loadFailed')}
      description={message}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t('actions.retry')}
          </Button>
        )
      }
    />
  )
}
