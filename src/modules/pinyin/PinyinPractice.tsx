import { useState } from 'react';
import { ALL_COMBOS, type SyllableCombo } from '@/data/pinyinIndex';
import { useTranslation } from '@/i18n/useTranslation';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { AiPanel } from '@/components/ai';
import { useAiStream } from '@/lib/ai/useAi';
import { pinyinTutorTask } from '@/lib/ai/tasks';
import { speak } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';

export function PinyinPractice() {
  const { t: tr } = useTranslation();
  const [selected, setSelected] = useState<SyllableCombo | null>(null);
  const tutor = useAiStream();

  return (
    <div className="space-y-5">
      <Panel>
        <PanelTitle emoji="🎯" title={tr('pinyin.comboTableTitle')} subtitle={tr('pinyin.comboTableSubtitle')} tone="purple" />
        <div className="space-y-3">
          {ALL_COMBOS.map((combo, i) => (
            <button
              key={`combo-${i}`}
              onClick={() => { sfxTap(); setSelected(combo); }}
              className="flex w-full items-center gap-3 rounded-2xl bg-white/70 p-3 text-left transition-all active:translate-y-[1px]"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-candy-blue-soft text-xl font-black leading-tight text-candy-blue-deep">
                {combo.shengmu}
              </span>
              <span className="text-lg font-bold text-ink-soft">+</span>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-candy-pink-soft text-xl font-black leading-tight text-candy-pink-deep">
                {combo.yunmu}
              </span>
              <span className="text-lg font-bold text-ink-soft">=</span>
              <span className="grid h-12 min-w-[60px] shrink-0 place-items-center rounded-xl bg-candy-green-soft text-2xl font-black leading-tight text-candy-green-deep px-3">
                {combo.result}
              </span>
              <span className="ml-auto text-sm font-bold text-ink/40">{tr('pinyin.tapToPractice')}</span>
            </button>
          ))}
        </div>
      </Panel>

      {selected && (
        <Panel>
          <PanelTitle emoji="🔊" title={`${selected.shengmu} + ${selected.yunmu} = ${selected.result}`} tone="green" />
          <div className="flex flex-wrap justify-center gap-3">
            <CandyButton tone="green" size="lg" onClick={() => speak(selected.result, { lang: 'zh-CN', rate: 0.6 })}>
              {tr('pinyin.listenCombo')}
            </CandyButton>
            <CandyButton tone="purple" size="md" variant="soft" onClick={() => { sfxTap(); tutor.run(pinyinTutorTask({ symbol: selected.result, type: 'final' })); }}>
              {tr('pinyin.aiExplainCombo')}
            </CandyButton>
          </div>
          <AiPanel state={tutor} tone="purple" title={tr('pinyin.aiExplainComboTitle')} />
        </Panel>
      )}
    </div>
  );
}
