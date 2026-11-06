/**
 * Secure localStorage for Laslos Life
 *
 * Uses XOR obfuscation + Base64 encoding to prevent casual
 * tampering of the save data in browser DevTools.
 *
 * This is NOT cryptographic security — it's a deterrent against
 * casual cheating. Hardcore reverse-engineers can still break it.
 * The real defense is server-side validation (not applicable in
 * this single-player game) and clever design decisions below.
 */

import { createJSONStorage, type StateStorage } from 'zustand/middleware';

const STORAGE_KEY = 'laslos_life_save';
const VERSION_KEY = 'laslos_save_version';

/**
 * Bump this whenever the persisted save shape or its rendered text changes
 * in a way that cannot be migrated in-place.
 *
 * v2 = full i18n migration. Saves written before v2 contain hardcoded Chinese
 * log text and legacy event payloads, which cannot be retro-translated.
 * They are discarded so the player starts from a clean, correctly-localized state.
 *
 * Deliberately NOT bumped to v3 for the 2026-11-05 save-integrity upgrade:
 * the store's onRehydrateStorage() accepts the legacy money/aura/day checksum,
 * supplies defaults for new fields and rewrites the full signature in place.
 * Bumping here would wipe every returning player's progress for no benefit.
 */
export const SAVE_VERSION = 2;

// Lightweight obfuscation key — change this for fun or A/B tests
const OBFUSCATE_KEY = 'LASLOS_NOIR_2026_KEY';

function xorObfuscate(str: string): string {
  // Encode to handle Unicode (Chinese text in logs, etc.)
  const encoded = encodeURIComponent(str);
  let result = '';
  for (let i = 0; i < encoded.length; i++) {
    const charCode = encoded.charCodeAt(i) ^ OBFUSCATE_KEY.charCodeAt(i % OBFUSCATE_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
}

function xorDeobfuscate(base64: string): string {
  try {
    const str = atob(base64);
    let result = '';
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i) ^ OBFUSCATE_KEY.charCodeAt(i % OBFUSCATE_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return decodeURIComponent(result);
  } catch {
    return '';
  }
}

export const secureStorage = createJSONStorage((): StateStorage => ({
  getItem: (_name: string): string | null => {
    // Save-version gate: discard saves written by an incompatible build
    const storedVersion = Number(localStorage.getItem(VERSION_KEY) || '0');
    if (storedVersion < SAVE_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, String(SAVE_VERSION));
      return null;
    }

    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return null;
    const decrypted = xorDeobfuscate(item);
    if (!decrypted) return null;
    return decrypted;
  },

  setItem: (_name: string, value: string): void => {
    const encrypted = xorObfuscate(value);
    localStorage.setItem(STORAGE_KEY, encrypted);
    localStorage.setItem(VERSION_KEY, String(SAVE_VERSION));
  },

  removeItem: (_name: string): void => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(VERSION_KEY, String(SAVE_VERSION));
  },
}));
