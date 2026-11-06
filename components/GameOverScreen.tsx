'use client';

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { getEnding } from '@/data/endings';
import { useI18n } from '@/components/I18n';
import AchievementPanel from '@/components/AchievementPanel';
import AchievementToast from '@/components/AchievementToast';

export default function GameOverScreen() {
  const { stats, money, debt, endingId, endingReason, day, restart } = useGameStore();
  const { t } = useI18n();
  const [ending, setEnding] = useState<typeof import('@/data/endings').ENDINGS[number] | null>(null);

  useEffect(() => {
    const found = getEnding({ ...useGameStore.getState(), endingId, endingReason } as any);
    if (found) setEnding(found);

    // Trigger confetti for winning endings
    if (found && (found.id === 'la_queen' || found.id === 'mystery')) {
      const end = setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF6B9D', '#FFD93D', '#9B7BFF', '#6BCB9F'],
        });
      }, 500);
      return () => clearTimeout(end);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ending) return null;

  // Get localized ending title and text
  // Map ending IDs to i18n keys (handle faded_aura -> ending_faded)
  const endingKeyMap: Record<string, string> = {
    'la_queen': 'ending_la_queen',
    'survivor': 'ending_survivor',
    'faded_aura': 'ending_faded',
    'evicted': 'ending_evicted',
    'breakdown': 'ending_breakdown',
    'bankrupt': 'ending_bankrupt',
    'starved': 'ending_starved',
    'mystery': 'ending_mystery',
  };
  const titleKey = endingKeyMap[ending.id] || `ending_${ending.id}`;
  const localizedTitle = t(titleKey);
  const localizedText = t(`${titleKey}_text`);
  // Fallback: if t() returns the key itself (missing), use the data from endings.ts
  const displayTitle = localizedTitle === titleKey ? ending.title : localizedTitle;
  const displayText = localizedText === `${titleKey}_text` ? ending.text : localizedText;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="w-full max-w-md mx-auto text-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
        className="glass-card p-8"
      >
        {/* Emoji */}
        <div className="text-7xl mb-4">{ending.emoji}</div>

        {/* Title — <h1>: /play.html owns its own document heading. */}
        <h1 className="font-display font-extrabold text-3xl text-[#FF6B9D] mb-2">
          {displayTitle}
        </h1>

        {/* Divider */}
        <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-[#FF6B9D] to-transparent mx-auto my-4" />

        {/* Story text */}
        <p className="text-[#FFF5E4]/80 text-sm leading-relaxed mb-6">
          {displayText}
        </p>

        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-2 text-xs text-[#FFF5E4]/50 mb-6">
          <SummaryRow label={t('final_cash')} value={`$${money}`} />
          <SummaryRow label={t('final_debt')} value={`$${debt}`} neg />
          <SummaryRow label={t('final_beauty')} value={`${stats.beauty}%`} color="#6BCB9F" />
          <SummaryRow label={t('final_aura')} value={`${stats.aura}%`} color="#E8C547" />
          <SummaryRow label={t('final_mental')} value={`${stats.mental}%`} color="#9B7BFF" />
          <SummaryRow label={t('days_survived')} value={stats.hunger <= 0 ? `${day}` : t('days_30')} />
        </div>

        {/* Restart button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={restart}
          className="w-full bg-[#FF6B9D] hover:bg-[#FF6B9D]/90 text-white font-display font-bold py-3 rounded-xl transition-all"
        >
          {t('restart')}
        </motion.button>

        {/* Legacy / achievements — only shown after first game */}
        <AchievementPanel />
      </motion.div>
    </motion.div>
  );
}

function SummaryRow({
  label,
  value,
  neg = false,
  color,
}: {
  label: string;
  value: string;
  neg?: boolean;
  color?: string;
}) {
  return (
    <div className="flex justify-between px-3 py-1.5 rounded-lg bg-[#16213E]/50">
      <span className="text-[#FFF5E4]/40">{label}</span>
      <span className={`font-bold font-display ${neg ? 'text-red-400' : color ? '' : 'text-[#FFD93D]'}`} style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}
