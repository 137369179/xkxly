import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap } from '@/lib/sfx';

export function VoiceControls({
  isMuted,
  isListening,
  onToggleMute,
  onHangUp,
  onToggleListen,
}: {
  isMuted: boolean;
  isListening: boolean;
  onToggleMute: () => void;
  onHangUp: () => void;
  onToggleListen: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-3 gap-2 border-t border-pink-200/40 bg-white/40 px-4 pb-3 pt-2 sm:px-5 sm:pb-3.5">
      <button
        type="button"
        onClick={onToggleMute}
        className={`flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-black transition-all active:scale-95 ${
          isMuted
            ? 'border-2 border-amber-400 bg-amber-100 text-amber-900 shadow-xs'
            : 'border border-pink-200 bg-white/80 text-pink-700 hover:bg-pink-50 shadow-xs'
        }`}
      >
        {isMuted ? t('catCompanion.voice.unmute') : t('catCompanion.voice.muteOn')}
      </button>

      <button
        type="button"
        onClick={onHangUp}
        className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 py-2.5 text-xs font-black text-candy-pink-on shadow-md transition-all hover:from-rose-600 hover:to-red-600 active:scale-95"
      >
        {t('catCompanion.voice.hangUp')}
      </button>

      <button
        type="button"
        onClick={onToggleListen}
        className={`flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-black text-white shadow-md transition-all active:scale-95 ${
          isListening
            ? 'bg-rose-500 shadow-rose-500/40 animate-pulse'
            : 'bg-emerald-500 hover:bg-emerald-600'
        }`}
      >
        {isListening ? t('catCompanion.voice.doneSpeaking') : t('catCompanion.voice.speakAgain')}
      </button>
    </div>
  );
}

/** 智能探索提问词组 */
export function QuickPhrases({ onSend }: { onSend: (text: string) => void }) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'story' | 'math' | 'praise' | 'science'>('all');

  const CATEGORIES = [
    { id: 'all' as const, label: '✨ 推荐' },
    { id: 'story' as const, label: '📖 故事' },
    { id: 'math' as const, label: '🧮 数学' },
    { id: 'praise' as const, label: '🌟 夸夸' },
    { id: 'science' as const, label: '💡 百科' },
  ];

  const PHRASES = {
    all: [
      '🐱 介绍一下你自己喵！',
      '📖 讲一个关于小兔子的睡前故事',
      '🧮 考考我 10 以内的加减法',
      '🌟 用最萌的声音夸夸我！',
      '💡 为什么天上的星星会眨眼？',
      '🐟 你最喜欢吃什么口味的小鱼干？',
    ],
    story: [
      '📖 讲一个勇敢小恐龙的冒险故事',
      '🦊 讲一个森林小动物互帮互助的故事',
      '🚀 讲一个乘坐飞船去月球的探险故事',
    ],
    math: [
      '🧮 怎样才能快速记牢九九乘法口诀？',
      '🔢 告诉我一个有趣的数学小魔术',
      '📐 考考我认识各种图形',
    ],
    praise: [
      '❤️ 我今天完成了所有功课，夸夸我！',
      '⭐ 我今天自己收拾了玩具，棒不棒？',
      '🌈 给我一句元气满满的加油鼓励！',
    ],
    science: [
      '🌈 为什么下雨后会有彩虹？',
      '🌊 海水为什么是咸咸的呀？',
      '🦕 恐龙是怎么生活在地球上的？',
    ],
  };

  const currentList = PHRASES[activeCategory] || PHRASES.all;

  return (
    <div className="flex flex-col gap-1.5 px-4 pt-2">
      {/* 分类切换 */}
      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              sfxTap();
              setActiveCategory(cat.id);
            }}
            className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black transition-all ${
              activeCategory === cat.id
                ? 'bg-pink-500 text-candy-pink-on shadow-xs'
                : 'bg-pink-100/70 text-pink-700 hover:bg-pink-200/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 词组胶囊条 */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
        {currentList.map((phrase, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              sfxTap();
              onSend(phrase.replace(/^[\p{Emoji}\s]+/u, ''));
            }}
            className="flex-shrink-0 rounded-full border border-pink-200 bg-white/90 px-3 py-1 text-xs font-extrabold text-ink-soft shadow-xs transition-all hover:border-pink-400 hover:bg-pink-50 hover:text-pink-700 active:scale-95"
          >
            {phrase}
          </button>
        ))}
      </div>
    </div>
  );
}