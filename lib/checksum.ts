/**
 * Save-integrity signature for Laslos Life.
 *
 * This is NOT cryptographic security — it is a deterrent against casual
 * localStorage editing. Every field that can change the outcome is covered,
 * so editing cash, debt, rent warnings, stats, day or game-over state
 * invalidates the signature. The salt lives in the client bundle, so a
 * determined player can still recompute it; that is acceptable for a
 * single-player browser game.
 */

const SECRET_SALT = 'LASLOS_NOIR_2026_SALT';

export interface ChecksumState {
  money: number;
  debt: number;
  weeklyRent: number;
  day: number;
  timeSlot: string;
  stats: {
    hunger: number;
    energy: number;
    mental: number;
    beauty: number;
    aura: number;
  };
  evictionWarnings: number;
  isHomeless: boolean;
  isGameOver: boolean;
  lastSettledWeek: number;
  hasSignetRing: boolean;
  auraEventsTriggered: number;
  weeklyAuraBlessingUsed: boolean;
  earninUsesToday: number;
  endingId: string | null;
}

function djb2(raw: string): string {
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Current signature (2026-11-05): the old hash only covered money/aura/day,
 * so debt, the other four stats, eviction warnings and isGameOver could be
 * edited in DevTools without ever triggering the tamper penalty.
 */
export function generateChecksum(s: ChecksumState): string {
  const raw = [
    s.money,
    s.debt,
    s.weeklyRent,
    s.day,
    s.timeSlot,
    s.stats.hunger,
    s.stats.energy,
    s.stats.mental,
    s.stats.beauty,
    s.stats.aura,
    s.evictionWarnings,
    s.isHomeless ? 1 : 0,
    s.isGameOver ? 1 : 0,
    s.lastSettledWeek,
    s.hasSignetRing ? 1 : 0,
    s.auraEventsTriggered,
    s.weeklyAuraBlessingUsed ? 1 : 0,
    s.earninUsesToday,
    s.endingId ?? '',
  ].join('|') + '#' + SECRET_SALT;
  return djb2(raw);
}

/**
 * Legacy signature (money/aura/day only). Kept so saves written by older
 * builds still load normally instead of being punished as tampered. Once a
 * legacy save is rehydrated the store rewrites it with the full signature.
 */
export function generateLegacyChecksum(money: number, aura: number, day: number): string {
  return djb2(`cash_${money}#aura_${aura}#day_${day}#${SECRET_SALT}`);
}

export function verifyChecksum(stored: string | undefined, s: ChecksumState): boolean {
  if (!stored) return false;
  return (
    stored === generateChecksum(s) ||
    stored === generateLegacyChecksum(s.money, s.stats.aura, s.day)
  );
}
