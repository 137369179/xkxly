import { useState, useEffect } from 'react';
import { useAiStream } from '@/lib/ai/useAi';
import { logicDetectiveTask } from '@/lib/ai/tasks';
import { AiPanel } from '@/components/ai/AiPanel';
import { AiAvatar } from '@/components/ai/AiAvatar';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxWin } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';

const THEMES = [
  { id: 'cake', name: '谁吃了森林蛋糕？', emoji: '🎂', hint: '小动物排队买点心' },
  { id: 'hat', name: '谁戴了红帽子？', emoji: '🎩', hint: '三只小松鼠排排坐' },
  { id: 'hide', name: '捉迷藏谁藏在树后？', emoji: '🌳', hint: '小兔和小熊的脚印' },
  { id: 'train', name: '谁坐在第一节车厢？', emoji: '🚂', hint: '动物小火车出发啦' },
];

export function LogicDetective() {
  const [theme, setTheme] = useState(THEMES[0]!);
  const [solved, setSolved] = useState(false);
  const addStars = useStore((s) => s.addStars);
  const stream = useAiStream();

  const handleStartCase = (t: typeof THEMES[0]) => {
    sfxTap();
    setTheme(t);
    setSolved(false);
    stream.run(logicDetectiveTask(t.name));
  };

  useEffect(() => {
    stream.run(logicDetectiveTask(theme.name));
  }, []);

  const handleSolve = () => {
    if (solved) return;
    sfxWin();
    setSolved(true);
    addStars(3);
    celebrateBig();
  };

  return (
    <div className="space-y-4">
      {/* 侦探主题选择器 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => handleStartCase(t)}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition active:scale-95 ${
              theme.id === t.id
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-md font-black'
                : 'border-white/80 bg-white/70 text-ink hover:bg-white font-bold'
            }`}
          >
            <span className="text-2xl mb-1">{t.emoji}</span>
            <span className="text-xs text-center">{t.name}</span>
          </button>
        ))}
      </div>

      {/* 案情分析面板 */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border-2 border-emerald-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AiAvatar size={34} mood={stream.status === 'streaming' ? 'thinking' : solved ? 'celebrating' : 'idle'} />
            <div>
              <h3 className="text-base font-black text-ink-main">🕵️‍♂️ 案情通报：{theme.name}</h3>
              <p className="text-xs text-emerald-600 font-bold">请小侦探根据线索仔细思考</p>
            </div>
          </div>
          <CandyButton
            tone="green"
            size="sm"
            onClick={() => handleStartCase(theme)}
          >
            🔄 换个谜题
          </CandyButton>
        </div>

        <AiPanel state={stream} tone="green" />

        {stream.status === 'done' && (
          <div className="pt-2 flex flex-col items-center gap-3">
            <CandyButton
              tone={solved ? 'green' : 'orange'}
              size="md"
              onClick={handleSolve}
              disabled={solved}
            >
              {solved ? '🎉 破案成功！获得 3 颗星星 ⭐' : '💡 我推理出答案了！'}
            </CandyButton>
          </div>
        )}
      </div>
    </div>
  );
}
