// ─── Core Types ───────────────────────────────────────────────

export type StatKey = 'hunger' | 'energy' | 'mental' | 'beauty' | 'aura';
export type TimeSlot = 'morning' | 'afternoon' | 'evening';
export type ActionCategory = 'hustle' | 'beauty' | 'social' | 'finance';
export type GamePhase = 'creation' | 'playing' | 'gameOver';
export type EventType = 'action' | 'event' | 'system' | 'warning' | 'broadcast';

// ─── Stats ────────────────────────────────────────────────────

export interface Stats {
  hunger: number;
  energy: number;
  mental: number;
  beauty: number;
  aura: number; // HIDDEN — innate aristocratic quality
}

export interface ChoiceEffect {
  aura?: number;
  energy?: number;
  hunger?: number;
  money?: number;
  mental?: number;
  beauty?: number;
  debt?: number;
  loseRing?: boolean;
}

export interface Choice {
  text: string;
  effect: ChoiceEffect;
  log: string;
  logKey?: string;       // i18n key for log text (optional, falls back to log)
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  weight?: number;
  condition?: (state: {
    stats: { aura: number; beauty: number; mental: number; hunger: number; energy: number };
    hustleStreak: Record<string, number>;
    day: number;
    isHomeless: boolean;
    money: number;
    debt: number;
    hasSignetRing: boolean;
  }) => boolean;
  choices: Choice[];
}

export interface EventLogItem {
  id: string;
  day: number;
  timeSlot: TimeSlot;
  text: string;
  timestamp: string;
  logKey?: string;       // i18n key (optional, falls back to text)
  logParams?: Record<string, string | number | undefined>;  // template params
}

// ─── Debt ─────────────────────────────────────────────────────

export interface DebtEntry {
  id: string;
  source: string;      // "Klarna", "EarnIn", "Credit Card"
  principal: number;
  interestRate: number; // e.g. 0.15 = 15% per week
  installmentsRemaining: number;
  installmentAmount: number;
  createdAt: number;
}

// ─── Action ───────────────────────────────────────────────────

export interface GameAction {
  id: string;
  label: string;
  emoji: string;
  category: ActionCategory;
  cost?: number;        // cash cost (display only)
  energyCost?: number;
  hungerCost?: number;
  mentalCost?: number;
  beautyCost?: number;
  image?: string;       // path to card image (e.g. '/actions/doordash.png')
  execute: (state: GameState) => ActionResult;
}

export interface ActionResult {
  money?: number;
  stats?: Partial<Stats>;
  debt?: DebtEntry | number;  // DebtEntry = new debt added; number = AMOUNT paid off (not the remaining balance)
  message: string;
  logText: string;
  logKey?: string;       // i18n key for log text (optional, falls back to logText)
  logParams?: Record<string, string | number | undefined>;  // template params for logKey
}

// ─── Game State ───────────────────────────────────────────────

export interface GameState {
  phase: GamePhase;
  playerName: string;
  money: number;
  debt: number;
  weeklyRent: number;
  stats: Stats;
  day: number;
  timeSlot: TimeSlot;
  hasSignetRing: boolean;
  currentEvent: GameEvent | null;
  logs: EventLogItem[];
  isGameOver: boolean;
  endingId: string | null;
  endingReason: string | null;
  hustleStreak: Record<string, number>;
  auraEventsTriggered: number;
  evictionWarnings: number;
  isHomeless: boolean;
  weeklyAuraBlessingUsed: boolean;
  /** EarnIn advances used in the current in-game day (repeat-cap counter). */
  earninUsesToday: number;
  /** Highest 7-day rent week already settled (0 = none). Guards against double charging. */
  lastSettledWeek: number;
  checksum: string;
}

// ─── Store Actions ────────────────────────────────────────────

export interface GameStore extends GameState {
  createPlayer: (name: string) => void;
  performAction: (actionId: string) => void;
  resolveEventChoice: (choiceIndex: number) => void;
  advanceTime: () => void;
  checkSaturdaySettlement: () => void;
  borrowPaydayLoan: (amount: number, fee: number) => void;
  triggerRandomEvent: () => void;
  triggerCheatPenalty: () => void;
  checkBankruptcyDeadlock: () => void;
  restart: () => void;
}

// ─── Endings ──────────────────────────────────────────────────

export interface Ending {
  id: string;
  title: string;
  emoji: string;
  condition: (state: GameState) => boolean;
  text: string;
}
