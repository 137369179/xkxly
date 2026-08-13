/**
 * 儿歌乐园 - 逐句朗读+拼音+教育寓意
 */

import { useState, useRef, useMemo, useEffect } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { NURSERY_RHYMES, THEME_LABEL, type NurseryRhyme, type RhymeTheme } from '@/data/nurseryRhymes';
import { speak, stopSpeaking } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { motion } from 'motion/react';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';

const THEME_COLORS: Record<RhymeTheme, string> = {
  animals: '#FF6B6B',
  nature: '#4ECDC4',
  number: '#FFE66D',
  daily: '#A8E6CF',
  family: '#FF8B94',
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
      map[r.theme]!.push(r);
    }
    return map;
  }, []);

  const playRhyme = async (rhyme: NurseryRhyme) => {
    sfxTap();
    learnSkill(`fun:nursery-${rhyme.title}`);
    tickTime(10);
    setPlaying(true);
    stopRef.current = false;
    setActiveLine(0);

    for (let i = 0; i < rhyme.lyrics.length; i++) {
      if (stopRef.current) break;
      setActiveLine(i);
      await new Promise<void>(resolve => {
        speak(rhyme.lyrics[i]!, { rate: 0.85, onEnd: () => resolve() });
      });
      if (stopRef.current) break;
      await new Promise(r => setTimeout(r, 300));
    }
    setActiveLine(-1);
    setPlaying(false);
  };

  const stop = () => {
    stopRef.current = true;
    stopSpeaking();
    setPlaying(false);
    setActiveLine(-1);
  };

  if (!selected) {
    return (
      <div className="space-y-4">
        <PageHeader emoji="🎵" title={t('nurseryPage.title')} subtitle={t('nurseryPage.subtitle')} tone="pink" />
        {(Object.keys(THEME_LABEL) as RhymeTheme[]).map(theme => {
          const rhymes = byTheme[theme]!
          if (!rhymes?.length) return null;
          const tl = THEME_LABEL[theme]!
          const color = THEME_COLORS[theme]!
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
                    onClick={() => { sfxTap(); setSelected(r); }}
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
        <CandyButton tone="pink" variant="soft" size="sm" onClick={() => { stop(); sfxTap(); setSelected(null); }}>
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
            🎵 {t('nurseryPage.play')}
          </CandyButton>
        ) : (
          <CandyButton tone="orange" size="lg" onClick={stop}>
            ⏹️ {t('nurseryPage.stop')}
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

