'use client';

import { useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toggleMute, isAudioMuted, startAmbient, markAudioReady, disposeAll, setVolume } from '@/lib/audio';
import { useI18n } from '@/components/I18n';

export default function AudioControl() {
  const { t } = useI18n();
  const [muted, setMuted] = useState(true);
  const [volume, setVolumeState] = useState(0.8);
  const [showControls, setShowControls] = useState(false);

  const handleInteraction = useCallback(() => {
    markAudioReady();
    if (!muted) startAmbient();
    document.removeEventListener('click', handleInteraction);
    document.removeEventListener('keydown', handleInteraction);
  }, [muted]);

  useEffect(() => {
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    return () => { disposeAll(); document.removeEventListener('click', handleInteraction); document.removeEventListener('keydown', handleInteraction); };
  }, [handleInteraction]);

  const handleClick = () => {
    const newState = toggleMute();
    setMuted(newState);
    if (!newState) startAmbient();
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {showControls && !muted && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="mb-1 glass-card px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-[#FFF5E4]/60">🔊</span>
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); setVolumeState(v); }} className="w-24 accent-[#FF6B9D]" />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={handleClick} onMouseEnter={() => setShowControls(true)} onMouseLeave={() => setShowControls(false)} className="w-10 h-10 rounded-full bg-[#16213E]/90 backdrop-blur border border-[#FF6B9D]/30 flex items-center justify-center hover:bg-[#FF6B9D]/20 transition-all" aria-label={muted ? t('unmute_audio') : t('mute_audio')}>
        {muted ? <VolumeX className="w-5 h-5 text-[#FFF5E4]/50" /> : <Volume2 className="w-5 h-5 text-[#FF6B9D]" />}
      </motion.button>
    </div>
  );
}
