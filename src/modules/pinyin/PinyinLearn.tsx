import { useMemo } from 'react';
import { type PinyinEntry } from '@/data/pinyinIndex';
import { getKingdomLevel, type KingdomPinyinLevel } from '@/data/pinyinKingdomData';
import { LearnFlow, type FlowStep } from '@/components/LearnFlow';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { PinyinInteractiveScene } from './components/PinyinInteractiveScene';
import { PinyinToneCar } from './components/PinyinToneCar';
import { PinyinVoiceStudio } from './components/PinyinVoiceStudio';
import { PinyinFourLineCanvas } from './components/PinyinFourLineCanvas';
import { PinyinPracticeMiniGames } from './components/PinyinPracticeMiniGames';

interface PinyinLearnProps {
  entry: PinyinEntry;
  onDone: () => void;
}

export function PinyinLearn({ entry, onDone }: PinyinLearnProps) {
  const learnSkill = useStore((s) => s.learnSkill);
  const practice = useStore((s) => s.practice);
  const addStars = useStore((s) => s.addStars);

  const skill = `pinyin:${entry.p}`;
  const level: KingdomPinyinLevel = useMemo(() => getKingdomLevel(entry.p), [entry.p]);

  const steps: FlowStep[] = [
    // ── 1. 玩 (Play: 拟人动画情境交互) ──
    {
      key: 'play',
      label: '玩',
      emoji: '🎮',
      gate: true,
      autoAdvanceMs: 1200,
      render: (api) => (
        <div className="space-y-4">
          <PinyinInteractiveScene
            symbol={level.p}
            name={level.name}
            rhyme={level.rhyme}
            personification={level.personification}
            onInteracted={() => {
              api.ready();
            }}
          />
        </div>
      ),
    },

    // ── 2. 认 (Recognize: 四声调过山车与口型要领) ──
    {
      key: 'recognize',
      label: '认',
      emoji: '💡',
      gate: true,
      autoAdvanceMs: 1400,
      render: (api) => (
        <div className="space-y-4 max-w-md mx-auto">
          {/* 四声调小汽车过山车 */}
          <PinyinToneCar basePinyin={level.p} tones={level.tones} />

          {/* 发音口型指引与拼读音节 */}
          <Panel className="p-4 bg-purple-50/90 border-2 border-purple-200 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl">👄</span>
              <span className="text-sm font-black text-candy-purple-deep">标准发音口型要领</span>
            </div>
            <p className="text-xs font-bold text-ink mb-3 leading-relaxed">{level.mouthGuide}</p>

            {level.syllables && level.syllables.length > 0 && (
              <div>
                <div className="text-xs font-black text-purple-900 mb-1.5">🔊 常用拼读组合：</div>
                <div className="flex flex-wrap gap-1.5">
                  {level.syllables.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        sfxTap();
                        speak(s, { lang: 'zh-CN', rate: 0.65 });
                      }}
                      className="px-3 py-1 rounded-xl bg-white border border-purple-300 text-xs font-black text-purple-900 shadow-xs hover:bg-purple-100 active:scale-95 transition-all cursor-pointer font-sans"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <div className="flex justify-center pt-1">
            <CandyButton
              tone="green"
              size="lg"
              onClick={() => {
                sfxCorrect();
                triggerHaptic(30);
                api.ready();
              }}
            >
              我记牢啦 ➔
            </CandyButton>
          </div>
        </div>
      ),
    },

    // ── 3. 读 (Read: 变声魔镜智能录音跟读棚) ──
    {
      key: 'read',
      label: '读',
      emoji: '🗣️',
      gate: true,
      autoAdvanceMs: 1400,
      render: (api) => (
        <div className="space-y-4">
          <PinyinVoiceStudio
            level={level}
            onPass={() => {
              addStars(2);
              api.ready();
            }}
          />
        </div>
      ),
    },

    // ── 4. 写 (Write: 四线三格魔法描红书写) ──
    {
      key: 'write',
      label: '写',
      emoji: '✍️',
      gate: true,
      autoAdvanceMs: 1400,
      render: (api) => (
        <div className="space-y-4">
          <PinyinFourLineCanvas
            symbol={level.p}
            gridSpec={level.fourLineGrid}
            onPass={() => {
              learnSkill(skill);
              addStars(1);
              api.ready();
            }}
          />
        </div>
      ),
    },

    // ── 5. 练 (Practice: 3大趣味小游戏闯关) ──
    {
      key: 'practice',
      label: '练',
      emoji: '🧩',
      gate: true,
      render: (api) => (
        <div className="space-y-4 flex flex-col items-center">
          <PinyinPracticeMiniGames
            level={level}
            onPass={() => {
              practice(skill, true, 1);
              learnSkill(skill);
              addStars(3);
              api.ready();
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 select-none max-w-2xl mx-auto pb-10">
      {/* ── 小莤顶部木纹状态栏 ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-amber-100 rounded-3xl border-3 border-yellow-400 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-400 text-amber-950 font-black text-xl flex items-center justify-center shadow-md">
            {level.personification.emoji}
          </div>
          <div>
            <div className="text-xs font-bold text-amber-200">当前关卡</div>
            <div className="text-sm font-black text-white">
              {level.name} · {level.personification.character}
            </div>
          </div>
        </div>

        <button
          onClick={onDone}
          className="px-3.5 py-1.5 rounded-full bg-black/25 hover:bg-black/40 text-amber-200 hover:text-white text-xs font-black border border-yellow-300/60 shadow transition-all cursor-pointer"
        >
          返回拼音王国 ➔
        </button>
      </div>

      {/* ── 小莤 5 步超级教学闭环流 ── */}
      <LearnFlow
        steps={steps}
        tone="purple"
        finishLabel="🎉 完美通关！返回王国"
        onFinish={() => {
          sfxWin();
          triggerHaptic([60, 40, 80, 50, 120]);
          celebrateBig();
          onDone();
        }}
      />
    </div>
  );
}
