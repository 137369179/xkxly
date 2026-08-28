/**
 * 👄 卡通发音口型与舌位引导弹窗 (Articulation Guide)
 * ------------------------------------------------------------------
 * 提供少儿常见易错音素（平翘舌、前后鼻音、声调走势）的卡通图示与动作秘诀。
 */

import { useState } from 'react';
import { sfxTap } from '@/lib/sfx';

interface ArticulationItem {
  id: string;
  title: string;
  category: 'tongue' | 'nasal' | 'tone' | 'lip';
  emoji: string;
  tip: string;
  secret: string;
  illustration: string; // ASCII / SVG 图示描述
}

const GUIDES: ArticulationItem[] = [
  {
    id: 'zh-ch-sh',
    title: '翘舌音 (zh / ch / sh / r)',
    category: 'tongue',
    emoji: '👅',
    tip: '小舌头打个卷，像小拱桥一样轻轻顶住上牙膛！',
    secret: '发音秘诀：嘴巴微微张开，舌尖轻轻向上卷起，不要用力咬舌头哦~',
    illustration: '╭──╮ 舌尖向上卷起 ⌒\n| 👄 | 气流从舌面与上颚缝隙擦出',
  },
  {
    id: 'z-c-s',
    title: '平舌音 (z / c / s)',
    category: 'tongue',
    emoji: '👄',
    tip: '小舌头伸平平，舌尖轻轻贴住下牙齿后面！',
    secret: '发音秘诀：嘴角向两边咧开微笑，舌头放平平，呼出细细的气流~',
    illustration: '├──┤ 舌面平平展放 ─\n| 😊 | 舌尖轻贴下门牙齿背',
  },
  {
    id: 'front-back-nasal',
    title: '前后鼻音 (an / en vs ang / eng)',
    category: 'nasal',
    emoji: '👃',
    tip: '前鼻音鼻子尖响，后鼻音小舌根向上提！',
    secret: '发音秘诀：读 an 时舌尖抵上齿龈；读 ang 时舌根抬起抵软腭，声音更洪亮圆润。',
    illustration: '👃 前鼻音：舌尖向前挡气流 ➔\n🔔 后鼻音：喉咙深处如敲钟 🔔',
  },
  {
    id: 'tones',
    title: '四声调魔术口诀',
    category: 'tone',
    emoji: '🎶',
    tip: '一声平平高高挂，二声向上爬小山，三声下坡又上坡，四声下山滑梯快！',
    secret: '一声 55 调值持续高平，二声 35 扬起，三声 214 拐弯沉降，四声 51 坚决下坠。',
    illustration: '— 一声平平 5-5\n／ 二声爬坡 3-5\n∨ 三声拐弯 2-1-4\n＼ 四声下坠 5-1',
  },
];

export function ArticulationGuideModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>('zh-ch-sh');

  if (!isOpen) return null;

  const current = GUIDES.find((g) => g.id === selectedId) ?? GUIDES[0]!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border-4 border-indigo-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-indigo-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">👄</span>
            <div>
              <h3 className="text-lg font-black text-slate-800">发音口型与舌位小秘诀</h3>
              <p className="text-xs text-slate-500 font-bold">跟着卡通口型，发音更标准更清晰！</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { sfxTap(); onClose(); }}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 标签栏 */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {GUIDES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => { sfxTap(); setSelectedId(g.id); }}
              className={`rounded-2xl px-3 py-2 text-xs font-black shrink-0 transition-all border-2 ${
                selectedId === g.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105'
                  : 'bg-indigo-50/70 text-indigo-800 border-indigo-100 hover:bg-indigo-100'
              }`}
            >
              {g.emoji} {g.title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* 核心展示区 */}
        <div className="rounded-2xl bg-indigo-50/50 border-2 border-indigo-100 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{current.emoji}</span>
            <h4 className="font-black text-indigo-950 text-base">{current.title}</h4>
          </div>

          <div className="rounded-xl bg-white p-3.5 border border-indigo-100 shadow-sm space-y-2">
            <p className="text-sm font-black text-slate-800">🌟 儿歌记忆口诀：</p>
            <p className="text-xs font-bold text-indigo-600 bg-indigo-50/80 p-2.5 rounded-lg leading-relaxed">
              {current.tip}
            </p>
          </div>

          <div className="rounded-xl bg-white p-3.5 border border-indigo-100 shadow-sm space-y-1.5">
            <p className="text-sm font-black text-slate-800">💡 动作要领：</p>
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              {current.secret}
            </p>
            <pre className="mt-2 text-xs font-mono text-indigo-700 bg-slate-50 p-2 rounded-lg border border-slate-200 whitespace-pre-wrap">
              {current.illustration}
            </pre>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => { sfxTap(); onClose(); }}
            className="rounded-2xl bg-indigo-600 px-6 py-2.5 text-sm font-black text-white shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
          >
            我学会啦！
          </button>
        </div>
      </div>
    </div>
  );
}
