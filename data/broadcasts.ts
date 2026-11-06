// Broadcast ticker messages — i18n keys with {name} placeholders
// The player name is injected at runtime, so these are templates.

export const BROADCAST_KEYS: string[] = [
  'broadcast_01',
  'broadcast_02',
  'broadcast_03',
  'broadcast_04',
  'broadcast_05',
  'broadcast_06',
  'broadcast_07',
  'broadcast_08',
  'broadcast_09',
  'broadcast_10',
  'broadcast_11',
  'broadcast_12',
  'broadcast_13',
  'broadcast_14',
  'broadcast_15',
];

export function getRandomBroadcastKey(): string {
  return BROADCAST_KEYS[Math.floor(Math.random() * BROADCAST_KEYS.length)];
}
