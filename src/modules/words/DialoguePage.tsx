/**
 * 英语情景对话练习
 */

import { useStore } from '@/store/useStore';
import { useState, useRef, useEffect } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { randomPraise, randomEncourage } from '@/lib/speech';
import { useTranslation } from '@/i18n/useTranslation';
import { SpeechEvalButton } from '@/components/SpeechEvalButton';

import { DIALOGUES, type Dialogue } from '@/data/dialogues';



export function DialoguePage() {
  const { t } = useTranslation();
  const practice = useStore((s) => s.practice);
  const learnSkill = useStore((s) => s.learnSkill);
  const [selected, setSelected] = useState<Dialogue | null>(null);
  const [lineIdx, setLineIdx] = useState(0);
  const [mode, setMode] = useState<'learn' | 'practice' | 'repeat'>('learn');
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'none' | 'right' | 'wrong'>('none');
  const [score, setScore] = useState(0);

  // 跟踪自动播放第一句的 timeout，便于卸载/切换对话时清理
  const firstLineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清理挂起的 timeout
  useEffect(() => {
    return () => {
      if (firstLineTimerRef.current) {
        clearTimeout(firstLineTimerRef.current);
        firstLineTimerRef.current = null;
      }
    };
  }, []);

  const currentLine = selected ? selected.lines[lineIdx] : null;

  const startDialogue = (d: Dialogue) => {
    sfxTap();
    // 切换对话时清理旧的 timeout
    if (firstLineTimerRef.current) {
      clearTimeout(firstLineTimerRef.current);
      firstLineTimerRef.current = null;
    }
    setSelected(d);
    setLineIdx(0);
    setMode('learn');
    setInput('');
    setFeedback('none');
    setScore(0);
    // 记录开始学习该对话
    learnSkill(`dialogue:${d.id}`);
    // 自动播放第一句（跟读模式下也会播放）
    firstLineTimerRef.current = setTimeout(() => {
      firstLineTimerRef.current = null;
      speak(d.lines[0]!.en, { lang: 'en-US', rate: 0.75 });
    }, 300);
  };

  const nextLine = () => {
    if (!selected) return;
    sfxTap();
    if (lineIdx + 1 < selected.lines.length) {
      const next = lineIdx + 1;
      setLineIdx(next);
      setInput('');
      setFeedback('none');
      if (mode === 'learn') {
        speak(selected.lines[next]!.en, { lang: 'en-US', rate: 0.75 });
      }
    } else {
      // 完成全部对话：发放完成奖励
      sfxStar();
      celebrateSmall();
      practice(`word:dialogue:${selected.id}`, true, 2);
    }
  };

  const checkAnswer = () => {
    if (!currentLine || !selected || !input.trim()) return;
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const isRight = clean(input) === clean(currentLine.en);
    setFeedback(isRight ? 'right' : 'wrong');
    // 回写掌握度：单句练习计入对话掌握度
    if (isRight) {
      practice(`word:dialogue:${selected.id}:${lineIdx}`, true, 1);
      sfxCorrect();
      randomPraise();
      setScore(s => s + 10);
    } else {
      practice(`word:dialogue:${selected.id}:${lineIdx}`, false, 0);
      sfxWrong();
      randomEncourage();
    }
  };

  if (!selected) {
    return (
      <div className="space-y-4">
        <PageHeader emoji="💬" title={t('words.dialoguePageTitle')} subtitle={t('words.dialogueSubtitle')} tone="pink" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DIALOGUES.map(d => (
            <button
              key={d.id}
              onClick={() => startDialogue(d)}
              className="flex items-center gap-3 rounded-2xl border-4 border-candy-pink-soft bg-white p-3 text-left transition-all active:translate-y-[1px] hover:bg-candy-pink-soft"
            >
              <span className="text-3xl">{d.emoji}</span>
              <div className="flex-1">
                <div className="text-base font-extrabold text-ink">{d.scene}</div>
                <div className="text-xs font-bold text-ink-soft">{d.desc} · {t('words.lineCount', { count: d.lines.length })}</div>
              </div>
              <span className="text-xl">▶️</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CandyButton tone="pink" variant="soft" size="sm" onClick={() => { sfxTap(); setSelected(null); }}>
          {t('words.back')}
        </CandyButton>
        <span className="text-sm font-extrabold text-ink">
          {selected.emoji} {selected.scene} · {lineIdx + 1}/{selected.lines.length}
        </span>
        <div className="flex gap-1">
          <CandyButton
            tone={mode === 'learn' ? 'pink' : 'purple'}
            variant={mode === 'learn' ? 'solid' : 'soft'}
            size="sm"
            onClick={() => { setMode('learn'); sfxTap(); }}
          >
            {t('words.learnMode')}
          </CandyButton>
          <CandyButton
            tone={mode === 'practice' ? 'pink' : 'purple'}
            variant={mode === 'practice' ? 'solid' : 'soft'}
            size="sm"
            onClick={() => { setMode('practice'); sfxTap(); }}
          >
            {t('words.practiceMode')}
          </CandyButton>
          <CandyButton
            tone={mode === 'repeat' ? 'blue' : 'purple'}
            variant={mode === 'repeat' ? 'solid' : 'soft'}
            size="sm"
            onClick={() => { setMode('repeat'); sfxTap(); }}
          >
            {t('words.repeatMode')}
          </CandyButton>
        </div>
      </div>

      {currentLine && (
        <Panel className="space-y-3">
          {/* 对话气泡 */}
          <div className={`flex ${currentLine.speaker === 'A' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[80%] rounded-2xl p-3 ${
                currentLine.speaker === 'A'
                  ? 'bg-candy-blue-soft text-candy-blue-deep'
                  : 'bg-candy-pink-soft text-candy-pink-deep'
              }`}
            >
              <div className="text-xs font-bold opacity-70 mb-1">
                {currentLine.speaker === 'A' ? t('words.otherPerson') : t('words.me')}
              </div>
              {mode === 'learn' || mode === 'repeat' || feedback !== 'none' ? (
                <>
                  <p className="text-base font-extrabold">{currentLine.en}</p>
                  <p className="text-sm font-bold opacity-70">{currentLine.zh}</p>
                </>
              ) : (
                <p className="text-sm font-bold opacity-60">🎙️ {currentLine.zh}</p>
              )}
            </div>
          </div>

          {/* 学习模式：播放+翻页 */}
          {mode === 'learn' && (
            <div className="flex flex-wrap justify-center gap-2">
              <CandyButton tone="blue" size="sm" onClick={() => speak(currentLine.en, { lang: 'en-US', rate: 0.6 })}>
                {t('words.slowRead')}
              </CandyButton>
              <CandyButton tone="pink" size="sm" onClick={() => speak(currentLine.en, { lang: 'en-US', rate: 0.85 })}>
                {t('words.normalSpeed')}
              </CandyButton>
              <CandyButton tone="green" size="sm" onClick={nextLine} disabled={lineIdx + 1 >= selected.lines.length}>
                {lineIdx + 1 >= selected.lines.length ? t('words.complete') : t('words.nextLine')}
              </CandyButton>
            </div>
          )}

          {/* 跟读模式：听原声 + 发音评测（SpeechEvalButton 评分通过才算读好） */}
          {mode === 'repeat' && (
            <div className="space-y-2">
              <div className="flex justify-center gap-2">
                <CandyButton tone="blue" size="sm" onClick={() => speak(currentLine.en, { lang: 'en-US', rate: 0.7 })}>
                  {t('words.listenOriginal')}
                </CandyButton>
              </div>
              <SpeechEvalButton
                targetText={currentLine.en}
                lang="en-US"
                onPass={() => nextLine()}
                className="w-full"
              />
            </div>
          )}

          {/* 练习模式：输入句子 */}
          {mode === 'practice' && (
            <>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') checkAnswer(); }}
                placeholder={t('words.inputPlaceholder')}
                className={`w-full rounded-2xl border-4 px-4 py-3 text-base font-bold outline-none ${
                  feedback === 'right'
                    ? 'border-candy-green-deep bg-candy-green-soft'
                    : feedback === 'wrong'
                    ? 'border-candy-red-deep bg-candy-red-soft'
                    : 'border-candy-pink-soft bg-white'
                }`}
                autoFocus
              />
              {feedback === 'wrong' && (
                <p className="text-sm font-bold text-candy-red-deep">{t('words.correctAnswer', { answer: currentLine.en })}</p>
              )}
              <div className="flex justify-center gap-2">
                <CandyButton
                  tone="green"
                  size="sm"
                  disabled={!input.trim() || feedback !== 'none'}
                  onClick={checkAnswer}
                >
                  {t('words.check')}
                </CandyButton>
                <CandyButton tone="blue" variant="soft" size="sm" onClick={() => speak(currentLine.en, { lang: 'en-US', rate: 0.6 })}>
                  {t('words.hint')}
                </CandyButton>
                <CandyButton tone="pink" size="sm" onClick={nextLine} disabled={lineIdx + 1 >= selected.lines.length}>
                  {lineIdx + 1 >= selected.lines.length ? t('words.complete') : t('words.nextLine')}
                </CandyButton>
              </div>
            </>
          )}

          {/* 得分 */}
          {mode === 'practice' && score > 0 && (
            <div className="text-center text-sm font-extrabold text-candy-pink-deep">{t('words.score', { score })}</div>
          )}
        </Panel>
      )}
    </div>
  );
}
