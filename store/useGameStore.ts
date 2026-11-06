import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameStore, GameState, Stats, ChoiceEffect, EventLogItem, TimeSlot } from '@/app/types';
import { ACTIONS } from '@/data/actions';
import { isRepeatCapped, auraBlessingAvailable } from '@/data/limits';
import { LA_EVENTS, getAvailableEvents, rollEvent } from '@/data/events';
import { getEnding, ENDINGS } from '@/data/endings';
import { clamp } from '@/lib/utils';
import { STRINGS, type Lang } from '@/lib/i18n';
import { secureStorage } from '@/lib/secureStorage';
import { generateChecksum, generateLegacyChecksum, verifyChecksum } from '@/lib/checksum';
import {
  playSound,
  startAmbient,
  onActionPerform,
  onEventTrigger,
  onAuraChange,
  onRentDue,
  onEviction,
  onEnding,
} from '@/lib/audio';
import { useAchievementStore } from '@/store/useAchievementStore';
import { analytics } from '@/lib/analytics';

const ENDINGS_FALLBACK = ENDINGS.find((e) => e.id === 'bankrupt') ?? {
  id: 'bankrupt',
  title: 'Bankrupt',
  emoji: '💸',
  condition: () => false,
  text: 'She went under. The city kept moving.',
};

const INITIAL_STATS: Stats = {
  hunger: 65,
  energy: 70,
  mental: 55,
  beauty: 45,
  aura: 70,
};

const INITIAL_STATE: Omit<GameState, 'phase' | 'playerName'> = {
  money: 50,
  debt: 0,
  weeklyRent: 450,
  stats: { ...INITIAL_STATS },
  day: 1,
  timeSlot: 'morning',
  hasSignetRing: true,
  currentEvent: null,
  logs: [],
  isGameOver: false,
  endingId: null,
  endingReason: null,
  hustleStreak: {},
  auraEventsTriggered: 0,
  evictionWarnings: 0,
  isHomeless: false,
  weeklyAuraBlessingUsed: false,
  earninUsesToday: 0,
  lastSettledWeek: 0,
  checksum: '',
};

/**
 * Which rent week (1 = day 7, 2 = day 14, ...) has just become due, or null.
 *
 * Rent is settled at the END of day 7 / 14 / 21 / 28 (the evening slot).
 * A "lie flat" day can jump over a Saturday entirely (day 6 evening → day 8
 * morning), so a week is also due once the calendar has moved past it.
 * `lastSettledWeek` makes settlement idempotent: a week is charged once only,
 * even if the player reloads or the settlement routine is re-entered.
 */
function rentDueWeek(day: number, slot: TimeSlot, lastSettledWeek: number): number | null {
  const week = Math.floor(day / 7);
  if (week < 1 || week <= lastSettledWeek) return null;
  const saturdayEnded = day > week * 7 || (day === week * 7 && slot === 'evening');
  return saturdayEnded ? week : null;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      phase: 'creation',
      playerName: '',

      createPlayer: (name: string) => {
        set({
          phase: 'playing',
          playerName: name,
          ...INITIAL_STATE,
          stats: { ...INITIAL_STATS },
        });
        analytics.gameStart(name);
      },

      advanceTime: () => {
        const state = get();
        if (state.isGameOver || state.phase !== 'playing') return;

        const slots: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening'];
        const currentIdx = slots.indexOf(state.timeSlot);
        const nextSlot = slots[currentIdx + 1] ?? 'morning';
        let nextDay = state.day;

        if (nextSlot === 'morning') nextDay = state.day + 1;

        // Passive decay per slot
        const decayHunger = -8;
        const decayEnergy = -5;
        const decayMental = state.isHomeless ? -5 : -3;
        const decayBeauty = state.isHomeless ? -8 : -2;

        const updatedStats: Stats = {
          hunger: clamp(state.stats.hunger + decayHunger, 0, 100),
          energy: clamp(state.stats.energy + decayEnergy, 0, 100),
          mental: clamp(state.stats.mental + decayMental, 0, 100),
          beauty: clamp(state.stats.beauty + decayBeauty, 0, 100),
          aura: state.stats.aura, // Aura doesn't decay
        };

        // Threshold effects
        if (updatedStats.hunger < 20) {
          updatedStats.energy = clamp(updatedStats.energy - 5, 0, 100);
          updatedStats.mental = clamp(updatedStats.mental - 5, 0, 100);
        }
        if (updatedStats.energy < 20) {
          // All rewards halved — handled in action execution
        }
        if (updatedStats.mental < 20 && Math.random() < 0.30) {
          // Lie flat — skip a whole day. The log promises rent is still
          // collected, so a skipped Saturday must not become a free week.
          nextDay += 1;
          const lieFlatDueWeek = rentDueWeek(nextDay, 'morning', state.lastSettledWeek);
          set({
            day: nextDay,
            timeSlot: 'morning',
            earninUsesToday: 0, // a skipped day is still a new day
            stats: { ...updatedStats, hunger: clamp(updatedStats.hunger + 5, 0, 100) }, // slight hunger recovery from rest
            logs: [
              {
                id: `lie_flat_${Date.now()}`,
                day: state.day,
                timeSlot: state.timeSlot,
                text: '😶 什么都不想做了……躺平一天。房租照样扣。',
                timestamp: new Date().toLocaleTimeString(),
                logKey: 'log_lie_flat',
              },
              ...state.logs,
            ],
          });
          if (lieFlatDueWeek !== null) get().checkSaturdaySettlement();
          return;
        }

        // Win condition: survive 30 days
        if (nextDay > 30) {
          const ending = getEnding({ ...state, day: nextDay, stats: updatedStats });
          const endingId = ending?.id ?? 'survivor';
          useAchievementStore.getState().recordEnding(endingId, { aura: updatedStats.aura, money: state.money });
          analytics.gameEnd(endingId, { aura: updatedStats.aura, money: state.money, day: nextDay });
          set({
            day: nextDay,
            timeSlot: nextSlot,
            stats: updatedStats,
            isGameOver: true,
            endingId,
            endingReason: ending?.text ?? '',
          });
          return;
        }

        // CRITICAL: commit the clock BEFORE settlement. The old code called
        // checkSaturdaySettlement() and returned without advancing day/slot,
        // so the store stayed on the same Saturday forever and rent was
        // charged again on every single action (a hard soft-lock).
        set({
          day: nextDay,
          timeSlot: nextSlot,
          stats: updatedStats,
          ...(nextSlot === 'morning' ? { earninUsesToday: 0 } : {}),
        });

        const dueWeek = rentDueWeek(nextDay, nextSlot, state.lastSettledWeek);
        if (dueWeek !== null) get().checkSaturdaySettlement();
      },

      performAction: (actionId: string) => {
        const state = get();
        if (state.isGameOver || state.currentEvent) return;

        const action = ACTIONS.find((a) => a.id === actionId);
        if (!action) return;

        // Resolve localized action label without React context
        const lang = (typeof window !== 'undefined'
          ? (localStorage.getItem('laslos_lang') as Lang) || 'en'
          : 'en') as Lang;
        const localizedLabel = STRINGS[lang]?.[`action_${action.id}`] ?? action.label;

        // Repeat-cap switch (#3). Limits frequency only — no amounts change.
        // ActionHub disables the card too; this is the defence-in-depth guard.
        if (isRepeatCapped(action.id, state)) {
          set({
            logs: [
              {
                id: `cap_${Date.now()}`,
                day: state.day,
                timeSlot: state.timeSlot,
                text: `⏳ ${localizedLabel}: daily limit reached`,
                timestamp: new Date().toLocaleTimeString(),
                logKey: 'action_daily_cap',
                logParams: { label: localizedLabel },
              },
              ...state.logs,
            ],
          });
          return;
        }

        // Check cash requirement
        if (action.cost && state.money < action.cost) {
          set({
            logs: [
              {
                id: `warn_${Date.now()}`,
                day: state.day,
                timeSlot: state.timeSlot,
                text: `⚠️ ${localizedLabel}: not enough money`,
                timestamp: new Date().toLocaleTimeString(),
                logKey: 'log_not_enough_money_action',
                logParams: { label: localizedLabel },
              },
              ...state.logs,
            ],
          });
          return;
        }

        // Check energy threshold for rewards
        const energyHalved = state.stats.energy < 20;

        const result = action.execute(state);

        // Apply energy halving to income
        let finalMoney = result.money ?? 0;
        if (energyHalved && finalMoney > 0) {
          finalMoney = Math.round(finalMoney * 0.5);
        }

        // Apply income reduction for low beauty
        if (state.stats.beauty < 20 && finalMoney > 0) {
          finalMoney = Math.round(finalMoney * 0.5);
        }

        const newStats: Stats = {
          ...state.stats,
          ...(result.stats ?? {}),
          aura: clamp(result.stats?.aura ?? state.stats.aura, 0, 100),
          hunger: clamp(result.stats?.hunger ?? state.stats.hunger, 0, 100),
          energy: clamp(result.stats?.energy ?? state.stats.energy, 0, 100),
          mental: clamp(result.stats?.mental ?? state.stats.mental, 0, 100),
          beauty: clamp(result.stats?.beauty ?? state.stats.beauty, 0, 100),
        };

        // Cash can never go negative: an unpaid bill is simply capped at the
        // wallet's contents. Previously a random Uber tow / club tab could
        // leave the player at -$200 with no way to climb back.
        const newMoney = Math.max(0, state.money + finalMoney);
        let newDebt = state.debt;
        if (result.debt !== undefined) {
          if (typeof result.debt === 'number') {
            // debt is a reduction (pay off)
            newDebt = Math.max(0, state.debt - result.debt);
          } else {
            // debt is a new entry (add principal)
            newDebt += result.debt.principal;
          }
        }

        const newHustleStreak = { ...state.hustleStreak };
        if (action.category === 'hustle') {
          newHustleStreak[action.id] = (state.hustleStreak[action.id] || 0) + 1;
        } else {
          // Reset hustle streak when doing non-hustle actions
          if (newHustleStreak[action.id]) delete newHustleStreak[action.id];
        }

        const newLog: EventLogItem = {
          id: `action_${Date.now()}`,
          day: state.day,
          timeSlot: state.timeSlot,
          text: result.logText,
          timestamp: new Date().toLocaleTimeString(),
          logKey: result.logKey,
          logParams: result.logParams,
        };

        // Repeat-cap bookkeeping. Pure counters — no reward/value changes.
        const capUpdates: Partial<GameState> = {};
        if (action.id === 'earnin_advance') {
          capUpdates.earninUsesToday = state.earninUsesToday + 1;
        }
        if (action.id === 'venice_sunset' && auraBlessingAvailable(state)) {
          capUpdates.weeklyAuraBlessingUsed = true;
        }

        // Advance time after action
        set({
          money: newMoney,
          debt: newDebt,
          stats: newStats,
          hustleStreak: newHustleStreak,
          logs: [newLog, ...state.logs],
          ...capUpdates,
        });

        // Audio feedback
        onActionPerform();
        analytics.action(action.id);

        // Check aura change and play sound
        const auraDelta = newStats.aura - state.stats.aura;
        if (auraDelta !== 0) {
          onAuraChange(auraDelta);
        }

        get().advanceTime();

        // Roll for random event (25% base chance, modified by state)
        let eventChance = 0.25;
        const s = get().stats;
        if (s.mental < 30) eventChance += 0.15;
        if (s.hunger < 30) eventChance += 0.10;
        if (state.isHomeless) eventChance += 0.20;

        if (Math.random() < eventChance) {
          const available = getAvailableEvents({
            stats: {
              aura: s.aura,
              beauty: s.beauty,
              mental: s.mental,
              hunger: s.hunger,
              energy: s.energy,
            },
            hustleStreak: get().hustleStreak,
            day: get().day,
            isHomeless: get().isHomeless,
            money: get().money,
            debt: get().debt,
            hasSignetRing: get().hasSignetRing,
          });
          const event = rollEvent(available);
          if (event && event.choices.length > 0) {
            onEventTrigger();
            analytics.event(event.id);
            set({ currentEvent: event });
          }
        }

        // Check for bankruptcy deadlock (money < 0 and no way to recover)
        get().checkBankruptcyDeadlock();
      },

      resolveEventChoice: (choiceIndex: number) => {
        const state = get();
        if (!state.currentEvent) return;

        const choice = state.currentEvent.choices[choiceIndex];
        if (!choice) return;

        const effect: ChoiceEffect = choice.effect;
        const newStats: Stats = {
          aura: clamp(state.stats.aura + (effect.aura ?? 0), 0, 100),
          energy: clamp(state.stats.energy + (effect.energy ?? 0), 0, 100),
          hunger: clamp(state.stats.hunger + (effect.hunger ?? 0), 0, 100),
          mental: clamp(state.stats.mental + (effect.mental ?? 0), 0, 100),
          beauty: clamp(state.stats.beauty + (effect.beauty ?? 0), 0, 100),
        };

        const newMoney = Math.max(0, state.money + (effect.money ?? 0));
        let newDebt = Math.max(0, state.debt + (effect.debt ?? 0));
        const newHasSignetRing = effect.loseRing ? false : state.hasSignetRing;

        const newLog: EventLogItem = {
          id: `event_${Date.now()}`,
          day: state.day,
          timeSlot: state.timeSlot,
          text: choice.log,
          logKey: choice.logKey,
          timestamp: new Date().toLocaleTimeString(),
        };

        // Track aura events for mystery ending
        let newAuraEventsTriggered = state.auraEventsTriggered;
        if (state.currentEvent.id.startsWith('event_old_money') ||
            state.currentEvent.id === 'event_405_traffic' ||
            state.currentEvent.id === 'event_erewhon_smoothie' ||
            state.currentEvent.id === 'event_hinge_crypto_bro' ||
            state.currentEvent.id === 'event_ktown_landlord' ||
            state.currentEvent.id === 'director_notice' ||
            state.currentEvent.id === 'european_mistaken' ||
            state.currentEvent.id === 'old_photo') {
          newAuraEventsTriggered += 1;
        }

        // Audio feedback for event choice
        onEventTrigger();
        analytics.event(state.currentEvent.id);

        // Check aura change from event choice
        const eventAuraDelta = newStats.aura - state.stats.aura;
        if (eventAuraDelta !== 0) {
          onAuraChange(eventAuraDelta);
        }

        set({
          stats: newStats,
          money: newMoney,
          debt: newDebt,
          hasSignetRing: newHasSignetRing,
          auraEventsTriggered: newAuraEventsTriggered,
          currentEvent: null,
          logs: [newLog, ...state.logs],
        });

        // Check game over from event
        const s = get().stats;
        if (s.mental <= 0 || s.energy <= 0 || s.hunger <= 0) {
          const ending = getEnding(get());
          if (ending) {
            onEnding(ending.id === 'la_queen' || ending.id === 'mystery' ? 'win' : 'bad');
            useAchievementStore.getState().recordEnding(ending.id, { aura: s.aura, money: state.money });
            analytics.gameEnd(ending.id, { aura: s.aura, money: state.money, day: state.day });
            set({
              isGameOver: true,
              endingId: ending.id,
              endingReason: ending.text,
            });
          }
        }

        // Check for bankruptcy deadlock after event choice
        get().checkBankruptcyDeadlock();
      },

      checkSaturdaySettlement: () => {
        const state = get();
        // One week, one charge. Mark it BEFORE doing any work so a re-entrant
        // call (reload, repeated action, direct UI call) cannot bill twice.
        const week = Math.floor(state.day / 7);
        if (week < 1 || week <= state.lastSettledWeek) return;
        // A new rent week also refreshes the weekly Venice Aura blessing.
        set({ lastSettledWeek: week, weeklyAuraBlessingUsed: false });

        let totalOwed = state.weeklyRent;

        // Credit card minimum payment
        if (state.debt > 0) {
          totalOwed += Math.min(50, Math.round(state.debt * 0.05));
        }

        // Klarna installments
        // (simplified: each Klarna debt entry charges installmentAmount)
        // We track this in the debt system

        const canPay = state.money >= totalOwed;

        if (canPay) {
          onRentDue();
          const newMoney = state.money - totalOwed;
          const newLog: EventLogItem = {
            id: `rent_paid_${Date.now()}`,
            day: state.day,
            timeSlot: state.timeSlot,
            text: `🏠 周六结算：支付房租 $${totalOwed}`,
            timestamp: new Date().toLocaleTimeString(),
            logKey: 'log_rent_paid',
            logParams: { amount: totalOwed },
          };
          set({ money: newMoney, logs: [newLog, ...state.logs] });
        } else {
          onEviction();
          const newWarnings = state.evictionWarnings + 1;
          const isHomeless = newWarnings >= 2;

          const newLog: EventLogItem = {
            id: `rent_fail_${Date.now()}`,
            day: state.day,
            timeSlot: state.timeSlot,
            text: isHomeless
              ? '📦 第二次警告！你被驱逐了，现在睡在 Venice Beach。体力上限减半。'
              : '⚠️ 周六房租不足！收到驱逐警告（第' + newWarnings + '次）',
            timestamp: new Date().toLocaleTimeString(),
            logKey: 'log_rent_fail',
            logParams: { count: newWarnings },
          };

          const finalMoney = Math.max(0, state.money);

          set({
            money: finalMoney,
            evictionWarnings: newWarnings,
            isHomeless,
            logs: [newLog, ...state.logs],
          });

          // If homeless, apply energy halving effect
          if (isHomeless) {
            const currentEnergy = state.stats.energy;
            set({
              stats: {
                ...state.stats,
                energy: Math.round(currentEnergy * 0.5),
              },
            });
          }
        }

        // Check for bankruptcy deadlock after rent settlement
        get().checkBankruptcyDeadlock();
      },

      borrowPaydayLoan: (amount: number, fee: number) => {
        const state = get();
        set({
          money: state.money + amount,
          debt: state.debt + amount + fee,
          stats: {
            ...state.stats,
            aura: clamp(state.stats.aura - 4, 0, 100),
          },
          logs: [
            {
              id: `loan_${Date.now()}`,
              day: state.day,
              timeSlot: state.timeSlot,
              text: `💳 预支工资 $${amount}，需还 $${amount + fee}。自尊 -4`,
              timestamp: new Date().toLocaleTimeString(),
              logKey: 'log_payday_loan',
              logParams: { amount, total: amount + fee },
            },
            ...state.logs,
          ],
        });
      },

      triggerRandomEvent: () => {
        const state = get();
        const available = getAvailableEvents({
          stats: {
            aura: state.stats.aura,
            beauty: state.stats.beauty,
            mental: state.stats.mental,
            hunger: state.stats.hunger,
            energy: state.stats.energy,
          },
          hustleStreak: state.hustleStreak,
          day: state.day,
          isHomeless: state.isHomeless,
          money: state.money,
          debt: state.debt,
          hasSignetRing: state.hasSignetRing,
        });
        const event = rollEvent(available);
        if (event && event.choices.length > 0) {
          set({ currentEvent: event });
        }
      },

      triggerCheatPenalty: () => {
        const state = get();
        if (state.isGameOver || state.phase !== 'playing') return;
        set({
          money: 0, // Cheater's cash wiped
          stats: {
            ...state.stats,
            aura: clamp(state.stats.aura - 30, 0, 100), // aura heavily damaged
          },
          logs: [
            {
              id: `cheat_${Date.now()}`,
              day: state.day,
              timeSlot: state.timeSlot,
              text: '🕵️ 你试图在开发者工具里改写命运……洛杉矶的底层法则对此毫不留情。现金清零，气质 -30。',
              timestamp: new Date().toLocaleTimeString(),
              logKey: 'log_devtools_penalty',
            },
            ...state.logs,
          ],
        });
      },

      checkBankruptcyDeadlock: () => {
        const state = get();
        if (state.isGameOver || state.phase !== 'playing') return;

        // Only check when money is deeply negative — player can't pay for anything
        // and can't recover through normal actions
        if (state.money >= 0) return;

        // Check if any hustle action is executable (energy sufficient, not blocked)
        const hustleActions = ACTIONS.filter((a) => a.category === 'hustle');
        const canHustle = hustleActions.some((action) => {
          // Uber requires a car (not homeless)
          if (action.id === 'uber' && state.isHomeless) return false;
          // Check energy requirement
          const energyNeeded = action.energyCost ?? 0;
          if (state.stats.energy < energyNeeded) return false;
          // Audition requires beauty >= 30
          if (action.id === 'audition' && state.stats.beauty < 30) return false;
          return true;
        });

        // Also check if finance actions could help (EarnIn needs no cash, but is daily-capped)
        const canFinance = ACTIONS.some((action) => {
          if (action.category !== 'finance') return false;
          if (action.id === 'pay_debt' && (state.debt <= 0 || state.money <= 0)) return false;
          if (action.id === 'klarna_split' && state.money < (action.cost ?? 0)) return false;
          // EarnIn advance needs no cash, but the daily cap switch may have
          // exhausted it for today.
          if (action.id === 'earnin_advance') return !isRepeatCapped('earnin_advance', state);
          return false;
        });

        // If no hustle and no finance action can save the player → deadlock → bankrupt
        if (!canHustle && !canFinance) {
          const ending = getEnding({ ...state, debt: Math.max(state.debt, 501) });
          const finalEnding = ending ?? ENDINGS_FALLBACK;
          onEnding('bad');
          useAchievementStore.getState().recordEnding('bankrupt', { aura: state.stats.aura, money: state.money });
          analytics.gameEnd('bankrupt', { aura: state.stats.aura, money: state.money, day: state.day });
          set({
            isGameOver: true,
            endingId: 'bankrupt',
            endingReason: finalEnding.text,
            logs: [
              {
                id: `deadlock_${Date.now()}`,
                day: state.day,
                timeSlot: state.timeSlot,
                text: '💸 No way out. Bank account negative, no energy to work, no one left to call. LA wins this round.',
                timestamp: new Date().toLocaleTimeString(),
                logKey: 'log_bankruptcy_deadlock',
              },
              ...state.logs,
            ],
          });
        }
      },

      restart: () => {
        set({
          ...INITIAL_STATE,
          phase: 'creation',
          playerName: '',
          stats: { ...INITIAL_STATS },
        });
      },
    }),
    {
      name: 'laslos_life_save',
      storage: secureStorage,
      version: 1,
      partialize: (state) => {
        // Only persist gameplay-relevant fields (not functions)
        const {
          phase, playerName, money, debt, weeklyRent, stats, day, timeSlot,
          hasSignetRing, logs, isGameOver, endingId, endingReason,
          hustleStreak, auraEventsTriggered, evictionWarnings, isHomeless,
          weeklyAuraBlessingUsed, earninUsesToday, lastSettledWeek,
        } = state;
        // Full-state signature. The old signature only covered money/aura/day,
        // so debt, four other stats, warnings, ending and rent week could be
        // edited in DevTools without ever triggering the tamper penalty.
        const checksum = generateChecksum(state);
        return {
          phase, playerName, money, debt, weeklyRent, stats, day, timeSlot,
          hasSignetRing, logs, isGameOver, endingId, endingReason,
          hustleStreak, auraEventsTriggered, evictionWarnings, isHomeless,
          weeklyAuraBlessingUsed, earninUsesToday, lastSettledWeek, checksum,
        } as GameStore;
      },
      onRehydrateStorage: () => {
        return (state) => {
          if (!state) return;

          // ── 1. Structural validation ──────────────────────────────────
          // A truncated, hand-edited or stale save must never crash the UI.
          // zustand's default merge fills absent fields from INITIAL_STATE;
          // here we also repair wrong types and impossible numeric values.
          const raw = state as unknown as Record<string, unknown>;
          const num = (v: unknown, fallback: number, lo: number, hi: number): number =>
            typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : fallback;
          const bool = (v: unknown, fallback: boolean): boolean =>
            typeof v === 'boolean' ? v : fallback;
          const rawStats = (raw.stats && typeof raw.stats === 'object'
            ? raw.stats : {}) as Record<string, unknown>;

          state.stats = {
            hunger: num(rawStats.hunger, INITIAL_STATS.hunger, 0, 100),
            energy: num(rawStats.energy, INITIAL_STATS.energy, 0, 100),
            mental: num(rawStats.mental, INITIAL_STATS.mental, 0, 100),
            beauty: num(rawStats.beauty, INITIAL_STATS.beauty, 0, 100),
            aura: num(rawStats.aura, INITIAL_STATS.aura, 0, 100),
          };
          state.money = num(raw.money, INITIAL_STATE.money, 0, 1_000_000);
          state.debt = num(raw.debt, INITIAL_STATE.debt, 0, 1_000_000);
          state.weeklyRent = num(raw.weeklyRent, INITIAL_STATE.weeklyRent, 0, 100_000);
          state.day = Math.round(num(raw.day, INITIAL_STATE.day, 1, 31));
          const slot = raw.timeSlot;
          state.timeSlot = (slot === 'morning' || slot === 'afternoon' || slot === 'evening')
            ? slot : INITIAL_STATE.timeSlot;
          state.evictionWarnings = Math.round(num(raw.evictionWarnings, 0, 0, 2));
          state.auraEventsTriggered = Math.round(num(raw.auraEventsTriggered, 0, 0, 999));
          state.earninUsesToday = Math.round(num(raw.earninUsesToday, 0, 0, 999));
          state.isHomeless = bool(raw.isHomeless, false);
          state.isGameOver = bool(raw.isGameOver, false);
          state.hasSignetRing = bool(raw.hasSignetRing, true);
          state.weeklyAuraBlessingUsed = bool(raw.weeklyAuraBlessingUsed, false);
          const phase = raw.phase;
          state.phase = (phase === 'playing' || phase === 'gameOver') ? phase : 'creation';
          state.playerName = typeof raw.playerName === 'string' ? raw.playerName.slice(0, 40) : '';
          state.endingId = typeof raw.endingId === 'string' ? raw.endingId.slice(0, 60) : null;
          state.endingReason = typeof raw.endingReason === 'string' ? raw.endingReason.slice(0, 500) : null;
          state.currentEvent = null; // never restore a half-resolved modal
          state.logs = Array.isArray(raw.logs)
            ? (raw.logs as unknown[])
                .filter((l): l is EventLogItem => !!l && typeof l === 'object'
                  && typeof (l as EventLogItem).text === 'string')
                .slice(0, 100)
            : [];
          const streakRaw = (raw.hustleStreak && typeof raw.hustleStreak === 'object'
            && !Array.isArray(raw.hustleStreak) ? raw.hustleStreak : {}) as Record<string, unknown>;
          const cleanStreak: Record<string, number> = {};
          for (const key of Object.keys(streakRaw).slice(0, 50)) {
            const v = streakRaw[key];
            if (typeof v === 'number' && Number.isFinite(v)) cleanStreak[key] = Math.max(0, Math.round(v));
          }
          state.hustleStreak = cleanStreak;

          // ── 2. Integrity check ────────────────────────────────────────
          const stored = typeof raw.checksum === 'string' ? raw.checksum : undefined;
          // zustand's default merge fills missing fields from INITIAL_STATE,
          // so `lastSettledWeek === 0` cannot distinguish "old save" from
          // "day 1". The legacy checksum format is the reliable signal.
          const isLegacy = !!stored
            && stored === generateLegacyChecksum(state.money, state.stats.aura, state.day);

          // Old v2 saves have no rent-week marker. Treat every week already
          // elapsed as settled, otherwise returning players get billed twice.
          const hasMarker = typeof raw.lastSettledWeek === 'number'
            && Number.isFinite(raw.lastSettledWeek);
          state.lastSettledWeek = (hasMarker && !isLegacy)
            ? Math.round(num(raw.lastSettledWeek, 0, 0, 5))
            : Math.floor((state.day - 1) / 7);

          const isValid = verifyChecksum(stored, state);
          if (!isValid && state.phase === 'playing') {
            // Tamper detected — apply penalty
            const penaltyLog: EventLogItem = {
              id: `tamper_${Date.now()}`,
              day: state.day,
              timeSlot: state.timeSlot,
              text: '🚨 时空错乱：存档被篡改。洛杉矶的底层法则已注意到你。现金清零，气质归零。',
              timestamp: new Date().toLocaleTimeString(),
              logKey: 'log_tamper',
            };
            state.money = 0;
            state.stats.aura = 0;
            state.logs = [penaltyLog, ...state.logs];
          }

          // ── 3. Always rewrite with the current signature ─────────────
          // Also upgrades legacy (money/aura/day) saves in place, so no
          // SAVE_VERSION bump and no loss of player progress.
          state.checksum = generateChecksum(state);
        };
      },
    }
  )
);
