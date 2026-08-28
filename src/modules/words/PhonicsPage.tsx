import { useState, useEffect } from 'react';
import { LETTER_SOUNDS, COMBO_SOUNDS, type PhonicsRule } from '@/data/phonics';
import { useTranslation } from '@/i18n/useTranslation';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { AiPanel } from '@/components/ai';
import { useAiStream } from '@/lib/ai/useAi';
import { wordPhonicsTask } from '@/lib/ai/tasks';
import { speak } from '@/lib/speech';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { navigate } from '@/lib/router';
import { TONE_STYLE } from '@/lib/tones';

export function PhonicsPage() {
  const { t: tr } = useTranslation();
  const [tab, setTab] = useState<'letters' | 'combos'>('letters');
  const [selected, setSelected] = useState<PhonicsRule | null>(null);
  const tutor = useAiStream();

  const items = tab === 'letters' ? LETTER_SOUNDS : COMBO_SOUNDS;
  const tone = tab === 'letters' ? 'blue' : 'purple';

  // 全局键盘快捷键：1-2 切换字母音/组合音，Esc 返回
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      switch (e.key) {
        case '1': setTab('letters'); setSelected(null); break;
        case '2': setTab('combos'); setSelected(null); break;
        case 'Escape':
          if (selected) setSelected(null);
          else navigate('words');
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selected]);

  return (
    <div className="space-y-5">
      {/* 排版 P1：页面顶部为 Tab 栏，补语义 h1 供屏幕阅读器/SEO 导航 */}
      <h1 className="sr-only">{tr('letters.title')}</h1>
      <div className="flex gap-2">
        <CandyButton tone={tab === 'letters' ? 'blue' : 'purple'} variant={tab === 'letters' ? 'solid' : 'soft'} size="sm" onClick={() => { setTab('letters'); setSelected(null); }}>
          {tr('words.letterSounds')} ({LETTER_SOUNDS.length})
        </CandyButton>
        <CandyButton tone={tab === 'combos' ? 'blue' : 'purple'} variant={tab === 'combos' ? 'solid' : 'soft'} size="sm" onClick={() => { setTab('combos'); setSelected(null); }}>
          {tr('words.comboSounds')} ({COMBO_SOUNDS.length})
        </CandyButton>
      </div>

      <Panel>
        <PanelTitle emoji={tab === 'letters' ? '🔤' : '🔗'} title={tab === 'letters' ? tr('words.lettersTitle') : tr('words.combosTitle')} subtitle={tr('words.tapToLearn')} tone={tone} />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {items.map(rule => {
            const active = selected?.letter === rule.letter;
            const t = TONE_STYLE[tone]!
            return (
              <button
                key={rule.letter}
                onClick={() => { sfxTap(); triggerHaptic(10); setSelected(rule); }}
                className="flex flex-col items-center justify-center rounded-2xl p-3 min-h-[72px] shadow-candy-sm transition-all active:translate-y-[2px]"
                style={{ background: active ? t.main : t.soft, color: active ? t.on : t.deep }}
              >
                <span className="text-2xl font-black">{rule.letter}</span>
                <span className="text-xs font-bold">{rule.sound}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      {selected && (
        <Panel>
          <PanelTitle emoji="🔊" title={`${selected.letter} → ${selected.sound}`} tone={tone} />
          <div className="space-y-3">
            <div className="rounded-xl bg-candy-blue-soft p-3">
              <p className="text-sm font-bold text-ink-soft">{tr('words.pronunciationRule')}</p>
              <p className="text-base font-semibold text-ink">{selected.rule}</p>
            </div>
            {selected.examples.length > 0 && (
              <div>
                <p className="text-sm font-bold text-ink-soft">{tr('words.exampleWords')}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selected.examples.map(ex => (
                    <button key={ex} onClick={() => speak(ex, { lang: 'en-US', rate: 0.7 })} className="rounded-full bg-candy-pink-soft px-4 py-2 text-base font-bold text-candy-pink-deep active:scale-95">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <CandyButton tone="blue" size="md" onClick={() => speak(selected.letter, { lang: 'en-US', rate: 0.6 })}>{tr('words.listenLetter')}</CandyButton>
              <CandyButton tone="purple" size="md" variant="soft" onClick={() => { sfxTap(); tutor.run(wordPhonicsTask({ letters: selected.letter, sound: selected.sound, examples: selected.examples })); }}>{tr('words.aiPhonics')}</CandyButton>
            </div>
          </div>
          <AiPanel state={tutor} tone="purple" title={tr('words.aiPhonicsTitle')} />
        </Panel>
      )}
    </div>
  );
}
