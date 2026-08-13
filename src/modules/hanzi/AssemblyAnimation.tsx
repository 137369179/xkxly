import { useState } from 'react';
import { getComponents, hasDecomposition } from '@/lib/hanziEtymology';
import { useTranslation } from '@/i18n/useTranslation';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';

/**
 * 拼字动画：把部件「飞入 + 组装」成完整汉字的过程做成动效，
 * 让孩子直观看到「日 + 月 → 明」「氵 + 青 → 清」的拼装顿悟。
 * 象形 / 独体字没有可拼部件，改为展示「整体字 · 照样子画出来」的轻脉动。
 */
export function AssemblyAnimation({ char }: { char: string }) {
  const { t } = useTranslation();
  const [runId, setRunId] = useState(0);
  const comps = getComponents(char);
  const canAssemble = hasDecomposition(char);

  return (
    <Panel className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-ink-soft">{t('hanzi.assembleTitle')}</p>
        {canAssemble && (
          <CandyButton tone="purple" size="sm" variant="soft" onClick={() => setRunId((n) => n + 1)}>
            {t('hanzi.replayAssemble')}
          </CandyButton>
        )}
      </div>

      {canAssemble ? (
        <div key={runId} className="flex flex-wrap items-center justify-center gap-2 py-2">
          {comps.map((c, i) => (
            <div key={`${c}-${i}`} className="flex items-center gap-2">
              <div
                className="hz-anim-comp flex h-16 w-16 items-center justify-center rounded-2xl bg-white/70 text-4xl font-black text-ink shadow-sm ring-1 ring-candy-purple/15"
                style={{ animationDelay: `${i * 0.16}s` }}
              >
                {c}
              </div>
              {i < comps.length - 1 && (
                <span className="text-2xl font-black text-ink-soft" style={{ animationDelay: `${i * 0.16 + 0.12}s` }}>
                  +
                </span>
              )}
            </div>
          ))}
          <span className="text-2xl font-black text-ink-soft">=</span>
          <div
            className="hz-anim-char flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-candy-purple-soft to-candy-pink-soft text-5xl font-black text-candy-purple-deep shadow-md"
            style={{ animationDelay: `${comps.length * 0.16}s` }}
          >
            {char}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-3">
          <div className="hz-pulse flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-candy-orange-soft to-candy-yellow-soft text-6xl font-black text-candy-orange-deep shadow-sm">
            {char}
          </div>
          <p className="text-xs font-semibold text-ink-soft">{t('hanzi.wholeCharNote')}</p>
        </div>
      )}
    </Panel>
  );
}
