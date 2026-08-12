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

interface DialogueLine {
  speaker: 'A' | 'B';
  en: string;
  zh: string;
}

interface Dialogue {
  id: string;
  scene: string;
  emoji: string;
  desc: string;
  lines: DialogueLine[];
}

const DIALOGUES: Dialogue[] = [
  {
    id: 'shop',
    scene: '商店购物',
    emoji: '🛒',
    desc: '在商店买东西',
    lines: [
      { speaker: 'A', en: 'Hello! Can I help you?', zh: '你好！需要帮忙吗？' },
      { speaker: 'B', en: 'Yes, I want an apple.', zh: '是的，我想要一个苹果。' },
      { speaker: 'A', en: 'Here you are. Two yuan, please.', zh: '给你。两元。' },
      { speaker: 'B', en: 'Thank you! Here is the money.', zh: '谢谢！给你钱。' },
      { speaker: 'A', en: 'You are welcome. Bye!', zh: '不客气。再见！' },
      { speaker: 'B', en: 'Goodbye!', zh: '再见！' },
    ],
  },
  {
    id: 'restaurant',
    scene: '餐厅点餐',
    emoji: '🍽️',
    desc: '在餐厅点食物',
    lines: [
      { speaker: 'A', en: 'Welcome! What would you like?', zh: '欢迎！你想吃什么？' },
      { speaker: 'B', en: 'I would like some rice and fish.', zh: '我想要一些米饭和鱼。' },
      { speaker: 'A', en: 'Anything to drink?', zh: '要喝什么吗？' },
      { speaker: 'B', en: 'A glass of milk, please.', zh: '请来一杯牛奶。' },
      { speaker: 'A', en: 'OK. Just a moment.', zh: '好的。稍等。' },
      { speaker: 'B', en: 'Thank you!', zh: '谢谢！' },
    ],
  },
  {
    id: 'school',
    scene: '学校交友',
    emoji: '🏫',
    desc: '在学校认识新朋友',
    lines: [
      { speaker: 'A', en: 'Hi! What is your name?', zh: '嗨！你叫什么名字？' },
      { speaker: 'B', en: 'My name is Tom. And you?', zh: '我叫汤姆。你呢？' },
      { speaker: 'A', en: 'I am Lily. Nice to meet you!', zh: '我是莉莉。很高兴认识你！' },
      { speaker: 'B', en: 'Nice to meet you too.', zh: '我也很高兴认识你。' },
      { speaker: 'A', en: 'Let us play together!', zh: '我们一起玩吧！' },
      { speaker: 'B', en: 'Great idea!', zh: '好主意！' },
    ],
  },
  {
    id: 'home',
    scene: '家庭日常',
    emoji: '🏠',
    desc: '在家和爸爸妈妈说话',
    lines: [
      { speaker: 'A', en: 'Good morning, Mom!', zh: '早上好，妈妈！' },
      { speaker: 'B', en: 'Good morning! Time for breakfast.', zh: '早上好！该吃早餐了。' },
      { speaker: 'A', en: 'What is for breakfast?', zh: '早餐吃什么？' },
      { speaker: 'B', en: 'Eggs and milk. Eat well!', zh: '鸡蛋和牛奶。好好吃！' },
      { speaker: 'A', en: 'Yummy! Thank you, Mom.', zh: '真好吃！谢谢妈妈。' },
      { speaker: 'B', en: 'You are a good child.', zh: '你真乖。' },
    ],
  },
  {
    id: 'park',
    scene: '公园游玩',
    emoji: '🌳',
    desc: '在公园和小朋友玩',
    lines: [
      { speaker: 'A', en: 'Look! A big tree!', zh: '看！一棵大树！' },
      { speaker: 'B', en: 'Yes, and a bird is on it.', zh: '是的，上面有一只鸟。' },
      { speaker: 'A', en: 'I like birds. Do you?', zh: '我喜欢鸟。你呢？' },
      { speaker: 'B', en: 'Me too! They can fly.', zh: '我也是！它们会飞。' },
      { speaker: 'A', en: 'Let us play on the slide.', zh: '我们去玩滑梯吧。' },
      { speaker: 'B', en: 'OK! Race you there!', zh: '好！看谁先到！' },
    ],
  },
  {
    id: 'weather',
    scene: '谈论天气',
    emoji: '☀️',
    desc: '和老师聊天气',
    lines: [
      { speaker: 'A', en: 'Good morning, teacher!', zh: '早上好，老师！' },
      { speaker: 'B', en: 'Good morning! How is the weather?', zh: '早上好！天气怎么样？' },
      { speaker: 'A', en: 'It is sunny today.', zh: '今天是晴天。' },
      { speaker: 'B', en: 'Yes, it is a nice day.', zh: '是的，是个好天气。' },
      { speaker: 'A', en: 'Can we play outside?', zh: '我们能在户外玩吗？' },
      { speaker: 'B', en: 'Of course! Have fun!', zh: '当然！玩得开心！' },
    ],
  },
];

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

          {/* 跟读模式：听原声+我读好了 */}
          {mode === 'repeat' && (
            <div className="flex flex-wrap justify-center gap-2">
              <CandyButton tone="blue" size="sm" onClick={() => speak(currentLine.en, { lang: 'en-US', rate: 0.7 })}>
                {t('words.listenOriginal')}
              </CandyButton>
              <CandyButton tone="green" size="sm" onClick={nextLine} disabled={lineIdx + 1 >= selected.lines.length}>
                {lineIdx + 1 >= selected.lines.length ? t('words.complete') : t('words.iRead')}
              </CandyButton>
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
