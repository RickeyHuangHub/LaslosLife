'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
} from 'react';
import type { Lang } from '@/lib/i18n';
import { STRINGS, OPENING_LINES, LANGUAGES } from '@/lib/i18n';

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  openingLines: string[];
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
  openingLines: [],
});

// Layout effects run before the browser paints, so restoring a stored language
// never shows a visible EN -> ZH/DE flash. On the server there is no layout
// phase, so useEffect avoids React's useLayoutEffect SSR warning.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function I18nProvider({ children }: { children: React.ReactNode }) {
  /**
   * HYDRATION CONTRACT (Ricky Sir, 2026-11-05)
   * -----------------------------------------
   * The server always renders `en`. Reading localStorage inside the useState
   * initializer used to make the FIRST client render use zh/de for returning
   * visitors, so SSR and client markup disagreed. React threw #418 (hydration
   * text mismatch) -> #423 (root switched to client rendering), and Next.js
   * fell through to its global "Application error" page on some loads.
   *
   * Now both server and first client render start at `en`; the stored language
   * is applied in a layout effect, before the first paint. SiteIntro and the
   * other landing blocks already use the same mounted-guard pattern, so the
   * Chinese SSR copy that Baidu reads is unchanged.
   */
  const [lang, setLangState] = useState<Lang>('en');

  useIsomorphicLayoutEffect(() => {
    const stored = localStorage.getItem('laslos_lang') as Lang | null;
    if (stored === 'en' || stored === 'zh' || stored === 'de') {
      setLangState(stored);
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('laslos_lang', l);
  }, []);

  const t = useCallback((key: string) => {
    return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  }, [lang]);

  const openingLines = OPENING_LINES[lang];

  return (
    <I18nContext.Provider value={{ lang, setLang, t, openingLines }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

// ─── Language Switcher Component ──────────────────────────────

/**
 * `inline` is used by the landing page top bar, where the three language
 * buttons sit at the RIGHT end next to the "30 DAYS · 8 ENDINGS" pill.
 * Everywhere else (the game page) the control stays pinned to the top-right.
 * The active pill is PINK, matching the hero's neon accent.
 */
export function LanguageSwitcher({ inline = false }: { inline?: boolean }) {
  const { lang, setLang } = useI18n();

  return (
    <div
      className={`${
        inline ? '' : 'fixed right-4 top-4'
      } z-50 flex gap-1 rounded-full border border-white/10 bg-[#07080F]/80 p-1 shadow-xl backdrop-blur-md`}
    >
      {LANGUAGES.map(({ code, label, flag }) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`la-mono rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider transition-all ${
            lang === code
              ? 'bg-[#FF6B9D] text-[#05060C] shadow-[0_0_18px_rgba(255,107,157,0.55)]'
              : 'text-[#FFF5E4]/55 hover:bg-white/5 hover:text-[#FFF5E4]'
          }`}
        >
          {flag} {label}
        </button>
      ))}
    </div>
  );
}
