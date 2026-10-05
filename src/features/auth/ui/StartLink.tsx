import { Link } from '@tanstack/react-router'
import { buttonClass } from '@/shared/ui'
import { cn } from '@/shared/lib'
import { useTranslation } from '@/shared/i18n'

/** "Get started" button to /login – the one entry point shared by the landing hero and its header. */
export function StartLink({ size = 'lg', variant = 'primary', className }: { size?: 'sm' | 'md' | 'lg'; variant?: 'primary' | 'outline'; className?: string }) {
  const { t } = useTranslation('features/auth')
  return (
    <Link to="/login" className={buttonClass(variant, size, cn(className))}>
      {t('start.cta')}
    </Link>
  )
}
