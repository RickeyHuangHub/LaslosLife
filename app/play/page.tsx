'use client';

/**
 * THE GAME — served at /play.html (static export of app/play/page.tsx).
 *
 * The public landing page lives at / (app/page.tsx). A player presses
 * "Let's Try" there, lands here, picks a name in CharacterCreation and starts
 * a 30-day run. There is NO login wall: this page is publicly reachable, it
 * just contains the game instead of the marketing/SEO copy.
 *
 * Heading levels: each of the two pages owns ONE <h1> for its own document.
 * On the landing page it is the Hero; here it is the game title. The three
 * mutually exclusive phase screens (CharacterCreation / in-game header /
 * GameOverScreen) each render an <h1>, so the built static HTML — which is the
 * creation phase — contains exactly one. postbuild.py verifies both pages.
 */

import { AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useI18n } from '@/components/I18n';
import CharacterCreation from '@/components/CharacterCreation';
import StatusBar from '@/components/StatusBar';
import ActionHub from '@/components/ActionHub';
import EventModal from '@/components/EventModal';
import EventLog from '@/components/EventLog';
import BroadcastTicker from '@/components/BroadcastTicker';
import RentCountdown from '@/components/RentCountdown';
import AchievementToast from '@/components/AchievementToast';
import GameOverScreen from '@/components/GameOverScreen';
import AudioControl from '@/components/AudioControl';
import { LanguageSwitcher } from '@/components/I18n';
import { useAntiCheat } from '@/lib/antiCheat';

export default function PlayPage() {
  const { phase, isGameOver, currentEvent, day, timeSlot, triggerCheatPenalty } = useGameStore();
  const { t } = useI18n();

  // Anti-cheat: triggers in-game penalty when DevTools opens
  useAntiCheat(() => {
    if (phase === 'playing') triggerCheatPenalty();
  });

  const slotLabel = timeSlot === 'morning' ? t('morning') : timeSlot === 'afternoon' ? t('afternoon') : t('evening');

  if (phase === 'creation') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 relative">
        <LanguageSwitcher />
        <CharacterCreation />
      </main>
    );
  }

  if (isGameOver) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 relative">
        <LanguageSwitcher />
        <GameOverScreen />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-3 md:p-6 max-w-[800px] mx-auto flex flex-col gap-4 relative">
      <LanguageSwitcher />
      <AudioControl />

      {/* Header */}
      <header className="flex items-center justify-between py-2">
        {/* <h1>: this game page is its own document, so it owns its own <h1>. */}
        <h1 className="font-display font-bold text-xl md:text-2xl text-[#FF6B9D] tracking-tight">
          🌴 {t('game_title')}
        </h1>
        <div className="text-sm text-[#FFF5E4]/70 font-display">
          <span className="text-[#FFD93D] font-semibold">{day}{t('of')}</span>
          <span className="mx-2">·</span>
          <span>{slotLabel}</span>
        </div>
      </header>

      <StatusBar />
      <RentCountdown />
      <ActionHub />
      <AnimatePresence>
        {currentEvent && <EventModal event={currentEvent} />}
      </AnimatePresence>
      <EventLog />
      <BroadcastTicker />
      <AchievementToast />
    </main>
  );
}
