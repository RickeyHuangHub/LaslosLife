/**
 * Analytics module for Laslos Life
 * Supports Cloudflare Web Analytics (page views) + custom event tracking
 */

export type AnalyticsEvent =
  | 'game_start'           // Player starts a new game
  | 'game_end'             // Player finishes a game
  | 'action_performed'     // Player takes an action
  | 'event_triggered'      // An event occurs
  | 'ending_unlocked'      // Player unlocks an ending
  | 'pageview';            // Page view (backup for CF Web Analytics)

interface AnalyticData {
  eventName: AnalyticsEvent;
  properties?: Record<string, string | number>;
}

// Simple beacon-based tracking (works without external libraries)
function trackBeacon(data: AnalyticData): void {
  try {
    // This is a purely static site (no server route). Sending to /_analytics
    // would produce a 404 on every page load and every action. Only send when
    // an endpoint has been explicitly configured (e.g. a Worker / Zaraz URL).
    const endpoint =
      typeof window !== 'undefined'
        ? (window as unknown as { __LASLOS_ANALYTICS_ENDPOINT__?: string })
            .__LASLOS_ANALYTICS_ENDPOINT__
        : undefined;
    if (!endpoint) return;

    const payload = JSON.stringify({
      ...data,
      ts: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      lang: typeof document !== 'undefined' ? document.documentElement.lang : 'en',
    });

    // Use sendBeacon for reliable post-on-page-unload
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
    } else {
      // Fallback: fetch with keepalive
      fetch(endpoint, {
        method: 'POST',
        body: payload,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    // Silently fail — analytics should never break the game
  }
}

/**
 * Cloudflare Worker usage counters.
 * The actual fetch calls live in ONE static inline script injected by
 * scripts/postbuild.py (the single source of truth). This module only emits
 * semantic events, so every "new game" path and every ending branch is counted
 * automatically — no DOM ids, no button selectors, no hydration timing issues.
 * Page visits are counted by that static script on first HTML parse, so
 * analytics.pageview() intentionally does NOT emit a second visit.
 */
function emitStatsEvent(name: 'laslos:stats-start' | 'laslos:stats-end'): void {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(name));
    }
  } catch {
    // Stats must never break gameplay.
  }
}

// Public API
export const analytics = {
  pageview: () => {
    // Cloudflare Web Analytics auto-tracks pageviews via their script tag
    // This is a backup for custom tracking. The visit counter is handled by
    // the static script — do not add a stats event here (it would double count).
    trackBeacon({ eventName: 'pageview' });
  },

  gameStart: (name: string) => {
    emitStatsEvent('laslos:stats-start');
    trackBeacon({
      eventName: 'game_start',
      properties: { name, lang: typeof document !== 'undefined' ? document.documentElement.lang : 'en' },
    });
  },

  gameEnd: (endingId: string, stats: { aura: number; money: number; day: number }) => {
    emitStatsEvent('laslos:stats-end');
    trackBeacon({
      eventName: 'game_end',
      properties: {
        endingId,
        aura: String(stats.aura),
        money: String(stats.money),
        day: String(stats.day),
      },
    });
  },

  action: (actionId: string) => {
    trackBeacon({
      eventName: 'action_performed',
      properties: { actionId },
    });
  },

  event: (eventId: string) => {
    trackBeacon({
      eventName: 'event_triggered',
      properties: { eventId },
    });
  },

  endingUnlocked: (endingId: string) => {
    trackBeacon({
      eventName: 'ending_unlocked',
      properties: { endingId },
    });
  },
};

// Track page view on module load (SSR-safe)
if (typeof window !== 'undefined') {
  analytics.pageview();
}
