import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UserAvatar, userQueries } from '@/entities/user'
import { libraryQueries } from '@/entities/library'
import { trackQueries } from '@/entities/track'
import { AnimatedNumber, Skeleton } from '@/shared/ui'
import { useTranslation } from '@/shared/i18n'
import { gsap, msToMinutes, prefersReducedMotion, SplitText, useGSAP } from '@/shared/lib'
import { decorativeMotion, tune } from '@/shared/theme'

const greetingKey = () => {
  const h = new Date().getHours()
  if (h < 5) return 'lateNight'
  if (h < 11) return 'morning'
  if (h < 14) return 'noon'
  if (h < 18) return 'afternoon'
  return 'evening'
}

function Kpi({ label, value, suffix }: { label: string; value?: number; suffix?: string }) {
  return (
    <div data-kpi className="panel rounded-2xl border-line/70 bg-surface/60 px-4 py-3">
      <p className="text-xs text-ink-muted">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-1.5 h-7 w-16" />
      ) : (
        <p className="font-display text-2xl font-bold tabular-nums">
          <AnimatedNumber value={value} />
          {suffix && <span className="ml-1 text-sm font-medium text-ink-muted">{suffix}</span>}
        </p>
      )}
    </div>
  )
}

export function ProfileHero() {
  const ref = useRef<HTMLElement>(null)
  const { t } = useTranslation(['widgets/profile-hero', 'common'])
  const { data: me } = useQuery(userQueries.me())
  const { data: lib } = useQuery(libraryQueries.summary())
  const { data: recent } = useQuery(trackQueries.recent())
  const recentMinutes = recent ? msToMinutes(recent.reduce((s, p) => s + p.track.duration_ms, 0)) : undefined

  useGSAP(
    () => {
      if (prefersReducedMotion() || !me) return
      const split = SplitText.create('[data-hello]', { type: 'chars', mask: 'chars' })
      const tl = gsap.timeline()
      tl.from(split.chars, tune({ yPercent: 120, stagger: 0.02, duration: 0.9, ease: 'expo.out' }))
        .from('[data-avatar]', tune({ scale: 0.4, autoAlpha: 0, duration: 0.8, ease: 'back.out(1.8)' }), 0)
        .from('[data-kpi]', tune({ y: 20, autoAlpha: 0, stagger: 0.07, duration: 0.6 }), 0.3)
      if (decorativeMotion())
        gsap.to('[data-orb]', { xPercent: 12, yPercent: -10, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut' })
      return () => split.revert()
    },
    { scope: ref, dependencies: [me?.id] },
  )

  return (
    <section ref={ref} className="panel grain relative mb-10 overflow-hidden rounded-4xl border-line/60 bg-surface p-6 sm:p-10">
      <div
        data-orb
        data-decor
        className="pointer-events-none absolute -top-32 -right-24 size-[28rem] rounded-full bg-[radial-gradient(circle,var(--skin-brand)_0%,transparent_65%)] opacity-25 blur-2xl"
        aria-hidden
      />
      <div
        data-decor
        className="pointer-events-none absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-[radial-gradient(circle,var(--skin-accent)_0%,transparent_65%)] opacity-15 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-5">
          <div data-avatar>
            {me ? <UserAvatar user={me} className="size-20 text-3xl sm:size-24" /> : <Skeleton className="size-20 rounded-full" />}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xs tracking-[0.2em] text-brand uppercase">{t(`greeting.${greetingKey()}`)}</p>
            {me ? (
              <h1 data-hello className="font-display text-3xl font-bold tracking-tight break-words sm:text-5xl pixel:leading-[1.2]">
                {me.display_name ?? me.id}
              </h1>
            ) : (
              <Skeleton className="mt-2 h-12 w-64" />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label={t('savedTracks')} value={lib?.savedTracks} />
          <Kpi label={t('savedAlbums')} value={lib?.savedAlbums} />
          <Kpi label={t('following')} value={lib?.followedArtists} suffix={t('common:units.artistSuffix')} />
          <Kpi label={t('last50')} value={recentMinutes} suffix={t('common:units.minuteSuffix')} />
        </div>
      </div>
    </section>
  )
}
