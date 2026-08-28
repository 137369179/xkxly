/**
 * 🌍 中西乐器博览馆 (Instrument Explorer)
 * ------------------------------------------------------------
 * 1. 8 大经典中西乐器（钢琴、小提琴、琵琶、古筝、架子鼓、萨克斯、竹笛、木琴）
 * 2. 乐器实时 WebAudio 泛音物理合成试弹
 * 3. 乐器结构知识与文化百科讲解
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { getAudioContext } from '@/lib/audioContext';
import { useStore } from '@/store/useStore';

export interface InstrumentItem {
  id: string;
  name: string;
  nameEn: string;
  category: 'keyboard' | 'string' | 'wind' | 'percussion' | 'traditional';
  categoryLabel: string;
  emoji: string;
  desc: string;
  funFact: string;
  origin: string;
  notes: { label: string; freq: number }[];
  timbreType: 'piano' | 'violin' | 'plucked' | 'flute' | 'drum' | 'bell';
}

export const INSTRUMENTS: InstrumentItem[] = [
  {
    id: 'piano',
    name: '钢琴',
    nameEn: 'Piano',
    category: 'keyboard',
    categoryLabel: '🎹 键盘乐器之王',
    emoji: '🎹',
    desc: '拥有 88 个黑白琴键，音域极其宽广，被誉为「乐器之王」！',
    funFact: '钢琴里面其实有两百多根高张力的钢丝弦，按键时小木槌会敲击琴弦发声！',
    origin: '源于 18 世纪的欧洲',
    timbreType: 'piano',
    notes: [
      { label: 'Do', freq: 261.63 },
      { label: 'Re', freq: 293.66 },
      { label: 'Mi', freq: 329.63 },
      { label: 'Fa', freq: 349.23 },
      { label: 'Sol', freq: 392.00 },
      { label: 'La', freq: 440.00 },
      { label: 'Ti', freq: 493.88 },
      { label: 'High Do', freq: 523.25 },
    ],
  },
  {
    id: 'guzheng',
    name: '中国古筝',
    nameEn: 'Guzheng',
    category: 'traditional',
    categoryLabel: '🎼 中华传统筝乐',
    emoji: '🎼',
    desc: '中国传统弹拨乐器，音色清脆悠扬，如山间清泉、高山流水！',
    funFact: '古筝通常采用「宫、商、角、徵、羽」五声音阶（1 2 3 5 6），弹起来特别有古风意境！',
    origin: '拥有 2500 多年悠久中华历史',
    timbreType: 'plucked',
    notes: [
      { label: '宫 (1)', freq: 261.63 },
      { label: '商 (2)', freq: 293.66 },
      { label: '角 (3)', freq: 329.63 },
      { label: '徵 (5)', freq: 392.00 },
      { label: '羽 (6)', freq: 440.00 },
      { label: '高宫 (i)', freq: 523.25 },
    ],
  },
  {
    id: 'violin',
    name: '小提琴',
    nameEn: 'Violin',
    category: 'string',
    categoryLabel: '🎻 弓弦乐器皇后',
    emoji: '🎻',
    desc: '拥有 4 根琴弦，用马尾制成的琴弓拉动，声音细腻如歌唱！',
    funFact: '小提琴身形小巧，但发出的声音极富穿透力，是交响乐团的灵魂首席！',
    origin: '源于文艺复兴时期的意大利',
    timbreType: 'violin',
    notes: [
      { label: 'G弦 (Sol)', freq: 196.00 },
      { label: 'D弦 (Re)', freq: 293.66 },
      { label: 'A弦 (La)', freq: 440.00 },
      { label: 'E弦 (Mi)', freq: 659.25 },
    ],
  },
  {
    id: 'pipa',
    name: '中国琵琶',
    nameEn: 'Pipa',
    category: 'traditional',
    categoryLabel: '🪕 中华四弦乐器',
    emoji: '🪕',
    desc: '弹弦乐器首座，抱在怀中弹奏，音色铿锵清脆，大珠小珠落玉盘！',
    funFact: '「琵」和「琶」原本是古代弹拨的两个动作：向前弹叫琵，向后挑叫琶！',
    origin: '秦汉时期便已流传的中华名乐器',
    timbreType: 'plucked',
    notes: [
      { label: '低音A', freq: 220.00 },
      { label: 'D (Re)', freq: 293.66 },
      { label: 'E (Mi)', freq: 329.63 },
      { label: 'A (La)', freq: 440.00 },
    ],
  },
  {
    id: 'drums',
    name: '架子鼓',
    nameEn: 'Drum Kit',
    category: 'percussion',
    categoryLabel: '🥁 现代打击乐灵魂',
    emoji: '🥁',
    desc: '由大鼓、军鼓、踩镲和通鼓组成，充满动感与节奏活力！',
    funFact: '鼓手手脚并用，双手敲击鼓面与镲片，双脚踩动大鼓与踩镲踏板！',
    origin: '20 世纪流行于现代爵士与摇滚乐',
    timbreType: 'drum',
    notes: [
      { label: '大鼓 (Kick)', freq: 80.00 },
      { label: '军鼓 (Snare)', freq: 200.00 },
      { label: '通鼓 (Tom)', freq: 150.00 },
      { label: '镲片 (Crash)', freq: 800.00 },
    ],
  },
  {
    id: 'flute',
    name: '中国竹笛',
    nameEn: 'Bamboo Flute',
    category: 'wind',
    categoryLabel: '🪈 东方清音竹乐',
    emoji: '🪈',
    desc: '采用天然竹子制作，贴上薄薄的笛膜，吹出来的声音宛如百鸟啼鸣！',
    funFact: '笛子上的小薄膜叫「笛膜」，是芦苇茎里的薄膜，正是它让竹笛声清脆亮丽！',
    origin: '新石器时代贾湖骨笛演化而来',
    timbreType: 'flute',
    notes: [
      { label: '1 (Do)', freq: 523.25 },
      { label: '2 (Re)', freq: 587.33 },
      { label: '3 (Mi)', freq: 659.25 },
      { label: '5 (Sol)', freq: 783.99 },
      { label: '6 (La)', freq: 880.00 },
    ],
  },
  {
    id: 'saxophone',
    name: '萨克斯风',
    nameEn: 'Saxophone',
    category: 'wind',
    categoryLabel: '🎷 木管铜身乐器',
    emoji: '🎷',
    desc: '虽然由黄铜制成，但因为使用单簧木哨片发音，属于木管乐器家族！',
    funFact: '萨克斯风由比利时乐器制造家阿道夫·萨克斯在 1840 年发明！',
    origin: '19 世纪比利时发明',
    timbreType: 'flute',
    notes: [
      { label: 'Do', freq: 261.63 },
      { label: 'Mi', freq: 329.63 },
      { label: 'Sol', freq: 392.00 },
      { label: 'La', freq: 440.00 },
    ],
  },
  {
    id: 'xylophone',
    name: '七彩木琴',
    nameEn: 'Xylophone',
    category: 'percussion',
    categoryLabel: '🔔 童趣旋律打击乐',
    emoji: '🔔',
    desc: '由不同长度的木块或钢片排列而成，用琴槌敲击发出晶莹剔透的清脆声音！',
    funFact: '木块越长声音越低沉，木块越短声音越清脆高亢！',
    origin: '古老的打击旋律乐器',
    timbreType: 'bell',
    notes: [
      { label: '1 (红)', freq: 261.63 },
      { label: '2 (橙)', freq: 293.66 },
      { label: '3 (黄)', freq: 329.63 },
      { label: '4 (绿)', freq: 349.23 },
      { label: '5 (青)', freq: 392.00 },
      { label: '6 (蓝)', freq: 440.00 },
      { label: '7 (紫)', freq: 493.88 },
      { label: 'i (粉)', freq: 523.25 },
    ],
  },
];

// 物理音色合成器
function playInstrumentSound(freq: number, timbre: InstrumentItem['timbreType']) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (timbre === 'piano') {
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    } else if (timbre === 'violin') {
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    } else if (timbre === 'plucked') {
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    } else if (timbre === 'flute') {
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    } else if (timbre === 'drum') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    } else {
      // bell / xylophone
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    }

    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch {
    sfxTap();
  }
}

const FALLBACK_INSTRUMENT = INSTRUMENTS[0] ?? {
  id: 'piano',
  name: '钢琴',
  nameEn: 'Piano',
  category: 'keyboard',
  categoryLabel: '🎹 键盘乐器之王',
  emoji: '🎹',
  desc: '拥有 88 个黑白琴键，音域极其宽广，被誉为「乐器之王」！',
  funFact: '钢琴里面其实有两百多根高张力的钢丝弦！',
  origin: '欧洲',
  timbreType: 'piano',
  notes: [{ label: 'Do', freq: 261.63 }],
};

export function InstrumentExplorer() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const addStars = useStore((s) => s.addStars);

  const current = INSTRUMENTS[selectedIdx % INSTRUMENTS.length] ?? FALLBACK_INSTRUMENT;

  const handleSelect = useCallback((idx: number) => {
    sfxTap();
    triggerHaptic(20);
    setSelectedIdx(idx);
    const inst = INSTRUMENTS[idx % INSTRUMENTS.length] ?? FALLBACK_INSTRUMENT;
    void speak(`这是${inst.name}。${inst.desc}`, { lang: 'zh-CN' });
  }, []);

  const handlePlayKey = useCallback((label: string, freq: number) => {
    setActiveKey(label);
    triggerHaptic(25);
    playInstrumentSound(freq, current.timbreType);
    celebrateSmall();
    addStars(1);
    setTimeout(() => setActiveKey(null), 300);
  }, [current.timbreType, addStars]);

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
        const noteIdx = parseInt(e.key, 10) - 1;
        const note = current.notes[noteIdx];
        if (note) {
          e.preventDefault();
          handlePlayKey(note.label, note.freq);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSelect((selectedIdx + 1) % INSTRUMENTS.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSelect((selectedIdx - 1 + INSTRUMENTS.length) % INSTRUMENTS.length);
      } else if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        sfxTap();
        void speak(`这是${current.name}。${current.desc}`, { lang: 'zh-CN' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [current, selectedIdx, handlePlayKey, handleSelect]);

  return (
    <div className="space-y-6">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-indigo-900 font-bold bg-indigo-50/90 px-3 py-1 rounded-xl border border-indigo-200">
          ⌨️ 键盘快捷操作：数字键 1-8 试弹琴键音阶 · 左右方向键 切换乐器 · 空格/R 听百科讲解
        </span>
      </div>

      {/* 乐器选择器导航 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {INSTRUMENTS.map((inst, idx) => {
          const active = selectedIdx === idx;
          return (
            <motion.button
              key={inst.id}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(idx)}
              className={`p-3.5 rounded-2xl border-2 font-black text-xs transition-all flex items-center gap-2.5 shadow-sm ${
                active
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-indigo-700 shadow-md scale-105'
                  : 'bg-white text-slate-700 border-indigo-100 hover:bg-indigo-50/50'
              }`}
            >
              <span className="text-3xl select-none">{inst.emoji}</span>
              <div className="text-left">
                <span className="block text-sm leading-tight">{inst.name}</span>
                <span className={`text-xs block ${active ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {inst.nameEn}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 乐器详情与试弹舞台 */}
      <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/60 to-pink-50/60 rounded-3xl border-3 border-indigo-200 p-6 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <motion.div
            key={current.id}
            initial={{ scale: 0.8, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            className="w-32 h-32 rounded-3xl bg-white border-4 border-indigo-300 shadow-lg flex items-center justify-center text-7xl select-none"
          >
            {current.emoji}
          </motion.div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-3xl font-black text-slate-800">{current.name}</h3>
              <span className="text-lg font-extrabold text-indigo-600">{current.nameEn}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold">
                {current.categoryLabel}
              </span>
            </div>
            <p className="text-sm text-slate-700 font-medium">{current.desc}</p>
            <div className="p-3 bg-white/80 rounded-2xl border border-indigo-100 text-xs font-bold text-slate-600">
              💡 <span className="text-indigo-900 font-black">乐器小百科：</span>{current.funFact}
            </div>
          </div>
        </div>

        {/* 乐器互动试弹琴键/鼓垫 */}
        <div className="bg-white rounded-2xl p-5 border border-indigo-100 space-y-3 text-center shadow-inner">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
              <span>🎵</span>
              <span>触键试弹专区 ({current.name} 真实音色)：</span>
            </h4>
            <span className="text-xs text-slate-400 font-bold">
              轻触下方音键体验声音高低变化
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            {current.notes.map((note) => {
              const isPressed = activeKey === note.label;
              return (
                <motion.button
                  key={note.label}
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handlePlayKey(note.label, note.freq)}
                  className={`px-5 py-4 rounded-2xl font-black text-sm border-2 shadow-sm transition-all flex flex-col items-center gap-1 ${
                    isPressed
                      ? 'bg-indigo-600 text-white border-indigo-700 scale-105 shadow-md'
                      : 'bg-gradient-to-b from-indigo-50 to-purple-50 text-indigo-950 border-indigo-200 hover:border-indigo-400'
                  }`}
                >
                  <span className="text-base select-none">🎹</span>
                  <span>{note.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
