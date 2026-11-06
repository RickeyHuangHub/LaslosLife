'use client';

import { motion } from 'framer-motion';
import { useAchievementStore } from '@/store/useAchievementStore';
import { useI18n } from '@/components/I18n';

export default function AchievementPanel() {
  const { legacy, getAllUnlocked } = useAchievementStore();
  const { t } = useI18n();
  const unlocked = getAllUnlocked();

  if (legacy.totalGames === 0) return null;

  // Find rarest ending (least played)
  const entryEntries = Object.entries(legacy.endedWith);
  const rarest = entryEntries.length > 0
    ? entryEntries.reduce((a, b) => (a[1] <= b[1] ? a : b))[0]
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="mt-4 pt-4 border-t border-[#FFF5E4]/10"
    >
      <p className="text-xs font-display font-bold text-[#E8C547] tracking-widest uppercase mb-3">
        {t('your_legacy')}
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <LegacyStat label={t('ach_total_games')} value={String(legacy.totalGames)} />
        <LegacyStat label={t('ach_ending_count')} value={String(entryEntries.length)} />
        {legacy.firstEndingId && (
          <LegacyStat
            label={t('first_ending')}
            value={t(`ending_${legacy.firstEndingId}`)}
          />
        )}
        {rarest && (
          <LegacyStat
            label={t('ach_rarest_ending')}
            value={t(`ending_${rarest}`)}
          />
        )}
      </div>

      {/* Badges */}
      {unlocked.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unlocked.map(a => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-display font-semibold border"
              style={{
                backgroundColor: '#E8C54718',
                borderColor: '#E8C54740',
                color: '#E8C547',
              }}
            >
              🏆 {t(a.titleKey)}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function LegacyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-3 py-1.5 rounded-lg bg-[#16213E]/40">
      <span className="text-[#FFF5E4]/40">{label}</span>
      <span className="font-display font-semibold text-[#FFF5E4]/80">{value}</span>
    </div>
  );
}
