/**
 * 数学竖式计算 - 分步演示加减乘除竖式
 */

import { useState, useMemo } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap } from '@/lib/sfx';

type Op = 'add' | 'sub' | 'mul' | 'div';

const OPS: { id: Op; label: string; emoji: string }[] = [
  { id: 'add', label: '加法', emoji: '➕' },
  { id: 'sub', label: '减法', emoji: '➖' },
  { id: 'mul', label: '乘法', emoji: '✖️' },
  { id: 'div', label: '除法', emoji: '➗' },
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
        arr.push(`个位${i === 0 ? '' : i === 1 ? '十' : '百'}：${ai} ${OP_SYMBOL[op]} ${bi} = ${ri}`);
      }
    } else if (op === 'mul') {
      const bStr = String(b);
      for (let i = 0; i < bStr.length; i++) {
        const bi = parseInt(bStr[bStr.length - 1 - i]!);
        arr.push(`${a} × ${bi} = ${a * bi}`);
      }
      arr.push(`相加 = ${result}`);
    } else {
      arr.push(`${a} ÷ ${b} = ${result}`);
      arr.push(`验证：${result} × ${b} = ${result * b}`);
    }
    return arr;
  }, [op, a, b, result]);

  const aStr = String(a);
  const bStr = String(b);
  const rStr = String(result);
  const maxLen = Math.max(aStr.length, bStr.length, rStr.length);

  return (
    <div className="space-y-4">
      <PageHeader emoji="📝" title="竖式计算" subtitle="分步演示加减乘除" tone="blue" />

      <div className="flex flex-wrap gap-2">
        {OPS.map(o => (
          <CandyButton
            key={o.id}
            tone={op === o.id ? 'blue' : 'purple'}
            variant={op === o.id ? 'solid' : 'soft'}
            size="sm"
            onClick={() => newQuestion(o.id)}
          >
            {o.emoji} {o.label}
          </CandyButton>
        ))}
      </div>

      {/* 竖式展示 */}
      <Panel className="text-center">
        <div className="mx-auto inline-block font-mono text-3xl">
          {/* 第一个数 */}
          <div className="text-right" style={{ minWidth: `${maxLen + 2}ch` }}>
            {aStr}
          </div>
          {/* 运算符+第二个数 */}
          <div className="text-right border-b-2 border-ink" style={{ minWidth: `${maxLen + 2}ch` }}>
            {OP_SYMBOL[op]}{bStr}
          </div>
          {/* 结果 */}
          <div className="text-right" style={{ minWidth: `${maxLen + 2}ch` }}>
            {showSteps ? rStr : '？'}
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-2">
          <CandyButton tone="blue" size="sm" onClick={() => { sfxTap(); setShowSteps(s => !s); }}>
            {showSteps ? '🙈 隐藏答案' : '👁️ 显示答案'}
          </CandyButton>
          <CandyButton tone="green" size="sm" onClick={() => newQuestion()}>
            🔄 换一题
          </CandyButton>
        </div>
      </Panel>

      {/* 分步讲解 */}
      {showSteps && (
        <Panel>
          <h4 className="mb-2 text-sm font-extrabold text-ink">📋 计算步骤</h4>
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
    </div>
  );
}
