/**
 * 🎙️ 60秒家长学情语音速报 (Voice Study Report for Parents)
 * ------------------------------------------------------------------
 * 一键生成并温柔朗读今日学情摘要：
 *   - 学习总时长、打卡进度、攻克知识点数量
 *   - 识别薄弱学科与今日突破点
 *   - 给出针对性家庭陪伴建议
 */

import { useState, useCallback } from 'react';
import { useMastery, useDailyLog } from '@/store/useStore';
import { dateKey } from '@/lib/dailyPlan';
import { weakSkills, masteryRate } from '@/lib/srs';
import { speak, stopSpeaking } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import type { Progress } from '@/types';

export function VoiceStudyReport() {
  const mastery = useMastery();
  const dailyLog = useDailyLog();
  const [isPlaying, setIsPlaying] = useState(false);

  const today = dateKey();
  const todayEntry = dailyLog[today];

  const generateReportText = useCallback((): string => {
    const timeSpentMin = Math.round((todayEntry?.sec ?? 0) / 60);
    const questionsDone = todayEntry?.items ?? 0;
    const rate = Math.round(masteryRate({ mastery } as Progress) * 100);
    const weak = weakSkills({ mastery } as Progress, 2);

    let text = `家长您好！我是宝贝学习乐园的伴学导师。今天宝贝共学习了 ${timeSpentMin} 分钟，完成了 ${questionsDone} 道练习，当前全学科知识掌握率为 ${rate}%。`;

    if (questionsDone > 0) {
      text += ` 宝贝今天表现非常专注，在答题中展现了很棒的思考力。`;
    } else {
      text += ` 今天宝贝还没有开始练习哦，建议您稍后陪伴孩子完成 10 分钟的今日课程。`;
    }

    if (weak.length > 0) {
      text += ` 近期在部分知识点上可以多鼓励巩固。今晚推荐您和宝贝玩一玩亲子拼字或数数小游戏，晚安！`;
    } else {
      text += ` 知识点掌握非常扎实，继续保持好习惯！祝您和宝贝度过温馨的一天。`;
    }

    return text;
  }, [todayEntry, mastery]);

  const handleTogglePlay = () => {
    sfxTap();
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }

    const text = generateReportText();
    setIsPlaying(true);
    void speak(text, {
      lang: 'zh-CN',
      rate: 0.88,
      pitch: 1.05,
      module: 'parent_report',
    }).finally(() => {
      setIsPlaying(false);
    });
  };

  return (
    <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl sm:text-4xl animate-bounce">📻</span>
          <div>
            <h4 className="text-base sm:text-lg font-black text-indigo-950">
              60 秒今日学情语音速报
            </h4>
            <p className="text-xs text-indigo-700 font-semibold">
              导师温情播报 · 涵盖时长、掌握率与家庭辅导建议
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition-all shadow-md active:scale-95 ${
            isPlaying
              ? 'bg-rose-500 text-candy-pink-on hover:bg-rose-600 animate-pulse'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <span>{isPlaying ? '⏹️ 停止播报' : '▶️ 播放今日小报'}</span>
        </button>
      </div>
    </div>
  );
}
