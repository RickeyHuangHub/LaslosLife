'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useI18n } from '@/components/I18n';

const STAT_CONFIG = [
  { key: 'hunger' as const, labelKey: 'stat_hunger', color: '#FF8E72' },
  { key: 'energy' as const, labelKey: 'stat_energy', color: '#4D96FF' },
  { key: 'mental' as const, labelKey: 'stat_mental', color: '#9B7BFF' },
  { key: 'beauty' as const, labelKey: 'stat_beauty', color: '#6BCB9F' },
];

export default function StatusBar() {
  const { stats, money, day, timeSlot } = useGameStore();
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-card p-4"
    >
      {/* Money + Day info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[#FFD93D] font-display font-bold text-xl">💰 ${money}</span>
        </div>
        <div className="text-xs text-[#FFF5E4]/50">
          {t('day_counter')} <span className="text-[#FFD93D] font-bold">{day}</span>/30
          <span className="mx-1">·</span>
          <span className="capitalize">{t(timeSlot)}</span>
        </div>
      </div>

      {/* Stat bars */}
      <div className="grid grid-cols-2 gap-3">
        {STAT_CONFIG.map(({ key, labelKey, color }) => (
          <StatBar key={key} label={t(labelKey)} value={stats[key]} color={color} />
        ))}
      </div>
    </motion.div>
  );
}

function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const isLow = value < 20;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#FFF5E4]/70">{label}</span>
        <span className="font-bold font-display" style={{ color }}>
          {value}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#1A1A2E]/80 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            backgroundColor: color,
            ...(isLow ? { animation: 'glow-low 1.2s ease-in-out infinite' } : {}),
          }}
        />
      </div>
    </div>
  );
}
