/**
 * Repeat-action caps — the "上限开关" for issues #3 / #4.
 *
 * IMPORTANT: this file is a STRUCTURAL switch only. It limits HOW OFTEN an
 * action may be repeated. It deliberately does NOT change any existing
 * balance number: EarnIn still gives $200 for a $230 debt, Venice sunset
 * still gives +10 mental / -5 beauty / +2 Aura, rent, decay and thresholds
 * are all untouched.
 *
 * Flip REPEAT_CAPS_ENABLED to false to restore the original unlimited
 * behaviour instantly (e.g. while balance tuning is being discussed).
 * All the knobs live here — no store / action logic needs editing.
 */

export const REPEAT_CAPS_ENABLED = true;

/** EarnIn cash advances allowed per in-game day (was unlimited). */
export const EARNIN_DAILY_CAP = 1;

/**
 * Venice sunset Aura blessings allowed per rent week (was unlimited).
 * Backed by the existing `weeklyAuraBlessingUsed` flag, which used to be
 * dead code, so the switch is 1/week by construction. Keep it at 1; to
 * allow more, replace that boolean with a counter reset each settlement.
 */
export const VENICE_WEEKLY_AURA_CAP = 1;

export interface CapState {
  earninUsesToday: number;
  weeklyAuraBlessingUsed: boolean;
}

/** Hard-block check used by both the store (defence) and ActionHub (UI). */
export function isRepeatCapped(actionId: string, s: CapState): boolean {
  if (!REPEAT_CAPS_ENABLED) return false;
  if (actionId === 'earnin_advance') return s.earninUsesToday >= EARNIN_DAILY_CAP;
  // Venice sunset is never hard-disabled: it still restores mental.
  // Only its Aura blessing is capped.
  return false;
}

/** Whether the +Aura monologue may fire. */
export function auraBlessingAvailable(s: {
  stats: { aura: number };
  weeklyAuraBlessingUsed: boolean;
}): boolean {
  if (s.stats.aura < 60) return false;
  if (!REPEAT_CAPS_ENABLED) return true;
  return !s.weeklyAuraBlessingUsed && VENICE_WEEKLY_AURA_CAP >= 1;
}
