'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useI18n } from '@/components/I18n';
import { STRINGS } from '@/lib/i18n';

// Layout effects run before paint, so the Chinese -> EN/DE switch is invisible.
// On the server there is no layout phase, so useEffect avoids React's warning.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Keep this in sync with FAQ_ITEMS in scripts/postbuild.py (the single source
// of truth for the visible FAQ, FAQPage JSON-LD and both llms files).
const FAQ_COUNT = 7;
const QUESTION_KEYS = Array.from({ length: FAQ_COUNT }, (_, i) => `faq_q${i + 1}`);
const ANSWER_KEYS = Array.from({ length: FAQ_COUNT }, (_, i) => `faq_a${i + 1}`);

/**
 * Visible FAQ. FAQPage structured data is only legitimate when the Q&A is
 * actually readable on the page, so this block is real, visible DOM — no
 * display:none, no sr-only. It is server-rendered in Chinese (the same copy as
 * FAQ_ITEMS in scripts/postbuild.py) so crawlers see structured data and body
 * text that agree, then follows the player's language after hydration.
 */
export function SiteFaq() {
  const { lang, t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setMounted(true);
  }, []);

  const activeLang = mounted ? lang : 'zh';
  const get = (key: string) => (mounted ? t(key) : STRINGS.zh[key]);
  const htmlLang = activeLang === 'zh' ? 'zh-CN' : activeLang;

  return (
    <div lang={htmlLang} className="mt-4 border-t border-[#FFF5E4]/10 pt-3">
      {/*
        Heading is the plain label `FAQ` — the bilingual "常见问题 / FAQ" was
        removed at the product owner's request and mirrored in llms.txt.

        The questions form a REAL numbered list. The numbers are plain DOM
        text (1. / 2. / 3. / ...), NOT CSS ::marker counters: lightweight LLM /
        search crawlers read static HTML and would never see a CSS-generated
        marker. `list-none` only removes the browser's duplicate marker. Each
        number is emitted as ONE expression child (a template string) so React
        does not insert a `<!-- -->` hydration separator inside "1.".

        This list lives inside the page's native <details> disclosure, so all
        Q&A text stays in the DOM while players see it after expanding — the
        same accordion pattern Google documents for FAQPage rich results.
      */}
      <h3 className="mb-3 font-display text-xs font-semibold tracking-wide text-[#8BE9FF]/85">FAQ</h3>
      <ol className="list-none space-y-3">
        {QUESTION_KEYS.map((q, i) => (
          <li key={q} className="flex gap-2.5">
            <span className="la-mono shrink-0 select-none text-[11px] font-bold text-[#35E6F4]/80">{`${i + 1}.`}</span>
            <div className="min-w-0">
              <p className="font-semibold text-[#FFF5E4]/82">{get(q)}</p>
              <p className="mt-0.5 leading-relaxed text-[#FFF5E4]/52">{get(ANSWER_KEYS[i])}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
