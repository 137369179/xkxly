import {
  getEtymology,
  hasDecomposition,
  semanticHint,
  type HanziEtymology,
} from '@/lib/hanziEtymology';
import { useTranslation } from '@/i18n/useTranslation';
import { Panel } from '@/components/ui/Card';
import { ExploreReward } from '@/components/study/ExploreReward';

type Role = 'semantic' | 'phonetic' | 'component';

const ROLE_CLASS: Record<Role, string> = {
  semantic: 'bg-candy-blue-soft text-candy-blue-deep',
  phonetic: 'bg-candy-purple-soft text-candy-purple-deep',
  component: 'bg-candy-green-soft text-candy-green-deep',
};

function roleLabel(t: (k: string) => string, role: Role): string {
  return role === 'semantic' ? t('hanzi.roleSemantic') : role === 'phonetic' ? t('hanzi.rolePhonetic') : t('hanzi.roleComponent');
}

function soundPhrase(t: (k: string) => string, rel: NonNullable<HanziEtymology['soundRel']>): string {
  return rel === 'exact' ? t('hanzi.soundExact') : rel === 'rhyme' ? t('hanzi.soundRhyme') : t('hanzi.soundInitial');
}

/**
 * 部件拆解：把「清 = 氵 + 青」这类造字结构做成带角色标注的图。
 * - 形声字：标出形旁（表义）与声旁（表音），声旁仅在确有读音关系时才展示「读音一样/韵母一样」。
 * - 会意字：标出每一个会意部件，提示「合起来表意」。
 * 象形字 / 拆不出可教学部件的字不渲染本组件。
 */
export function ComponentBreakdown({ char }: { char: string }) {
  const { t } = useTranslation();
  if (!hasDecomposition(char)) return null;
  const e = getEtymology(char)!;
  const comps = e.components;

  const roleOf = (c: string): Role =>
    c === e.phonetic ? 'phonetic' : c === e.semantic ? 'semantic' : 'component';

  const noteOf = (c: string, role: Role): string => {
    if (role === 'semantic') {
      const hint = semanticHint(c);
      return hint ? `${t('hanzi.means')}${hint}` : t('hanzi.meansMeaning');
    }
    if (role === 'phonetic' && e.phoneticPinyin && e.soundRel) {
      return `${t('hanzi.reads')} ${e.phoneticPinyin}，${soundPhrase(t, e.soundRel)}`;
    }
    return '';
  };

  return (
    <Panel className="space-y-3">
      <p className="text-sm font-extrabold text-ink-soft">{t('hanzi.componentsTitle')}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {comps.map((c, i) => {
          const role = roleOf(c);
          return (
            <div key={`${c}-${i}`} className="flex items-center gap-2">
              <div className={`flex flex-col items-center rounded-2xl px-3 py-2 ${ROLE_CLASS[role]}`}>
                <span className="text-3xl font-black leading-none">{c}</span>
                <span className="mt-1 text-xs font-extrabold">{roleLabel(t, role)}</span>
                {noteOf(c, role) && (
                  <span className="mt-0.5 max-w-[88px] text-center text-xs font-semibold leading-tight opacity-80">
                    {noteOf(c, role)}
                  </span>
                )}
              </div>
              {i < comps.length - 1 && <span className="text-2xl font-black text-ink-soft">+</span>}
            </div>
          );
        })}
        <span className="text-2xl font-black text-ink-soft">=</span>
        <div className="flex flex-col items-center rounded-2xl bg-white/70 px-4 py-2 shadow-sm ring-1 ring-candy-purple/20">
          <span className="text-4xl font-black text-candy-purple-deep leading-none">{char}</span>
          <span className="mt-1 text-xs font-extrabold text-candy-purple-deep">{t('hanzi.resultChar')}</span>
        </div>
      
      <ExploreReward rewardKey="hanzi-component" scene="hanzi" tone="blue" /></div>
    </Panel>
  );
}
