import { useState, lazy, Suspense, useEffect } from 'react';
import { navigate } from '@/lib/router';
import { useMastery } from '@/store/useStore';
import type { Progress } from '@/types';
import { masteredCount } from '@/lib/englishCurriculum';
import { useTranslation } from '@/i18n/useTranslation';
import { PageHeader } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { sfxTap } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTrainingTarget } from '@/hooks/useTrainingTarget';
import { TrainingBanner } from '@/components/study/TrainingBanner';

// 按需懒加载子模块
const LetterWall = lazy(() => import('./LetterWall').then((m) => ({ default: m.LetterWall })));
const LetterStudy = lazy(() => import('./LetterStudy').then((m) => ({ default: m.LetterStudy })));
const LetterTrace = lazy(() => import('./LetterTrace').then((m) => ({ default: m.LetterTrace })));
const LetterOrder = lazy(() => import('./LetterOrder').then((m) => ({ default: m.LetterOrder })));
const MatchGame = lazy(() => import('./MatchGame').then((m) => ({ default: m.MatchGame })));
const LetterPopGame = lazy(() => import('./LetterPopGame').then((m) => ({ default: m.LetterPopGame })));

type TabId = 'wall' | 'study' | 'trace' | 'order' | 'arcade';
type ArcadeMode = 'pop' | 'match';

export default function LettersPage() {
  const [tab, setTab] = useState<TabId>('wall');
  const [arcadeMode, setArcadeMode] = useState<ArcadeMode>('pop');
  const mastery = useMastery();
  const { t } = useTranslation();
  const { target, clear } = useTrainingTarget('letters');
  const lettersDone = masteredCount({ mastery } as Progress, 'letter:');
  const unlockedPhonics = lettersDone >= 8;
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

      <Tabs<TabId>
        tone="blue"
        layoutId="letters-tabs"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'wall', label: t('letters.tabWall'), emoji: '🌳' },
          { id: 'study', label: t('letters.tabStudy'), emoji: '🎯' },
          { id: 'trace', label: t('letters.tabTrace'), emoji: '✍️' },
          { id: 'order', label: t('letters.tabOrder'), emoji: '🅰️' },
          { id: 'arcade', label: '字母游乐场', emoji: '🎮' },
        ]}
      />

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
