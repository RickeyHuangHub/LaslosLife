import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/components/I18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";

/**
 * ROOT LAYOUT — ONE shared shell, TWO public pages.
 *
 *   /          -> app/page.tsx        pure landing page (entity home, SEO/GEO)
 *   /play.html -> app/play/page.tsx   the game: pick a name, start a 30-day run
 *
 * Ricky Sir 2026-11-05: the player presses "Let's Try" on the landing page,
 * lands on the game page and picks a name. There is NO login wall.
 *
 * IMPORTANT — JSON-LD lives OUTSIDE this React tree on purpose.
 * Next.js serialises every element rendered in <head> into the RSC/hydration
 * payload. If a <script type="application/ld+json"> is rendered here, the
 * resulting HTML contains the schema TWICE (once as a real tag, once as an
 * escaped string inside self.__next_f.push(...)), which makes Google Rich
 * Results reject the page. scripts/postbuild.py injects exactly ONE static
 * @graph, and ONLY into index.html. The game page gets none.
 *
 * The landing-only content (Hero, About, FAQ, contact) used to live in this
 * root layout. It now lives in app/page.tsx, otherwise it would be duplicated
 * onto /play.html and dilute the game page's purpose. The edition roadmap is
 * no longer published on any public surface (Ricky Sir, 2026-11-05).
 *
 * Commercial-model wording is intentionally ABSENT everywhere (no "free",
 * no "免费", no in-app-purchase / ad claims, and no `isAccessibleForFree`).
 * Access-mode facts (no download, no sign-up, browser-based) are still stated,
 * because those describe HOW the game is played, not what it costs.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://www.laslos.com"),
  title: "Laslos Life — 拉斯洛斯生活 | Browser Survival Game",
  description:
    "Laslos Life (拉斯洛斯生活) is a browser-based survival simulation game set in Los Angeles. Play instantly in your web browser with no download, no sign-up and no installation. Manage hunger, energy, mental health and appearance across 30 days, make dignity-defining choices and unlock 8 endings. Available in English, Chinese and German.",
  applicationName: "Laslos Life",
  authors: [{ name: "Laslos" }],
  publisher: "Laslos",
  category: "games",
  keywords: [
    "Laslos Life",
    "Laslos Game",
    "拉斯洛斯生活",
    "browser game",
    "web game",
    "play in browser",
    "no download game",
    "survival game",
    "survival simulation",
    "life simulation game",
    "Los Angeles game",
    "narrative game",
    "indie game",
    "text adventure",
    "story game",
    "single player game",
    // Chinese-language discovery (Baidu / Sogou / 360). English terms above
    // are kept intact so Google and OG coverage does not regress.
    "网页游戏",
    "浏览器游戏",
    "网页生存游戏",
    "生存模拟游戏",
    "生存策略游戏",
    "文字冒险游戏",
    "模拟经营游戏",
    "洛杉矶生存游戏",
    "30天生存挑战",
    "单机网页游戏",
  ],
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    title: "Laslos Life — 拉斯洛斯生活 | Browser Survival Game",
    description:
      "A survival simulation game set in Los Angeles. Play directly in your browser — no download, no sign-up. 30 days, 8 endings, 3 languages.",
    images: [
      {
        url: "https://www.laslos.com/images/person-hero.jpg",
        width: 1280,
        height: 720,
        alt: "Laslos Life — a browser survival game set in Los Angeles",
      },
    ],
    url: "https://www.laslos.com/",
    siteName: "Laslos Life",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@LaslosLife",
    creator: "@LaslosLife",
    title: "Laslos Life — Browser Survival Game",
    description:
      "Survive 30 days in Los Angeles. A browser game with 8 endings. Play instantly, no download required.",
    images: ["https://www.laslos.com/images/person-hero.jpg"],
  },
  alternates: {
    canonical: "https://www.laslos.com/",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1A1A2E",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Outfit = display, DM Sans = body, Space Mono = tech/system labels. */}
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#1A1A2E] text-[#FFF5E4] font-body">
        {/*
          Providers wrap BOTH pages so the language choice survives the jump
          from / to /play.html. Page-specific chrome (Hero, footer, About, FAQ)
          lives in each page, not here.
        */}
        <ErrorBoundary>
          <I18nProvider>{children}</I18nProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
