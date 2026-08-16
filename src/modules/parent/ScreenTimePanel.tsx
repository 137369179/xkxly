/**
 * 家长控制面板增强 - 屏幕时间报告
 * ------------------------------------------------------------
 * 新增功能：
 *   1. 今日学习时间统计
 *   2. 本周学习趋势图表
 *   3. 各模块学习时长分布
 *   4. 学习时长限制设置
 */

import { useState, useEffect } from 'react';

interface StudyTimeStats {
  today: {
    totalMinutes: number;
    sessions: number;
    lastSessionEnd: number | null;
  };
  week: {
    dailyMinutes: number[];
    totalMinutes: number;
  };
  byModule: Record<string, number>;
}

/**
 * 计算学习时间统计
 */
function calculateStudyTimeStats(): StudyTimeStats {
  const studySessions: Array<{ startTime: number; endTime?: number; duration?: number; module?: string }> = [];
  
  const now = Date.now();
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  
  // 今日数据
  const todaySessions = studySessions.filter((s: { startTime: number; duration?: number; endTime?: number; module?: string }) => s.startTime >= todayStart);
  const todayTotal = todaySessions.reduce((sum: number, s: { duration?: number }) => sum + (s.duration || 0), 0);
  
  // 本周数据（按天分组）
  const weeklyData: number[] = [0, 0, 0, 0, 0, 0, 0];
  studySessions.forEach((session: { startTime: number; duration?: number }) => {
    if (session.startTime >= weekStart) {
      const dayIndex = Math.floor((session.startTime - weekStart) / (24 * 60 * 60 * 1000));
      const idx = Math.min(Math.max(0, dayIndex), 6);
      weeklyData[idx] = (weeklyData[idx] ?? 0) + (session.duration || 0);
    }
  });
  
  // 按模块统计
  const byModule: Record<string, number> = {};
  studySessions.forEach((session: { module?: string; duration?: number }) => {
    const module = session.module || 'other';
    byModule[module] = (byModule[module] || 0) + (session.duration || 0);
  });
  
  return {
    today: {
      totalMinutes: Math.round(todayTotal / 60000),
      sessions: todaySessions.length,
      lastSessionEnd: todaySessions[todaySessions.length - 1]?.endTime || null,
    },
    week: {
      dailyMinutes: weeklyData.map((m: number) => Math.round(m / 60000)),
      totalMinutes: Math.round(weeklyData.reduce((a: number, b: number) => a + b, 0) / 60000),
    },
    byModule,
  };
}

/**
 * 屏幕时间报告组件
 */
export function ScreenTimeReport() {
  const [stats, setStats] = useState<StudyTimeStats>(calculateStudyTimeStats);
  const settings = { dailyLimitMin: 30 };
  
  useEffect(() => {
    // 每分钟更新一次
    const timer = setInterval(() => {
      setStats(calculateStudyTimeStats());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);
  
  const dailyLimit = settings.dailyLimitMin || 30;
  const todayPercent = Math.min(100, Math.round((stats.today.totalMinutes / dailyLimit) * 100));
  
  // 本周趋势数据（最近7天）
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const maxDailyMinutes = Math.max(...stats.week.dailyMinutes, 1);
  
  return (
    <div className="space-y-6">
      {/* 今日概览 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="text-lg font-extrabold text-ink mb-4">📊 今日学习</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-3xl font-black text-candy-purple-deep">
              {stats.today.totalMinutes}
            </div>
            <div className="text-xs font-bold text-ink-soft mt-1">分钟今日学习</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-black text-candy-blue-deep">
              {stats.today.sessions}
            </div>
            <div className="text-xs font-bold text-ink-soft mt-1">次学习会话</div>
          </div>
        </div>
        
        {/* 进度条 */}
        <div className="mt-4">
          <div className="flex justify-between text-xs font-bold text-ink-soft mb-1">
            <span>今日进度</span>
            <span>{todayPercent}%</span>
          </div>
          <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${todayPercent}%`,
                background: todayPercent >= 100 ? '#EF4444' : '#8B5CF6'
              }}
            />
          </div>
          <p className="text-xs text-ink-soft mt-1">
            {todayPercent >= 100 
              ? '⚠️ 已达到今日学习上限' 
              : `还剩 ${dailyLimit - stats.today.totalMinutes} 分钟`}
          </p>
        </div>
      </div>
      
      {/* 本周趋势 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="text-lg font-extrabold text-ink mb-4">📈 本周趋势</h3>
        
        <div className="flex items-end justify-between h-32 gap-2">
          {stats.week.dailyMinutes.map((minutes, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div 
                className="w-full rounded-t-lg bg-candy-purple-soft transition-all"
                style={{ 
                  height: `${(minutes / maxDailyMinutes) * 100}%`,
                  minHeight: minutes > 0 ? '8px' : '2px'
                }}
              />
              <span className="text-xs font-bold text-ink-soft">{days[index]}</span>
              <span className="text-[10px] text-ink-soft">{minutes}分</span>
            </div>
          ))}
        </div>
        
        <div className="mt-3 text-center">
          <span className="text-sm font-bold text-ink-soft">
            本周总计：{stats.week.totalMinutes} 分钟
          </span>
        </div>
      </div>
      
      {/* 模块分布 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="text-lg font-extrabold text-ink mb-4">🎯 模块分布</h3>
        
        <div className="space-y-2">
          {Object.entries(stats.byModule)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([module, minutes]) => (
              <div key={module} className="flex items-center gap-3">
                <span className="text-sm font-bold text-ink w-20">{module}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-candy-green"
                    style={{ width: `${(minutes / stats.week.totalMinutes) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-ink-soft">{Math.round(minutes / 60)}分</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 学习时长限制设置
 */
export function StudyTimeLimitSetting({ 
  currentLimit, 
  onUpdate 
}: { 
  currentLimit: number; 
  onUpdate: (limit: number) => void;
}) {
  const limits = [15, 30, 45, 60, 90, 120];
  
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-lg font-extrabold text-ink mb-4">⏰ 每日学习时间上限</h3>
      
      <div className="grid grid-cols-3 gap-3">
        {limits.map(min => (
          <button
            key={min}
            onClick={() => onUpdate(min)}
            className={`rounded-xl py-3 text-base font-extrabold transition ${
              currentLimit === min
                ? 'bg-candy-purple text-white shadow-md'
                : 'bg-gray-100 text-ink-soft hover:bg-gray-200'
            }`}
          >
            {min}分钟
          </button>
        ))}
      </div>
      
      <p className="text-xs text-ink-soft mt-3">
        达到上限后会温和提醒，不会强制关闭应用。
      </p>
    </div>
  );
}
