'use client';

import { useGameStore } from '@/store/useGameStore';
import { useI18n } from '@/components/I18n';

/**
 * Rent Countdown Bar
 * Shows days remaining until next Saturday rent settlement with urgency color.
 * Blue → Yellow → Red as the deadline approaches.
 */
export default function RentCountdown() {
  const { day, timeSlot, isHomeless, evictionWarnings, weeklyRent, money, debt } = useGameStore();
  const { t } = useI18n();

  // Rent is settled on the EVENING of day 7 / 14 / 21 / 28 — the same rule
  // as rentDueWeek() in the store. The old formula used "Saturday = day 6",
  // so the bar showed "6d" on the very day rent was actually collected.
  const weekEnd = Math.ceil(day / 7) * 7;
  const settledThisEvening = day === weekEnd && timeSlot === 'evening';
  const nextSettlementDays = settledThisEvening ? 7 : weekEnd - day;

  // Only show after morning of day 6 (Saturday morning) or if homeless/warned
  const showBar = nextSettlementDays <= 2 || isHomeless || evictionWarnings > 0;
  if (!showBar) return null;

  const totalOwed = weeklyRent + (debt > 0 ? Math.min(50, Math.round(debt * 0.05)) : 0);
  const shortfall = totalOwed - money;
  const isUrgent = shortfall > 0;

  const barColor = isUrgent ? '#FF6B9D' : nextSettlementDays <= 1 ? '#FFD93D' : '#4D96FF';
  const label = isHomeless
    ? t('evicted')
    : isUrgent
    ? `${t('rent_next_collected')} · ${nextSettlementDays}d`
    : `${t('rent_next_collected')} · ${nextSettlementDays}d · ${t('rent_amount')}`;

  return (
    <div className="rounded-xl px-4 py-2 text-sm font-display font-semibold flex items-center gap-2"
         style={{ backgroundColor: `${barColor}18`, color: barColor, border: `1px solid ${barColor}30` }}>
      <span>{isHomeless ? '📦' : nextSettlementDays <= 1 ? '🔥' : '🏠'}</span>
      <span>{label}</span>
    </div>
  );
}
