/**
 * 速算排行榜 - localStorage 持久化速算记录
 */

import { useState, useEffect } from 'react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap } from '@/lib/sfx';
import { motion } from 'motion/react';
import { safeSetItem, safeRemoveItem, safeGetItem, safeParseJSON } from '@/lib/safeStorage';
import { useTranslation } from '@/i18n/useTranslation';

interface SpeedRecord {
  name: string;
  score: number;
  time: number; // 秒
  date: string;
  level: 1 | 2 | 3;
}

function getRecords(): SpeedRecord[] {
  const raw = safeGetItem('speed-records');
  return safeParseJSON(raw ?? '[]', []);
}

function saveRecords(records: SpeedRecord[]) {
  safeSetItem('speed-records', JSON.stringify(records.slice(0, 30)));
}

export function addSpeedRecord(name: string, score: number, time: number, level: 1 | 2 | 3) {
  const records = getRecords();
  records.push({
    name: name || '小宝贝',
    score,
    time,
    date: new Date().toISOString().slice(0, 10),
    level,
  });
  // 按分数降序+时间升序排
  records.sort((a, b) => b.score - a.score || a.time - b.time);
  saveRecords(records);
}

export function SpeedRankings({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<SpeedRecord[]>([]);
  const [level, setLevel] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    setRecords(getRecords().filter(r => r.level === level));
  }, [level]);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-3">
      {onClose && (
        <CandyButton tone="purple" variant="soft" size="sm" onClick={() => { sfxTap(); onClose(); }}>
          {t('speedRankings.back')}
        </CandyButton>
      )}

      <div className="flex gap-2">
        {[1, 2, 3].map(l => (
          <CandyButton
            key={l}
            tone={level === l ? 'orange' : 'purple'}
            variant={level === l ? 'solid' : 'soft'}
            size="sm"
            onClick={() => { sfxTap(); setLevel(l as 1 | 2 | 3); }}
          >
            Level {l}
          </CandyButton>
        ))}
      </div>

      {records.length === 0 ? (
        <Panel className="text-center">
          <div className="text-4xl">🏆</div>
          <p className="mt-2 text-sm font-bold text-ink-soft">{t('speedRankings.empty', { level })}</p>
          <p className="text-xs font-bold text-ink-soft">{t('speedRankings.emptyTip')}</p>
        </Panel>
      ) : (
        <div className="space-y-2">
          {records.slice(0, 10).map((r, i) => (
            <motion.div
              key={`r-${i}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Panel className={`flex items-center gap-3 ${i < 3 ? 'bg-candy-yellow-soft' : ''}`}>
                <span className="w-8 text-center text-xl">
                  {i < 3 ? medals[i] : i + 1}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-extrabold text-ink">{r.name}</div>
                  <div className="text-xs font-bold text-ink-soft">{r.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-candy-orange-deep">⭐{r.score}</div>
                  <div className="text-xs font-bold text-ink-soft">{r.time}s</div>
                </div>
              </Panel>
            </motion.div>
          ))}
        </div>
      )}

      {records.length > 0 && (
        <div className="flex justify-end">
          <CandyButton
            tone="pink"
            variant="soft"
            size="sm"
            onClick={() => {
              sfxTap();
              safeRemoveItem('speed-records');
              setRecords([]);
            }}
          >
            {t('speedRankings.clear')}
          </CandyButton>
        </div>
      )}
    </div>
  );
}
