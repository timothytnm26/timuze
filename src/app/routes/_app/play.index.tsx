import { createFileRoute } from '@tanstack/react-router'
import { PlayPage } from '@/pages/play'

export const Route = createFileRoute('/_app/play/')({ component: PlayPage })
