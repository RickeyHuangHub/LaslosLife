'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useI18n } from '@/components/I18n';

export default function CharacterCreation() {
  const { createPlayer } = useGameStore();
  const { t, openingLines } = useI18n();
  const [name, setName] = useState('');
  const [started, setStarted] = useState(false);

  const handleStart = () => {
    if (name.trim()) {
      setStarted(true);
      createPlayer(name.trim());
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!started ? (
        <motion.div
          key="creation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 flex items-center justify-center overflow-hidden"
        >
          {/* Layer 0: STATIC hero artwork (Ricky Sir, 2026-11-05).
              The landing page keeps the 15s movie; the game entry page now uses
              the X-Hero_1 triptych so the creation screen has a real, bright
              illustration instead of a near-black video loop. Decorative only:
              every word on this page is real, visible DOM text above it. */}
          <img
            src="/images/x-hero-1.jpg"
            alt=""
            aria-hidden="true"
            className="la-play-hero-img absolute inset-0 h-full w-full"
          />

          {/* Layer 1: Dark overlay + centre scrim. The artwork is much brighter
              than the old video, so the centre needs its own dim layer to keep
              the white character-creation copy readable. */}
          <div className="la-play-scrim absolute inset-0" aria-hidden="true" />
          <div
            className="la-play-vignette absolute inset-0 pointer-events-none"
            aria-hidden="true"
          />

          {/* Layer 2: UI Content */}
          <div className="relative z-10 flex flex-col items-center justify-center px-4 w-full max-w-lg">
            {/* Logo */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mb-6"
            >
              <img
                src="/images/logo-laslos.jpg"
                alt="Laslos Life Logo"
                className="w-48 h-auto drop-shadow-2xl"
              />
            </motion.div>

            {/* Title — <h1>: /play.html is its own document. This creation
                screen is the phase rendered in the static HTML, so it must
                carry the game page's single <h1> for crawlers. */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="font-display font-extrabold text-4xl md:text-5xl text-white mb-2 tracking-widest text-center drop-shadow-lg"
            >
              {t('game_title')}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-[#FFF5E4]/60 text-sm mb-8 text-center font-display"
            >
              {t('game_subtitle')}
            </motion.p>

            {/* Opening narrative — cinematic fade-in lines */}
            <div className="space-y-1.5 mb-8 min-h-[120px]">
              {openingLines.map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: line ? 1 : 0, x: line ? 0 : 0 }}
                  transition={{ delay: 1.0 + i * 0.15, duration: 0.5 }}
                  className="text-sm md:text-base text-[#FFF5E4]/80 text-center leading-relaxed font-light"
                >
                  {line || '\u00A0'}
                </motion.p>
              ))}
            </div>

            {/* Name input */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.2 }}
              className="w-full mb-4"
            >
              {/* Slightly stronger than the old /40: the background artwork is
                  now brighter, so the faint labels need a little more ink. */}
              <label className="block text-xs text-[#FFF5E4]/55 font-display uppercase tracking-widest mb-2 text-center">
                {t('give_name')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('name_placeholder')}
                maxLength={20}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/45 font-display text-lg text-center focus:outline-none focus:border-[#FF6B9D] focus:ring-1 focus:ring-[#FF6B9D]/50 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              />
            </motion.div>

            {/* Start button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.5 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleStart}
              disabled={!name.trim()}
              className="w-full bg-[#FF6B9D] hover:bg-[#FF6B9D]/90 disabled:bg-white/20 disabled:cursor-not-allowed text-white font-display font-bold text-lg py-3.5 rounded-xl transition-all shadow-lg shadow-[#FF6B9D]/20"
            >
              {t('start_game')}
            </motion.button>

            {/* Aura hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.0 }}
              className="mt-4 text-xs text-[#FFF5E4]/45 font-display italic text-center"
            >
              {t('aura_note')}
            </motion.p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
