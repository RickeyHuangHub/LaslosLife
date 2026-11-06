import { Howl, Howler } from 'howler';

// ─── Audio Manager Singleton ──────────────────────────────────
// Manages all game audio: ambient loop, SFX, and transitions.
// Uses Howler.js for crossfade and lazy loading.

type SoundId =
  | 'ambient'       // 主题曲循环
  | 'action'        // 行动点击
  | 'event'         // 事件触发
  | 'warning'       // 警告/房租
  | 'success'       // 成功
  | 'fail'          // 失败
  | 'aura_up'       // 气质上升
  | 'aura_down'     // 气质下降
  | 'rent_due'      // 房租结算
  | 'eviction'      // 驱逐
  | 'ending_la_queen'   // 结局：LA Queen
  | 'ending_mystery'    // 结局：???
  | 'ending_bad';       // 结局：失败

interface AudioAsset {
  id: SoundId;
  src: string; // relative to public/audio/
  loop?: boolean;
  volume?: number;
}

// ─── Asset Registry ───────────────────────────────────────────
// 主题曲使用用户自创的 Holding_The_Edge.mp3
const AUDIO_ASSETS: AudioAsset[] = [
  { id: 'ambient',       src: 'ambient/Holding_The_Edge.mp3',  loop: true,  volume: 0.25 },
  { id: 'action',        src: 'sfx/click.mp3',           loop: false, volume: 0.4 },
  { id: 'event',         src: 'sfx/event_appear.mp3',    loop: false, volume: 0.5 },
  { id: 'warning',       src: 'sfx/alert.mp3',           loop: false, volume: 0.4 },
  { id: 'success',       src: 'sfx/success.mp3',         loop: false, volume: 0.5 },
  { id: 'fail',          src: 'sfx/fail.mp3',            loop: false, volume: 0.4 },
  { id: 'aura_up',       src: 'sfx/aura_rise.mp3',       loop: false, volume: 0.6 },
  { id: 'aura_down',     src: 'sfx/aura_fade.mp3',       loop: false, volume: 0.4 },
  { id: 'rent_due',      src: 'sfx/rent_due.mp3',        loop: false, volume: 0.5 },
  { id: 'eviction',      src: 'sfx/eviction.mp3',        loop: false, volume: 0.6 },
  { id: 'ending_la_queen', src: 'ending/la_queen.mp3',   loop: false, volume: 0.7 },
  { id: 'ending_mystery',  src: 'ending/mystery.mp3',    loop: false, volume: 0.7 },
  { id: 'ending_bad',      src: 'ending/bad_end.mp3',    loop: false, volume: 0.5 },
];

// ─── State ────────────────────────────────────────────────────
const soundMap = new Map<SoundId, Howl>();
let isMuted = false;
let globalVolume = 0.8;
let isReady = false;

// ─── Play Functions ───────────────────────────────────────────

export function playSound(id: SoundId): void {
  if (isMuted || !isReady) return;

  let sound = soundMap.get(id);

  // Lazy load
  if (!sound) {
    const asset = AUDIO_ASSETS.find((a) => a.id === id);
    if (!asset) return;

    sound = new Howl({
      src: [`/audio/${asset.src}`],
      loop: asset.loop ?? false,
      volume: (asset.volume ?? 0.5) * globalVolume,
    });

    soundMap.set(id, sound);
  }

  sound.play();
}

// ─── Crossfade: stop one sound, start another ─────────────────

export function crossfade(from: SoundId | null, to: SoundId, durationMs = 1000): void {
  if (from && soundMap.has(from)) {
    const prev = soundMap.get(from)!;
    prev.fade(prev.volume(), 0, durationMs);
    setTimeout(() => prev.stop(), durationMs);
  }

  if (to) playSound(to);
}

// ─── Ambient Loop Control ─────────────────────────────────────

export function startAmbient(): void {
  playSound('ambient');
}

export function stopAmbient(): void {
  const ambient = soundMap.get('ambient');
  if (ambient) {
    ambient.fade(ambient.volume(), 0, 500);
    setTimeout(() => ambient.stop(), 500);
  }
}

// ─── Volume & Mute ────────────────────────────────────────────

export function setVolume(vol: number): void {
  globalVolume = Math.max(0, Math.min(1, vol));
  Howler.volume(globalVolume);
  soundMap.forEach((s) => {
    if (s.playing()) {
      s.volume(s.volume()); // Howler handles global volume
    }
  });
}

export function toggleMute(): boolean {
  isMuted = !isMuted;
  Howler.mute(isMuted);
  return isMuted;
}

export function isAudioMuted(): boolean {
  return isMuted;
}

// ─── Ready Check ──────────────────────────────────────────────

export function markAudioReady(): void {
  isReady = true;
}

// ─── Cleanup on unmount ───────────────────────────────────────

export function disposeAll(): void {
  Howler.unload();
  soundMap.clear();
  isReady = false;
}

// ─── Event-driven helpers ─────────────────────────────────────

export function onEventTrigger(): void {
  playSound('event');
}

export function onActionPerform(): void {
  playSound('action');
}

export function onAuraChange(delta: number): void {
  playSound(delta > 0 ? 'aura_up' : 'aura_down');
}

export function onRentDue(): void {
  playSound('rent_due');
  playSound('warning');
}

export function onEviction(): void {
  playSound('eviction');
  playSound('fail');
}

export function onEnding(type: 'win' | 'mystery' | 'bad'): void {
  const map = {
    win: 'ending_la_queen',
    mystery: 'ending_mystery',
    bad: 'ending_bad',
  };
  stopAmbient();
  setTimeout(() => playSound(map[type] as SoundId), 500);
}
