import { useState, useMemo } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap } from '@/lib/sfx';
import { CandyButton } from '@/components/ui/Button';
import { useMastery } from '@/store/useStore';
import { weakSkills, skillLabel } from '@/lib/srs';
import type { Progress } from '@/types';

export function WorksheetGenerator() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'letters' | 'hanzi' | 'weak_targeted'>('letters');
  const mastery = useMastery();

  const weakItems = useMemo(() => {
    const list = weakSkills({ mastery } as Progress, 12);
    // 优先从掌握度低的内容中提取
    return list.map((sk) => ({
      skill: sk.skill,
      label: skillLabel(sk.skill),
    }));
  }, [mastery]);

  const printWorksheet = () => {
    sfxTap();
    window.print();
  };

  return (
    <div className="space-y-4 rounded-3xl border-4 border-pink-200 bg-white p-6 shadow-fluffy">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-pink-100 pb-4">
        <div>
          <h3 className="text-xl font-black text-pink-900">{t('worksheetGenerator.title')}</h3>
          <p className="text-sm font-bold text-pink-600">
            {t('worksheetGenerator.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { sfxTap(); setMode('letters'); }}
            className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
              mode === 'letters' ? 'bg-pink-500 text-white shadow-sm' : 'bg-pink-50 text-pink-700'
            }`}
          >
            {t('worksheetGenerator.lettersBtn')}
          </button>
          <button
            type="button"
            onClick={() => { sfxTap(); setMode('hanzi'); }}
            className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
              mode === 'hanzi' ? 'bg-purple-500 text-white shadow-sm' : 'bg-purple-50 text-purple-700'
            }`}
          >
            {t('worksheetGenerator.hanziBtn')}
          </button>
          <button
            type="button"
            onClick={() => { sfxTap(); setMode('weak_targeted'); }}
            className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
              mode === 'weak_targeted' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-50 text-amber-700'
            }`}
          >
            🎯 易错点靶向字帖 ({weakItems.length})
          </button>
        </div>
      </div>

      {/* 可打印预览区 */}
      <div className="printable-area rounded-2xl border border-pink-100 bg-pink-50/40 p-4 min-h-[300px]">
        {mode === 'letters' && (
          <div className="space-y-4">
            <h4 className="text-center font-black text-pink-900">{t('worksheetGenerator.lettersPreview')}</h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((char) => (
                <div key={char} className="flex flex-col items-center justify-center rounded-xl border border-pink-300 bg-white p-3 shadow-sm">
                  <span className="text-3xl font-black text-pink-600">{char}</span>
                  <span className="text-xs font-bold text-pink-400">{char.toLowerCase()}</span>
                  <div className="mt-1 w-full border-b border-dashed border-pink-200" />
                  <div className="mt-1 w-full border-b border-dashed border-pink-200" />
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === 'hanzi' && (
          <div className="space-y-4">
            <h4 className="text-center font-black text-purple-900">{t('worksheetGenerator.hanziPreview')}</h4>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {['一', '二', '三', '人', '大', '天', '口', '日', '月', '水', '火', '山', '石', '田', '土'].map((hz) => (
                <div key={hz} className="relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-purple-300 bg-white p-2 shadow-sm">
                  <div className="absolute inset-0 border-r border-b border-dashed border-purple-100" />
                  <span className="relative z-10 text-4xl font-black text-purple-700">{hz}</span>
                  <span className="relative z-10 text-xs font-bold text-purple-400">mǐ zì gé</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === 'weak_targeted' && (
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="font-black text-amber-950 text-base">🎯 宝贝专属 · 易错与薄弱点强化字帖</h4>
              <p className="text-xs text-amber-700">根据近期答题情况定制生成，点击打印即可装订成册</p>
            </div>
            {weakItems.length === 0 ? (
              <div className="py-12 text-center text-sm font-bold text-slate-400">
                🎉 太棒啦！目前没有明显易错或薄弱点，建议打印全套字帖进行常规练字！
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {weakItems.map((item, idx) => (
                  <div key={`${item.skill}-${idx}`} className="relative flex aspect-square flex-col items-center justify-between rounded-xl border-2 border-amber-300 bg-white p-3 shadow-sm">
                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                      专项 #{idx + 1}
                    </span>
                    <span className="text-3xl font-black text-slate-800 my-auto">{item.label}</span>
                    <div className="w-full border-t-2 border-dashed border-amber-200" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <CandyButton tone="pink" size="md" onClick={printWorksheet}>
          {t('worksheetGenerator.printBtn')}
        </CandyButton>
      </div>
    </div>
  );
}
