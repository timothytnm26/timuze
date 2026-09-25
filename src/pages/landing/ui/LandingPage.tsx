import { useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { LoginButton, useSession } from '@/features/auth';
import { LocaleMenu } from '@/features/switch-locale';
import { SkinMenu } from '@/features/switch-skin';
import { isSpotifyConfigured, env } from '@/shared/config';
import { buttonClass, Cover } from '@/shared/ui';
import { Trans, useFormatters, useTranslation } from '@/shared/i18n';
import { cn, gsap, prefersReducedMotion, ScrollTrigger, SplitText, useGSAP } from '@/shared/lib';
import { decorativeMotion, tune, useSkin } from '@/shared/theme';
import { Logo, ProfileMenu } from '@/widgets/app-shell';
import { HeroTurntable } from '@/widgets/hero-turntable';
import { decorCovers } from '../lib/covers';
import { Features } from './Features';

/**
 * SplitText rewrites the DOM of the hero/outro text, so a language switch
 * remounts the page body (keyed by locale) instead of patching split nodes.
 * A skin switch remounts too, replaying the choreography in the new motion style.
 * The header sits outside the key, so its skin/language islands stay open while you switch.
 */
export function LandingPage() {
  const { i18n } = useTranslation();
  const skin = useSkin();
  return (
    <>
      <LandingHeader />
      <Landing key={`${i18n.resolvedLanguage}-${skin}`} />
    </>
  );
}

function LandingHeader() {
  return (
    // frosting sits on a ::before so the header isn't a backdrop root – its islands can blur the page too
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/40 before:absolute before:inset-0 before:-z-10 before:bg-canvas/70 before:backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <SkinMenu />
          <LocaleMenu />
          <ProfileMenu className="ml-1 sm:ml-2" />
        </div>
      </div>
    </header>
  );
}

function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const { mode } = useSession();
  const { t } = useTranslation(['pages/landing', 'common']);
  const f = useFormatters();
  const loggedIn = mode !== 'anonymous';

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const split = SplitText.create('[data-hero-title]', { type: 'lines,words,chars', mask: 'lines' });
      const tl = gsap.timeline({ defaults: tune({ ease: 'expo.out' }) });
      tl.from(split.chars, tune({ yPercent: 115, rotate: 6, stagger: 0.012, duration: 1.1 }))
        .from('[data-hero-fade]', tune({ y: 20, autoAlpha: 0, stagger: 0.1, duration: 0.9 }), 0.35)
        .from('[data-hero-visual]', tune({ y: 60, autoAlpha: 0, duration: 1.2 }), 0.2);

      // feature cards
      ScrollTrigger.batch('[data-feature]', {
        start: 'top 88%',
        once: true,
        onEnter: (els) => gsap.from(els, tune({ y: 50, autoAlpha: 0, stagger: 0.08, duration: 0.9 })),
      });

      gsap.from(
        '[data-step]',
        tune({
          y: 40,
          autoAlpha: 0,
          stagger: 0.15,
          scrollTrigger: { trigger: '[data-steps]', start: 'top 80%', once: true },
        }),
      );

      // calm skins stop here: no loops, parallax or scrubbing
      if (!decorativeMotion()) return () => split.revert();

      // equalizer
      gsap.utils.toArray<HTMLElement>('[data-eq] > span').forEach((bar) => {
        gsap.to(bar, {
          scaleY: () => gsap.utils.random(0.15, 1),
          duration: () => gsap.utils.random(0.25, 0.6),
          repeat: -1,
          repeatRefresh: true,
          yoyo: true,
          ease: 'sine.inOut',
          transformOrigin: 'bottom',
        });
      });

      // the 3D turntable does its own scroll choreography – only the fallback stack gets parallax
      gsap.utils.toArray<HTMLElement>('[data-stack]').forEach((el) =>
        gsap.to(el, {
          yPercent: -18,
          ease: 'none',
          scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
        }),
      );

      // steps: scrubbed progress line
      gsap.from('[data-progress]', {
        scaleX: 0,
        transformOrigin: 'left',
        ease: 'none',
        scrollTrigger: { trigger: '[data-steps]', start: 'top 75%', end: 'bottom 60%', scrub: true },
      });

      // big outro text – words light up as you scroll
      const outro = SplitText.create('[data-outro]', { type: 'words' });
      gsap.fromTo(
        outro.words,
        { opacity: 0.12 },
        {
          opacity: 1,
          stagger: 0.1,
          ease: 'none',
          scrollTrigger: { trigger: '[data-outro]', start: 'top 85%', end: 'bottom 55%', scrub: true },
        },
      );

      return () => {
        split.revert();
        outro.revert();
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} className="overflow-x-clip">
      {/* hero */}
      <section data-hero className="relative mx-auto grid min-h-dvh max-w-7xl items-center gap-12 px-4 pt-28 pb-16 sm:px-8 lg:grid-cols-[1.15fr_1fr]">
        <div data-decor className="pointer-events-none absolute top-1/4 -left-40 size-[40rem] rounded-full bg-[radial-gradient(circle,var(--skin-brand)_0%,transparent_60%)] opacity-15 blur-3xl" aria-hidden />
        <div className="relative">
          <div data-hero-fade className="panel mb-6 inline-flex items-center gap-2 rounded-full border-line bg-surface px-3 py-1 text-xs text-ink-muted">
            <span data-eq className="flex h-3 items-end gap-[2px]">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-full w-[3px] rounded-full bg-brand" />
              ))}
            </span>
            {t('badge')}
          </div>
          <h1 data-hero-title className="font-display text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.95] font-extrabold tracking-[-0.03em] text-balance pixel:leading-[1.15]">
            <Trans t={t} i18nKey="heroTitle" components={{ hl: <span className="text-brand" /> }} />
          </h1>
          <p data-hero-fade className="mt-6 max-w-xl text-lg text-ink-muted">
            {t('heroBody')}
          </p>
          <div id="start" data-hero-fade className="mt-9 flex scroll-mt-28 flex-wrap gap-3">
            {loggedIn ?
              <Link to="/dashboard" className={buttonClass('primary', 'lg')}>
                {t('common:actions.openDashboard')}
              </Link>
            : <LoginButton />}
          </div>
          {!isSpotifyConfigured() && (
            <p data-hero-fade className="mt-5 max-w-xl rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
              <Trans
                t={t}
                i18nKey="notConfigured"
                values={{ redirectUri: env.spotifyRedirectUri }}
                components={{
                  code: <code className="font-mono" />,
                  link: <a className="underline" href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" />,
                }}
              />
            </p>
          )}
        </div>

        <div data-hero-visual className="relative min-w-0">
          <HeroTurntable loginAction={<LoginButton size="md" />} fallback={<CoverStack stat={f.number(48213)} statLabel={t('floatingStat')} />} />
        </div>
      </section>

      {/* features */}
      <section className="mx-auto max-w-7xl px-4 py-28 sm:px-8">
        <p className="font-mono text-xs tracking-[0.2em] text-brand uppercase">{t('featuresEyebrow')}</p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">{t('featuresTitle')}</h2>
        <Features />
      </section>

      {/* steps */}
      {/* <section data-steps className="mx-auto max-w-7xl px-4 pb-28 sm:px-8">
        <div className="relative mb-10 h-px bg-line">
          <div data-progress className="absolute inset-0 bg-brand" />
        </div>
        <div className="grid gap-10 md:grid-cols-3">
          {t('steps', { returnObjects: true }).map((s, i) => (
            <div key={i} data-step>
              <p className="font-mono text-sm text-brand">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-2 font-display text-2xl font-bold">{s.title}</h3>
              <p className="mt-2 text-ink-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section> */}

      {/* outro */}
      {/* <section className="mx-auto max-w-5xl px-4 pb-32 text-center sm:px-8">
        <p data-outro className="font-display text-3xl leading-tight font-bold tracking-tight sm:text-5xl">
          {t('outro')}
        </p>
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {loggedIn ? (
            <Link to="/dashboard" className={buttonClass('primary', 'lg')}>
              {t('common:actions.openDashboard')}
            </Link>
          ) : (
            <LoginButton />
          )}
        </div>
      </section> */}

      <footer className="border-t border-line/50 px-4 py-8 text-center text-xs leading-relaxed text-balance text-ink-faint sm:px-8">
        <Trans
          t={t}
          i18nKey="footer"
          components={{
            link: <a href="https://developer.spotify.com/documentation/web-api" className="underline" target="_blank" rel="noreferrer" />,
          }}
        />
      </footer>
    </div>
  );
}

/** Static hero visual – used when WebGL isn't available. */
function CoverStack({ stat, statLabel }: { stat: string; statLabel: string }) {
  return (
    <div data-stack className="relative mx-auto aspect-square w-full max-w-md">
      {decorCovers.map((a, i) => {
        const pos = ['top-[4%] left-[18%] w-[58%] rotate-[-8deg] z-30', 'top-[30%] right-0 w-[46%] rotate-[9deg] z-20', 'bottom-[2%] left-[4%] w-[44%] rotate-[5deg] z-40', 'top-0 right-[6%] w-[30%] rotate-[14deg] z-10', 'bottom-[10%] right-[16%] w-[32%] rotate-[-12deg] z-50'][i];
        return (
          <div key={a.id} className={cn('absolute', pos)}>
            <Cover images={a.images} alt="" rounded="xl" className="w-full shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/10" />
          </div>
        );
      })}
      <div className="panel absolute bottom-[34%] left-[46%] z-60 rounded-2xl border-line bg-surface/90 px-4 py-3 glass:bg-surface">
        <p className="text-[10px] text-ink-muted uppercase">{statLabel}</p>
        <p className="font-display text-2xl font-bold text-brand">{stat}</p>
      </div>
    </div>
  );
}
