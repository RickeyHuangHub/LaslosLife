export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function formatMoney(n: number) {
  return `$${n >= 0 ? '' : ''}${n}`;
}

export const TIME_SLOT_LABEL: Record<string, string> = {
  morning: '上午',
  afternoon: '下午',
  evening: '晚上',
};

export function timeSlotLabel(slot: string) {
  return TIME_SLOT_LABEL[slot] ?? slot;
}
