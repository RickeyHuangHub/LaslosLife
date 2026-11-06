'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAchievementStore } from '@/store/useAchievementStore';
import { useI18n } from '@/components/I18n';

/** Brief toast shown when an achievement is unlocked at game end. */
export default function AchievementToast() {
  const { pendingUnlock, clearPending } = useAchievementStore();
  const { t } = useI18n();

  if (!pendingUnlock) return null;

  const achMap: Record<string, { title: string; desc: string }> = {
    'first_game': { title: t('ach_first_game'), desc: t('ach_first_game_desc') },
    'survivor':   { title: t('ach_survivor'),   desc: t('ach_survivor_desc') },
    'la_queen':   { title: t('ach_la_queen'),   desc: t('ach_la_queen_desc') },
    'bankrupt':   { title: t('ach_bankrupt'),   desc: t('ach_bankrupt_desc') },
  };
  const ach = achMap[pendingUnlock];
  if (!ach) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={pendingUnlock}
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.3, type: 'spring', damping: 18 }}
        onAnimationComplete={() => setTimeout(clearPending, 4000)}
        className="fixed top-6 right-6 z-50 max-w-[280px]"
      >
        <div className="glass-card px-5 py-4 shadow-2xl border-l-4"
             style={{ borderColor: '#E8C547' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🏆</span>
            <div>
              <p className="text-xs text-[#E8C547] font-display font-bold tracking-widest mb-0.5 uppercase">
                {t('achievement_unlocked')}
              </p>
              <p className="font-display font-bold text-[#FFF5E4] text-sm">{ach.title}</p>
              <p className="text-xs text-[#FFF5E4]/50 mt-0.5">{ach.desc}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
