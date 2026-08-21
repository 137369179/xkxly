/**
 * 汉字演变 - 甲骨文→金文→篆书→隶书→楷书
 */

import { useState, useMemo } from 'react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { getHanziByLevel } from '@/data/hanziIndex';
import { HANZI_500 } from '@/data/hanzi500';
import { speak } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { motion } from 'motion/react';
import { useTranslation } from '@/i18n/useTranslation';
import { ExploreReward } from '@/components/study/ExploreReward';

interface EvolveStage {
  name: string;
  emoji: string;
  desc: string;
}

/** 字源演变条目的统一类型：from300 的 HanziEntry 与 from500 映射项在此交汇（P3-3 收敛 as any） */
interface EvolveHanzi {
  c: string;
  p?: string;
  origin?: string;
  evolve?: string;
  radical?: string;
}

const EVOLVE_STAGES: EvolveStage[] = [
  { name: '甲骨文', emoji: '🦴', desc: '刻在龟甲兽骨上的文字，3000多年前的商朝' },
  { name: '金文', emoji: '青铜', desc: '铸在青铜器上的文字，西周时期' },
  { name: '小篆', emoji: '📜', desc: '秦始皇统一文字，线条圆润匀称' },
  { name: '隶书', emoji: '✒️', desc: '汉代通行，笔画平直，字形扁方' },
  { name: '楷书', emoji: '✍️', desc: '魏晋以来通行，就是今天写的字' },
];

// 从 hanzi 数据取有字源描述的字
function getAllHanzi() {
  const from300 = getHanziByLevel(1).filter(h => h.origin && h.evolve);
  const from500 = HANZI_500.map(h => ({ c: h.char, p: h.pinyin, origin: h.originDesc, evolve: h.originDesc, radical: h.radical }));
  // 合并去重
  const map = new Map<string, EvolveHanzi>();
  from300.forEach(h => map.set(h.c, h));
  from500.forEach(h => {
    if (!map.has(h.c)) map.set(h.c, h);
  });
  return [...map.values()];
}

const ALL_HANZI = getAllHanzi();


export function HanziEvolve({ char, onClose }: { char?: string; onClose?: () => void }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(char ?? ALL_HANZI[0]?.c ?? '日');
  const [stageIdx, setStageIdx] = useState(4); // 默认楷书

  const data = useMemo(() => {
    return ALL_HANZI.find(h => h.c === selected) ?? ALL_HANZI[0];
  }, [selected]);

  if (!data) return null;

  return (
    <div className="space-y-4">
      {onClose && (
        <CandyButton tone="blue" variant="soft" size="sm" onClick={() => { sfxTap(); onClose(); }}>
          {t('common.back')}
        </CandyButton>
      )}

      {/* 当前字 */}
      <Panel className="text-center">
        <motion.div
          key={selected}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-8xl font-black text-ink"
        >
          {data.c}
        </motion.div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="rounded-full bg-candy-blue-soft px-3 py-1 text-sm font-bold text-candy-blue-deep">
            {data.p}
          </span>
          <CandyButton tone="blue" size="sm" onClick={() => speak(data.c, { rate: 0.6 })}>
            {t('hanziEvolve.read')}
          </CandyButton>
        </div>
      </Panel>

      {/* 演变阶段选择 */}
      <Panel>
        <h4 className="mb-2 text-sm font-extrabold text-ink">{t('hanziEvolve.fontEvolution')}</h4>
        <div className="flex flex-wrap gap-2">
          {EVOLVE_STAGES.map((s, i) => (
            <CandyButton
              key={s.name}
              tone={stageIdx === i ? 'blue' : 'purple'}
              variant={stageIdx === i ? 'solid' : 'soft'}
              size="sm"
              onClick={() => { sfxTap(); setStageIdx(i); }}
            >
              {s.name}
            </CandyButton>
          ))}
        </div>

        <motion.div
          key={stageIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-2xl bg-candy-blue-soft p-4 text-center"
        >
          <div className="text-center text-5xl font-black leading-tight text-candy-blue-deep sm:text-6xl" style={{ fontFamily: 'serif' }}>
            {data.c}
          </div>
          <p className="mt-2 text-sm font-bold text-ink">{EVOLVE_STAGES[stageIdx]!.name}</p>
          <p className="text-xs font-bold text-ink-soft">{EVOLVE_STAGES[stageIdx]!.desc}</p>
        </motion.div>
      </Panel>

      {/* 字源故事 */}
      <Panel>
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-extrabold text-ink">{t('hanziEvolve.originStory')}</h4>
          <CandyButton tone="purple" size="sm" variant="soft" onClick={() => speak(data.origin || `${data.c}字的演变故事`, { rate: 0.8 })}>
            🔊 听故事
          </CandyButton>
        </div>
        <p className="text-sm font-bold leading-relaxed text-ink-soft">{data.origin}</p>
      </Panel>

      {/* 换字 */}
      <div className="flex flex-wrap gap-2">
        {ALL_HANZI.slice(0, 20).map(h => (
          <button
            key={h.c}
            onClick={() => { sfxTap(); setSelected(h.c); setStageIdx(4); }}
            className={`h-10 w-10 rounded-lg text-lg font-black transition-all ${
              selected === h.c
                ? 'bg-candy-blue-deep text-white scale-110'
                : 'bg-white text-ink hover:bg-candy-blue-soft'
            }`}
          >
            {h.c}
          </button>
        ))}
      </div>
    
      <ExploreReward rewardKey="hanzi-evolve" scene="hanzi" tone="blue" /></div>
  );
}
