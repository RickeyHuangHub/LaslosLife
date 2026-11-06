import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AchievementEntry {
  id: string;
  titleKey: string;
  descKey: string;
}

export interface LegacyData {
  totalGames: number;
  endedWith: Record<string, number>;  // endingId -> count
  firstEndingId: string | null;
  unlockedAt: Record<string, number>;  // achievementId -> timestamp
}

const ALL_ACHIEVEMENTS: AchievementEntry[] = [
  { id: 'first_game',       titleKey: 'ach_first_game',        descKey: 'ach_first_game_desc' },
  { id: 'survivor',         titleKey: 'ach_survivor',          descKey: 'ach_survivor_desc' },
  { id: 'la_queen',         titleKey: 'ach_la_queen',          descKey: 'ach_la_queen_desc' },
  { id: 'bankrupt',         titleKey: 'ach_bankrupt',          descKey: 'ach_bankrupt_desc' },
];

interface AchievementState {
  legacy: LegacyData;
  pendingUnlock: string | null;   // achievementId currently showing toast
  clearPending: () => void;
  recordEnding: (endingId: string, stats: { aura: number; money: number }) => void;
  getAllUnlocked: () => AchievementEntry[];
}

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      legacy: {
        totalGames: 0,
        endedWith: {},
        firstEndingId: null,
        unlockedAt: {},
      },
      pendingUnlock: null,

      clearPending: () => set({ pendingUnlock: null }),

      recordEnding: (endingId, stats) => {
        const legacy = get().legacy;
        const total = legacy.totalGames + 1;
        const endedWith = { ...legacy.endedWith };
        endedWith[endingId] = (endedWith[endingId] || 0) + 1;
        const firstEndingId = legacy.firstEndingId ?? endingId;

        // Determine which achievements to unlock
        const newUnlocks: Record<string, number> = { ...legacy.unlockedAt };
        const now = Date.now();

        // First game ever
        if (!newUnlocks['first_game'] && total >= 1) {
          newUnlocks['first_game'] = now;
        }
        // Survivor: survived all 30 days
        if (!newUnlocks['survivor'] && endingId === 'survivor') {
          newUnlocks['survivor'] = now;
        }
        // LA Queen: ended with la_queen
        if (!newUnlocks['la_queen'] && endingId === 'la_queen') {
          newUnlocks['la_queen'] = now;
        }
        // Bankrupt
        if (!newUnlocks['bankrupt'] && endingId === 'bankrupt') {
          newUnlocks['bankrupt'] = now;
        }

        set({
          legacy: { totalGames: total, endedWith, firstEndingId, unlockedAt: newUnlocks },
          // Show toast for any newly unlocked this session
          pendingUnlock: Object.keys(newUnlocks).find(
            k => !legacy.unlockedAt[k]
          ) ?? null,
        });
      },

      getAllUnlocked: () => {
        const unlockedAt = get().legacy.unlockedAt;
        return ALL_ACHIEVEMENTS.filter(a => unlockedAt[a.id]);
      },
    }),
    { name: 'laslos_achievements', version: 1 }
  )
);
