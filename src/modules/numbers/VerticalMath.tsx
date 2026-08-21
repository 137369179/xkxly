/**
 * 数学竖式计算 - 分步演示加减乘除竖式
 */

import { useState, useMemo } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';
import { ExploreReward } from '@/components/study/ExploreReward';

type Op = 'add' | 'sub' | 'mul' | 'div';

const OPS: { id: Op; labelKey: string; emoji: string }[] = [
  { id: 'add', labelKey: 'verticalMath.op.add', emoji: '➕' },
  { id: 'sub', labelKey: 'verticalMath.op.sub', emoji: '➖' },
  { id: 'mul', labelKey: 'verticalMath.op.mul', emoji: '✖️' },
  { id: 'div', labelKey: 'verticalMath.op.div', emoji: '➗' },
];

function genNum(op: Op): [number, number] {
  switch (op) {
    case 'add': {
      const a = Math.floor(Math.random() * 80) + 10;
      const b = Math.floor(Math.random() * 80) + 10;
      return [a, b];
    }
    case 'sub': {
      const a = Math.floor(Math.random() * 80) + 20;
      const b = Math.floor(Math.random() * (a - 1)) + 1;
      return [a, b];
    }
    case 'mul': {
      const a = Math.floor(Math.random() * 8) + 2;
      const b = Math.floor(Math.random() * 8) + 2;
      return [a, b];
    }
    case 'div': {
      const b = Math.floor(Math.random() * 8) + 2;
      const q = Math.floor(Math.random() * 8) + 2;
      return [b * q, b];
    }
  }
}

function calc(op: Op, a: number, b: number): number {
  switch (op) {
    case 'add': return a + b;
    case 'sub': return a - b;
    case 'mul': return a * b;
    case 'div': return a / b;
  }
}

const OP_SYMBOL: Record<Op, string> = { add: '+', sub: '−', mul: '×', div: '÷' };

export function VerticalMath() {
  const { t } = useTranslation();
  const [op, setOp] = useState<Op>('add');
  const [nums, setNums] = useState<[number, number]>(() => genNum('add'));
  const [showSteps, setShowSteps] = useState(false);

  const [a, b] = nums;
  const result = calc(op, a, b);

  const newQuestion = (newOp?: Op) => {
    sfxTap();
    const o = newOp ?? op;
    if (newOp) setOp(newOp);
    setNums(genNum(o));
    setShowSteps(false);
  };

  // 竖式分步
  const steps = useMemo(() => {
    const arr: string[] = [];
    if (op === 'add' || op === 'sub') {
      const aStr = String(a);
      const bStr = String(b);
      const maxLen = Math.max(aStr.length, bStr.length);
      for (let i = 0; i < maxLen; i++) {
        const ai = parseInt(aStr[aStr.length - 1 - i] ?? '0');
        const bi = parseInt(bStr[bStr.length - 1 - i] ?? '0');
        const ri = op === 'add' ? ai + bi : ai - bi;
        arr.push(`${t(i === 0 ? 'verticalMath.placeOnes' : i === 1 ? 'verticalMath.placeTens' : 'verticalMath.placeHundreds')}：${ai} ${OP_SYMBOL[op]} ${bi} = ${ri}`);
      }
    } else if (op === 'mul') {
      const bStr = String(b);
      for (let i = 0; i < bStr.length; i++) {
        const bi = parseInt(bStr[bStr.length - 1 - i]!);
        arr.push(`${a} × ${bi} = ${a * bi}`);
      }
      arr.push(`${t('verticalMath.sumLabel')} = ${result}`);
    } else {
      arr.push(`${a} ÷ ${b} = ${result}`);
      arr.push(`${t('verticalMath.verifyLabel')}：${result} × ${b} = ${result * b}`);
    }
    return arr;
  }, [op, a, b, result]);

  const aStr = String(a);
  const bStr = String(b);
  const rStr = String(result);
  const maxLen = Math.max(aStr.length, bStr.length, rStr.length);

  return (
    <div className="space-y-4">
      <PageHeader emoji="📝" title={t('verticalMath.title')} subtitle={t('verticalMath.subtitle')} tone="blue" />

      <div className="flex flex-wrap gap-2">
        {OPS.map(o => (
          <CandyButton
            key={o.id}
            tone={op === o.id ? 'blue' : 'purple'}
            variant={op === o.id ? 'solid' : 'soft'}
            size="sm"
            onClick={() => newQuestion(o.id)}
          >
            {o.emoji} {t(o.labelKey)}
          </CandyButton>
        ))}
      </div>

      {/* 竖式展示 */}
      <Panel className="text-center !py-6">
        <div className="mx-auto inline-block font-mono text-5xl font-black leading-tight sm:text-6xl">
          {/* 进位/借位标记行 */}
          <div className="text-right text-xs font-black text-candy-pink-deep h-4" style={{ minWidth: `${maxLen + 2}ch` }}>
            {op === 'add' && (a % 10) + (b % 10) >= 10 && showSteps && (
              <span className="inline-block rounded-full bg-pink-100 px-1 border border-pink-300 mr-4">¹</span>
            )}
            {op === 'sub' && (a % 10) < (b % 10) && showSteps && (
              <span className="inline-block text-candy-purple-deep mr-4 font-black">· (借1当10)</span>
            )}
          </div>
          {/* 第一个数 */}
          <div className="text-right tracking-widest" style={{ minWidth: `${maxLen + 2}ch` }}>
            {aStr}
          </div>
          {/* 运算符+第二个数 */}
          <div className="text-right border-b-4 border-ink tracking-widest pb-1" style={{ minWidth: `${maxLen + 2}ch` }}>
            <span className="text-candy-purple-deep mr-2">{OP_SYMBOL[op]}</span>{bStr}
          </div>
          {/* 结果 */}
          <div className="text-right text-candy-green-deep tracking-widest pt-2 font-black" style={{ minWidth: `${maxLen + 2}ch` }}>
            {showSteps ? rStr : '？'}
          </div>
        </div>

        <div className="mt-5 flex justify-center gap-3">
          <CandyButton tone="blue" size="md" onClick={() => { sfxTap(); setShowSteps(s => !s); }}>
            {showSteps ? t('verticalMath.hideAnswer') : `💡 ${t('verticalMath.showAnswer')}`}
          </CandyButton>
          <CandyButton tone="green" size="md" onClick={() => newQuestion()}>
            🔄 {t('verticalMath.newQuestion')}
          </CandyButton>
        </div>
      </Panel>

      {/* 分步讲解 */}
      {showSteps && (
        <Panel>
          <h4 className="mb-2 text-sm font-extrabold text-ink">{t('verticalMath.stepsTitle')}</h4>
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={`s-${i}`} className="rounded-xl bg-candy-blue-soft p-2 text-sm font-bold text-candy-blue-deep">
                {i + 1}. {s}
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-candy-green-soft p-3 text-center text-lg font-black text-candy-green-deep">
            {a} {OP_SYMBOL[op]} {b} = {result}
          </div>
        </Panel>
      )}
    
      <ExploreReward rewardKey="number-vertical" scene="number" tone="green" /></div>
  );
}
