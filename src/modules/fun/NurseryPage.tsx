/**
 * 儿歌乐园 - 逐句朗读+拼音+教育寓意
 */

import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { NURSERY_RHYMES, THEME_LABEL, type NurseryRhyme, type RhymeTheme } from '@/data/nurseryRhymes';
import { speak, stopSpeaking } from '@/lib/speech';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { navigate } from '@/lib/router';
import { motion } from 'motion/react';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';

const THEME_COLORS: Record<RhymeTheme, string> = {
  animals: '#ff5c7a',
  nature: '#5fd68b',
  number: '#e5ac2e',
  daily: '#b8f0d8',
  family: '#ff8db0',
};

export function NurseryPage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<NurseryRhyme | null>(null);
  const [activeLine, setActiveLine] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef(false);
  const { learnSkill, tickTime } = useStore();

  useEffect(() => () => { stopRef.current = true; }, []);

  const byTheme = useMemo(() => {
    const map: Record<string, NurseryRhyme[]> = {};
    for (const r of NURSERY_RHYMES) {
      if (!map[r.theme]) map[r.theme] = [];
      const arr = map[r.theme]; if (arr) arr.push(r);
    }
    return map;
  }, []);

  const playRhyme = useCallback(async (rhyme: NurseryRhyme) => {
    sfxTap();
    triggerHaptic(25);
    learnSkill(`fun:nursery-${rhyme.title}`);
    tickTime(10);
    setPlaying(true);
    stopRef.current = false;
    setActiveLine(0);

    for (let i = 0; i < rhyme.lyrics.length; i++) {
      if (stopRef.current) break;
      setActiveLine(i);
      await new Promise<void>(resolve => {
        const line = rhyme.lyrics[i]; if (line) speak(line, { rate: 0.85, onEnd: () => resolve() });
      });
      if (stopRef.current) break;
      await new Promise(r => setTimeout(r, 300));
    }
    setActiveLine(-1);
    setPlaying(false);
  }, [learnSkill, tickTime]);

  const stop = useCallback(() => {
    stopRef.current = true;
    stopSpeaking();
    triggerHaptic(15);
    setPlaying(false);
    setActiveLine(-1);
  }, []);

  // 全局键盘快捷键响应 (Space 播放/停止, Esc 返回列表或主页)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (selected) {
          if (playing) stop();
          else void playRhyme(selected);
        }
      } else if (e.key === 'Escape') {
        if (selected) {
          stop();
          setSelected(null);
        } else {
          navigate('home');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, playing, playRhyme, stop]);

  if (!selected) {
    return (
      <div className="space-y-4">
        <PageHeader emoji="🎵" title={t('nurseryPage.title')} subtitle={t('nurseryPage.subtitle')} tone="pink" />
        
        {/* 快捷操作提示条 */}
        <div className="text-center">
          <span className="inline-block text-xs text-pink-900 font-bold bg-pink-50/90 px-3 py-1 rounded-xl border border-pink-200">
            ⌨️ 键盘快捷操作：点击儿歌进入 · 空格键 播放/暂停 · Esc 返回列表/主页
          </span>
        </div>
        {(Object.keys(THEME_LABEL) as RhymeTheme[]).map((theme) => {
          const rhymes = byTheme[theme] ?? [];
          if (!rhymes?.length) return null;
          const tl = THEME_LABEL[theme] ?? { emoji: '🎵', label: theme };
          const color = THEME_COLORS[theme] ?? '#ff5c7a';
          return (
            <div key={theme}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">{tl.emoji}</span>
                <span className="text-sm font-extrabold text-ink">{tl.label}</span>
                <div className="h-1 flex-1 rounded-full" style={{ background: color + '40' }} />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {rhymes.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { sfxTap(); triggerHaptic(20); setSelected(r); }}
                    className="flex flex-col items-center rounded-2xl border-4 bg-white p-3 transition-all hover:scale-105 active:translate-y-[1px]"
                    style={{ borderColor: color + '40' }}
                  >
                    <span className="text-3xl">{r.emoji}</span>
                    <span className="mt-1 text-sm font-extrabold text-ink">{r.title}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CandyButton tone="pink" variant="soft" size="sm" aria-label="返回儿歌列表" onClick={() => { stop(); sfxTap(); setSelected(null); }}>
          ◀️ {t('nurseryPage.back')}
        </CandyButton>
        <span className="text-sm font-extrabold text-ink">{selected.emoji} {selected.title}</span>
      </div>

      <Panel className="text-center">
        <div className="text-6xl">{selected.emoji}</div>
        <h3 className="mt-2 text-xl font-black text-ink">{selected.title}</h3>
        <p className="text-sm font-bold text-ink-soft">{selected.desc}</p>
      </Panel>

      {/* 歌词逐句 */}
      <Panel>
        <div className="space-y-2">
          {selected.lyrics.map((line, i) => (
            <motion.div
              key={`line-${i}`}
              animate={{
                scale: activeLine === i ? 1.05 : 1,
                backgroundColor: activeLine === i ? THEME_COLORS[selected.theme] + '30' : 'transparent',
              }}
              className={`rounded-xl p-3 text-center text-lg font-extrabold ${
                activeLine === i ? 'text-ink' : 'text-ink-soft'
              }`}
              onClick={() => { if (!playing) { sfxTap(); speak(line, { rate: 0.8 }); } }}
              style={{ cursor: 'pointer' }}
            >
              {line}
            </motion.div>
          ))}
        </div>
      </Panel>

      {/* 控制 */}
      <div className="flex justify-center gap-2">
        {!playing ? (
          <CandyButton tone="pink" size="lg" onClick={() => playRhyme(selected)}>
            {t('nurseryPage.play')}
          </CandyButton>
        ) : (
          <CandyButton tone="orange" size="lg" onClick={stop}>
            {t('nurseryPage.stop')}
          </CandyButton>
        )}
      </div>

      {/* 教育寓意 */}
      <Panel>
        <div className="rounded-xl bg-candy-pink-soft p-3 text-center">
          <p className="text-xs font-bold text-ink-soft">💡 {t('nurseryPage.moral')}</p>
          <p className="mt-1 text-sm font-extrabold text-ink">{selected.moral}</p>
        </div>
      </Panel>
    </div>
  );
}

export default NurseryPage;

