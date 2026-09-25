import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/lib'
import { useTranslation } from '@/shared/i18n'
import { logout } from '../model/auth'

export function LogoutButton({ className }: { className?: string }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation()
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(className)}
      onClick={() => {
        logout()
        qc.clear()
        void navigate({ to: '/' })
      }}
    >
      {t('actions.logout')}
    </Button>
  )
}
