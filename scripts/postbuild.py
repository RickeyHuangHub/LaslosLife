#!/usr/bin/env python3
"""
Laslos Life — single source of truth for production HTML and the deploy package.

Why this exists
---------------
Next.js serialises every element rendered in <head> into the RSC/hydration
payload (self.__next_f.push(...)). Any JSON-LD rendered by React therefore
appears TWICE in the raw HTML: once as a real <script> and once as an escaped
string. Google Rich Results then reports "No items detected".

The fix: keep ALL JSON-LD out of the React tree (see app/layout.tsx) and inject
exactly one static <script type="application/ld+json"> into the FINISHED LANDING
HTML after the build. This script also owns asset paths, domain normalisation,
SEO/GEO files, security headers and the final ZIP — one deterministic pass,
so deploy/ and the ZIP can never go stale again.

Two pages (2026-11-05)
----------------------
  out/index.html  -> /           pure landing page, ONE JSON-LD @graph
  out/play.html   -> /play       the game, self-canonical, NO JSON-LD
Both get the stats script and the supplementary meta. Each page self-
canonicalises through its own (nested) layout metadata; sitemap lists exactly
these two URLs. Do not add a third page without extending PAGE_CANONICALS.

IMPORTANT (live audit 2026-11-05): Cloudflare Pages replies to /play.html with
a 307 -> /play, and /play is the final 200 document. Canonical / OG / sitemap /
PlayAction / llms.txt AND every internal link (Hero CTA + footer) therefore all
use /play, never the redirecting static filename. verify() rejects any
href="/play.html" left in the shipped HTML.

Usage
-----
  python scripts/postbuild.py --postbuild   # patch built HTML only (npm hook)
  python scripts/postbuild.py               # full: patch + sync deploy/ + ZIP + verify
"""

from __future__ import annotations

import json
import os
import re
import shutil
import sys
import zipfile
from datetime import date
from html import escape as html_escape, unescape as html_unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
DEPLOY = ROOT / "deploy"
ZIP = ROOT / "Laslos-Deploy-FINAL.zip"
SITE = "https://www.laslos.com"
TODAY = date.today().isoformat()

# Baidu Webmaster Tools verification. Paste ONLY the exact `content` value that
# Baidu gives you (usually "code-xxxxxxxx"). Leaving it empty emits NO meta tag
# at all — an empty verification tag is worse than none, because Baidu treats it
# as a failed claim. This is the single place to change when the code arrives.
BAIDU_SITE_VERIFICATION = ""

# ---------------------------------------------------------------------------
# Structured data — ONE script tag containing a @graph, correct domain only
# ---------------------------------------------------------------------------
# Keeping exactly ONE <script type="application/ld+json"> is a hard project rule:
# React serialises head elements into the RSC payload, and a second script tag
# is what previously made Google Rich Results report "No items detected".
# A @graph lets us add WebSite + FAQPage entity anchors WITHOUT breaking that
# rule (and without re-introducing duplicate VideoGame nodes).
#
# `brand` is NOT a VideoGame property (Rich Results warns on it); author /
# publisher / offers / mainEntityOfPage are omitted to keep the graph lean;
# `sameAs` is legal and links the game to its official X account.
# No aggregateRating / review: there is no public rating data.
# No isAccessibleForFree / price / offers: the commercial model is deliberately
# left unstated so it can be decided later.
#
# FAQPage is only legitimate when the Q&A is actually visible on the page —
# components/SiteFaq.tsx renders exactly these strings (see FAQ_ITEMS).
#
# Brand-identity technique (Ricky Sir, 2026-11-05). The owner asked for an
# explicit distinction from a similarly-named work WITHOUT breaking the earlier
# "no third-party brand names, no targeted negative sentences" boundary. The
# resolution is two layers: the near-spelling token appears EXACTLY ONCE, in a
# single FAQ *question* (so that exact navigational query still matches), while
# every ANSWER, entity description, meta and GEO summary uses a positive,
# self-contained brand statement plus a GENERIC (never name-specific) negation.
# Define it once here so all four surfaces stay byte-identical.
BRAND_LINE = (
    "Laslos Life（拉斯洛斯生活）是一个独立、完整的原创作品与品牌名称，"
    "不是任何其他名称的变体、简写或拼写误差。"
)
BRAND_LINE_EN = (
    "Laslos Life is an independent, self-contained original title and brand "
    "name — not a variant, abbreviation or misspelling of any other name."
)
FAQ_ITEMS = [
    (
        "Laslos Life 拉斯洛斯生活是什么类型的游戏？",
        "这是一款网页版的育智娱乐单人文字生存冒险类网页游戏。无需下载、不用注册，浏览器打开即可直接游玩。故事舞台设定在洛杉矶，玩家将开启为期 30 天的生存挑战，管理饥饿、精力、心理健康与外貌状态，依靠不同选择解锁 8 种差异化结局，支持中文、英文、德语。",
    ),
    (
        "游玩拉斯洛斯生活需要下载或者注册账号吗？",
        "不需要下载，也不用注册账号，任意现代浏览器打开网页就能直接游玩。",
    ),
    (
        "Laslos Life 支持多人联机吗？",
        "不支持多人联机，这是一款单人叙事生存模拟游戏。",
    ),
    (
        "拉斯洛斯生活有没有手机 APP 版本？",
        "没有独立 APP，只有网页版本；手机浏览器同样可以访问游玩。",
    ),
    # Navigational / entity-confusion queries (Ricky Sir, 2026-11-05).
    # ONE source, four surfaces: visible FAQ, FAQPage JSON-LD, llms.txt and
    # llms-full.txt all read FAQ_ITEMS, so the clarification stays consistent
    # without being repeated in the entity's own description / meta / OG.
    # Q5's QUESTION is the ONLY string on the whole site that names a similarly
    # spelled third-party work (it exists to match that exact search query).
    # Its ANSWER never repeats the token: it leads with the independent-brand
    # statement, then describes the game, then states a generic non-affiliation.
    (
        "Laslos Life 和 Lagos Life 有什么区别？",
        BRAND_LINE + "本作是一款以洛杉矶为背景的浏览器文字育智游戏：30 天生存挑战、隐藏 Aura 数值、8 种结局，支持中、英、德三语。与名称相近的其他作品均没有关联；官网与游戏入口是 www.laslos.com。",
    ),
    (
        "Laslos Life 安全吗？",
        "游戏在浏览器里直接运行，无需下载安装、不用注册账号，也不要求提供真实姓名、邮箱等个人资料；官方入口是 www.laslos.com，从该地址即可直接进入游戏。",
    ),
    (
        "Laslos Life 怎么样？",
        "这是一款偏硬核的文字生存与决策训练游戏：每天 3 个时段、30 天视界内统筹饥饿、体力、心理、外表与现金，容错率低，算错一步就可能触发失败结局；隐藏的 Aura 数值只由尊严抉择改变，共有 8 种结局。适合喜欢资源统筹、模拟经营与深度叙事的玩家。",
    ),
]

GAME_ID = SITE + "/#game"
WEBSITE_ID = SITE + "/#website"
FAQ_ID = SITE + "/#faq"

SCHEMA = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "VideoGame",
            "@id": GAME_ID,
            "name": "Laslos Life",
            "alternateName": ["Laslos Game", "拉斯洛斯生活"],
            "description": (
                "Laslos Life is a browser-based survival simulation game set in "
                "Los Angeles, designed as a decision-training sandbox: survive 30 "
                "days, balance hunger, energy, mental health and appearance, and "
                "plan under low fault tolerance. Dignity-defining choices change "
                "the hidden Aura stat and unlock 8 endings. Play instantly in any "
                "web browser with no download, no sign-up and no installation."
            ),
            # Entity disambiguation (Ricky Sir, 2026-11-05). A coined name like
            # "Laslos" is easily folded into near-spelling competitors by search
            # engines. schema.org's disambiguatingDescription is the machine-
            # readable place for this — its own example (George Bush / "41st
            # President") states a DISTINCTIVE POSITIVE trait, never "not X".
            # So: describe what this game uniquely IS, once, here only. Do NOT
            # name third-party brands in this field, in description, in the
            # meta/title, or in any player-visible copy: repeating a rival's
            # high-authority token inside our own entity description tends to
            # strengthen the co-occurrence we are trying to break, and it reads
            # as negative marketing to players. The "independent original title
            # and brand" phrasing is the positive form of the same disambiguation
            # the FAQ states in words — no "not X", no third-party token.
            # No invented publisher, no placeholder sameAs URLs — real IDs only.
            "disambiguatingDescription": (
                "An independent, self-contained original game title and brand: "
                "a 30-day Los Angeles browser survival game with a hidden Aura "
                "stat and 8 endings."
            ),
            "url": SITE + "/",
            "sameAs": ["https://x.com/LaslosLife"],
            "image": SITE + "/images/person-hero.jpg",
            # The UI ships in all three languages; keep this in sync with the
            # WebSite node and the FAQ copy instead of claiming English only.
            "inLanguage": ["en", "zh", "de"],
            "gamePlatform": "Web Browser",
            "playMode": "SinglePlayer",
            "genre": ["Simulation", "Survival", "Text Adventure", "Adventure"],
            "applicationCategory": "Game",
            "operatingSystem": "Any",
            "locationCreated": {
                "@type": "Place",
                "name": "Los Angeles, California",
                "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": 34.0522,
                    "longitude": -118.2437,
                },
            },
        },
        {
            "@type": "WebSite",
            "@id": WEBSITE_ID,
            "name": "Laslos Life 拉斯洛斯生活",
            "alternateName": "Laslos Life",
            "url": SITE + "/",
            "inLanguage": ["zh", "en", "de"],
            "about": {"@id": GAME_ID},
            # The two-page split gives PlayAction a REAL play URL rather than
            # the marketing homepage. Use the FINAL 200 URL: Cloudflare Pages
            # 307-redirects /play.html -> /play, so a target that ends in .html
            # would point structured data at a redirecting URL.
            "potentialAction": {"@type": "PlayAction", "target": SITE + "/play"},
        },
        {
            "@type": "FAQPage",
            "@id": FAQ_ID,
            "about": {"@id": GAME_ID},
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": q,
                    "acceptedAnswer": {"@type": "Answer", "text": a},
                }
                for q, a in FAQ_ITEMS
            ],
        },
    ],
}

SCHEMA_TAG = (
    '<script type="application/ld+json">'
    + json.dumps(SCHEMA, ensure_ascii=False, separators=(",", ":"))
    + "</script>"
)

# Supplementary head tags that Next.js metadata does not emit. These are plain
# <meta> nodes added to <head> — no React hydration impact.
_EXTRA_META_TAGS = [
    # zh-CN / de-DE are the two alternate UI languages; en_US stays primary
    # (emitted by Next.js metadata). Explicit locale codes help Chinese
    # crawlers classify the page instead of treating all Chinese as noise.
    '<meta name="language" content="en, zh-CN, de-DE"/>',
    '<meta name="subject" content="Laslos Life - browser survival simulation game set in Los Angeles"/>',
    '<meta name="abstract" content="Laslos Life is a browser-based decision-training sandbox: a 30-day Los Angeles survival simulation with 8 endings, available in English, Chinese and German."/>',
    '<meta name="classification" content="Games, Browser Game, Survival Simulation"/>',
    '<meta name="distribution" content="global"/>',
    '<meta name="rating" content="general"/>',
    # Baidu / Sogou / 360 use this to classify the page as PC+mobile friendly.
    # Purely declarative: it does not change layout or add a redirect.
    '<meta name="applicable-device" content="pc,mobile"/>',
    # Open Graph locale alternates — the primary locale (en_US) is emitted
    # by Next.js metadata; these declare the other two supported UI languages
    # so social/AI crawlers can map the page to zh_CN and de_DE variants.
    '<meta property="og:locale:alternate" content="zh_CN"/>',
    '<meta property="og:locale:alternate" content="de_DE"/>',
]
if BAIDU_SITE_VERIFICATION.strip():
    _EXTRA_META_TAGS.append(
        '<meta name="baidu-site-verification" content="'
        + html_escape(BAIDU_SITE_VERIFICATION.strip(), quote=True)
        + '"/>'
    )
EXTRA_META = "\n".join(_EXTRA_META_TAGS)

# ---------------------------------------------------------------------------
# Cloudflare Worker usage counters — ONE static inline script before </body>.
# Why here and not hand-edited into index.html / React:
#   * index.html is regenerated by every build; this is the single source of truth.
#   * the visit ping fires on first HTML parse, before React hydration.
#   * game start / end are driven by semantic events emitted from
#     lib/analytics.ts, so every new-game path and all 3 ending branches are
#     covered automatically — no DOM ids and no button selectors.
# `mode: "no-cors"` avoids a silent CORS rejection when the Worker does not
# return Access-Control-Allow-Origin; the response is never read anyway.
# Every failure is swallowed; stats can never block or interrupt gameplay.
# ---------------------------------------------------------------------------
STATS_ORIGIN = "https://laslos-stats.rickey-huang-account.workers.dev"
STATS_DEBUG = False  # flip to True for console diagnostics; no player impact

STATS_START = "<!-- laslos:stats:start -->"
STATS_END = "<!-- laslos:stats:end -->"
STATS_RE = re.compile(
    re.escape(STATS_START) + r".*?" + re.escape(STATS_END) + r"\s*",
    re.DOTALL,
)

STATS_BLOCK = (
    STATS_START
    + (
        """
<script>
(function(){
  var BASE = "__STATS_ORIGIN__";
  var DEBUG = __STATS_DEBUG__;
  function ping(path){
    try {
      fetch(BASE + path, { keepalive: true, mode: "no-cors" })
        .catch(function(e){ if (DEBUG) console.log("Laslos stats:", path, e); });
    } catch (e) { if (DEBUG) console.log("Laslos stats:", path, e); }
  }
  ping("/track");
  window.addEventListener("laslos:stats-start", function(){ ping("/track-game-start"); });
  window.addEventListener("laslos:stats-end", function(){ ping("/track-game-end"); });
})();
</script>
"""
        .replace("__STATS_ORIGIN__", STATS_ORIGIN)
        .replace("__STATS_DEBUG__", "true" if STATS_DEBUG else "false")
    )
    + STATS_END
    + "\n"
)

# ---------------------------------------------------------------------------
# GEO crawler policy — ONE switch
# ---------------------------------------------------------------------------
# Retrieval crawlers are always welcome: they are what lets ChatGPT / Gemini /
# Claude / Perplexity / 豆包 / DeepSeek / WorkBuddy cite this site in a live
# answer. Training crawlers are kept out by default so the copy is not absorbed
# into model weights. Flipping this single flag re-opens training access; it
# never affects search ranking or AI retrieval (they are separate agents).
BLOCK_TRAINING_CRAWLERS = True

# Real training-side UA tokens. Two tokens from the reference plan
# ("Anthropic-Extended", "CohereBot") do not exist, so rules using them would
# be inert. Google-Extended / Applebot-Extended are control tokens, not bots:
# blocking them does NOT affect Google Search or Siri/Spotlight results.
# Bytespider is deliberately NOT blocked — it is also ByteDance / 豆包's
# retrieval source, so blocking it would break Chinese LLM answers.
TRAINING_BOTS = [
    "GPTBot",
    "ClaudeBot",
    "Claude-Web",
    "anthropic-ai",
    "cohere-ai",
    "CCBot",
    "Meta-ExternalAgent",
    "Google-Extended",
    "Applebot-Extended",
]

# Retrieval / search crawlers. The most-specific user-agent group wins in
# robots.txt, so these explicit Allow groups override the wildcard group.
RETRIEVAL_BOTS = [
    "OAI-SearchBot",
    "ChatGPT-User",
    "Claude-SearchBot",
    "Claude-User",
    "PerplexityBot",
    "Perplexity-User",
    "Googlebot",
    "Bingbot",
    "Applebot",
    "DuckDuckBot",
    "Baiduspider",
    "Baiduspider-render",
    "Sogou web spider",
    "Sogou inst spider",
    "360Spider",
    "YisouSpider",
    "Bytespider",
]

_TRAINING_ACTION = "Disallow" if BLOCK_TRAINING_CRAWLERS else "Allow"
_RETRIEVAL_RULES = "\n".join(
    f"User-agent: {bot}\nAllow: /" for bot in RETRIEVAL_BOTS
)
_TRAINING_RULES = "\n".join(
    f"User-agent: {bot}\n{_TRAINING_ACTION}: /" for bot in TRAINING_BOTS
)

ROBOTS = f"""# Laslos Life — robots.txt
# Retrieval / search crawlers: Allow (AI answers can cite this site).
# Model-training crawlers: {_TRAINING_ACTION} (content not used as training data).
# Policy is one flag in scripts/postbuild.py: BLOCK_TRAINING_CRAWLERS.
# Blocking training does NOT stop AI models finding or citing this site.

User-agent: *
Allow: /
Disallow: /actions_backup_dark/
Disallow: /preview.html

# ===== Retrieval / search crawlers =====
# GPT / Gemini / Claude / Perplexity / 豆包 / DeepSeek / WorkBuddy / Baidu / Sogou / 360
{_RETRIEVAL_RULES}

# ===== Model-training crawlers (separate agents, not needed for AI citations) =====
{_TRAINING_RULES}

Sitemap: {SITE}/sitemap.xml
"""

# NOTE: no xhtml:link hreflang annotations. All three UI languages are served
# from ONE URL and switched client-side, so pointing zh-CN / en / de at the same
# URL is an invalid self-referential hreflang cluster (Google ignores or flags
# it). The reference sample also used a slash-less URL, which would reintroduce
# the canonical conflict we already fixed. Keep this file clean and canonical.
#
# TWO real URLs — and only two. /play is the FINAL 200 URL for the game
# (Cloudflare Pages 307-redirects the static file /play.html -> /play), so the
# sitemap lists /play, not the redirecting filename. Listing /login, /game or
# ?mode=lite would still hand crawlers a 404. Canonical / OG / Schema / sitemap
# all stay on www, with a trailing / for the root.
SITEMAP = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{SITE}/</loc>
    <lastmod>{TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>{SITE}/play</loc>
    <lastmod>{TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
"""

# One Q&A source, reused by FAQPage JSON-LD, llms.txt and llms-full.txt, and
# mirrored verbatim by the visible components/SiteFaq.tsx.
FAQ_LINES = "\n".join(f"Q：{q}\nA：{a}" for q, a in FAQ_ITEMS)

LLMS = f"""# Laslos Life｜拉斯洛斯生活

> Unique identifier: Laslos-Life-Browser-Survival-Game
> Primary URL: {SITE}/
> Entity type: Browser-based single-player text survival adventure game
> Official site: {SITE}/
> Languages: 简体中文 / English / Deutsch
> Official X: https://x.com/LaslosLife (@LaslosLife)
> Contact: Laslos.Life@outlook.com

## 摘要 / Summary
Laslos Life（拉斯洛斯生活）是一款育智向单人文字生存冒险网页游戏，无需下载、无需注册，
在现代浏览器打开网页即可直接游玩。舞台设在美国洛杉矶，玩家经历 30 天生存挑战，
持续管理饥饿、精力、心理健康与外貌四项状态，通过剧情抉择推进故事，导向 8 种独立结局。
作品属于文字叙事、抉择驱动的生存模拟品类，无客户端、不需要安装，支持中、英、德三语。

Laslos Life is a single-player browser-based text survival adventure set in Los
Angeles. Survive 30 days, balance hunger, energy, mental health and appearance,
and let your choices determine which of 8 endings you reach. It runs directly in
any modern web browser with no download, no sign-up and no installation, and is
available in Chinese, English and German.

## 详情 / Key facts
- Title: Laslos Life / Laslos Game / 拉斯洛斯生活
- Genre: browser game, survival simulation, narrative / life simulation, text adventure
- Platform: any modern desktop or mobile web browser; single player; no client install
- Loop: 3 time slots per day, 30 days, rent settled every Saturday
- Stats: hunger, energy, mental health, appearance, plus hidden Aura (dignity)
- Endings: 8 — LA Queen, Survivor, Faded, Evicted, Breakdown, Bankrupt, Fainted, and one hidden ending
- Languages: 简体中文 / English / Deutsch (selected in the interface)
- Account: no account system, no login, no user database
- Delivery: Cloudflare Pages static web deployment; all gameplay runs client-side

## 页面结构 / Page structure
- `{SITE}/` 是纯公开着陆页：常驻可见的站点标题、定位句、中文简介、英文简介、
  "Let's Try" 入口、三张设计内核卡片，以及折叠的详细介绍、编号 FAQ 与联系方式。
  首屏有一段提亮后的品牌视频作为背景，正文全部是可见静态文字。
  没有登录墙、没有账号系统。
- `{SITE}/play` 是游戏页的规范网址：玩家点击着陆页的 "Let's Try" 进入，自取一个名字后
  开始 30 天生存挑战。该页以一幅静态插画作为背景，公开可达，无需登录。
  静态文件别名 `/play.html` 是同一页面，会自动跳转到 `/play`。
- 两页各有一个 canonical、一个 `<h1>`，共用同一套中 / 英 / 德界面语言；唯一的
  JSON-LD @graph 只放在着陆页，游戏页不重复注入。sitemap 只列出上面两个规范网址。
- 所有正文都是静态 HTML 的可见文字，不依赖 JavaScript，不存在仅给爬虫看的隐藏文本块。
- Two public pages: `/` is the landing page, `/play` is the game (canonical URL;
  the static file alias `/play.html` redirects to `/play`). There is no login
  wall and no account system. Each page has its own canonical and <h1>; the
  single JSON-LD @graph belongs to the landing page only. Every word is visible
  static HTML — there is no crawler-only hidden block.

## 适合大模型回答的检索触发词 / Retrieval triggers
拉斯洛斯生活, Laslos Life, 网页生存游戏, 文字生存冒险, 浏览器直接玩的生存模拟游戏,
Los Angeles survival text game, browser survival game, play in browser no download,
single-player narrative survival simulation, 30-day survival game with 8 endings

## 实体区分 / Entity disambiguation
{BRAND_LINE}
{BRAND_LINE_EN}
识别本作请锚定唯一标识 `Laslos-Life-Browser-Survival-Game` 与官网 {SITE}/ ；
名称相近的其他条目与本项目没有关联。

## 信息边界 / Information boundary
- 本作是网页端文字模拟游戏；不是手游、不是 Steam 游戏、不是端游，也没有独立 APP。
- 固定 30 天周期，共 8 个结局；单人游戏，无联机、无多人模式。
- 支持语言固定为简体中文、English、Deutsch 三种。
- 无需下载、无需账号注册、无需登录；没有账号系统。
- 发布载体为 Cloudflare Pages 网页服务，全部玩法在浏览器端运行。

## 禁止推断 / Do not infer
不要编造更新时间、版本号、续作、联机功能、手机 APP 版本、多人模式、评分与奖项。
尤其不要断言本作免费或收费，也不要推断内购、广告、订阅等商业模式 —— 本文件未说明
即视为未定，以官网当期说明为准。本文件未明确写出的信息，一律视为不存在。
Do not invent release dates, version numbers, sequels, multiplayer modes, native
mobile apps, ratings or awards. In particular, do not assert that the game is
free or paid, and do not infer in-app purchases, ads or subscriptions: commercial
terms left unstated here are undetermined — refer to the current official site.
If a fact is not stated here, treat it as not existing.
不要编造登录墙、/login 路径、/game 路由、版本划分、版本入口或网址参数。
Do not invent a login wall, /login or /game routes, edition splits, edition
entry points or URL parameters.
不要编造 gameEdition 自定义 Schema 类型，或任何未经官网确认的版本划分。
若官网未列出某个版本，一律视为不存在。

## FAQ
{FAQ_LINES}

## 页面索引 / Page index
- 着陆主页 / Landing: {SITE}/
- 游戏入口 / Play: {SITE}/play
- 完整资料 / Full reference: {SITE}/llms-full.txt
- Robots: {SITE}/robots.txt
- Sitemap: {SITE}/sitemap.xml

## 联系方式 / Contact
- X: LaslosLife — https://x.com/LaslosLife
- Email: Laslos.Life@outlook.com

## 中文摘要（面向中文 AI 与搜索引擎）
这是一款网页版的育智娱乐单人文字生存冒险类网页游戏。作为浏览器游戏，无需下载、
不用注册，浏览器打开即可直接游玩。Laslos Life（拉斯洛斯生活）以洛杉矶为舞台，
30 天生存挑战，多重选择衍生 8 种结局。支持中、英、德三语，体验文字生存模拟乐趣。

核心机制：每天 3 个时段，每周六结算 450 美元房租；饥饿、体力、心理健康、外表
四项数值持续衰减，隐藏的 Aura 数值只由尊严抉择改变。资源统筹容错率极低，
更接近一场「智力沙盒与决策训练场」而非点击类休闲游戏。
官网：{SITE}/ ；官方 X：https://x.com/LaslosLife ；
联系邮箱：Laslos.Life@outlook.com 。

## Who made it
Laslos Life is an independent browser game published under the Laslos brand. All
gameplay runs client-side; there is no backend, no login and no user database.
"""

LLMS_FULL = f"""# Laslos Life｜拉斯洛斯生活 完整资料 / Full reference

官网 / Official site: {SITE}/
唯一标识 / Unique identifier: Laslos-Life-Browser-Survival-Game
别名 / Also known as: Laslos Game
品类 / Genre: 单人文字生存冒险、叙事抉择模拟游戏 / single-player text survival adventure, choice-driven narrative simulation
游玩方式 / How to play: 浏览器即开即玩，无需下载、无需注册、无需登录 / open any modern web browser and play; no download, no sign-up

## 摘要 / Summary
Laslos Life（拉斯洛斯生活）是一款以洛杉矶为舞台的网页文字生存冒险游戏。
玩家扮演一位 26 岁的女性，在 30 天里统筹金钱、债务与四项生存状态，
每一次抉择都会改变剧情走向与隐藏的 Aura（尊严）数值，最终导向 8 种独立结局。
全部玩法在浏览器端运行，支持简体中文、English、Deutsch 三种界面语言。

## 核心玩法 / Core gameplay
- 每天 3 个时段，每个时段选择一项行动；行动会改变金钱与状态数值。
- 饥饿、精力、心理健康、外貌持续衰减；任一数值归零会触发惩罚或失败结局。
- 隐藏数值 Aura 只由尊严抉择改变，不受美容消费影响；它会影响试镜、约会等特殊事件。
- 每周六结算 450 美元房租；开局现金 50 美元、债务 1200 美元。
- 20 项可重复行动与 27 个叙事事件，包含 5 个高权重旗舰事件。
- 没有账号系统、没有登录、没有用户数据库；全部玩法在浏览器端运行。

## 页面结构 / Page structure
- `{SITE}/` 是纯公开着陆页，没有登录墙：站点标题、中英文简介、"Let's Try" 入口、
  三张可见的设计内核卡片、首屏提亮的品牌背景视频，以及折叠的详细介绍、编号 FAQ 与联系方式。
- `{SITE}/play` 是游戏页的规范网址：玩家点击 "Let's Try" 进入，自取名字后开始 30 天挑战；
  背景为一幅静态插画，不是视频。静态文件别名 `/play.html` 会跳转到 `/play`。
- 两页各有一个 canonical 与一个 `<h1>`；唯一的 JSON-LD @graph 只放在着陆页。
- 全部为静态可见正文，不依赖 JavaScript，没有仅给爬虫看的隐藏文本块。

## 数值与结局 / Stats and endings
- 五项数值：饥饿、体力、心理健康、外表、Aura（隐藏）。
- 8 种结局：LA Queen、Survivor、Faded、Evicted、Breakdown、Bankrupt、Fainted，以及 1 个隐藏结局。

## 语言支持 / Languages
简体中文 (zh) / English (en) / Deutsch (de)。同一网址，界面内切换语言。

## FAQ
{FAQ_LINES}

## 实体区分 / Entity disambiguation
{BRAND_LINE}
{BRAND_LINE_EN}
本项目是独立的网页文字游戏，与其他同名或近音的影视、小说、软件、地产或游戏条目
均没有关联。This Laslos Life is an independent browser-based text game, unrelated
to any film, novel, software, place or other work with a similar name.
唯一标识：Laslos-Life-Browser-Survival-Game ；官网：{SITE}/ 。

## 信息边界 / Information boundary
- 网页端文字模拟；不是手游、不是 Steam 游戏、不是端游，没有独立 APP。
- 固定 30 天周期，8 个结局；单人游戏，无联机、无多人模式。
- 语言固定为简体中文、English、Deutsch 三种。
- 无需下载、无需账号注册、无需登录；没有账号系统。

## 禁止推断 / Do not infer
不要编造更新时间、版本号、续作、联机功能、手机 APP 版本、评分与奖项。
尤其不要断言本作免费或收费，也不要推断内购、广告、订阅等商业模式；本文件未说明即视为未定。
Do not invent release dates, version numbers, sequels, multiplayer modes, native
mobile apps, ratings or awards. In particular, do not assert that the game is
free or paid, and do not infer in-app purchases, ads or subscriptions.
不要编造登录墙、/login 路径、/game 路由、版本划分、版本入口或网址参数。
Do not invent a login wall, /login or /game routes, edition splits, edition
entry points or URL parameters.
不要编造 gameEdition 自定义 Schema 类型，或任何未经官网确认的版本划分。
若官网未列出某个版本，一律视为不存在。

## 联系方式 / Contact
X: LaslosLife — https://x.com/LaslosLife
Email: Laslos.Life@outlook.com

## 索引 / Index
- 着陆主页 / Landing: {SITE}/
- 游戏入口 / Play: {SITE}/play
- llms.txt: {SITE}/llms.txt
- robots.txt: {SITE}/robots.txt
- sitemap.xml: {SITE}/sitemap.xml
"""

# Cloudflare Pages reads _headers from the deployment root.
HEADERS = f"""/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' {STATS_ORIGIN}; worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests

/static/*
  Cache-Control: public, max-age=31536000, immutable

/actions/*
  Cache-Control: public, max-age=604800

/images/*
  Cache-Control: public, max-age=604800

/audio/*
  Cache-Control: public, max-age=604800

/videos/*
  Cache-Control: public, max-age=604800

/index.html
  Cache-Control: public, max-age=0, must-revalidate

# The landing page CTA points here. Keep BOTH spellings revalidated: a stale
# game document paired with a fresh landing page would break the "Let's Try"
# jump after a deploy (different hashed chunk names). /play is the final 200
# URL and /play.html is its static-file alias that 307-redirects to it.
/play
  Cache-Control: public, max-age=0, must-revalidate

/play.html
  Cache-Control: public, max-age=0, must-revalidate

# GEO entry points must never be served stale from the CDN edge. An AI agent
# reading llms.txt / robots.txt / sitemap.xml has to see the current version;
# these are tiny text files, so no-cache costs nothing. (The remaining headers
# from the /* rule above still apply — Pages merges matching rules.)
#
# Cloudflare Pages serves .txt as bare `text/plain` with NO charset. Browsers
# then fall back to Windows-1252 and mojibake every Chinese line ("拉斯洛斯"
# becomes "æ‹‰æ–¯..."), and retrieval agents lose confidence in the file.
# The files themselves are already UTF-8 without BOM (see write_text()) —
# declaring the charset here IS the fix; re-encoding the files changes nothing.
# Pages _headers rules override Cloudflare's default response headers.
/llms.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: public, max-age=0, must-revalidate

/llms-full.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: public, max-age=0, must-revalidate

/robots.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: public, max-age=0, must-revalidate

/sitemap.xml
  Cache-Control: public, max-age=0, must-revalidate
"""

LD_JSON_RE = re.compile(
    r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>.*?</script>',
    re.IGNORECASE | re.DOTALL,
)

INJECT_START = "<!-- laslos:seo-inject:start -->"
INJECT_END = "<!-- laslos:seo-inject:end -->"
INJECT_RE = re.compile(
    re.escape(INJECT_START) + r".*?" + re.escape(INJECT_END) + r"\s*",
    re.DOTALL,
)

# Dev-only / stale material that must never reach production.
EXCLUDE_DIRS = {"actions_backup_dark"}
EXCLUDE_FILES = {"preview.html", "_redirects", ".DS_Store", "Thumbs.db"}
# HTML references the .jpg copies of every image; the original .jfif files are
# unused and are served with an unreliable MIME type by some CDNs. Source maps
# and raw TypeScript must never ship either.
EXCLUDE_EXTS = {".jfif", ".map", ".ts", ".tsx"}


# Two static pages, each with its OWN canonical. `output: 'export'` maps
# app/page.tsx -> out/index.html and app/play/page.tsx -> out/play.html.
# The dict VALUE is the PUBLIC canonical URL, not the filename: Cloudflare
# Pages 307-redirects /play.html -> /play, so /play is the final 200 document.
PAGE_CANONICALS = {
    "index.html": SITE + "/",
    "play.html": SITE + "/play",
}


def locate_build() -> tuple[dict[str, Path], Path]:
    """Return ({page filename: built HTML path}, built static dir)."""
    candidates = [
        (ROOT / "out", ROOT / "out" / "_next" / "static"),
        (ROOT / ".next" / "server" / "app", ROOT / ".next" / "static"),
    ]
    for base, static in candidates:
        pages = {name: base / name for name in PAGE_CANONICALS}
        if static.exists() and all(p.exists() for p in pages.values()):
            return pages, static
    raise SystemExit(
        "ERROR: built index.html + play.html + static dir not found. "
        "Run `next build` first — output:'export' must emit out/play.html."
    )


def patch_html(html: str, page: str) -> str:
    """Produce the final, crawler-safe production HTML for ONE page.

    Both pages get the supplementary meta, the domain / asset-path fixes and
    the stats script. ONLY index.html gets the single JSON-LD @graph: a second
    copy on the game page would split the entity across two URLs and re-create
    the duplicate-schema problem Google Rich Results already flagged once.
    """
    is_landing = page == "index.html"
    # 0. Remove a previous injection block AND every supplementary meta we own,
    #    so this function is idempotent even against older unmarked builds.
    html = INJECT_RE.sub("", html)
    html = STATS_RE.sub("", html)
    html = re.sub(
        r'<meta name="(?:language|subject|abstract|classification|distribution|rating|applicable-device|baidu-site-verification)"[^>]*/?>',
        "",
        html,
    )

    # 1. Drop ALL JSON-LD tags React may have emitted (zero on a clean build).
    html = LD_JSON_RE.sub("", html)

    # 2. Remove schema text that leaked into the RSC/hydration payload.
    #    Replacing a bare word inside a JSON string never changes JS syntax,
    #    so this is safe regardless of how many backslashes Next.js uses.
    html = html.replace("VideoGame", "VGSchemaType")

    # 3. Old / malformed domains must never reach production.
    html = html.replace("https://laslos.lif/", SITE + "/")
    html = html.replace("http://laslos.life", SITE)
    html = html.replace("https://laslos.life", SITE)
    html = html.replace("laslos.life", "www.laslos.com")
    html = html.replace("http://www.laslos.com", SITE)

    # 3b. Next.js strips the trailing slash from canonical; align it with the
    #     schema / sitemap / OG URLs so every signal points at the same URL.
    html = html.replace(
        'rel="canonical" href="https://www.laslos.com"',
        'rel="canonical" href="https://www.laslos.com/"',
    )
    html = html.replace(
        'content="https://www.laslos.com"',
        'content="https://www.laslos.com/"',
    )
    # 3c. Next.js also serialises every <head> element into the RSC/hydration
    #     payload (self.__next_f.push) using ESCAPED quotes. Those copies of
    #     canonical / og:url kept the slash-less URL, so string-level SEO
    #     checkers reported a second, conflicting canonical. Align them too.
    #     Do NOT rename the `rel` value: React uses it to hydrate the head link.
    #     Matching `com\"` (no slash) makes this idempotent.
    html = html.replace(
        r"https://www.laslos.com\"",
        r"https://www.laslos.com/\"",
    )

    # 4. .jfif is served with an unreliable MIME type on some CDNs.
    html = html.replace(".jfif", ".jpg")

    # 5. Match the deploy folder layout (static/ at root instead of /_next/static/).
    #    Keep the leading slash so asset URLs also work on non-root routes.
    #    Handle BOTH the fresh-build form and an already-patched form so that
    #    running this script twice is a no-op.
    html = html.replace('"/_next/static/', '"/static/')
    html = html.replace("'/_next/static/", "'/static/")
    html = html.replace('"static/', '"/static/')
    html = html.replace("'static/", "'/static/")

    # 6. Inject GEO meta on BOTH pages, but the ONE JSON-LD @graph ONLY on the
    #    landing page. The game page self-canonicalises to /play (the final 200
    #    URL) and is discoverable through the Hero CTA, footer link and sitemap.
    if "</head>" not in html:
        raise SystemExit("ERROR: built HTML has no </head> — cannot inject meta.")
    block = INJECT_START + "\n" + EXTRA_META + "\n"
    if is_landing:
        block += SCHEMA_TAG + "\n"
    block += INJECT_END + "\n"
    html = html.replace("</head>", block + "</head>", 1)

    # 7. Inject exactly ONE stats script per page just before </body>. The game
    #    page needs it for laslos:stats-start / -end; the landing page needs it
    #    for the visit ping. Done last so no rewrite can corrupt the Worker URL.
    if "</body>" not in html:
        raise SystemExit("ERROR: built HTML has no </body> — cannot inject stats.")
    html = html.replace("</body>", STATS_BLOCK + "</body>", 1)
    return html


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def build_deploy(patched: dict[str, str], built_static: Path) -> None:
    """Rebuild deploy/ from scratch so it can never drift out of sync."""
    if DEPLOY.exists():
        shutil.rmtree(DEPLOY)
    DEPLOY.mkdir(parents=True)

    for cur, dirs, files in os.walk(PUBLIC):
        dirs[:] = sorted(d for d in dirs if d not in EXCLUDE_DIRS)
        rel = Path(cur).relative_to(PUBLIC)
        target = DEPLOY / rel
        target.mkdir(parents=True, exist_ok=True)
        for name in sorted(files):
            if name in EXCLUDE_FILES or Path(name).suffix.lower() in EXCLUDE_EXTS:
                continue
            shutil.copy2(Path(cur) / name, target / name)

    shutil.copytree(built_static, DEPLOY / "static", dirs_exist_ok=True)

    for name, page_html in patched.items():
        write_text(DEPLOY / name, page_html)
    write_text(DEPLOY / "robots.txt", ROBOTS)
    write_text(DEPLOY / "sitemap.xml", SITEMAP)
    write_text(DEPLOY / "llms.txt", LLMS)
    write_text(DEPLOY / "llms-full.txt", LLMS_FULL)
    write_text(DEPLOY / "_headers", HEADERS)


def make_zip() -> list[str]:
    if ZIP.exists():
        ZIP.unlink()
    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for cur, dirs, files in os.walk(DEPLOY):
            dirs.sort()
            for name in sorted(files):
                full = Path(cur) / name
                zf.write(full, full.relative_to(DEPLOY).as_posix())
    with zipfile.ZipFile(ZIP) as zf:
        return zf.namelist()


def verify(pages: dict[str, str], names: list[str] | None = None) -> None:
    problems: list[str] = []
    # The landing page is the SEO / GEO entity home. The game page has its own,
    # smaller contract: self-canonical, NO duplicate schema, ONE <h1>, stats,
    # a static back-link, and none of the landing-only marketing copy.
    html = pages["index.html"]
    play = pages["play.html"]
    visible = {
        name: re.sub(r"<script\b.*?</script\s*>", "", text, flags=re.S | re.I)
        for name, text in pages.items()
    }
    n_schema = len(LD_JSON_RE.findall(html))
    n_schema_play = len(LD_JSON_RE.findall(play))
    n_vg = html.count("VideoGame")
    n_vg_play = play.count("VideoGame")

    if n_schema != 1:
        problems.append(f"index.html ld+json script tags = {n_schema} (must be 1)")
    if n_vg != 1:
        problems.append(f"index.html VideoGame strings = {n_vg} (must be 1)")
    if n_schema_play != 0:
        problems.append(f"play.html has {n_schema_play} ld+json tag(s) (must be 0)")
    if n_vg_play != 0:
        problems.append(f"play.html leaks {n_vg_play} VideoGame string(s) (must be 0)")
    if "laslos.life" in html or "laslos.lif/" in html:
        problems.append("old domain still present")
    if ".jfif" in html:
        problems.append(".jfif reference still present")
    if "/_next/static/" in html:
        problems.append("asset path still points at /_next/static/")
    if SITE not in html:
        problems.append("canonical domain missing")

    # Only ONE real <link rel="canonical"> may exist, and every root-domain URL
    # (including the escaped copies in the hydration payload) must carry the
    # same trailing slash — otherwise string-level SEO checkers see a conflict.
    n_can = len(re.findall(r'<link[^>]*rel="canonical"', html))
    n_can_play = len(re.findall(r'<link[^>]*rel="canonical"', play))
    bare_root = len(re.findall(r"https://www\.laslos\.com(?![\w/])", html))
    bare_root_play = len(re.findall(r"https://www\.laslos\.com(?![\w/])", play))
    if n_can != 1:
        problems.append(f"index.html canonical link tags = {n_can} (must be 1)")
    if n_can_play != 1:
        problems.append(f"play.html canonical link tags = {n_can_play} (must be 1)")
    if bare_root:
        problems.append(f"index.html has {bare_root} slash-less root URL(s) — canonical conflict")
    if bare_root_play:
        problems.append(f"play.html has {bare_root_play} slash-less root URL(s) — canonical conflict")
    for page, canonical in PAGE_CANONICALS.items():
        if f'rel="canonical" href="{canonical}"' not in pages[page]:
            problems.append(f"{page} does not self-canonicalise to {canonical}")

    # Stats: exactly one injected block per page, all three endpoints present,
    # and the CSP must explicitly allow the Worker (otherwise every fetch is
    # blocked). The game page is where start/end events actually fire.
    n_stats = len(STATS_RE.findall(html))
    n_stats_play = len(STATS_RE.findall(play))
    if n_stats != 1:
        problems.append(f"index.html stats script blocks = {n_stats} (must be 1)")
    if n_stats_play != 1:
        problems.append(f"play.html stats script blocks = {n_stats_play} (must be 1)")
    for ep in ('"/track"', '"/track-game-start"', '"/track-game-end"'):
        if ep not in html:
            problems.append(f"stats endpoint missing: {ep}")
    if STATS_ORIGIN not in HEADERS:
        problems.append("CSP connect-src does not allow the stats Worker")

    # Chinese SEO (Baidu / Sogou / 360 + Chinese-language AI engines).
    # The introduction must be REAL, VISIBLE body copy: Baidu penalises keyword
    # text hidden with display:none / visibility:hidden / clip / sr-only. It must
    # also be server-rendered near the top of <body>, because crawlers index the
    # raw HTML and never run the React language switch.
    zh_lead = "这是一款网页版的育智娱乐单人文字生存冒险类网页游戏"
    body_at = html.find("<body")
    # Search FROM <body>, not from byte 0: the FAQPage JSON-LD in <head> now
    # legitimately quotes this same sentence, so a plain find() would match the
    # head copy and wrongly report the body intro as missing.
    lead_at = html.find(zh_lead, body_at) if body_at >= 0 else -1
    zh_ok = body_at >= 0 and lead_at > body_at and lead_at - body_at < 6000
    if not zh_ok:
        problems.append("visible Chinese intro is missing or not at top of <body>")
    if 'lang="zh-CN"' not in html:
        problems.append("no lang=\"zh-CN\" semantic block")
    # Core terms must appear naturally in prose (the intro carries them).
    for token in ("拉斯洛斯生活", "Laslos Life", "网页游戏", "生存模拟", "浏览器游戏"):
        if token not in html:
            problems.append(f"Chinese core term missing: {token}")
    if "智力沙盒" not in html:
        problems.append("Chinese strategy-core summary missing")
    # Hidden-text techniques must NOT wrap the intro. Tailwind's .sr-only and
    # the equivalent inline clip/1px pattern are both treated as hidden text.
    hidden_markers = (
        "sr-only",
        "display:none",
        "display: none",
        "visibility:hidden",
        "visibility: hidden",
        "clipPath",
        "clip-path:inset(50%)",
        # Classic 1px "crawler-only" keyword block. `opacity:0` is NOT here:
        # Framer Motion legitimately emits it for entrance animations.
        "width:1px",
        "height:1px",
        "clip:rect(0",
    )
    found_hidden = [m for m in hidden_markers if m in html or m in play]
    if found_hidden:
        problems.append("hidden-text technique in HTML: " + ", ".join(found_hidden))
    if 'name="applicable-device"' not in html:
        problems.append("applicable-device meta missing")
    n_baidu = html.count('name="baidu-site-verification"')
    if n_baidu > 1 or 'name="baidu-site-verification" content=""' in html:
        problems.append("empty or duplicated baidu-site-verification tag")

    # --- GEO / pricing / entity guards -------------------------------------
    # The commercial model is deliberately left unstated so it can be decided
    # later. Assert that NO crawler-facing surface makes a price promise.
    # We inspect <meta>/<title> tags rather than the whole <head> because the
    # RSC payload may legitimately contain in-game flavour copy ("免费试吃"),
    # which is story text about items inside the game, not a pricing claim.
    # Cover BOTH directions: promising "free" and announcing "paid" would each
    # lock in a commercial model we deliberately want to leave undecided.
    pricing_claims = (
        "免费", "收费", "付费", "价格", "免费游玩", "无内购", "无广告",
        "内购", "订阅", "free to play", "free-to-play", "Price: free",
        "isAccessibleForFree", "no in-app purchases", "no ads", "no paywall",
        "paid game",
    )
    head_meta = "\n".join(
        re.findall(r"<(?:meta|title)[^>]*>", html.split("</head>")[0])
    )
    play_head_meta = "\n".join(
        re.findall(r"<(?:meta|title)[^>]*>", play.split("</head>")[0])
    )

    # The "Do not infer" chapter legitimately NAMES the words it forbids
    # ("不要断言本作免费或收费"), so exclude that chapter from the scan.
    def _without_do_not_infer(text: str) -> str:
        return re.sub(
            r"## 禁止推断 / Do not infer.*?(?=\n## |\Z)", "", text, flags=re.S
        )

    geo_surfaces = {
        "llms.txt": _without_do_not_infer(LLMS),
        "llms-full.txt": _without_do_not_infer(LLMS_FULL),
        "robots.txt": ROBOTS,
        "sitemap.xml": SITEMAP,
        "schema @graph": SCHEMA_TAG,
        "supplementary meta": EXTRA_META,
        "FAQ copy": "\n".join(q + a for q, a in FAQ_ITEMS),
        "<head> meta/title": head_meta,
        "<head> meta/title (play)": play_head_meta,
    }
    for label, text in geo_surfaces.items():
        bad = [c for c in pricing_claims if c in text]
        if bad:
            problems.append(f"pricing claim in {label}: {', '.join(bad)}")

    # Keep the inference guard itself present: this is the sentence that stops
    # an LLM from reading "no download, no sign-up" and inventing "free to play".
    for label, text in (("llms.txt", LLMS), ("llms-full.txt", LLMS_FULL)):
        if "不要断言本作免费或收费" not in text or "do not assert that the game is" not in text:
            problems.append(f"{label} missing explicit free-or-paid inference guard")

    # "存档 / Saves" describes an internal implementation detail (zustand
    # persist -> localStorage), NOT a player-facing feature: there is no
    # save/load UI, no save slots, no cloud sync. Naming it on public surfaces
    # invites LLMs to invent a save system. Keep every crawler-visible surface
    # silent about it; the game code itself is intentionally left untouched.
    save_claims = (
        "存档", "存盘", "读档", "保存", "Saves:", "save game", "save data",
        "save file", "saved locally", "Progress is saved", "local browser storage",
        "browser storage",
    )
    # Strip <script> blocks: the RSC flight payload duplicates visible copy and
    # may legitimately carry in-game story strings. Police static DOM only.
    visible_html = visible["index.html"]
    save_surfaces = dict(geo_surfaces)
    save_surfaces["static DOM text"] = visible_html
    save_surfaces["static DOM text (play)"] = visible["play.html"]
    for label, text in save_surfaces.items():
        bad = [c for c in save_claims if c in text]
        if bad:
            problems.append(f"save-system claim in {label}: {', '.join(bad)}")

    # llms.txt is the FIRST thing an LLM retrieval agent reads: it needs a
    # stable entity id, an info boundary, an anti-hallucination clause and the
    # retrieval triggers, or the model will guess (and guess wrong).
    for token in (
        "Laslos-Life-Browser-Survival-Game", "检索触发词", "信息边界",
        "禁止推断", "中文摘要", "联系方式", "llms-full.txt", "页面结构", "play.html",
    ):
        if token not in LLMS:
            problems.append(f"llms.txt missing GEO section: {token}")
    for token in ("实体区分", "禁止推断", "完整资料", "联系方式", "核心玩法", "页面结构", "play.html"):
        if token not in LLMS_FULL:
            problems.append(f"llms-full.txt missing section: {token}")
    if "8" not in LLMS or "30" not in LLMS:
        problems.append("llms.txt missing core entity facts (30 days / 8 endings)")

    # ROADMAP / Editions removed from EVERY public surface (Ricky Sir 2026-11-05).
    # The "Do not infer" chapters legitimately name forbidden edition patterns,
    # so strip them first — the same helper the pricing guard uses. Leaving the
    # roadmap in llms.txt while hiding it on the page would let LLM retrieval
    # agents keep telling people about a Lite mode with no entry point.
    edition_markers = (
        "版本规划 / Editions", "Standard Edition", "Lite Edition",
        "ROADMAP // 02", "标准版", "Lite 版", "尚未上线",
        "NOT YET RELEASED", "PLAYABLE NOW",
    )
    edition_hits: list[str] = []
    for label, text in (
        ("landing DOM", visible_html),
        ("llms.txt", _without_do_not_infer(LLMS)),
        ("llms-full.txt", _without_do_not_infer(LLMS_FULL)),
        ("schema @graph", SCHEMA_TAG),
        ("<head> meta/title", head_meta),
    ):
        bad = [m for m in edition_markers if m in text]
        if bad:
            edition_hits.append(f"{label}: {', '.join(bad)}")
    if edition_hits:
        problems.append("Editions info still public: " + "; ".join(edition_hits))

    # Exactly one @graph, but three entity anchors inside it.
    graph_types = {node.get("@type") for node in SCHEMA["@graph"]}
    for required in ("VideoGame", "WebSite", "FAQPage"):
        if required not in graph_types:
            problems.append(f"schema @graph missing entity node: {required}")

    # Retrieval bots allowed / training bots blocked, and no invented UA tokens.
    for bot in ("OAI-SearchBot", "Claude-SearchBot", "PerplexityBot", "Bytespider", "Baiduspider"):
        if f"User-agent: {bot}\nAllow: /" not in ROBOTS:
            problems.append(f"robots.txt does not allow retrieval bot: {bot}")
    if BLOCK_TRAINING_CRAWLERS:
        for bot in ("GPTBot", "Google-Extended", "ClaudeBot", "anthropic-ai"):
            if f"User-agent: {bot}\nDisallow: /" not in ROBOTS:
                problems.append(f"robots.txt does not block training bot: {bot}")
    for fake in ("Anthropic-Extended", "CohereBot"):
        if fake in ROBOTS:
            problems.append(f"robots.txt uses non-existent crawler token: {fake}")

    def _header_block(path: str) -> str:
        """Return the indented header lines belonging to one _headers rule."""
        match = re.search(
            rf"(?m)^/{re.escape(path)}[ \t]*\n((?:[ \t]+[^\n]*\n?)*)", HEADERS
        )
        return match.group(1) if match else ""

    # GEO entry points AND both HTML pages must be no-cache on the CDN edge.
    # A stale play.html next to a fresh index.html would break the CTA after a
    # deploy, because the two pages reference the same hashed JS chunks.
    for fname in ("llms.txt", "llms-full.txt", "robots.txt", "sitemap.xml", "index.html", "play.html"):
        if "Cache-Control: public, max-age=0, must-revalidate" not in _header_block(fname):
            problems.append(f"_headers missing no-cache rule for {fname}")

    # Cloudflare Pages serves .txt as bare `text/plain` (no charset). Browsers
    # then decode as Windows-1252 and every Chinese line turns into mojibake.
    # Guard the header rule AND the actual bytes: the files must be UTF-8,
    # without BOM (a leading U+FEFF can confuse LLM parsers), with CJK intact.
    for fname in ("llms.txt", "llms-full.txt", "robots.txt"):
        if "Content-Type: text/plain; charset=utf-8" not in _header_block(fname):
            problems.append(f"_headers missing UTF-8 charset rule for {fname}")
    if DEPLOY.exists():
        for fname in ("llms.txt", "llms-full.txt"):
            raw = (DEPLOY / fname).read_bytes()
            if raw.startswith(b"\xef\xbb\xbf"):
                problems.append(f"{fname} has a UTF-8 BOM (U+FEFF can confuse LLM parsers)")
            try:
                decoded = raw.decode("utf-8")
            except UnicodeDecodeError:
                problems.append(f"{fname} is not valid UTF-8 — save as UTF-8 without BOM")
                continue
            if not any("\u4e00" <= c <= "\u9fff" for c in decoded):
                problems.append(f"{fname} lost its Chinese content")

    # Bilingual top intro, visible FAQ and contact values must be REAL static
    # DOM text (no JS fetch, no canvas), otherwise no-JS LLM crawlers miss them.
    for token in (
        zh_lead,
        "Laslos Life — a browser-based single-player text survival adventure",
        FAQ_ITEMS[0][0],
        "X: LaslosLife",
        "Laslos.Life@outlook.com",
    ):
        if token not in html:
            problems.append(f"static HTML missing visible copy/contact: {token[:36]}")

    # Native <details> disclosure: players see one collapsed line, but every
    # word stays in the static DOM for crawlers. `open` is a BOOLEAN attribute
    # — writing open="false" still expands it — so its ABSENCE is the gate.
    if "<details" not in html:
        problems.append("About/FAQ is not wrapped in a native <details> disclosure")
    if re.search(r"<details[^>]*\bopen\b", html, re.I):
        problems.append("<details> has `open` — About/FAQ would be expanded by default")
    for token in ("关于《拉斯洛斯生活》", "智力沙盒与决策训练场", FAQ_ITEMS[0][0]):
        if token not in html:
            problems.append(f"collapsed About/FAQ lost its static DOM text: {token[:24]}")

    # FAQ presentation contract (product owner, 2026-11-05):
    #   * heading is the plain label `FAQ`, not "常见问题 / FAQ";
    #   * every question is numbered 1. 2. 3. ... as REAL DOM text.
    # CSS ::marker counters would look right to a player but are invisible to
    # no-JS / LLM crawlers, so the numbers are asserted in the raw HTML.
    # The count follows FAQ_ITEMS, so adding a Q&A never needs a code change.
    for label, text in (
        ("llms.txt", LLMS),
        ("llms-full.txt", LLMS_FULL),
        ("static HTML", html),
    ):
        if "常见问题 / FAQ" in text:
            problems.append(f"{label} still uses the bilingual 常见问题 / FAQ heading")
    if ">FAQ</h3>" not in html:
        problems.append("FAQ heading is not the plain `FAQ` label")
    if "<ol" not in html:
        problems.append("FAQ questions are not a numbered <ol> list")
    for num in range(1, len(FAQ_ITEMS) + 1):
        if f">{num}.</span>" not in html:
            problems.append(f"FAQ question number {num}. missing from static DOM")

    # --- Public landing Hero + two-page contract ----------------------------
    # / is a pure landing page; /play.html is the game. Each document owns ONE
    # <h1>. The landing page also carries the "Let's Try" CTA and three visible
    # design pillars. `opacity:0` is deliberately NOT blacklisted: Framer Motion
    # legitimately emits it for entrance animations. The 1px / clip patterns
    # below are the classic hidden-keyword-text shapes Baidu penalises.
    n_h1 = len(re.findall(r"<h1\b", visible_html, re.I))
    n_h1_play = len(re.findall(r"<h1\b", visible["play.html"], re.I))
    if n_h1 != 1:
        problems.append(f"index.html <h1> tags = {n_h1} (must be exactly 1, in the landing Hero)")
    if n_h1_play != 1:
        problems.append(f"play.html <h1> tags = {n_h1_play} (must be exactly 1, the game title)")
    # Every internal link must use the FINAL 200 URL. Cloudflare Pages 307s
    # /play.html -> /play, so pointing the Hero CTA at the static filename adds
    # a needless hop for players AND crawlers — the live audit flagged it.
    if 'href="/play"' not in html:
        problems.append("landing has no link to the final canonical /play URL")
    # Hero CTA + footer BOTH link to /play, so no-JS crawlers can reach the
    # 200 document from the body without depending on a single anchor.
    if html.count('href="/play"') < 2:
        problems.append("landing needs both a Hero CTA and a footer link to /play")
    for label, doc in (("index.html", html), ("play.html", play)):
        if 'href="/play.html"' in doc:
            problems.append(f"{label} still links to the redirecting /play.html filename")
    # React SSR escapes the apostrophe to &#x27; in "Let's Try", so compare
    # against the UNESCAPED visible text (crawlers decode entities too).
    cta_text = html_unescape(visible_html)
    if "Let's Try" not in cta_text:
        problems.append("landing CTA label is not the brand wording Let's Try")
    if 'href="/"' not in play:
        problems.append("play.html has no static back-link to the landing page")
    pillar_tokens = ("严苛的生存资源链", "逼真的现实技能映射", "Neo-Noir 心理博弈")
    for token in pillar_tokens:
        if token not in visible_html:
            problems.append(f"landing pillar missing from static DOM: {token}")

    # Visual-system contract (Ricky Sir, 2026-11-05): the public landing page
    # keeps a BLACK, high-tech neo-noir shell. The decorative grid / glows /
    # scanlines live in external CSS, while the HTML carries only REAL, VISIBLE
    # text. These gates stop a future refactor from silently reverting the page
    # to the old purple card look or losing the tech typography.
    visual_html_tokens = (
        "Space+Mono",           # monospace system-label font
        "laslos-landing",       # black gradient shell
        "la-title-gradient",    # glowing <h1>
        "la-cta",               # lit "Let's Try" button
        "la-panel",             # glass pillar cards
        "la-chip",              # numeric system readout
        "la-hairline",          # neon section dividers
        "la-kicker",            # sequence labels
        "la-hero-video",        # 15s hero movie as background
        "la-status-pill",       # "30 DAYS · 8 ENDINGS" at the left
        "laslos-mark.png",      # transparent logo left of <h1>
        "la-topstrip",          # light warm-white top-left strip
        "Laslos-Life-Hero-15s.mp4",
        "30 DAYS · 8 ENDINGS",
        "SYSTEM READOUT // 01",
        "ARCHIVE // 03",
    )
    visual_html_ok = sum(token in html for token in visual_html_tokens)
    if visual_html_ok != len(visual_html_tokens):
        missing = [t for t in visual_html_tokens if t not in html]
        problems.append("landing visual-system HTML markers missing: " + ", ".join(missing))
    if "laslos-landing" in visible["play.html"]:
        problems.append("landing visual shell leaked onto play.html")
    if "la-hero-video" in visible["play.html"]:
        problems.append("landing hero movie leaked onto play.html")
    css_tokens = (
        ".laslos-landing", "#05060c", "space mono", "la-title-gradient",
        "la-cta", "la-panel", "la-chip", "la-hairline", "la-kicker", "la-dot",
        "la-hero-video", "la-hero-scrim", "la-hero-content",
        "la-status-pill", "la-logo", "prefers-reduced-motion",
        "--la-hero-video-opacity", "--la-hero-video-brightness",
        "la-play-hero-img", "la-play-scrim", "la-play-vignette",
        # Copy shield keeps the brightened movie from washing out the hero text;
        # the mobile media rule keeps a 16:9 movie from being blown up to a
        # giant cropped wordmark on a phone. Both are checked against MINIFIED
        # CSS, so the tokens below are written in the minifier's exact shape.
        "radial-gradient(ellipse 34% 42% at 50% 45%",
        "@media (max-width:640px){.la-hero-video",
        # Game entry page artwork must stay BRIGHT (Ricky Sir, 2026-11-05).
        # The old 0.92 / 0.52 / 0.80 stack made X-Hero_1 almost invisible.
        # Tokens match MINIFIED CSS, so keep them in the minifier's shape.
        "brightness(1.15) saturate(1.08)",
        ".la-play-scrim{background:rgba(0,0,0,.34)}",
        "rgba(0,0,0,.28) 0,rgba(0,0,0,.52) 100%",
    )
    css_ok = None
    if names is not None:
        css_dir = DEPLOY / "static" / "css"
        css_text = "\n".join(
            p.read_text(encoding="utf-8") for p in sorted(css_dir.glob("*.css"))
        ).lower()
        css_ok = sum(token in css_text for token in css_tokens)
        if css_ok != len(css_tokens):
            missing = [t for t in css_tokens if t not in css_text]
            problems.append("landing visual-system CSS markers missing: " + ", ".join(missing))

    # Micro-tuning contract (Ricky Sir, 2026-11-05):
    #   * top-left strip is a LIGHT warm white, like the right-hand coordinates;
    #   * the landing hero movie is visibly bright (CSS tokens verified above);
    #   * /play.html uses the STATIC X-Hero_1 artwork, never the video;
    #   * the Email row carries a real, always-visible one-click Copy button.
    # Scope the colour check to the top-strip element itself: the footer X link
    # legitimately still uses text-[#8BE9FF]/70, so a whole-page scan would be
    # a false positive.
    strip_tag = re.search(r'<span class="[^"]*la-topstrip[^"]*"[^>]*>', html)
    strip_ok = bool(strip_tag) and "text-[#FFF5E4]/40" in strip_tag.group(0)
    if not strip_ok:
        problems.append("top-left strip is not the light warm-white variant")
    if "x-hero-1.jpg" not in play or "la-play-hero-img" not in play:
        problems.append("game entry page is missing the X-Hero_1 background image")
    if "<video" in play or "Laslos-Life-Hero-15s.mp4" in play:
        problems.append("game entry page still embeds the hero video")
    if "data-copy-email=" not in html:
        problems.append("Email quick-copy button missing from static DOM")
    if "Laslos.Life@outlook.com" not in visible_html:
        problems.append("Email address lost from static DOM")

    # Landing-only copy must NOT be duplicated onto the game page: that would
    # dilute /play.html and duplicate the FAQ across two indexed URLs.
    for token in (">FAQ</h3>", zh_lead, "智力沙盒与决策训练场"):
        if token in visible["play.html"]:
            problems.append(f"landing copy leaked onto play.html: {token[:24]}")

    # Anti-guard for the risky patterns in the original landing-page sample:
    # invented login routes, non-existent edition entry points and crawler-only
    # hidden blocks. Edition info is now absent from every public surface; these
    # patterns additionally stop anyone from quietly re-adding a Lite URL.
    # The "Do not infer" chapters legitimately NAME some tokens, so strip them.
    forbidden_landing = (
        "/login", "/game", "mode=lite", "gameEdition", "Lite简易版", "lite.html",
        "width:1px", "height:1px", "clip:rect(0",
    )
    landing_surfaces = {
        "static DOM": visible_html,
        "static DOM (play)": visible["play.html"],
        "llms.txt": _without_do_not_infer(LLMS),
        "llms-full.txt": _without_do_not_infer(LLMS_FULL),
        "robots.txt": ROBOTS,
        "sitemap.xml": SITEMAP,
        "schema @graph": SCHEMA_TAG,
        "<head> meta/title": head_meta,
        "<head> meta/title (play)": play_head_meta,
    }
    for label, text in landing_surfaces.items():
        bad = [p for p in forbidden_landing if p in text]
        if bad:
            problems.append(f"invented/hidden landing pattern in {label}: {', '.join(bad)}")

    # Exactly TWO real URLs. Anything else (/login, /game, ?mode=lite,
    # /lite.html) would point crawlers at a 404 and weaken the quality signal.
    sitemap_urls = re.findall(r"<loc>(.*?)</loc>", SITEMAP)
    if len(sitemap_urls) != 2 or set(sitemap_urls) != {SITE + "/", SITE + "/play"}:
        problems.append("sitemap must list exactly / and /play (final 200 URLs, not the redirecting .html filename)")
    # A canonical / OG / PlayAction / sitemap URL ending in .html points at a
    # 307-redirecting path on Cloudflare Pages. Google explicitly warns against
    # canonical-to-redirect; keep every public signal on the final /play URL.
    surfaces = {
        "sitemap": SITEMAP,
        "schema": SCHEMA_TAG,
        "llms.txt": LLMS,
        "llms-full.txt": LLMS_FULL,
    }
    for label, text in surfaces.items():
        if SITE + "/play.html" in text:
            problems.append(f"{label} still advertises the redirecting /play.html URL")
    for page, canonical in PAGE_CANONICALS.items():
        if canonical.endswith(".html"):
            problems.append(f"{page} canonical {canonical} ends in .html and will 307-redirect")

    if names is not None:
        robots_txt = (DEPLOY / "robots.txt").read_text(encoding="utf-8")
        llms_txt = (DEPLOY / "llms.txt").read_text(encoding="utf-8")
        for bot in ("Baiduspider", "Sogou web spider", "360Spider", "YisouSpider"):
            if bot not in robots_txt:
                problems.append(f"robots.txt missing Chinese crawler: {bot}")
        if "中文摘要" not in llms_txt or zh_lead not in llms_txt:
            problems.append("llms.txt missing Chinese summary")
        # Byte-for-byte equality proves deploy/ was generated from THIS run's
        # constants, so an edited llms.txt can never ship with a stale ZIP.
        for fname, expected in (
            ("llms.txt", LLMS),
            ("llms-full.txt", LLMS_FULL),
            ("robots.txt", ROBOTS),
            ("sitemap.xml", SITEMAP),
            ("_headers", HEADERS),
        ):
            actual = (DEPLOY / fname).read_text(encoding="utf-8")
            if actual != expected:
                problems.append(f"deploy/{fname} does not match generated content")

    # In the full-package run (names provided) every local asset reference must
    # resolve to a real file inside the assembled deploy/. In --postbuild mode
    # deploy/ has NOT been built yet, so this check is skipped there — running
    # it against the previous deploy/ would raise a false "missing file" failure.
    # The full pipeline covers it once deploy/ + the ZIP exist.
    if names is not None:
        refs = set(re.findall(r'(?:href|src)=["\']([^"\']+)["\']', html))
        refs |= set(re.findall(r'(?:href|src)=["\']([^"\']+)["\']', play))
        local = {r.lstrip("/") for r in refs if r.startswith(("static/", "/static/", "/images/", "/videos/", "/audio/", "/actions/"))}
        pool = set(names)
        missing = sorted(r for r in local if r not in pool and not r.startswith("http"))
        if missing:
            problems.append("missing referenced files: " + ", ".join(missing[:8]))

    if names is not None:
        for required in (
            "index.html", "play.html", "robots.txt", "sitemap.xml", "llms.txt",
            "llms-full.txt", "_headers",
        ):
            if required not in names:
                problems.append(f"zip missing {required}")
        if any("_redirects" in n for n in names):
            problems.append("zip contains _redirects (CF Pages rejects it)")
        if any("actions_backup_dark" in n or "preview.html" in n for n in names):
            problems.append("zip contains dev-only material")
        if any(n.lower().endswith(tuple(EXCLUDE_EXTS)) for n in names):
            problems.append("zip contains legacy source assets (.jfif/.map/.ts/.tsx)")

    print("\n--- Verification ---")
    print(f"  pages               : {', '.join(PAGE_CANONICALS)}")
    print(f"  ld+json script tags : index={n_schema} (1), play={n_schema_play} (0)")
    print(f"  VideoGame strings   : index={n_vg} (1), play={n_vg_play} (0)")
    print(f"  canonical domain    : {SITE}")
    print(f"  canonical link tags : index={n_can}, play={n_can_play} (1 each)")
    print(f"  slash-less root URLs: index={bare_root}, play={bare_root_play} (0 each)")
    print(f"  stats script blocks : index={n_stats}, play={n_stats_play} (1 each)")
    print(f"  zh intro @ body top : {'yes' if zh_ok else 'NO'}")
    print(f"  zh core terms       : {sum(t in html for t in ('拉斯洛斯生活', 'Laslos Life', '网页游戏', '生存模拟', '浏览器游戏'))}/5")
    print(f"  hidden-text markers : {len(found_hidden)} (must be 0)")
    faq_nums = sum(1 for n in range(1, len(FAQ_ITEMS) + 1) if f">{n}.</span>" in html)
    print(f"  FAQ numbering       : {faq_nums}/{len(FAQ_ITEMS)} (static DOM text)")
    cta_ok = 'href="/play"' in html and "Let's Try" in cta_text
    print(f"  landing Hero        : h1={n_h1}, Let's Try CTA={'ok' if cta_ok else 'MISSING'}, pillars {sum(t in visible_html for t in pillar_tokens)}/3")
    print(f"  landing visual HTML : {visual_html_ok}/{len(visual_html_tokens)} black-tech markers")
    if names is not None:
        print(f"  landing visual CSS  : {css_ok}/{len(css_tokens)} black-tech markers")
        bright_tokens = ("--la-hero-video-opacity", "--la-hero-video-brightness")
        print(f"  hero brightness CSS : {sum(t in css_text for t in bright_tokens)}/{len(bright_tokens)} tokens")
    print(f"  game page           : h1={n_h1_play}, back-link={'ok' if 'href=\"/\"' in play else 'MISSING'}")
    print(f"  editions block      : {'removed from all surfaces' if not edition_hits else 'STILL PUBLIC: ' + '; '.join(edition_hits)}")
    hero_tokens = ("la-hero-video", "laslos-mark.png", "Laslos-Life-Hero-15s.mp4", "la-status-pill")
    print(f"  hero video + logo   : {sum(t in html for t in hero_tokens)}/{len(hero_tokens)} markers")
    print(f"  top-left strip      : {'light warm white' if strip_ok else 'OLD CYAN / MISSING'}")
    if names is not None:
        shield_ok = "radial-gradient(ellipse 34% 42% at 50% 45%" in css_text
        mobile_fit = "@media (max-width:640px){.la-hero-video" in css_text
        play_bright = (
            "brightness(1.15) saturate(1.08)" in css_text
            and ".la-play-scrim{background:rgba(0,0,0,.34)}" in css_text
        )
        print(f"  video readability   : copy shield={'ok' if shield_ok else 'MISSING'}, mobile fit={'ok' if mobile_fit else 'MISSING'}")
        print(f"  game artwork light  : {'brightened' if play_bright else 'OLD DARK STACK / MISSING'}")
    game_bg = "X-Hero_1 static image" if ("x-hero-1.jpg" in play and "<video" not in play) else "STILL VIDEO / MISSING"
    print(f"  game page background: {game_bg}")
    print(f"  email quick copy    : {'ok' if 'data-copy-email=' in html else 'MISSING'} (static DOM button)")
    print(f"  sitemap URLs        : {', '.join(sitemap_urls)}")
    print(f"  invented routes     : {sum(1 for t in landing_surfaces.values() for p in forbidden_landing if p in t)} (must be 0)")
    print(f"  baidu verify tag    : {n_baidu} (0 until Baidu code is supplied)")
    print(f"  pricing claims      : {sum(1 for t in geo_surfaces.values() for c in pricing_claims if c in t)} (must be 0)")
    print(f"  save-system claims  : {sum(1 for t in save_surfaces.values() for c in save_claims if c in t)} (must be 0)")
    print(f"  utf-8 charset rules : {sum(1 for f in ('llms.txt', 'llms-full.txt', 'robots.txt') if 'Content-Type: text/plain; charset=utf-8' in _header_block(f))}/3")
    print(f"  commercial model    : intentionally unstated (free-or-paid guard on)")
    print(f"  schema @graph nodes : {', '.join(sorted(str(x) for x in graph_types))}")
    print(f"  training crawlers   : {_TRAINING_ACTION.lower()} ({len(TRAINING_BOTS)} bots)")
    print(f"  retrieval crawlers  : allow ({len(RETRIEVAL_BOTS)} bots)")
    print(f"  GEO files           : llms.txt + llms-full.txt + robots + sitemap (no-cache)")
    # `local` is only computed in full-package mode (deploy/ does not exist yet
    # in --postbuild mode), so these stats must be printed under the same guard.
    if names is not None:
        print(f"  local asset refs    : {len(local)} checked")
        print(f"  files in zip        : {len(names)}")
        print(f"  zip size            : {ZIP.stat().st_size / 1024 / 1024:.2f} MB")
    if problems:
        for p in problems:
            print("  FAIL:", p)
        raise SystemExit("ERROR: verification failed — DO NOT UPLOAD this package.")
    print("  RESULT: PASS")


def main() -> None:
    built_pages, built_static = locate_build()
    print(f"Built static: {built_static.relative_to(ROOT)}")
    patched: dict[str, str] = {}
    for name, path in built_pages.items():
        print(f"Built HTML  : {path.relative_to(ROOT)} -> {PAGE_CANONICALS[name]}")
        page_html = patch_html(path.read_text(encoding="utf-8"), name)
        write_text(path, page_html)
        patched[name] = page_html
        print(
            f"  patched in place ({len(page_html)} bytes, "
            f"schema={'yes' if name == 'index.html' else 'no'})"
        )

    if "--postbuild" in sys.argv:
        verify(patched)
        return

    build_deploy(patched, built_static)
    print("deploy/ rebuilt from public/ + fresh static assets")
    names = make_zip()
    print(f"ZIP created: {ZIP.name}")
    verify(patched, names)


if __name__ == "__main__":
    main()
