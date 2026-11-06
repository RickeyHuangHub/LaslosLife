/**
 * Log migration: converts legacy Chinese-event-choice logs to i18n logKey format.
 * Called once during game start when saving version >= 2.
 *
 * Each event has deterministic logKey mapping:
 *   event_<id> choice <index> → log_<event_id>_<choiceIndex>
 */
export const EVENT_LOG_KEY_MAP: Record<string, Record<number, string>> = {
  // Flagship events
  'event_405_traffic': { 0: 'log_event_405_traffic_0', 1: 'log_event_405_traffic_1' },
  'event_erewhon_smoothie': { 0: 'log_event_erewhon_smoothie_0', 1: 'log_event_erewhon_smoothie_1' },
  'event_old_money_bar': { 0: 'log_event_old_money_bar_0', 1: 'log_event_old_money_bar_1' },
  'event_hinge_crypto_bro': { 0: 'log_event_hinge_crypto_bro_0', 1: 'log_event_hinge_crypto_bro_1' },
  'event_ktown_landlord': { 0: 'log_event_ktown_landlord_0', 1: 'log_event_ktown_landlord_1' },
  // Support events
  'freeway_broken': { 0: 'log_freeway_broken_0', 1: 'log_freeway_broken_1' },
  'date_ghost': { 0: 'log_date_ghost_0', 1: 'log_date_ghost_1' },
  'wildfire_heat': { 0: 'log_wildfire_heat_0', 1: 'log_wildfire_heat_1' },
  'crystal_healing': { 0: 'log_crystal_healing_0', 1: 'log_crystal_healing_1' },
  'viral_tiktok': { 0: 'log_viral_tiktok_0', 1: 'log_viral_tiktok_1' },
  'taco_stomach': { 0: 'log_taco_stomach_0', 1: 'log_taco_stomach_1' },
  'influencer_boss': { 0: 'log_influencer_boss_0', 1: 'log_influencer_boss_1' },
  'klarna_popup': { 0: 'log_klarna_popup_0', 1: 'log_klarna_popup_1' },
  'uber_passenger': { 0: 'log_uber_passenger_0', 1: 'log_uber_passenger_1' },
  'gym_crush': { 0: 'log_gym_crush_0', 1: 'log_gym_crush_1' },
  'erewhon_run': { 0: 'log_erewhon_run_0', 1: 'log_erewhon_run_1' },
  'roommate_drama': { 0: 'log_roommate_drama_0', 1: 'log_roommate_drama_1' },
  'raya_match': { 0: 'log_raya_match_0', 1: 'log_raya_match_1' },
  'parking_ticket': { 0: 'log_parking_ticket_0', 1: 'log_parking_ticket_1' },
  'compliment_stranger': { 0: 'log_compliment_stranger_0' },
  'instagram_envy': { 0: 'log_instagram_envy_0', 1: 'log_instagram_envy_1' },
  'trader_joes': { 0: 'log_trader_joes_0' },
  'director_notice': { 0: 'log_director_notice_0', 1: 'log_director_notice_1' },
  'european_mistaken': { 0: 'log_european_mistaken_0', 1: 'log_european_mistaken_1' },
  'old_photo': { 0: 'log_old_photo_0', 1: 'log_old_photo_1' },
};

// Map known Chinese log fragments to their event_id + choice_index
const CHINESE_LOG_HINTS: Array<{ regex: RegExp; eventId: string; choiceIndex: number }> = [
  // 405 freeway
  { regex: /405.*爆胎.*拖车/i, eventId: 'freeway_broken', choiceIndex: 0 },
  { regex: /405.*爆胎.*放弃/i, eventId: 'freeway_broken', choiceIndex: 1 },
  // date ghost
  { regex: /Hinge.*鸽.*哭/i, eventId: 'date_ghost', choiceIndex: 0 },
  { regex: /被鸽了.*明天更拼/i, eventId: 'date_ghost', choiceIndex: 1 },
  // wildfire
  { regex: /野火.*电费/i, eventId: 'wildfire_heat', choiceIndex: 0 },
  { regex: /高温预警.*不空调/i, eventId: 'wildfire_heat', choiceIndex: 1 },
  // crystal healing
  { regex: /水晶疗愈.*花了/i, eventId: 'crystal_healing', choiceIndex: 0 },
  { regex: /拒绝了水晶疗愈/i, eventId: 'crystal_healing', choiceIndex: 1 },
  // tiktok
  { regex: /TikTok.*爆了/i, eventId: 'viral_tiktok', choiceIndex: 0 },
  { regex: /删除了视频/i, eventId: 'viral_tiktok', choiceIndex: 1 },
  // taco
  { regex: /Taco.*肚子疼/i, eventId: 'taco_stomach', choiceIndex: 0 },
  { regex: /药店买了止痛药/i, eventId: 'taco_stomach', choiceIndex: 1 },
  // influencer boss
  { regex: /网红老板.*忍了/i, eventId: 'influencer_boss', choiceIndex: 0 },
  { regex: /辞掉了网红助理/i, eventId: 'influencer_boss', choiceIndex: 1 },
  // klarna
  { regex: /买了裙子.*Klarna/i, eventId: 'klarna_popup', choiceIndex: 0 },
  { regex: /关掉了 Klarna/i, eventId: 'klarna_popup', choiceIndex: 1 },
  // uber passenger
  { regex: /奇葩乘客.*小费/i, eventId: 'uber_passenger', choiceIndex: 0 },
  { regex: /打断了他.*小费/i, eventId: 'uber_passenger', choiceIndex: 1 },
  // gym crush
  { regex: /去搭话了/i, eventId: 'gym_crush', choiceIndex: 0 },
  { regex: /尴尬地盯/i, eventId: 'gym_crush', choiceIndex: 1 },
  // erewhon run
  { regex: /进了 Erewhon/i, eventId: 'erewhon_run', choiceIndex: 0 },
  { regex: /绕过了 Erewhon/i, eventId: 'erewhon_run', choiceIndex: 1 },
  // roommate drama
  { regex: /和室友吵了一架/i, eventId: 'roommate_drama', choiceIndex: 0 },
  { regex: /默默收拾了厨房/i, eventId: 'roommate_drama', choiceIndex: 1 },
  // raya
  { regex: /Raya.*回复/i, eventId: 'raya_match', choiceIndex: 0 },
  { regex: /关掉 Raya/i, eventId: 'raya_match', choiceIndex: 1 },
  // parking ticket
  { regex: /停车罚单.*交/i, eventId: 'parking_ticket', choiceIndex: 0 },
  { regex: /停车罚单.*申诉/i, eventId: 'parking_ticket', choiceIndex: 1 },
  // compliment
  { regex: /陌生人夸你/i, eventId: 'compliment_stranger', choiceIndex: 0 },
  // instagram
  { regex: /卸载了 Instagram/i, eventId: 'instagram_envy', choiceIndex: 0 },
  { regex: /继续刷 Instagram/i, eventId: 'instagram_envy', choiceIndex: 1 },
  // trader joes
  { regex: /Trader Joe.*试吃/i, eventId: 'trader_joes', choiceIndex: 0 },
  // director notice
  { regex: /导演主动联系/i, eventId: 'director_notice', choiceIndex: 0 },
  { regex: /婉拒了导演/i, eventId: 'director_notice', choiceIndex: 1 },
  // european mistaken
  { regex: /意大利语搭话/i, eventId: 'european_mistaken', choiceIndex: 0 },
  { regex: /解释了自己不是欧洲/i, eventId: 'european_mistaken', choiceIndex: 1 },
  // old photo
  { regex: /把旧照片收进抽屉/i, eventId: 'old_photo', choiceIndex: 0 },
  { regex: /盯着那张照片看了很久/i, eventId: 'old_photo', choiceIndex: 1 },
  // Flagship events
  { regex: /车流中保持了绝对的优雅/i, eventId: 'event_405_traffic', choiceIndex: 0 },
  { regex: /厚着脸皮向隔壁/i, eventId: 'event_405_traffic', choiceIndex: 1 },
  { regex: /优雅地谢绝/i, eventId: 'event_erewhon_smoothie', choiceIndex: 0 },
  { regex: /假装定位打卡/i, eventId: 'event_erewhon_smoothie', choiceIndex: 1 },
  { regex: /低声说.*有些东西/i, eventId: 'event_old_money_bar', choiceIndex: 0 },
  { regex: /戒指换成了现金/i, eventId: 'event_old_money_bar', choiceIndex: 1 },
  { regex: /买单离席.*无聊/i, eventId: 'event_hinge_crypto_bro', choiceIndex: 0 },
  { regex: /顺着他的虚荣心/i, eventId: 'event_hinge_crypto_bro', choiceIndex: 1 },
  { regex: /隔着门.*准时转账/i, eventId: 'event_ktown_landlord', choiceIndex: 0 },
  { regex: /手机小贷/i, eventId: 'event_ktown_landlord', choiceIndex: 1 },
];

/**
 * Given a Chinese log text string, try to find the matching i18n logKey.
 * Returns null if no match found (log stays as-is).
 */
export function guessLogKey(chineseText: string): string | null {
  if (!chineseText) return null;
  for (const hint of CHINESE_LOG_HINTS) {
    if (hint.regex.test(chineseText)) {
      const map = EVENT_LOG_KEY_MAP[hint.eventId];
      if (map && map[hint.choiceIndex]) return map[hint.choiceIndex];
    }
  }
  return null;
}
