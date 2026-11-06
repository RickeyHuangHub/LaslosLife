'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useI18n } from '@/components/I18n';
import { ACTIONS } from '@/data/actions';
import { isRepeatCapped } from '@/data/limits';

const CATEGORIES = [
  { id: 'hustle', labelKey: 'cat_hustle' },
  { id: 'beauty', labelKey: 'cat_beauty' },
  { id: 'social', labelKey: 'cat_social' },
  { id: 'finance', labelKey: 'cat_finance' },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  hustle: '#4D96FF',
  beauty: '#6BCB9F',
  social: '#9B7BFF',
  finance: '#FFD93D',
};

export default function ActionHub() {
  const [activeTab, setActiveTab] = useState('hustle');
  const { stats, money, isHomeless, earninUsesToday, weeklyAuraBlessingUsed } = useGameStore();
  const { t } = useI18n();

  const filtered = ACTIONS.filter((a) => a.category === activeTab);

  return (
    <div className="glass-card p-4">
      {/* Category tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {CATEGORIES.map(({ id, labelKey }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-full text-sm font-display font-semibold transition-all whitespace-nowrap ${
              activeTab === id ? 'text-white shadow-lg' : 'bg-[#1A1A2E]/60 text-[#FFF5E4]/50 hover:text-[#FFF5E4]/80'
            }`}
            style={activeTab === id ? {
              backgroundColor: `${CATEGORY_COLORS[id]}30`,
              border: `1px solid ${CATEGORY_COLORS[id]}60`,
              boxShadow: `0 0 16px ${CATEGORY_COLORS[id]}40`,
            } : undefined}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Action cards — immersive image-on-top layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <AnimatePresence mode="wait">
          {filtered.map((action, i) => (
            <ActionCard
              key={action.id}
              action={action}
              stats={stats}
              money={money}
              isHomeless={isHomeless}
              capState={{ earninUsesToday, weeklyAuraBlessingUsed }}
              index={i}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ActionCard({ action, stats, money, isHomeless, capState, index }: {
  action: typeof ACTIONS[0];
  stats: { energy: number; beauty: number; aura: number };
  money: number;
  isHomeless: boolean;
  capState: { earninUsesToday: number; weeklyAuraBlessingUsed: boolean };
  index: number;
}) {
  const { performAction } = useGameStore();
  const { t } = useI18n();

  // Only block on money if the action actually requires a cost (cost > 0).
  // Hustle actions (DoorDash, Uber, Barista, etc.) have no cost — they earn money.
  // This prevents the deadlock where negative cash blocks all income actions.
  const hasMoneyCost = (action.cost ?? 0) > 0;
  const canAfford = !hasMoneyCost || money >= (action.cost ?? 0);
  const hasEnergy = stats.energy >= (action.energyCost ?? 0);
  // Repeat-cap switch (#3): disable the card instead of letting the click no-op.
  const isCapped = isRepeatCapped(action.id, capState);
  const isLocked = !canAfford || !hasEnergy || isCapped || (action.id === 'uber' && isHomeless);
  const color = CATEGORY_COLORS[action.category] ?? '#FFF5E4';

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      whileHover={!isLocked ? { scale: 1.03, y: -4 } : {}}
      whileTap={!isLocked ? { scale: 0.97 } : {}}
      disabled={isLocked}
      onClick={() => !isLocked && performAction(action.id)}
      className={`glass-card overflow-hidden text-left transition-all flex flex-col ${
        isLocked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {/* ── Top: Full-width image area (no text overlay) ── */}
      <div className="relative w-full h-32 md:h-36 shrink-0 overflow-hidden bg-[#12121F]">
        {/* Category color bar at the very top */}
        <div className="absolute top-0 left-0 right-0 h-[3px] z-10" style={{ backgroundColor: color }} />
        {/* Image — falls back to a gradient + emoji if it fails to load */}
        <img
          src={action.image}
          alt={t(`action_${action.id}`)}
          className="w-full h-full object-cover"
          style={{ filter: isLocked ? 'saturate(0.55) brightness(0.82)' : 'none' }}
          loading="lazy"
          onError={(e) => {
            // Hide broken image, show gradient + emoji instead
            e.currentTarget.style.display = 'none';
          }}
        />
        {/* Gradient fallback layer (visible behind image, or alone if image fails) */}
        <div
          className="absolute inset-0 flex items-center justify-center -z-10"
          style={{ background: `linear-gradient(135deg, ${color}30 0%, #12121F 70%)` }}
        >
          <span className="text-4xl opacity-60">{action.emoji}</span>
        </div>
        {/* Emoji badge — small, top-right corner, doesn't obstruct image */}
        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-sm z-10">
          {action.emoji}
        </div>
        {/* Cost badge — bottom-right of image area */}
        {hasMoneyCost && (
          <div className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-xs font-bold backdrop-blur-sm z-10 ${
            money >= (action.cost ?? 0) ? 'bg-black/60 text-[#FFD93D]' : 'bg-red-900/70 text-red-300'
          }`}>
            ${action.cost}
          </div>
        )}
      </div>

      {/* ── Bottom: Text area (title, description, lock status) ── */}
      <div className="p-2.5 flex flex-col gap-1 flex-grow">
        <p className="font-display font-semibold text-sm text-[#FFF5E4] leading-tight">
          {t(`action_${action.id}`)}
        </p>
        <p className="text-xs text-[#FFF5E4]/40 leading-tight">
          {t(`action_${action.id}_desc`)}
        </p>
        {isLocked ? (
          <div className="text-xs text-red-400/70 mt-auto pt-1">
            {isCapped
              ? t('action_daily_cap').replace('{label}', t(`action_${action.id}`))
              : hasMoneyCost && money < (action.cost ?? 0)
                ? t('not_enough_money')
                : !hasEnergy
                  ? `${t('needs_energy').replace('${energy}', String(action.energyCost))}`
                  : t('need_car')}
          </div>
        ) : (
          /* Energy cost indicator for non-locked cards */
          action.energyCost ? (
            <div className="text-xs text-[#4D96FF]/60 mt-auto pt-1">
              ⚡ {action.energyCost}
            </div>
          ) : null
        )}
      </div>
    </motion.button>
  );
}
