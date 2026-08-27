import { useState, lazy, Suspense, useEffect } from 'react';
import { navigate } from '@/lib/router';
import { useMastery } from '@/store/useStore';
import type { Progress } from '@/types';
import { masteredCount } from '@/lib/englishCurriculum';
import { useTranslation } from '@/i18n/useTranslation';
import { PageHeader } from '@/components/ui/Card';
import { sfxTap } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTrainingTarget } from '@/hooks/useTrainingTarget';
import { TrainingBanner } from '@/components/study/TrainingBanner';
import { ModuleGameCard } from '@/components/study/ModuleGameCard';
import { useStars } from '@/store/useStore';

// 按需懒加载子模块
const LetterWall = lazy(() => import('./LetterWall').then((m) => ({ default: m.LetterWall })));
const LetterStudy = lazy(() => import('./LetterStudy').then((m) => ({ default: m.LetterStudy })));
const LetterTrace = lazy(() => import('./LetterTrace').then((m) => ({ default: m.LetterTrace })));
const LetterOrder = lazy(() => import('./LetterOrder').then((m) => ({ default: m.LetterOrder })));
const MatchGame = lazy(() => import('./MatchGame').then((m) => ({ default: m.MatchGame })));
const LetterPopGame = lazy(() => import('./LetterPopGame').then((m) => ({ default: m.LetterPopGame })));
const PhonicsBubbleLand = lazy(() => import('./PhonicsBubbleLand').then((m) => ({ default: m.PhonicsBubbleLand })));

type TabId = 'wall' | 'study' | 'trace' | 'order' | 'arcade' | 'phonics';
type ArcadeMode = 'pop' | 'match';

export default function LettersPage() {
  const [tab, setTab] = useState<TabId>('wall');
  const [arcadeMode, setArcadeMode] = useState<ArcadeMode>('pop');
  const mastery = useMastery();
  const { t } = useTranslation();
  const { target, clear } = useTrainingTarget('letters');
  const lettersDone = masteredCount({ mastery } as Progress, 'letter:');
  const unlockedPhonics = lettersDone >= 8;
  const letterStars = useStars();
  const letterProgress = Math.round((lettersDone / 26) * 100);
  // 深链预选目标：trace:<A> 描红预选字母；单字母 A 预选精学字母
  const [traceLetter, setTraceLetter] = useState<string | undefined>(undefined);
  const [studyLetter, setStudyLetter] = useState<string | undefined>(undefined);

  // 深链 param → 专项：trace:<A> 描红；order 排序；单个大写字母进入字母精学
  useEffect(() => {
    const p = target?.param;
    if (!p) return;
    if (p === 'order') {
      setTab('order');
      return;
    }
    const colon = p.indexOf(':');
    const cmd = colon === -1 ? '' : p.slice(0, colon);
    if (cmd === 'trace') {
      setTab('trace');
      setTraceLetter(p.slice('trace:'.length) || undefined);
    } else if (/^[A-Z]$/.test(p)) {
      setTab('study');
      setStudyLetter(p);
    }
  }, [target]);

  return (
    <div className="space-y-4">
      <PageHeader
        iconType="phonics"
        title={t('letters.title')}
        subtitle={t('letters.subtitle')}
        tone="blue"
      />

      <TrainingBanner target={target} onClose={clear} />

      {unlockedPhonics && (
        <button
          onClick={() => navigate('words')}
          className="w-full rounded-2xl border-3 border-purple-300 bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 p-3 text-left shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">🎉</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-purple-900">{t('letters.phonicsUnlockTitle')}</p>
              <p className="text-xs font-bold text-purple-600 truncate">{t('letters.phonicsUnlockDesc', { n: lettersDone })}</p>
            </div>
            <span className="rounded-full bg-purple-200/80 px-2.5 py-1 text-xs font-black text-purple-800">
              去拼读 ➔
            </span>
          </div>
        </button>
      )}

      {/* 🎮 游戏化功能卡入口：每个子功能独立展示进度/星星/解锁态，强化进入前的目标感 */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <ModuleGameCard
          emoji="🌳"
          title={t('letters.tabWall')}
          desc="认字母 · 听发音"
          tone="blue"
          progress={letterProgress}
          masteredCount={lettersDone}
          totalCount={26}
          stars={letterStars}
          testId="gamecard-wall"
          onEnter={() => { sfxTap(); setTab('wall'); }}
        />
        <ModuleGameCard
          emoji="🎯"
          title={t('letters.tabStudy')}
          desc="字母精学 · 例词"
          tone="blue"
          progress={letterProgress}
          masteredCount={lettersDone}
          totalCount={26}
          stars={letterStars}
          testId="gamecard-study"
          onEnter={() => { sfxTap(); setTab('study'); }}
        />
        <ModuleGameCard
          emoji="✍️"
          title={t('letters.tabTrace')}
          desc="描红书写 · 笔顺"
          tone="blue"
          progress={letterProgress}
          masteredCount={lettersDone}
          totalCount={26}
          stars={letterStars}
          testId="gamecard-trace"
          onEnter={() => { sfxTap(); setTab('trace'); }}
        />
        <ModuleGameCard
          emoji="🅰️"
          title={t('letters.tabOrder')}
          desc="字母排序闯关"
          tone="blue"
          progress={letterProgress}
          masteredCount={lettersDone}
          totalCount={26}
          stars={letterStars}
          testId="gamecard-order"
          onEnter={() => { sfxTap(); setTab('order'); }}
        />
        <ModuleGameCard
          emoji="🎮"
          title="字母游乐场"
          desc={unlockedPhonics ? '戳气球 · 大小写配对' : '学会 8 个字母解锁'}
          tone="purple"
          progress={unlockedPhonics ? 100 : 0}
          locked={!unlockedPhonics}
          testId="gamecard-arcade"
          onEnter={() => { sfxTap(); setTab('arcade'); }}
        />
        <ModuleGameCard
          emoji="🫧"
          title="自然拼读乐园"
          desc="26字母发音 · CVC三拼"
          tone="pink"
          progress={letterProgress}
          stars={letterStars}
          testId="gamecard-phonics"
          onEnter={() => { sfxTap(); setTab('phonics'); }}
        />
      </div>

      {/* 主入口已改为游戏化功能卡；arcade 二级切换保留在 Suspense 内按钮组，交互逻辑零回归 */}


      <Suspense
        fallback={
          <div className="grid min-h-[300px] place-items-center">
            <div className="flex items-center gap-2 text-sm font-bold text-sky-700">
              <span className="inline-block animate-spin text-2xl">⏳</span>
              <span>正在加载字母乐园...</span>
            </div>
          </div>
        }
      >
        {tab === 'wall' && <LetterWall />}
        {tab === 'study' && <LetterStudy initialUpper={studyLetter} />}
        {tab === 'trace' && <LetterTrace initialLetter={traceLetter} />}
        {tab === 'order' && <LetterOrder />}
        {tab === 'phonics' && <PhonicsBubbleLand />}
        {tab === 'arcade' && (
          <div className="space-y-4">
            {/* 游乐场二级切换 */}
            <div className="flex justify-center gap-2">
              <button
                onClick={() => { sfxTap(); setArcadeMode('pop'); }}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black transition active:scale-95 shadow-sm',
                  arcadeMode === 'pop'
                    ? 'bg-candy-blue-deep text-white ring-2 ring-blue-300'
                    : 'bg-white text-ink-soft hover:bg-blue-50 border border-blue-100'
                )}
              >
                <span>🎈 听音戳气球</span>
              </button>
              <button
                onClick={() => { sfxTap(); setArcadeMode('match'); }}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black transition active:scale-95 shadow-sm',
                  arcadeMode === 'match'
                    ? 'bg-candy-purple-deep text-white ring-2 ring-purple-300'
                    : 'bg-white text-ink-soft hover:bg-purple-50 border border-purple-100'
                )}
              >
                <span>🧩 大小写配对</span>
              </button>
            </div>

            {arcadeMode === 'pop' ? <LetterPopGame /> : <MatchGame />}
          </div>
        )}
      </Suspense>
    </div>
  );
}
