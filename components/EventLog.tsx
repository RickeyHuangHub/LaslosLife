'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useI18n } from '@/components/I18n';

export default function EventLog() {
  const { logs } = useGameStore();
  const { t } = useI18n();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Helper: get localized log text
  function getLogText(log: typeof logs[0]): string {
    if (log.logKey) {
      const template = t(log.logKey);
      if (template !== log.logKey && log.logParams) {
        // Replace {param} placeholders with actual values
        let result = template;
        for (const [key, value] of Object.entries(log.logParams)) {
          result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        }
        return result;
      }
      if (template !== log.logKey) return template;
    }
    return log.text; // fallback to raw stored text
  }

  return (
    <div className="glass-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-display text-[#FFF5E4]/40 uppercase tracking-wider">
          {t('event_log')}
        </span>
      </div>
      <div className="event-log-scroll max-h-32 overflow-y-auto space-y-1 text-xs">
        {logs.length === 0 ? (
          <p className="text-[#FFF5E4]/30 italic">{t('no_events')}</p>
        ) : (
          logs.map((log) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-[#FFF5E4]/70 leading-relaxed">
              <span className="text-[#FFF5E4]/30 mr-2">
                {log.day}/{t('of')} {log.timeSlot === 'morning' ? t('morning') : log.timeSlot === 'afternoon' ? t('afternoon') : t('evening')}
              </span>
              {getLogText(log)}
            </motion.div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
