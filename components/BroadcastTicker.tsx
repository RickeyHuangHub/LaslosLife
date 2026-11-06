'use client';

import { useState, useEffect, useMemo } from 'react';
import { getRandomBroadcastKey } from '@/data/broadcasts';
import { useI18n } from '@/components/I18n';

export default function BroadcastTicker() {
  const { t, lang } = useI18n();
  const [key, setKey] = useState(getRandomBroadcastKey);

  useEffect(() => {
    const interval = setInterval(() => {
      setKey(getRandomBroadcastKey());
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Pick 3 distinct broadcast keys for the marquee
  const trio = useMemo(() => {
    const keys = [key];
    while (keys.length < 3) {
      const k = getRandomBroadcastKey();
      if (!keys.includes(k)) keys.push(k);
    }
    return keys;
  }, [key, lang]);

  const resolve = (k: string) => {
    const text = t(k);
    return text === k ? '' : text;
  };

  return (
    <div className="glass-card px-4 py-2 flex items-center gap-2">
      <span className="text-xs text-[#FFD93D]/60 shrink-0">💬</span>
      <div className="marquee-container flex-1 overflow-hidden">
        <span className="marquee-content text-xs text-[#FFF5E4]/50">
          {resolve(trio[0])}&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;
          {resolve(trio[1])}&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;
          {resolve(trio[2])}
        </span>
      </div>
    </div>
  );
}
