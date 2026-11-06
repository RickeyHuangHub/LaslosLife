'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useI18n } from '@/components/I18n';

export default function RentWarning() {
  const { day, money, debt, isHomeless, evictionWarnings } = useGameStore();
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dayInWeek = ((day - 1) % 7) + 1;
    if (dayInWeek >= 6 || isHomeless || evictionWarnings > 0) setShow(true);
  }, [day, isHomeless, evictionWarnings]);

  if (!show) return null;

  const totalOwed = 450 + (debt > 0 ? Math.min(50, Math.round(debt * 0.05)) : 0);
  const shortfall = totalOwed - money;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl px-4 py-2 text-sm font-display font-semibold flex items-center gap-2 ${
        shortfall > 0 ? 'bg-[#FF6B9D]/20 text-[#FF6B9D] pulse-warning' : 'bg-[#FFD93D]/15 text-[#FFD93D]'
      }`}
    >
      <span>{isHomeless ? '📦' : '⚠️'}</span>
      {isHomeless
        ? t('evicted')
        : shortfall > 0
        ? `${t('rent_warning')} ${7 - ((day - 1) % 7)}d · ${t('rent_amount')} — ${t('not_enough_money')}`
        : `${t('rent_warning')}: ${t('rent_amount')} ✓`
      }
    </motion.div>
  );
}
