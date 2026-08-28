/**
 * 🐾 萌宠学情日记与明信片 (Pet Study Diary & Postcard)
 * ------------------------------------------------------------------
 * 以猫咪第一人称视角记录主人每日的学习足迹与投喂互动，生成温馨的学情明信片。
 */

import { useState, useMemo } from 'react';
import { useStore, useDailyLog } from '@/store/useStore';
import { dateKey } from '@/lib/dailyPlan';
import { speak, stopSpeaking } from '@/lib/speech';
import { sfxTap, sfxWin } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { CandyButton } from '@/components/ui/Button';

export function PetDiaryModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const dailyLog = useDailyLog();
  const fish = useStore((s) => s.progress.fishCount ?? 10);
  const affection = useStore((s) => s.progress.catAffection ?? 20);
  const fullness = useStore((s) => s.progress.catFullness ?? 80);
  const catName = '茜茜小猫';
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'diary' | 'postcard'>('diary');

  const today = dateKey();
  const todayEntry = dailyLog[today];
  const questionsDone = todayEntry?.items ?? 0;
  const timeSpentMin = Math.round((todayEntry?.sec ?? 0) / 60);

  const diaryText = useMemo(() => {
    if (questionsDone > 0) {
      return `喵呜~ 今天主人好棒呀！一共学习了 ${timeSpentMin} 分钟，解答了 ${questionsDone} 道题！我的好感度已经达到 ${affection} 点啦，肚肚饱饱心情超级好！明天我们也要一起快乐学本领哦，最喜欢主人啦！🐾`;
    }
    return `喵~ 主人今天还没来乐园打卡呢，我的小鱼干只剩下 ${fish} 条啦。快去完成 10 分钟今日课程赚小鱼干吧，茜茜在猫屋一直等小主人哦！🐟`;
  }, [questionsDone, timeSpentMin, affection, fish]);

  if (!isOpen) return null;

  const handleToggleVoice = () => {
    sfxTap();
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    void speak(diaryText, {
      lang: 'zh-CN',
      rate: 0.9,
      pitch: 1.2,
      module: 'cat_diary',
    }).finally(() => setIsPlaying(false));
  };

  const handlePrintPostcard = () => {
    sfxWin();
    celebrateSmall();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-amber-50 p-6 shadow-2xl border-4 border-amber-300 animate-in fade-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b-2 border-dashed border-amber-200 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">📖</span>
            <div>
              <h3 className="text-lg font-black text-amber-950">{catName}的伴读日记</h3>
              <p className="text-xs text-amber-700 font-bold">记录我们在一起的每一个成长时刻 🐾</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { sfxTap(); stopSpeaking(); onClose(); }}
            className="rounded-full p-1.5 text-amber-700 hover:bg-amber-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 模式切换 */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => { sfxTap(); setViewMode('diary'); }}
            className={`flex-1 rounded-2xl py-2 text-xs font-black transition-all border-2 ${
              viewMode === 'diary'
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-white text-amber-800 border-amber-200'
            }`}
          >
            🐾 萌宠手账日记
          </button>
          <button
            type="button"
            onClick={() => { sfxTap(); setViewMode('postcard'); }}
            className={`flex-1 rounded-2xl py-2 text-xs font-black transition-all border-2 ${
              viewMode === 'postcard'
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-white text-amber-800 border-amber-200'
            }`}
          >
            💌 成长学情明信片
          </button>
        </div>

        {/* 视图内容 */}
        {viewMode === 'diary' ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 border-2 border-amber-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-center text-xs font-bold text-amber-600 mb-2">
                <span>📅 {today}</span>
                <span>心情：{fullness > 50 ? '😸 超级开心' : '😽 乖巧陪伴'}</span>
              </div>
              <p className="text-sm font-bold text-slate-800 leading-relaxed indent-4">
                {diaryText}
              </p>
              <div className="mt-4 flex items-center justify-between pt-2 border-t border-amber-100 text-xs font-bold text-amber-700">
                <span>🐟 剩余小鱼干: {fish}</span>
                <span>💖 亲密度: {affection}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleToggleVoice}
                className="flex items-center gap-1.5 rounded-2xl bg-amber-200 px-4 py-2 text-xs font-black text-amber-900 hover:bg-amber-300 transition-colors shadow-sm"
              >
                <span>{isPlaying ? '⏹️ 停止' : '🔊 听猫咪读日记'}</span>
              </button>
              <button
                type="button"
                onClick={() => { sfxTap(); setViewMode('postcard'); }}
                className="text-xs font-bold text-amber-800 underline underline-offset-4"
              >
                查看今日明信片 ➔
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 可打印明信片区域 */}
            <div className="printable-area rounded-2xl bg-white p-5 border-4 border-dashed border-amber-300 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    ★ 宝贝成长明信片 ★
                  </span>
                  <h4 className="text-base font-black text-slate-800 mt-1">
                    今天也是闪闪发光的一天！
                  </h4>
                </div>
                <div className="h-12 w-10 border-2 border-dashed border-amber-400 bg-amber-50 rounded-md flex flex-col items-center justify-center text-xs font-black text-amber-700 rotate-3 shadow-inner">
                  <span>邮票</span>
                  <span>🐱</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-amber-50/60 p-3 rounded-xl border border-amber-100 text-center">
                <div>
                  <p className="text-xs font-bold text-amber-600">专注学习</p>
                  <p className="text-lg font-black text-amber-950">{timeSpentMin} <span className="text-xs">分钟</span></p>
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-600">攻坚解题</p>
                  <p className="text-lg font-black text-amber-950">{questionsDone} <span className="text-xs">道题</span></p>
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                “与主人在一起学习的每一天，都像小鱼干一样甜美！🐾”
              </p>

              <div className="flex justify-between items-center text-xs font-bold text-slate-400 pt-2 border-t border-slate-100">
                <span>寄件猫：{catName}</span>
                <span>日期：{today}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <CandyButton tone="orange" size="md" onClick={handlePrintPostcard}>
                🖨️ 打印 / 保存明信片
              </CandyButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
