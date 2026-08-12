/**
 * 偏旁部首汉字魔法组合组件 🏯 (Radicals Magic)
 * ------------------------------------------------------------
 * 让 5-6 岁儿童理解汉字造字法逻辑：
 * 氵(水) + 木 = 沐
 * 木 + 木 = 林
 * 日 + 月 = 明
 * 女 + 子 = 好
 */

import { useState } from 'react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { speak } from '@/lib/speech';

interface RadicalPair {
  r1: string;
  r2: string;
  res: string;
  pinyin: string;
  meaning: string;
  emoji: string;
}

const RADICAL_PAIRS: RadicalPair[] = [
  { r1: '氵(三点水)', r2: '水', res: '淼', pinyin: 'miǎo', meaning: '水广阔辽远的样子', emoji: '🌊' },
  { r1: '木', r2: '木', res: '林', pinyin: 'lín', meaning: '成片的树木叫树林', emoji: '🌲' },
  { r1: '日(太阳)', r2: '月(月亮)', res: '明', pinyin: 'míng', meaning: '太阳和月亮都很明亮', emoji: '☀️' },
  { r1: '女', r2: '子', res: '好', pinyin: 'hǎo', meaning: '女子怀抱幼儿，表示美好', emoji: '👍' },
  { r1: '亻(单人旁)', r2: '木(树木)', res: '休', pinyin: 'xiū', meaning: '人靠在树木边休息', emoji: '💤' },
  { r1: '口', r2: '鸟', res: '鸣', pinyin: 'míng', meaning: '鸟儿张口鸣叫', emoji: '🐦' },
];

export function RadicalsMagic() {
  const [idx, setIdx] = useState(0);
  const current = RADICAL_PAIRS[idx]!!
  const [merged, setMerged] = useState(false);

  const handleMerge = () => {
    sfxCorrect();
    setMerged(true);
    speak(`${current.r1} 加上 ${current.r2}，合成了 ${current.res} 字！${current.pinyin}！`, { lang: 'zh-CN' });
  };

  const handleNext = () => {
    sfxTap();
    setMerged(false);
    setIdx((idx + 1) % RADICAL_PAIRS.length);
  };

  return (
    <div className="rounded-3xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 p-5 text-center space-y-4 shadow-fluffy">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-purple-700 shadow-sm">
          🏯 偏旁部首汉字魔法 ({idx + 1} / {RADICAL_PAIRS.length})
        </span>
        <span className="text-3xl">{current.emoji}</span>
      </div>

      <h3 className="text-lg font-black text-purple-900">
        点击魔法棒，把两个部首合体变成新汉字！
      </h3>

      {/* 偏旁组合展现 */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex h-20 w-24 items-center justify-center rounded-2xl border-2 border-purple-200 bg-white text-xl font-black text-purple-900 shadow-sm">
          {current.r1}
        </div>
        <span className="text-3xl font-black text-purple-400">+</span>
        <div className="flex h-20 w-24 items-center justify-center rounded-2xl border-2 border-purple-200 bg-white text-xl font-black text-purple-900 shadow-sm">
          {current.r2}
        </div>
        <span className="text-3xl font-black text-purple-400">=</span>
        <div className={`flex h-20 w-24 items-center justify-center rounded-2xl border-4 text-4xl font-black shadow-fluffy transition-all ${merged ? 'border-purple-500 bg-purple-500 text-white scale-110' : 'border-dashed border-purple-300 bg-white text-gray-300'}`}>
          {merged ? current.res : '?'}
        </div>
      </div>

      {merged && (
        <div className="rounded-2xl bg-white p-3 shadow-sm inline-block space-y-1">
          <div className="text-xl font-black text-purple-900">
            {current.res} <span className="text-sm font-extrabold text-pink-600">({current.pinyin})</span>
          </div>
          <p className="text-xs font-bold text-purple-700">💡 字义：{current.meaning}</p>
        </div>
      )}

      {/* 按钮 */}
      <div className="flex justify-center gap-3 pt-2">
        {!merged ? (
          <CandyButton tone="purple" size="md" onClick={handleMerge}>
            🪄 施展部首合成魔法
          </CandyButton>
        ) : (
          <CandyButton tone="orange" size="md" onClick={handleNext}>
            🚀 下一组偏旁 ➔
          </CandyButton>
        )}
      </div>
    </div>
  );
}
