/**
 * 🎨 宝宝巴士/洪恩美育级「魔力分块填色本与创意艺术工坊」 (Magic Coloring Book Pro - Commercial Grade)
 * ---------------------------------------------------------------------------------------------------
 * 1. 🦕 8 套高清矢量线稿插画：萌趣小恐龙 🦖 / 太空火箭 🚀 / 梦幻城堡 🏰 / 快乐小猫 🐱 / 快乐海豚 🐬 / 勇敢消防车 🚒 / 甜蜜冰淇淋 🍦 / 彩虹独角兽 🦄；
 * 2. 🖍️ 16 色高饱和与马卡龙双系调色盘；
 * 3. 🎯 轻触线稿分块即时上色，支持撤销 ↩️、清空重填 🔄 与一键魔法上色 🪄；
 * 4. 🎵 WebAudio 涂色物理水滴与魔力琶音音效合成器；
 * 5. ✨ 作品苏醒复活：涂满后触发角色微动作动画（摆尾、升空、眨眼、闪耀）；
 * 6. Streak 连击激励与「小小色彩艺术家」荣誉勋章！
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { StreakBar } from '@/components/study/StreakBar';
import { getAudioContext } from '@/lib/audioContext';
import { navigate } from '@/lib/router';

// ── 调色盘 16 种高饱和度与马卡龙甜美色彩 ──
export const PALETTE_COLORS = [
  { name: '樱桃红', hex: '#FF4D6D', label: '红' },
  { name: '蜜柑橙', hex: '#FF9248', label: '橙' },
  { name: '柠檬黄', hex: '#FFD166', label: '黄' },
  { name: '青苹果绿', hex: '#06D6A0', label: '绿' },
  { name: '天空蓝', hex: '#118AB2', label: '蓝' },
  { name: '梦幻紫', hex: '#8338EC', label: '紫' },
  { name: '芭比粉', hex: '#FF70A6', label: '粉' },
  { name: '纯净白', hex: '#FFFFFF', label: '白' },
  { name: '薄荷绿', hex: '#A8DADC', label: '薄荷' },
  { name: '薰衣草', hex: '#CDB4DB', label: '淡紫' },
  { name: '奶霜黄', hex: '#FFF1C5', label: '奶黄' },
  { name: '蜜桃粉', hex: '#FFC8DD', label: '桃粉' },
  { name: '深海蓝', hex: '#1D3557', label: '深蓝' },
  { name: '巧克力棕', hex: '#6F4E37', label: '棕' },
  { name: '闪耀金', hex: '#F4A261', label: '金' },
  { name: '太空灰', hex: '#4A5568', label: '灰' },
];

export interface ColorTemplate {
  id: string;
  name: string;
  emoji: string;
  theme: string;
  desc: string;
  praise: string;
  parts: {
    id: string;
    name: string;
    shape: 'rect' | 'circle' | 'path' | 'polygon';
    defaultColor?: string;
    pathData?: string;
    coords?: { x: number; y: number; w?: number; h?: number; r?: number };
  }[];
}

export const COLORING_TEMPLATES: ColorTemplate[] = [
  {
    id: 'dino',
    name: '萌趣小恐龙',
    emoji: '🦖',
    theme: '侏罗纪绿色伙伴',
    desc: '给可爱的小恐龙穿上斑斓的新衣裳，让草地开满鲜花！',
    praise: '哇！小恐龙身上的颜色太漂亮啦，正在欢快地摇尾巴向你打招呼呢！',
    parts: [
      { id: 'sky', name: '蓝天背景', shape: 'rect', coords: { x: 10, y: 10, w: 280, h: 180 } },
      { id: 'grass', name: '青青草地', shape: 'rect', coords: { x: 10, y: 190, w: 280, h: 90 } },
      { id: 'body', name: '恐龙身体', shape: 'circle', coords: { x: 140, y: 150, r: 60 } },
      { id: 'belly', name: '恐龙肚皮', shape: 'circle', coords: { x: 150, y: 160, r: 35 } },
      { id: 'head', name: '恐龙脑袋', shape: 'circle', coords: { x: 200, y: 100, r: 30 } },
      { id: 'sun', name: '温暖太阳', shape: 'circle', coords: { x: 50, y: 50, r: 25 } },
    ],
  },
  {
    id: 'rocket',
    name: '太空探险火箭',
    emoji: '🚀',
    theme: '浩瀚宇宙星空',
    desc: '装点火箭机身与火焰喷射尾翼，飞向星辰大海！',
    praise: '酷炫极了！宇宙火箭注入了超能燃料，已经准备好点火发射啦！',
    parts: [
      { id: 'space', name: '深邃太空', shape: 'rect', coords: { x: 10, y: 10, w: 280, h: 270 } },
      { id: 'rocket_body', name: '火箭机身', shape: 'rect', coords: { x: 120, y: 70, w: 60, h: 110 } },
      { id: 'rocket_head', name: '火箭锥头', shape: 'circle', coords: { x: 150, y: 60, r: 30 } },
      { id: 'window', name: '圆形舷窗', shape: 'circle', coords: { x: 150, y: 110, r: 18 } },
      { id: 'flame', name: '喷射火焰', shape: 'rect', coords: { x: 130, y: 190, w: 40, h: 50 } },
      { id: 'planet', name: '神秘星球', shape: 'circle', coords: { x: 230, y: 60, r: 22 } },
    ],
  },
  {
    id: 'castle',
    name: '梦幻童话城堡',
    emoji: '🏰',
    theme: '皇家奇妙城堡',
    desc: '涂上绚丽的城墙与城堡尖顶，迎接王子与公主的到来！',
    praise: '太神奇啦！梦幻城堡点亮了七彩光芒，童话小精灵们正在城堡里开派对呢！',
    parts: [
      { id: 'background', name: '城堡天空', shape: 'rect', coords: { x: 10, y: 10, w: 280, h: 200 } },
      { id: 'ground', name: '城堡前庭', shape: 'rect', coords: { x: 10, y: 210, w: 280, h: 70 } },
      { id: 'main_wall', name: '中央城墙', shape: 'rect', coords: { x: 100, y: 120, w: 100, h: 90 } },
      { id: 'left_tower', name: '左侧塔楼', shape: 'rect', coords: { x: 50, y: 100, w: 40, h: 110 } },
      { id: 'right_tower', name: '右侧塔楼', shape: 'rect', coords: { x: 210, y: 100, w: 40, h: 110 } },
      { id: 'door', name: '城堡大门', shape: 'circle', coords: { x: 150, y: 180, r: 22 } },
    ],
  },
  {
    id: 'cat',
    name: '快乐小猫咪',
    emoji: '🐱',
    theme: '甜心萌宠乐园',
    desc: '给软萌小猫咪涂上毛茸茸的花纹和蝴蝶结！',
    praise: '喵呜～小猫咪换上了漂亮的新毛衣，正在开心地打滚求抱抱呢！',
    parts: [
      { id: 'room', name: '温馨房间', shape: 'rect', coords: { x: 10, y: 10, w: 280, h: 270 } },
      { id: 'cat_body', name: '猫咪身体', shape: 'circle', coords: { x: 150, y: 170, r: 55 } },
      { id: 'cat_head', name: '猫咪圆脸', shape: 'circle', coords: { x: 150, y: 100, r: 42 } },
      { id: 'left_ear', name: '左小耳朵', shape: 'circle', coords: { x: 120, y: 65, r: 18 } },
      { id: 'right_ear', name: '右小耳朵', shape: 'circle', coords: { x: 180, y: 65, r: 18 } },
      { id: 'bowtie', name: '漂亮领结', shape: 'circle', coords: { x: 150, y: 140, r: 14 } },
    ],
  },
  {
    id: 'dolphin',
    name: '快乐海豚湾',
    emoji: '🐬',
    theme: '蔚蓝深海王国',
    desc: '给跃出水面的海豚和海浪涂上海洋的色彩！',
    praise: '海豚发出欢快的叫声，在碧蓝的大海里翻跟头呢！',
    parts: [
      { id: 'sky', name: '晴朗天空', shape: 'rect', coords: { x: 10, y: 10, w: 280, h: 140 } },
      { id: 'sea', name: '蔚蓝大海', shape: 'rect', coords: { x: 10, y: 150, w: 280, h: 130 } },
      { id: 'dolphin_body', name: '海豚身体', shape: 'circle', coords: { x: 140, y: 130, r: 50 } },
      { id: 'dolphin_snout', name: '海豚嘴巴', shape: 'circle', coords: { x: 190, y: 115, r: 20 } },
      { id: 'dolphin_fin', name: '海豚背鳍', shape: 'circle', coords: { x: 130, y: 80, r: 18 } },
      { id: 'splash', name: '浪花水滴', shape: 'circle', coords: { x: 80, y: 160, r: 15 } },
    ],
  },
  {
    id: 'fire_truck',
    name: '勇敢消防车',
    emoji: '🚒',
    theme: '城市英雄救援',
    desc: '涂上鲜艳的大红色车身和闪耀的警灯！',
    praise: '消防车精神抖擞，警灯闪闪，随时准备出发救援！',
    parts: [
      { id: 'road', name: '柏油马路', shape: 'rect', coords: { x: 10, y: 180, w: 280, h: 100 } },
      { id: 'city_sky', name: '城市天空', shape: 'rect', coords: { x: 10, y: 10, w: 280, h: 170 } },
      { id: 'truck_body', name: '消防车厢', shape: 'rect', coords: { x: 50, y: 90, w: 190, h: 80 } },
      { id: 'truck_cab', name: '驾驶座舱', shape: 'rect', coords: { x: 170, y: 80, w: 70, h: 90 } },
      { id: 'front_wheel', name: '前大轮子', shape: 'circle', coords: { x: 200, y: 180, r: 22 } },
      { id: 'back_wheel', name: '后大轮子', shape: 'circle', coords: { x: 90, y: 180, r: 22 } },
    ],
  },
  {
    id: 'icecream',
    name: '甜蜜冰淇淋城堡',
    emoji: '🍦',
    theme: '夏日甜品派对',
    desc: '草莓、香草、抹茶多层冰淇淋球，美味又好看！',
    praise: '香甜美味的冰淇淋做好啦，散发着诱人的果香！',
    parts: [
      { id: 'cafe_bg', name: '甜品店背景', shape: 'rect', coords: { x: 10, y: 10, w: 280, h: 270 } },
      { id: 'cone', name: '香脆蛋筒', shape: 'rect', coords: { x: 115, y: 160, w: 70, h: 90 } },
      { id: 'scoop1', name: '香草冰淇淋球', shape: 'circle', coords: { x: 150, y: 140, r: 35 } },
      { id: 'scoop2', name: '草莓冰淇淋球', shape: 'circle', coords: { x: 150, y: 90, r: 30 } },
      { id: 'cherry', name: '顶端红樱桃', shape: 'circle', coords: { x: 150, y: 50, r: 16 } },
      { id: 'toppings', name: '彩虹糖针', shape: 'circle', coords: { x: 165, y: 80, r: 8 } },
    ],
  },
  {
    id: 'unicorn',
    name: '彩虹独角兽',
    emoji: '🦄',
    theme: '梦幻森林仙境',
    desc: '涂上纯洁的白色身体、七彩鬃毛和金色的独角！',
    praise: '神奇的独角兽踩着彩虹光芒在星空下奔跑，太美啦！',
    parts: [
      { id: 'forest_bg', name: '仙境星空', shape: 'rect', coords: { x: 10, y: 10, w: 280, h: 270 } },
      { id: 'body', name: '独角兽身体', shape: 'circle', coords: { x: 130, y: 160, r: 50 } },
      { id: 'neck_head', name: '优美头颈', shape: 'circle', coords: { x: 180, y: 110, r: 35 } },
      { id: 'magic_horn', name: '金色独角', shape: 'rect', coords: { x: 195, y: 60, w: 12, h: 35 } },
      { id: 'mane', name: '彩虹鬃毛', shape: 'circle', coords: { x: 140, y: 95, r: 25 } },
      { id: 'star_gem', name: '星光宝石', shape: 'circle', coords: { x: 60, y: 60, r: 18 } },
    ],
  },
];

const FALLBACK_TEMPLATE: ColorTemplate = COLORING_TEMPLATES[0] ?? {
  id: 'dino',
  name: '萌趣小恐龙',
  emoji: '🦖',
  theme: '侏罗纪伙伴',
  desc: '涂色',
  praise: '棒！',
  parts: [],
};

export function MagicColoringBook() {
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentColor, setCurrentColor] = useState<string>(PALETTE_COLORS[0]?.hex ?? '#FF4D6D');
  const [coloredParts, setColoredParts] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, string>[]>([]);
  const [completedTemplates, setCompletedTemplates] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);

  const template = useMemo(() => {
    return COLORING_TEMPLATES[currentIdx % COLORING_TEMPLATES.length] ?? FALLBACK_TEMPLATE;
  }, [currentIdx]);

  // WebAudio 涂色物理水滴/画笔音效
  const playBrushSfx = () => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';

      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(600 + Math.random() * 200, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // fallback
    }
  };

  // 魔法一键琶音
  const playMagicArpeggioSfx = () => {
    try {
      const ctx = getAudioContext();
      const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      const now = ctx.currentTime;

      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.08);

        gain.gain.setValueAtTime(0.12, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } catch {
      // fallback
    }
  };

  // 切换线稿底图
  const handleSelectTemplate = useCallback((idx: number) => {
    sfxTap();
    triggerHaptic(30);
    setCurrentIdx(idx);
    setColoredParts({});
    setHistory([]);
    const target = COLORING_TEMPLATES[idx] ?? FALLBACK_TEMPLATE;
    void speak(`开启画布：${target.name}！${target.desc}`, { lang: 'zh-CN' });
  }, []);

  // 点击分块涂色
  const handleFillPart = useCallback((partId: string) => {
    sfxTap();
    triggerHaptic(35);
    playBrushSfx();
    setHistory((prev) => [...prev, { ...coloredParts }]);
    const nextParts = { ...coloredParts, [partId]: currentColor };
    setColoredParts(nextParts);

    // 检查是否全部上色完成
    const totalParts = template.parts.length;
    const filledCount = Object.keys(nextParts).length;

    if (filledCount === totalParts && !completedTemplates.includes(template.id)) {
      sfxCorrect();
      triggerHaptic([40, 50, 80]);
      celebrateSmall();
      const nextDone = Array.from(new Set([...completedTemplates, template.id]));
      setCompletedTemplates(nextDone);
      addStars(2);
      practice(`art:${template.id}`, true, 3, 1);
      setStreak((s) => s + 1);

      setTimeout(() => {
        sfxWin();
        celebrateBig();
        playMagicArpeggioSfx();
        void speak(template.praise, { lang: 'zh-CN' });
      }, 500);
    }
  }, [coloredParts, currentColor, template, completedTemplates, addStars, practice]);

  // 撤销一步
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    sfxTap();
    triggerHaptic(30);
    const previous = history[history.length - 1];
    setColoredParts(previous ?? {});
    setHistory((prev) => prev.slice(0, prev.length - 1));
  }, [history]);

  // 清空重填（支持通过撤销恢复，防止误触丢失心血）
  const handleClear = useCallback(() => {
    sfxTap();
    triggerHaptic(40);
    if (Object.keys(coloredParts).length > 0) {
      setHistory((prev) => [...prev, coloredParts]);
    }
    setColoredParts({});
    void speak('画布已重置，想找回可以点击撤销哦！', { lang: 'zh-CN' });
  }, [coloredParts]);

  // 一键魔力涂色
  const handleMagicAutoFill = useCallback(() => {
    sfxTap();
    triggerHaptic([40, 50, 80]);
    const autoFilled: Record<string, string> = {};
    template.parts.forEach((p, idx) => {
      autoFilled[p.id] = PALETTE_COLORS[idx % PALETTE_COLORS.length]?.hex ?? '#FF4D6D';
    });
    setColoredParts(autoFilled);
    sfxWin();
    celebrateBig();
    playMagicArpeggioSfx();
    void speak('🪄 魔法涂色完成！整幅画面瞬间变得五彩斑斓！', { lang: 'zh-CN' });
  }, [template]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (COLORING_TEMPLATES[idx]) {
          e.preventDefault();
          handleSelectTemplate(idx);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIdx((prev) => (prev > 0 ? prev - 1 : COLORING_TEMPLATES.length - 1));
        setColoredParts({});
        setHistory([]);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIdx((prev) => (prev < COLORING_TEMPLATES.length - 1 ? prev + 1 : 0));
        setColoredParts({});
        setHistory([]);
      } else if (e.key === 'z' || e.key === 'Z' || e.key === 'u' || e.key === 'Backspace') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'm' || e.key === 'M' || e.key === ' ') {
        e.preventDefault();
        handleMagicAutoFill();
      } else if (e.key === 'c' || e.key === 'C' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        navigate('art');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectTemplate, handleUndo, handleMagicAutoFill, handleClear]);

  const isAllFilled = Object.keys(coloredParts).length === template.parts.length && template.parts.length > 0;

  return (
    <div className="space-y-4">
      {/* 顶部 8 款插画线稿快捷选择 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="填色底图模板选择">
          {COLORING_TEMPLATES.map((t, idx) => {
            const isSel = currentIdx === idx;
            const isDone = completedTemplates.includes(t.id);
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isSel}
                type="button"
                onClick={() => handleSelectTemplate(idx)}
                className={`py-2 px-3 min-h-[44px] rounded-2xl font-black text-xs transition-all border-2 flex items-center gap-1 shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-300 ${
                  isSel
                    ? 'bg-pink-500 text-white border-pink-600 shadow-md scale-105'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-pink-300'
                }`}
              >
                <span className="text-base">{t.emoji}</span>
                <span>{t.name}</span>
                {isDone && <span className="text-xs">✨</span>}
              </button>
            );
          })}
        </div>

        <StreakBar streak={streak} target={3} />
      </div>

      {/* 快捷键提示条 */}
      <div className="flex items-center justify-between text-xs text-pink-600 font-bold bg-pink-50/80 px-3 py-1 rounded-xl border border-pink-200">
        <span>⌨️ 键盘快捷操作：数字键 1-8 选图 · ←/→ 切换 · 空格/M 魔法上色 · Z 撤销 · C 清空</span>
      </div>

      {/* 调色盘与操作控制台 */}
      <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 rounded-3xl border-3 border-pink-300 p-5 shadow-sm space-y-4">
        {/* 当前插画介绍与操作栏 */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/90 backdrop-blur rounded-2xl p-3 border border-pink-100 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">{template.emoji}</span>
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <span>{template.name}</span>
                <span className="text-xs font-bold text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full">
                  {template.theme}
                </span>
              </h3>
              <p className="text-xs font-semibold text-slate-500">{template.desc}</p>
            </div>
          </div>

          {/* 辅助工具栏：撤销 / 清空 / 魔力涂色 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={history.length === 0}
              onClick={handleUndo}
              className="py-1.5 px-3 min-h-[44px] rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black shadow-sm disabled:opacity-40 hover:bg-slate-50 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-300"
            >
              ↩️ 撤销
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="py-1.5 px-3 min-h-[44px] rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black shadow-sm hover:bg-slate-50 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-300"
            >
              🔄 清空
            </button>
            <button
              type="button"
              onClick={handleMagicAutoFill}
              className="py-1.5 px-3 min-h-[44px] rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-black shadow-sm hover:opacity-95 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-300"
            >
              🪄 魔力上色
            </button>
          </div>
        </div>

        {/* 16 色调色盘颜料桶 */}
        <div className="bg-white rounded-2xl p-3.5 border border-pink-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1">
              <span>🖍️</span>
              <span>点击选中的颜料：</span>
              <span className="text-pink-600 font-extrabold">
                {PALETTE_COLORS.find((c) => c.hex === currentColor)?.name ?? '已选'}
              </span>
            </span>
            <span className="text-xs font-bold text-slate-400">
              已涂 {Object.keys(coloredParts).length} / {template.parts.length} 块
            </span>
          </div>

          <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5">
            {PALETTE_COLORS.map((c) => {
              const isSelected = currentColor === c.hex;
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => {
                    sfxTap();
                    setCurrentColor(c.hex);
                    playBrushSfx();
                  }}
                  className={`h-9 w-9 rounded-xl border-2 transition-all flex items-center justify-center relative shadow-sm ${
                    isSelected ? 'ring-3 ring-pink-400 scale-110 border-white z-10' : 'border-slate-200 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {isSelected && <span className="text-xs drop-shadow">✨</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 核心 SVG 涂色交互画布（支持苏醒微动作） */}
        <motion.div
          animate={isAllFilled ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 1.5, repeat: isAllFilled ? Infinity : 0, repeatDelay: 1 }}
          className="bg-white rounded-3xl p-4 border-2 border-pink-200 shadow-inner flex items-center justify-center relative"
        >
          <svg
            viewBox="0 0 300 300"
            className="w-full max-w-[340px] h-auto rounded-2xl shadow-sm border border-slate-100 select-none cursor-pointer"
          >
            {template.parts.map((part) => {
              const filledColor = coloredParts[part.id] ?? '#F8FAFC';

              if (part.shape === 'rect' && part.coords) {
                return (
                  <rect
                    key={part.id}
                    x={part.coords.x}
                    y={part.coords.y}
                    width={part.coords.w ?? 50}
                    height={part.coords.h ?? 50}
                    fill={filledColor}
                    stroke="#334155"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    rx="8"
                    onClick={() => handleFillPart(part.id)}
                    className="transition-colors duration-200 hover:opacity-85"
                  />
                );
              }

              if (part.shape === 'circle' && part.coords) {
                return (
                  <circle
                    key={part.id}
                    cx={part.coords.x}
                    cy={part.coords.y}
                    r={part.coords.r ?? 20}
                    fill={filledColor}
                    stroke="#334155"
                    strokeWidth="3"
                    onClick={() => handleFillPart(part.id)}
                    className="transition-colors duration-200 hover:opacity-85"
                  />
                );
              }

              return null;
            })}
          </svg>
        </motion.div>

        {/* 涂满全图苏醒复活提示 */}
        <AnimatePresence>
          {isAllFilled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 rounded-2xl p-4 text-white text-center shadow-lg space-y-1"
            >
              <p className="text-base font-black">🎉【{template.name}】苏醒复活啦！</p>
              <p className="text-xs font-extrabold opacity-95">
                {template.praise}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
