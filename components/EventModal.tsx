'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useI18n } from '@/components/I18n';
import type { GameEvent } from '@/app/types';

// Map event IDs to i18n key prefixes
// Flagship events have different IDs vs i18n keys
const EVENT_I18N_MAP: Record<string, string> = {
  'event_405_traffic': 'event_405',
  'event_erewhon_smoothie': 'event_erewhon',
  'event_old_money_bar': 'event_ring',
  'event_hinge_crypto_bro': 'event_crypto',
  'event_ktown_landlord': 'event_landlord',
  // Support events map directly (id === key prefix)
  'freeway_broken': 'event_freeway_broken',
  'date_ghost': 'event_date_ghost',
  'wildfire_heat': 'event_wildfire_heat',
  'crystal_healing': 'event_crystal_healing',
  'viral_tiktok': 'event_viral_tiktok',
  'taco_stomach': 'event_taco_stomach',
  'landlord_text': 'event_landlord_text',
  'influencer_boss': 'event_influencer_boss',
  'klarna_popup': 'event_klarna_popup',
  'uber_passenger': 'event_uber_passenger',
  'gym_crush': 'event_gym_crush',
  'erewhon_run': 'event_erewhon_run',
  'roommate_drama': 'event_roommate_drama',
  'raya_match': 'event_raya_match',
  'parking_ticket': 'event_parking_ticket',
  'compliment_stranger': 'event_compliment_stranger',
  'instagram_envy': 'event_instagram_envy',
  'trader_joes': 'event_trader_joes',
  'lie_flat': 'event_lie_flat',
  'director_notice': 'event_director_notice',
  'european_mistaken': 'event_european_mistaken',
  'old_photo': 'event_old_photo',
};

// Map event IDs to choice i18n key arrays
const EVENT_CHOICE_KEYS: Record<string, string[]> = {
  'event_405_traffic': ['choice_elegant', 'choice_asking'],
  'event_erewhon_smoothie': ['choice_refuse', 'choice_accept'],
  'event_old_money_bar': ['choice_french', 'choice_sell'],
  'event_hinge_crypto_bro': ['choice_dignity', 'choice_grab'],
  'event_ktown_landlord': ['choice_calm', 'choice_loan'],
  'freeway_broken': ['choice_tow_truck', 'choice_give_up_driving'],
  'date_ghost': ['choice_cry', 'choice_channel_rage'],
  'wildfire_heat': ['choice_pay_electric', 'choice_no_ac'],
  'crystal_healing': ['choice_crystal_pay', 'choice_crystal_refuse'],
  'viral_tiktok': ['choice_post_response', 'choice_delete_video'],
  'taco_stomach': ['choice_stomach_endure', 'choice_stomach_meds'],
  'influencer_boss': ['choice_boss_endure', 'choice_boss_quit'],
  'klarna_popup': ['choice_klarna_buy', 'choice_klarna_close'],
  'uber_passenger': ['choice_passenger_listen', 'choice_passenger_cut'],
  'gym_crush': ['choice_crush_talk', 'choice_crush_stare'],
  'erewhon_run': ['choice_erewhon_buy', 'choice_erewhon_resist'],
  'roommate_drama': ['choice_roommate_fight', 'choice_roommate_avoid'],
  'raya_match': ['choice_raya_reply', 'choice_raya_ignore'],
  'parking_ticket': ['choice_ticket_pay', 'choice_ticket_appeal'],
  'compliment_stranger': ['choice_compliment_smile'],
  'instagram_envy': ['choice_ig_uninstall', 'choice_ig_scroll'],
  'trader_joes': ['choice_tj_take'],
  'director_notice': ['choice_director_accept', 'choice_director_decline'],
  'european_mistaken': ['choice_european_play', 'choice_european_correct'],
  'old_photo': ['choice_photo_hide', 'choice_photo_stare'],
};

export default function EventModal({ event }: { event: GameEvent }) {
  const { resolveEventChoice } = useGameStore();
  const { t } = useI18n();

  const handleChoice = (index: number) => {
    resolveEventChoice(index);
  };

  // Get i18n key prefix for this event
  const i18nKey = EVENT_I18N_MAP[event.id] || event.id;
  const localizedTitle = t(i18nKey);
  const localizedDesc = t(`${i18nKey}_desc`);

  // Fallback: if t() returns the key itself, use the raw data
  const displayTitle = localizedTitle === i18nKey ? event.title : localizedTitle;
  const displayDesc = localizedDesc === `${i18nKey}_desc` ? event.description : localizedDesc;

  // Get choice keys for this event
  const choiceKeys = EVENT_CHOICE_KEYS[event.id] || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Card */}
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="relative w-full max-w-lg glass-card p-6"
      >
        {/* Close (X) not needed — choices are mandatory */}
        <div className="text-xs text-[#FFF5E4]/40 font-display uppercase tracking-wider mb-1">
          📍 {event.location}
        </div>
        <h2 className="font-display font-bold text-xl text-[#FF6B9D] mb-3">
          {displayTitle}
        </h2>
        <p className="text-[#FFF5E4]/80 text-sm leading-relaxed mb-6">
          {displayDesc}
        </p>

        {/* Choices */}
        <div className="space-y-3">
          {event.choices.map((choice, i) => {
            // Try i18n first, fallback to raw text (stripped of parenthetical hints)
            const choiceKey = choiceKeys[i];
            const localizedChoice = choiceKey ? t(choiceKey) : choice.text;
            const displayChoice = (choiceKey && localizedChoice !== choiceKey)
              ? localizedChoice
              : choice.text.split(/（[^）]+）/)[0]; // Strip effect hint from display

            const effectParts: string[] = [];
            if (choice.effect.aura) effectParts.push(`Aura ${choice.effect.aura > 0 ? '+' : ''}${choice.effect.aura}`);
            if (choice.effect.money) effectParts.push(`$${choice.effect.money > 0 ? '+' : ''}${choice.effect.money}`);
            if (choice.effect.energy) effectParts.push(`⚡${choice.effect.energy > 0 ? '+' : ''}${choice.effect.energy}`);
            if (choice.effect.mental) effectParts.push(`❤️${choice.effect.mental > 0 ? '+' : ''}${choice.effect.mental}`);
            if (choice.effect.hunger) effectParts.push(`🍔${choice.effect.hunger > 0 ? '+' : ''}${choice.effect.hunger}`);
            if (choice.effect.beauty) effectParts.push(`💄${choice.effect.beauty > 0 ? '+' : ''}${choice.effect.beauty}`);

            return (
              <motion.button
                key={i}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleChoice(i)}
                className="w-full text-left p-4 rounded-xl border transition-all"
                style={{
                  borderColor: choice.effect.aura && choice.effect.aura > 0
                    ? 'rgba(232, 197, 71, 0.4)'
                    : choice.effect.aura && choice.effect.aura < 0
                    ? 'rgba(255, 107, 157, 0.4)'
                    : 'rgba(255, 255, 255, 0.1)',
                  backgroundColor: choice.effect.aura && choice.effect.aura > 0
                    ? 'rgba(232, 197, 71, 0.08)'
                    : choice.effect.aura && choice.effect.aura < 0
                    ? 'rgba(255, 107, 157, 0.08)'
                    : 'rgba(22, 33, 62, 0.8)',
                }}
              >
                <p className="text-sm text-[#FFF5E4] leading-snug mb-2">
                  {displayChoice}
                </p>
                {effectParts.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {effectParts.map((part, j) => (
                      <span
                        key={j}
                        className={`px-2 py-0.5 rounded-full ${
                          part.startsWith('Aura') && part.includes('+')
                            ? 'bg-[#E8C547]/20 text-[#E8C547]'
                            : part.startsWith('Aura')
                            ? 'bg-[#FF6B9D]/20 text-[#FF6B9D]'
                            : part.startsWith('$') && part.includes('+')
                            ? 'bg-[#FFD93D]/20 text-[#FFD93D]'
                            : part.startsWith('$')
                            ? 'bg-red-400/20 text-red-400'
                            : 'bg-[#FFF5E4]/10 text-[#FFF5E4]/70'
                        }`}
                      >
                        {part}
                      </span>
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
