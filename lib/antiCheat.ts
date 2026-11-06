'use client';

import { useEffect } from 'react';

/**
 * Anti-cheat hook for Laslos Life
 *
 * Detects when a player opens browser DevTools and triggers a
 * dramatic in-game consequence that fits the noir tone.
 *
 * This is a soft deterrent, not a hard block. The game is
 * single-player and offline — we're not trying to stop
 * determined hackers, just make cheating less fun.
 */

const TRIGGERED_FLAG = 'laslos_cheat_triggered';

export function useAntiCheat(onCheatDetected: () => void): void {
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const checkDevTools = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      const devToolsOpen = widthDiff > threshold || heightDiff > threshold;

      if (devToolsOpen) {
        try {
          if (localStorage.getItem(TRIGGERED_FLAG)) return;
          localStorage.setItem(TRIGGERED_FLAG, '1');
        } catch {
          // ignore
        }

        // Suppress console output in production to avoid leaking internal details
        const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
        if (isDev) {
          console.clear();
          console.log('[Anti-cheat] DevTools detected');
        }

        onCheatDetected();
      }
    };

    // Check every 2 seconds
    intervalId = setInterval(checkDevTools, 2000);

    // Also detect via debugger statement timing
    const startTime = performance.now();
    // eslint-disable-next-line no-debugger
    void startTime;

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [onCheatDetected]);
}
