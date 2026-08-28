/**
 * 🔒 成人守护门禁 (Adult Gate Modal)
 * ------------------------------------------------------------------
 * 专为儿童教育产品设计的家长身份验证屏障（符合 COPPA 与儿童数字保护规范）。
 * 采用乘法算术题与防猜错随机机制，防止 3-6 岁儿童误操作或绕过防沉迷限制。
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { sfxTap, sfxWrong, sfxWin, triggerHaptic } from '@/lib/sfx';
import { CandyButton } from '@/components/ui/Button';

export interface AdultGateModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  onSuccess: () => void;
  onClose: () => void;
}

interface Question {
  text: string;
  answer: number;
  options: number[];
}

function generateQuestion(): Question {
  // 生成 6~9 乘 3~9 的中高阶乘法题（超出学龄前儿童自解能力）
  const a = Math.floor(Math.random() * 4) + 6; // 6, 7, 8, 9
  const b = Math.floor(Math.random() * 7) + 3; // 3 ~ 9
  const answer = a * b;

  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const delta = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
    const candidate = answer + delta;
    if (candidate > 0 && candidate !== answer) {
      distractors.add(candidate);
    }
  }

  const options = Array.from(distractors).concat(answer);
  options.sort(() => Math.random() - 0.5);

  return {
    text: `${a} × ${b} = ?`,
    answer,
    options,
  };
}

export function AdultGateModal({
  isOpen,
  title = '家长专属验证',
  subtitle = '为了保护宝贝的视力与安全设置，请爸爸妈妈完成以下算术题：',
  onSuccess,
  onClose,
}: AdultGateModalProps) {
  const [nonce, setNonce] = useState(0);
  const [errorNotice, setErrorNotice] = useState(false);

  const question = useMemo(() => generateQuestion(), [nonce]);

  const handleSelectOption = useCallback(
    (opt: number) => {
      if (opt === question.answer) {
        sfxWin();
        triggerHaptic(45);
        onSuccess();
      } else {
        sfxWrong();
        triggerHaptic(20);
        setErrorNotice(true);
        // 答错后立即刷新题目，防止儿童穷举点击
        setTimeout(() => {
          setErrorNotice(false);
          setNonce((n) => n + 1);
        }, 600);
      }
    },
    [question.answer, onSuccess],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        sfxTap();
        onClose();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const opt = question.options[idx];
        if (opt !== undefined) {
          e.preventDefault();
          handleSelectOption(opt);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        sfxTap();
        setNonce((n) => n + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, question.options, handleSelectOption, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adult-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md"
    >
      <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl border-4 border-emerald-200 text-center animate-in fade-in zoom-in-95">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
          🔒
        </div>

        <h3 id="adult-gate-title" className="mt-3 text-xl font-black text-slate-800">{title}</h3>
        <p className="mt-1.5 text-xs font-bold text-slate-500 leading-relaxed">
          {subtitle}
        </p>

        <div className="my-5 rounded-2xl bg-emerald-50/80 p-4 border-2 border-emerald-100">
          <span className="text-3xl font-black text-emerald-900 font-mono tracking-wider">
            {question.text}
          </span>
        </div>

        {errorNotice && (
          <p className="mb-3 text-xs font-black text-rose-500 animate-shake">
            答案不对哦，请爸爸妈妈重新算一算～
          </p>
        )}

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {question.options.map((opt, idx) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelectOption(opt)}
              className="min-h-[48px] rounded-2xl border-2 border-emerald-200 bg-white py-3 text-lg font-black text-emerald-900 shadow-sm hover:bg-emerald-500 hover:text-white hover:border-emerald-500 active:scale-95 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
            >
              <span className="text-xs text-emerald-500 mr-1 font-bold">[{idx + 1}]</span>
              {opt}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => { sfxTap(); setNonce((n) => n + 1); }}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 underline focus:outline-none"
          >
            换一道题 🔄
          </button>
          <CandyButton tone="purple" size="sm" variant="soft" onClick={() => { sfxTap(); onClose(); }}>
            取消
          </CandyButton>
        </div>
      </div>
    </div>
  );
}
