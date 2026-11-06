import { SiteIntro } from '@/components/SiteIntro';
import { SiteFaq } from '@/components/SiteFaq';
import { SiteContact } from '@/components/SiteContact';
import { LanguageSwitcher } from '@/components/I18n';

/**
 * PUBLIC LANDING PAGE — https://www.laslos.com/
 *
 * Two-page split (Ricky Sir, 2026-11-05):
 *   /          = THIS page: Hero + About + FAQ + contact
 *   /play.html = the game: the player picks a name and starts a 30-day run
 *
 * Hero revision (Ricky Sir, 2026-11-05): language buttons at the right end
 * of the top bar (pink active), "30 DAYS · 8 ENDINGS" pill at the left,
 * English lead above the title, cyan logo mark left of the <h1>, a pink-right
 * CTA gradient, and the 15s hero movie as a dark background layer. The
 * ROADMAP / Editions block was removed from every public surface.
 *
 * The Hero's "Let's Try" link is the single extra click. There is NO login
 * wall, NO account system and NO /login route.
 *
 * Visual direction (Ricky Sir, 2026-11-05): keep the BLACK background, but
 * make it feel like a high-tech text game — layered neon glows, a faint grid,
 * CRT scanlines, monospace system labels, a gradient <h1>, a lit CTA, glass
 * panels with hairline accents and readable 12–13px body copy. All of that
 * lives in app/globals.css; the HTML carries only REAL, VISIBLE text.
 *
 * Everything below is server-rendered into the static HTML: no JS fetch, no
 * canvas, no hidden crawler-only block. SiteIntro / SiteFaq / SiteContact
 * render their Chinese copy on the server (the raw HTML is what Baidu and
 * no-JS LLM crawlers read) and follow the player's language after hydration.
 * This is localisation, not cloaking — every visitor receives the exact SAME
 * HTML. The <video> is decorative only: it never hides or carries text.
 *
 * Exactly ONE site-level <h1> lives here (inside SiteIntro). The game page has
 * its own <h1> for its own document; postbuild.py verifies both.
 *
 * This is a Server Component: no hooks are used here, so all of this copy is
 * emitted at build time. The three imported text blocks are Client Components
 * that still render on the server through the I18nProvider in app/layout.tsx.
 */
export default function LandingPage() {
  return (
    <>
      <div className="laslos-landing">
        <div className="relative z-10">
          {/*
            HERO MOVIE (Ricky Sir, 2026-11-05): the original 15s Laslos logo
            animation plays behind the whole hero at low opacity. It is purely
            decorative — every word on this page is real, visible static HTML
            above the scrim. The poster is a frame extracted from the same
            movie, so there is no black flash before playback starts.
            autoplay + muted + playsInline is required for mobile browsers;
            prefers-reduced-motion is handled in app/globals.css.
          */}
          <div className="la-hero">
            <video
              className="la-hero-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/images/hero-poster.jpg"
              aria-hidden="true"
            >
              <source src="/videos/Laslos-Life-Hero-15s.mp4" type="video/mp4" />
            </video>
            <div className="la-hero-scrim" aria-hidden="true" />

            <div className="la-hero-content">
              {/*
                Data-only status strip: proper nouns and coordinates. No
                translatable UI copy and no invented version numbers.
              */}
              <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-2 px-5 pt-3">
                {/*
                  Light, low-saturation warm white — the same colour family as the
                  coordinate readout on the right (Ricky Sir, 2026-11-05). The old
                  saturated cyan made the left end visually louder than the right.
                  `la-topstrip` is the build-time marker for this contract.
                */}
                <span className="la-mono la-topstrip flex items-center gap-2 text-[9px] font-bold tracking-[0.24em] text-[#FFF5E4]/40">
                  <span className="la-dot opacity-50" aria-hidden="true" />
                  LASLOS.LIFE // LOS ANGELES
                </span>
                <span className="la-mono text-[9px] tracking-[0.2em] text-[#FFF5E4]/30">
                  34.0522° N / 118.2437° W
                </span>
              </div>

              {/*
                Top bar: the numeric pill sits at the LEFT end and the three
                language buttons at the RIGHT end. The pill used to be centred
                above the <h1>; the switcher used to be pinned top-left.
              */}
              <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 pb-3 pt-2">
                <div className="la-status-pill">
                  <span className="la-dot" aria-hidden="true" />
                  <span className="la-mono text-[10px] font-bold tracking-[0.26em] text-[#8BE9FF]">
                    30 DAYS · 8 ENDINGS ·
                  </span>
                </div>
                <LanguageSwitcher inline />
              </div>

              {/* Visible Hero: <h1>, Chinese intro, English lead, "Let's Try"
                  CTA, and the three design-pillar cards. */}
              <SiteIntro />
            </div>
          </div>

          {/* SYSTEM READOUT — a visible data band that gives the long page a
              second visual rhythm and makes the core numbers scannable. */}
          <section
            aria-label="Laslos Life key numbers"
            className="mx-auto w-full max-w-[960px] px-5 pb-12"
          >
            <div className="mb-4 flex items-center gap-4">
              <p className="la-kicker shrink-0">SYSTEM READOUT // 01</p>
              <div className="la-hairline flex-1" />
            </div>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['30', 'DAYS'],
                ['08', 'ENDINGS'],
                ['05', 'STATS'],
                ['03', 'LANGUAGES'],
              ].map(([num, label]) => (
                <li
                  key={label}
                  className="la-chip flex items-center justify-between gap-2 md:flex-col md:items-start md:gap-3"
                >
                  <span className="la-chip-num">{num}</span>
                  <span className="la-chip-label">{label}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ROADMAP / Editions removed from the public page (Ricky Sir,
              2026-11-05). The product plan is no longer published on any
              crawler-facing surface; postbuild.py asserts this. */}

          {/*
            Visible, server-rendered footer. rel="me" is the bidirectional
            identity signal: the X profile links back to https://www.laslos.com/
            and here we link back to X. Only proper nouns / handles are shown,
            so no translatable UI copy is hard-coded.
          */}
          <footer className="mx-auto flex max-w-[960px] flex-wrap items-center justify-center gap-x-5 gap-y-2 px-5 pb-8 pt-2 text-center">
            <a
              href="https://x.com/LaslosLife"
              target="_blank"
              rel="me noopener noreferrer"
              className="la-mono text-[10px] tracking-wider text-[#8BE9FF]/70 underline decoration-dotted underline-offset-4 transition-colors hover:text-[#35E6F4]"
              aria-label="Official X (Twitter) account @LaslosLife"
            >
              X @LaslosLife
            </a>
            <span aria-hidden="true" className="la-mono text-[#FFF5E4]/20">·</span>
            <a
              href="/"
              className="la-mono text-[10px] tracking-wider text-[#FFF5E4]/45 underline decoration-dotted underline-offset-4 transition-colors hover:text-[#FFF5E4]"
            >
              www.laslos.com
            </a>
            <span aria-hidden="true" className="la-mono text-[#FFF5E4]/20">·</span>
            {/* Crawler-facing entry uses the FINAL 200 URL /play (no redirect),
                exactly like the Hero CTA above. Every internal link stays on
                the canonical URL; /play.html is only the static filename. */}
            <a
              href="/play"
              className="la-mono text-[10px] tracking-wider text-[#FF8FB8]/75 underline decoration-dotted underline-offset-4 transition-colors hover:text-[#FF6B9D]"
            >
              Play Laslos Life
            </a>
          </footer>

          {/* Contact block: native <details> click-to-reveal, zero JS. */}
          <SiteContact />

          {/*
            Visible "About this game" block. Server-rendered into static HTML so
            crawlers that never execute JS read real body text, and genuinely
            readable by players — small, low-emphasis fine print, never hidden.
            <h2> is used because the Hero owns this page's single <h1>.
          */}
          <section
            lang="en"
            aria-label="About Laslos Life"
            className="mx-auto w-full max-w-[960px] px-5 pb-10"
          >
            <div className="la-hairline mb-5" />
            <p className="la-kicker mb-3">ARCHIVE // 03</p>
            {/*
              Native <details> keeps EVERY word in the static DOM for search
              engines and LLM crawlers — no display:none, no sr-only, no JS —
              while players see one collapsed line until they click. `open` is
              a BOOLEAN HTML attribute: OMITTING it is what collapses the
              block. Writing open="false" would still render it expanded.

              All copy below is unchanged, so the FAQPage JSON-LD still matches
              text that genuinely exists on this page.
            */}
            <details className="la-details px-5 py-4 md:px-7 md:py-5">
              <summary className="cursor-pointer list-none font-display text-xs font-semibold text-[#FFF5E4]/80 transition-colors hover:text-[#8BE9FF] focus-visible:text-[#8BE9FF] md:text-sm [&::-webkit-details-marker]:hidden">
                <h2 className="inline">About Laslos Life — a browser survival game</h2>
                <span className="ml-2 font-sans text-[10px] font-normal text-[#FFF5E4]/40">
                  点击展开简介与 FAQ / click to expand details &amp; FAQ
                </span>
              </summary>
              <p className="mt-4 text-[11px] leading-relaxed text-[#FFF5E4]/58 md:text-xs">
                Laslos Life (拉斯洛斯生活) is a single-player browser survival
                simulation game set in Los Angeles. Play it directly in a web browser
                with no download, no sign-up and no installation. The game is
                available in English, Chinese (简体中文) and German (Deutsch). It is
                published under the Laslos brand.
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-[#FFF5E4]/58 md:text-xs">
                You guide a 26-year-old woman through 30 days in Los Angeles, starting
                with $50 in cash, $1,200 of debt and $450 weekly rent on a shared
                apartment in Koreatown. Each day has three time slots. Hunger, energy,
                mental health and appearance decay over time, while a hidden stat
                called Aura records the dignity of your choices. Rent is settled every
                Saturday, and random events offer either a dignified response or an
                easy shortcut. Eight endings can be reached: LA Queen, Survivor,
                Faded, Evicted, Breakdown, Bankrupt, Fainted and one hidden ending.
              </p>
              <h3 className="mt-4 font-display text-xs font-semibold text-[#8BE9FF]/80">Core features</h3>
              <ul className="mt-1 list-disc pl-5">
                <li>Browser-based web game — no account, no installation.</li>
                <li>20 repeatable actions and 27 narrative events across a 30-day run.</li>
                <li>Five survival stats plus the hidden Aura dignity system.</li>
                <li>Three interface languages: English, 简体中文, Deutsch.</li>
                <li>Neo-noir dark visual design with an original soundtrack and hero video.</li>
                <li>No personal data is collected; there is no account system or user database.</li>
              </ul>
              <h3 className="mt-4 font-display text-xs font-semibold text-[#8BE9FF]/80">Genre and platform</h3>
              <p className="mt-1">
                Genre: survival simulation, life simulation, narrative text adventure.
                Platform: any modern desktop or mobile web browser, single player.
                Official site: https://www.laslos.com/ · Game page:
                https://www.laslos.com/play · Official X (Twitter) account:
                https://x.com/LaslosLife (@LaslosLife). The X profile and the website
                link to each other as the same official Laslos Life entity.
              </p>

              {/*
                Visible Chinese-language section for 百度 / 搜狗 / 360 and Chinese
                AI engines. Real body text, not hidden crawler bait. Core terms are
                distributed naturally inside prose rather than listed as keywords.
              */}
              <div lang="zh-CN" className="mt-4">
                <h2 className="mb-1 font-display text-xs font-semibold text-[#FFF5E4]/75">关于《拉斯洛斯生活》—— 智力沙盒与决策训练场</h2>
                <p>
                  每天分为三个时段，需要统筹饥饿、体力、心理健康与外表四项数值，并在
                  每周六支付 450 美元房租。每一次行动都在权衡「当前收益」与「长远风险」，
                  容错率极低，算错一步就可能触发失败结局 —— 这是一场关于资源统筹、
                  前瞻规划与风险管理的智力沙盒与决策训练场。隐藏的 Aura 数值记录尊严抉择，
                  不受金钱左右。共有 8 种结局，包括 LA Queen、Survivor、Faded、Evicted、
                  Breakdown、Bankrupt、Fainted 以及一个隐藏结局。
                </p>
              </div>

              {/* Visible FAQ: matches the FAQPage node in the JSON-LD @graph. */}
              <SiteFaq />
            </details>
          </section>

          {/* Data-only closing band — proper nouns and coordinates, no UI copy. */}
          <div className="la-hairline mx-auto max-w-[960px]" />
          <p className="la-mono pb-10 pt-5 text-center text-[9px] tracking-[0.24em] text-[#FFF5E4]/25">
            LASLOS.LIFE // LOS ANGELES // 34.0522 N 118.2437 W
          </p>
        </div>
      </div>
    </>
  );
}
