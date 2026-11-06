'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '@/components/I18n';
import { STRINGS } from '@/lib/i18n';

// Layout effects run before paint, so the Chinese -> EN/DE label switch is not
// visible as a flash. On the server there is no layout phase, so useEffect
// avoids React's useLayoutEffect SSR warning.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const EMAIL = 'Laslos.Life@outlook.com';

/**
 * Bottom-of-page contact block: X and Email, click to reveal + one-click copy.
 *
 * Why native <details>/<summary> instead of React state
 * ------------------------------------------------------
 * It gives click-to-reveal with ZERO JavaScript, and the revealed values are
 * real, static, server-rendered DOM text. That matters for GEO: lightweight
 * LLM / search crawlers that never execute JS can still read the official X
 * handle and email, so an AI model can answer "how do I contact Laslos Life?".
 * It also avoids display:none / sr-only / clip tricks that Baidu treats as
 * deliberately hidden keyword text — collapsed <details> is a standard
 * interactive disclosure, not cloaking.
 *
 * Email copy (Ricky Sir, 2026-11-05)
 * ----------------------------------
 * Hovering the Email row brightens BOTH the address and its Copy button, so the
 * brightened state is also the quick-copy affordance. The Copy button is always
 * in the DOM at low emphasis (never hidden), and the mailto link still works.
 * Clicking Copy writes the address to the clipboard and briefly shows a
 * "Copied" label. No hidden textarea is rendered server-side; the execCommand
 * fallback creates a transient element only inside the click handler.
 *
 * Labels follow the player's language after mount (the same isomorphic pattern
 * as SiteIntro / SiteFaq), so server HTML and the first client render match
 * exactly and hydration stays clean. The values themselves are proper nouns,
 * so they are intentionally identical in every language.
 */
export function SiteContact() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const get = (key: string) => (mounted ? t(key) : STRINGS.zh[key]);

  const handleCopy = async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(EMAIL);
        ok = true;
      }
    } catch {
      // Older browsers / non-secure contexts fall through to execCommand.
    }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = EMAIL;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '0';
        ta.style.opacity = '0';
        ta.style.pointerEvents = 'none';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      } catch {
        ok = false;
      }
    }
    if (!ok) return;
    setCopied(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  const summaryClass =
    'la-mono cursor-pointer list-none rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 ' +
    'text-[10px] tracking-[0.16em] text-[#FFF5E4]/60 [&::-webkit-details-marker]:hidden ' +
    'transition-colors hover:border-[#35E6F4]/40 hover:text-[#8BE9FF] ' +
    'focus-visible:text-[#8BE9FF] focus:outline-none';

  const valueClass =
    'la-mono whitespace-nowrap text-[11px] text-[#8BE9FF]/85 ' +
    'underline decoration-dotted underline-offset-4 ' +
    'transition-colors hover:text-[#FF8FB8]';

  // Always visible, just low-contrast: no display:none / sr-only / 1px tricks.
  // group-hover makes the button brighten together with the Email address.
  const copyClass =
    'la-mono cursor-pointer rounded-full border border-[#35E6F4]/25 bg-white/[0.03] px-2.5 py-1 ' +
    'text-[10px] tracking-[0.12em] text-[#FFF5E4]/40 ' +
    'transition-colors hover:border-[#FF6B9D]/50 hover:text-[#FF8FB8] ' +
    'group-hover:border-[#FF6B9D]/40 group-hover:text-[#FF8FB8] ' +
    'focus-visible:text-[#FF8FB8] focus:outline-none';

  return (
    <section
      aria-label={get('contact_title')}
      className="mx-auto flex max-w-[960px] flex-wrap items-center justify-center gap-x-4 gap-y-3 px-5 pb-10 pt-1 text-center text-xs text-[#FFF5E4]/45"
    >
      <h2 className="w-full font-display text-xs font-semibold tracking-wide text-[#FFF5E4]/65">
        {get('contact_title')}
      </h2>

      <details>
        <summary className={summaryClass}>{get('contact_x')}</summary>
        <a
          href="https://x.com/LaslosLife"
          target="_blank"
          rel="me noopener noreferrer"
          className={`${valueClass} mt-2 inline-block`}
        >
          X: LaslosLife
        </a>
      </details>

      <details className="group">
        <summary className={summaryClass}>{get('contact_email')}</summary>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <a href={`mailto:${EMAIL}`} className={valueClass}>
            Email: Laslos.Life@outlook.com
          </a>
          <button
            type="button"
            data-copy-email="button"
            onClick={handleCopy}
            aria-label={`Copy ${EMAIL}`}
            title={`Copy ${EMAIL}`}
            className={`${copyClass} ${copied ? '!border-[#6BCB9F]/50 !text-[#6BCB9F]' : ''}`}
          >
            {copied ? `${get('contact_copied')} ✓` : get('contact_copy')}
          </button>
        </div>
      </details>

      <p className="w-full text-[11px] text-[#FFF5E4]/35">{get('contact_hint')}</p>
    </section>
  );
}
