'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useI18n } from '@/components/I18n';
import { STRINGS } from '@/lib/i18n';

// Layout effects run before the browser paints, so the language switch is not
// visible as a Chinese->English flash. On the server there is no layout phase,
// so fall back to useEffect (and avoid React's useLayoutEffect SSR warning).
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * PUBLIC LANDING HERO — the part of / that a search engine or an LLM crawler
 * actually sees first.
 *
 * Why this is a real landing page, not hidden crawler bait
 * --------------------------------------------------------
 * `/` is a PURE landing page (two-page split, Ricky Sir 2026-11-05): the Hero,
 * the About block and the FAQ live here, while the game itself lives at
 * /play.html. There is NO login wall and NO account system. This component is
 * a proper, always visible Hero: <h1> entity name, positioning sentence, full
 * Chinese intro, an English positioning sentence, the "Let's Try" link to
 * /play.html and three visible design-pillar cards.
 * Zero display:none / sr-only / 1px / opacity:0 — Baidu treats hidden keyword
 * text as spam, and postbuild.py's verify() fails the build on any of those.
 *
 * Hero layout (Ricky Sir, 2026-11-05, per reference mockup)
 * --------------------------------------------------------
 * - The "30 DAYS · 8 ENDINGS" pill now lives in the top bar (app/page.tsx),
 *   at the LEFT end; the three language buttons sit at the RIGHT end.
 * - The English lead moved ABOVE the title; the Chinese/English intro stays
 *   below the gold tagline, where crawlers and players both read it.
 * - The cyan Laslos mark (/images/laslos-mark.png, transparent crop of the
 *   official logo) sits to the LEFT of the gradient <h1>.
 * - The 15s hero movie plays BEHIND the whole hero as a dark, low-opacity
 *   background layer (app/page.tsx + .la-hero-* in app/globals.css).
 *
 * Why the server render is Chinese
 * --------------------------------
 * The i18n provider defaults to `en` on the server (localStorage only exists in
 * the browser, and is now read after mount so hydration stays clean). This
 * component deliberately renders STRINGS.zh on the server AND on the first
 * client render, so the Chinese core terms are in the raw HTML — the only thing
 * Baidu reads. After mount everything follows the player's own language choice.
 * Every visitor and every crawler receives the SAME HTML; this is localisation,
 * not cloaking.
 *
 * `landing_*` keys live in lib/i18n.ts in all three languages. Do NOT add new
 * player-facing copy as hard-coded strings. The small monospace labels are
 * DATA-ONLY (numbers, language codes, proper nouns), not translatable UI.
 */
const INTRO_ZH = STRINGS.zh['site_intro'];

const PILLARS = [
  { titleKey: 'landing_pillar1_title', descKey: 'landing_pillar1_desc' },
  { titleKey: 'landing_pillar2_title', descKey: 'landing_pillar2_desc' },
  { titleKey: 'landing_pillar3_title', descKey: 'landing_pillar3_desc' },
];

export function SiteIntro() {
  const { lang, t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setMounted(true);
  }, []);

  // `mounted` is false on the server and on the first client render — identical
  // output, so React hydration stays clean. No suppressHydrationWarning needed.
  const activeLang = mounted ? lang : 'zh';
  const copy = mounted ? t('site_intro') : INTRO_ZH;
  const get = (key: string) => (mounted ? t(key) : STRINGS.zh[key]);
  const htmlLang = activeLang === 'zh' ? 'zh-CN' : activeLang;

  return (
    <header
      aria-label="Laslos Life — public landing page"
      lang={htmlLang}
      className="relative mx-auto w-full max-w-[960px] px-5 pb-12 pt-10 text-center md:pt-14"
    >
      {/*
        Always-static English lead for GPT / Gemini / Claude / Perplexity.
        Moved ABOVE the title per the 2026-11-05 reference mockup.
      */}
      <p
        lang="en"
        className="mx-auto max-w-[820px] text-[11px] leading-[1.85] text-[#FFF5E4]/50 md:text-xs"
      >
        Laslos Life — a browser-based single-player text survival adventure set in
        Los Angeles, built as a decision-training sandbox for long-term planning
        and risk management. 30 days, 8 endings, three languages.
      </p>

      {/* Official logo mark + the page's single <h1>. */}
      <div className="mt-9 flex items-center justify-center gap-3 md:mt-11 md:gap-5">
        <img
          src="/images/laslos-mark.png"
          alt="Laslos Life logo"
          width={76}
          height={98}
          className="la-logo w-12 shrink-0 md:w-[76px]"
        />
        <h1 className="la-title-gradient font-display text-4xl font-extrabold leading-[1.04] tracking-tight md:text-7xl">
          Laslos Life
        </h1>
      </div>

      <p className="mt-3 font-display text-lg font-semibold tracking-[0.42em] text-[#FF8FB8] md:text-2xl">
        拉斯洛斯生活
      </p>

      <p className="mx-auto mt-6 max-w-[680px] font-display text-sm font-semibold tracking-wide text-[#E8C547] md:text-base">
        {get('landing_tagline')}
      </p>

      <div className="la-hairline mx-auto mt-6 max-w-[560px]" />

      {/* Server-rendered Chinese intro: core terms in natural prose, visible. */}
      <p className="mx-auto mt-6 max-w-[700px] text-[12px] leading-[1.95] text-[#FFF5E4]/68 md:text-[13px]">
        {copy}
      </p>

      {/*
        This is the ONE extra click the product owner asked for: the player
        presses "Let's Try", lands on /play, picks a name and starts.
        /play is the FINAL 200 URL on Cloudflare Pages (the static filename
        /play.html 307-redirects to it), so no internal link should ever send
        a player or a crawler through that hop. A plain <a href> works without
        JavaScript and is followed by no-JS retrieval agents.
      */}
      <div className="mt-9 flex justify-center">
        <a
          href="/play"
          className="la-cta font-display text-sm font-bold md:text-base"
        >
          {get('landing_cta')}
          <span aria-hidden="true">→</span>
        </a>
      </div>

      {/*
        Three design pillars from the product brief. All visible static DOM,
        no invented routes and no edition roadmap on the public page.
      */}
      <ul className="mt-14 grid gap-4 text-left md:grid-cols-3">
        {PILLARS.map((pillar, i) => (
          <li key={pillar.titleKey} className="la-panel p-5">
            <span className="la-mono text-[10px] font-bold tracking-[0.24em] text-[#8BE9FF]/85">
              {`0${i + 1} //`}
            </span>
            <h2 className="mt-3 font-display text-sm font-bold text-[#FFF5E4] md:text-base">
              {get(pillar.titleKey)}
            </h2>
            <div className="la-hairline my-3" />
            <p className="text-[11px] leading-[1.85] text-[#FFF5E4]/60 md:text-xs">
              {get(pillar.descKey)}
            </p>
          </li>
        ))}
      </ul>
    </header>
  );
}
