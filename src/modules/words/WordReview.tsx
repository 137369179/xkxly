/**
 * 单词分类复习 - 按主题/难度/掌握度
 */

import { useState, useMemo } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { WORD_THEMES, getAllWords, getWordsByLevel } from '@/data/wordIndex';
import { useProgress } from '@/store/useStore';
import { speak } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { motion } from 'motion/react';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';
import { AdaptiveDifficultyHint } from '@/components/AdaptiveDifficultyHint';

type Mode = 'browse' | 'flashcard';

export function WordReview() {
  const progress = useProgress();
  const [mode, setMode] = useState<Mode>('browse');
  const [theme, setTheme] = useState(WORD_THEMES[0]!.id);
  const [level, setLevel, levelMeta] = useAdaptiveDifficultyState('word');
  const [filter, setFilter] = useState<'theme' | 'level' | 'weak'>('theme');
  const [flashIdx, setFlashIdx] = useState(0);
  const [showZh, setShowZh] = useState(false);

  const words = useMemo(() => {
    if (filter === 'theme') return getAllWords().filter(w => {
      const themeEntry = WORD_THEMES.find(t => t.id === theme);
      return themeEntry && w.level === level;
    });
    if (filter === 'level') return getWordsByLevel(level);
    // weak: 掌握度低的
    const mastery = progress.mastery;
    return getAllWords().filter(w => {
      const key = `word:${w.word}`;
      const m = mastery[key]!!
      return !m || m.lv < 2;
    }).slice(0, 20);
  }, [filter, theme, level, progress.mastery]);

  const current = words[flashIdx]!!

  if (mode === 'flashcard' && current) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <CandyButton tone="blue" variant="soft" size="sm" onClick={() => { sfxTap(); setMode('browse'); }}>
            ◀️ 返回
          </CandyButton>
          <span className="text-sm font-bold text-ink-soft">{flashIdx + 1} / {words.length}</span>
        </div>

        <motion.div
          key={flashIdx}
          initial={{ rotateY: 180, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          onClick={() => { sfxTap(); setShowZh(!showZh); }}
          className="cursor-pointer rounded-3xl bg-gradient-to-br from-candy-blue-soft to-candy-purple-soft p-8 text-center shadow-lg"
        >
          <div className="text-6xl">{current.emoji}</div>
          <h2 className="mt-3 text-3xl font-black text-ink">{current.word}</h2>
          <p className="text-sm font-bold text-ink-soft">/{current.phonetic}/</p>

          {showZh && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
              <p className="text-xl font-black text-candy-purple-deep">{current.zh}</p>
              <p className="mt-1 text-sm font-bold text-ink-soft">{current.sentence}</p>
              <p className="text-xs font-bold text-ink-soft">{current.sentenceZh}</p>
            </motion.div>
          )}

          <p className="mt-4 text-xs font-bold text-ink-soft">👆 点击卡片翻面</p>
        </motion.div>

        <div className="flex justify-center gap-3">
          <CandyButton tone="pink" size="sm" onClick={() => speak(current.word, { lang: 'en-US', rate: 0.7 })}>
            🔊 朗读
          </CandyButton>
          <CandyButton
            tone="blue"
            size="sm"
            onClick={() => { sfxTap(); setShowZh(false); setFlashIdx(i => (i + 1) % words.length); }}
          >
            下一个 →
          </CandyButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader emoji="📚" title="单词复习" subtitle="分类浏览+卡片复习" tone="blue" />

      <div className="flex gap-2">
        <CandyButton tone={filter === 'theme' ? 'blue' : 'purple'} variant={filter === 'theme' ? 'solid' : 'soft'} size="sm" onClick={() => { sfxTap(); setFilter('theme'); }}>
          按主题
        </CandyButton>
        <CandyButton tone={filter === 'level' ? 'blue' : 'purple'} variant={filter === 'level' ? 'solid' : 'soft'} size="sm" onClick={() => { sfxTap(); setFilter('level'); }}>
          按难度
        </CandyButton>
        <CandyButton tone={filter === 'weak' ? 'blue' : 'purple'} variant={filter === 'weak' ? 'solid' : 'soft'} size="sm" onClick={() => { sfxTap(); setFilter('weak'); }}>
          薄弱词
        </CandyButton>
      </div>

      {filter === 'theme' && (
        <div className="flex flex-wrap gap-2">
          {WORD_THEMES.map(t => (
            <CandyButton
              key={t.id}
              tone={theme === t.id ? t.tone : 'purple'}
              variant={theme === t.id ? 'solid' : 'soft'}
              size="sm"
              onClick={() => { sfxTap(); setTheme(t.id); }}
            >
              {t.emoji} {t.name}
            </CandyButton>
          ))}
        </div>
      )}

      {(filter === 'theme' || filter === 'level') && (
        <div className="space-y-2">
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
          <AdaptiveDifficultyHint
            meta={levelMeta}
            labels={{ 1: 'Level 1', 2: 'Level 2', 3: 'Level 3' }}
          />
        </div>
      )}

      {words.length > 0 && (
        <CandyButton tone="orange" size="sm" onClick={() => { sfxTap(); setMode('flashcard'); setFlashIdx(0); setShowZh(false); }}>
          🎴 开始卡片复习（{words.length}词）
        </CandyButton>
      )}

      {words.length === 0 ? (
        <Panel className="text-center">
          <p className="text-sm font-bold text-ink-soft">没有符合条件的单词</p>
        </Panel>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {words.map((w, i) => {
            const key = `word:${w.word}`;
            const m = progress.mastery[key];
            const mastered = m && m.lv >= 3;
            return (
              <motion.div
                key={w.word}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Panel className="text-center">
                  <div className="text-3xl">{w.emoji}</div>
                  <div className="mt-1 text-sm font-black text-ink">{w.word}</div>
                  <div className="text-xs font-bold text-ink-soft">{w.zh}</div>
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <button aria-label="🔊"
                      onClick={() => speak(w.word, { lang: 'en-US', rate: 0.7 })}
                      className="rounded-full bg-candy-blue-soft px-2 py-0.5 text-xs font-bold text-candy-blue-deep"
                    >
                      🔊
                    </button>
                    {mastered && <span className="text-xs">✅</span>}
                  </div>
                </Panel>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
