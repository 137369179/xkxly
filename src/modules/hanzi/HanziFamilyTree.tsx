import {
  buildFamilyGraph,
  componentUsers,
  getComponents,
  getEtymology,
  type FamilyRole,
  type HanziFamily,
} from '@/lib/hanziEtymology';
import { useTranslation } from '@/i18n/useTranslation';
import { Panel } from '@/components/ui/Card';
import { speak } from '@/lib/speech';
import { ExploreReward } from '@/components/study/ExploreReward';

const ROLE_BADGE: Record<FamilyRole, string> = {
  phonetic: 'bg-candy-purple-soft text-candy-purple-deep',
  semantic: 'bg-candy-blue-soft text-candy-blue-deep',
  component: 'bg-candy-green-soft text-candy-green-deep',
};

function roleBadge(t: (k: string) => string, role: FamilyRole): string {
  return role === 'phonetic' ? t('hanzi.rolePhonetic') : role === 'semantic' ? t('hanzi.roleSemantic') : t('hanzi.roleComponent');
}

/**
 * 字族定位：
 *   1. 优先展示「以本字为根」的字族（青 → 清/情/晴/请）。
 *   2. 本字是叶子时：形声字优先回退到**声旁族**（青带清/情/晴/请，正是「基本字带字」的精华），
 *      其余情况回退到它所属的最能产部件的字族（氵带出一堆水字）。
 */
function familyForChar(char: string): { family: HanziFamily; belongsTo: boolean } | null {
  const self = buildFamilyGraph(char, { max: 10 });
  if (self && self.members.length) return { family: self, belongsTo: false };

  const e = getEtymology(char);
  if (e?.phonetic && componentUsers(e.phonetic).length >= 2) {
    const fam = buildFamilyGraph(e.phonetic, { max: 10 });
    if (fam) return { family: fam, belongsTo: true };
  }

  let best: { root: string; count: number } | null = null;
  for (const comp of getComponents(char)) {
    const count = componentUsers(comp).length;
    if (count >= 2 && (!best || count > best.count)) best = { root: comp, count };
  }
  if (!best) return null;
  const fam = buildFamilyGraph(best.root, { max: 10 });
  return fam ? { family: fam, belongsTo: true } : null;
}

/**
 * 字族树：把「基本字带字」可视化——学会 青，就能带出 清/情/晴/请。
 * 声旁族（同音）与形旁族（同义类）用不同色徽章区分，点成员可听读。
 */
export function HanziFamilyTree({ char }: { char: string }) {
  const { t } = useTranslation();
  const found = familyForChar(char);
  if (!found) {
    return (
      <Panel className="space-y-2">
        <p className="text-sm font-extrabold text-ink-soft">{t('hanzi.familyTitle')}</p>
        <p className="text-xs font-semibold text-ink-soft">{t('hanzi.noFamily')}</p>
      </Panel>
    );
  }

  const { family, belongsTo } = found;
  return (
    <Panel className="space-y-3">
      <p className="text-sm font-extrabold text-ink-soft">{t('hanzi.familyTitle')}</p>
      {belongsTo ? (
        <p className="text-xs font-semibold text-ink-soft">
          「{char}」{t('hanzi.belongsTo')}「{family.root}」{t('hanzi.familySuffix')}
        </p>
      ) : (
        <p className="text-xs font-semibold text-ink-soft">
          「{char}」{t('hanzi.familyRoot')}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-candy-yellow-soft to-candy-orange-soft px-3 py-2 shadow-sm">
          <span className="text-3xl font-black leading-none text-candy-orange-deep">{family.root}</span>
          {family.rootPd && <span className="mt-0.5 text-xs font-bold text-candy-orange-deep">{family.rootPd}</span>}
          <span className="mt-1 text-xs font-extrabold text-candy-orange-deep">{t('hanzi.familyRootLabel')}</span>
        </div>
        <span className="text-2xl font-black text-ink-soft">→</span>
        {family.members.map((m) => (
          <button
            key={m.c}
            onClick={() => speak(m.c, { lang: 'zh-CN', rate: 0.75 })}
            className="flex flex-col items-center rounded-2xl bg-white/70 px-3 py-2 text-left shadow-sm ring-1 ring-candy-purple/15 transition active:scale-95"
            title={t('hanzi.listenFamily')}
          >
            <span className="text-3xl font-black leading-none text-ink">{m.c}</span>
            {m.pd && <span className="mt-0.5 text-xs font-bold text-ink-soft">{m.pd}</span>}
            <span className={`mt-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${ROLE_BADGE[m.role]}`}>
              {roleBadge(t, m.role)}
            </span>
            <span className="mt-0.5 text-xs font-semibold text-ink-soft">{m.word}</span>
          </button>
        ))}
      
      <ExploreReward rewardKey="hanzi-family" scene="hanzi" tone="blue" /></div>
    </Panel>
  );
}
