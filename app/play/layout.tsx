import type { Metadata } from "next";

/**
 * Metadata for the GAME page (static file play.html, served at /play).
 *
 * The root layout owns the site-wide metadata with canonical = https://www.laslos.com/.
 * Every page must self-canonicalise, so this nested layout overrides it with the
 * real game URL. Letting Next.js emit the <link> (rather than string-patching the
 * built HTML) also keeps the escaped copy inside the RSC/hydration payload in
 * sync — that was the source of a conflicting-canonical bug earlier.
 *
 * WHY /play AND NOT /play.html (live SEO audit, 2026-11-05):
 * Cloudflare Pages serves /play.html with a 307 redirect to /play, and /play
 * returns the final 200 document. A canonical that points at a redirecting URL
 * is a documented Google Search mistake, so canonical + og:url + sitemap +
 * PlayAction + llms.txt all use the FINAL url /play. Every internal link
 * (Hero CTA + footer) also points straight at /play: /play.html is only the
 * static export filename, and on Cloudflare it costs an extra 307 hop.
 *
 * Do NOT add JSON-LD here. scripts/postbuild.py injects exactly ONE ld+json
 * @graph, and it belongs on the landing page only. A second script tag in React
 * makes Google Rich Results report "No items detected".
 */
export const metadata: Metadata = {
  title: "Play Laslos Life — 拉斯洛斯生活 | Browser Survival Game",
  description:
    "Start a 30-day Los Angeles survival run in Laslos Life. Pick a name, manage hunger, energy, mental health and appearance, and see which of 8 endings your choices reach.",
  alternates: {
    canonical: "https://www.laslos.com/play",
  },
  openGraph: {
    type: "website",
    title: "Play Laslos Life — 拉斯洛斯生活",
    description:
      "Start a 30-day Los Angeles survival run. No download, no sign-up — pick a name and play.",
    url: "https://www.laslos.com/play",
    siteName: "Laslos Life",
    locale: "en_US",
    images: [
      {
        url: "https://www.laslos.com/images/person-hero.jpg",
        width: 1280,
        height: 720,
        alt: "Laslos Life — a browser survival game set in Los Angeles",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
  },
};

export default function PlayLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      {/*
        Slim footer for the game page. The full About / FAQ / contact block lives
        on the public landing page at / — the game screen stays clean. The "back"
        link is static HTML, so no-JS crawlers can still walk back to the entity
        homepage. Only proper nouns / handles are hard-coded (i18n convention).
      */}
      <footer className="mx-auto flex max-w-[800px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pb-8 pt-2 text-center text-xs text-[#FFF5E4]/45">
        <a
          href="/"
          className="underline decoration-dotted underline-offset-4 transition-colors hover:text-[#FF6B9D]"
        >
          ← Laslos Life
        </a>
        <span aria-hidden="true">·</span>
        <a
          href="https://x.com/LaslosLife"
          target="_blank"
          rel="me noopener noreferrer"
          className="underline decoration-dotted underline-offset-4 transition-colors hover:text-[#FF6B9D]"
          aria-label="Official X (Twitter) account @LaslosLife"
        >
          X @LaslosLife
        </a>
      </footer>
    </>
  );
}
