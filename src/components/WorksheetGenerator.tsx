/**
 * 🖨️ 智能 PDF / HTML 打印练习册生成器
 * 支持生成 26 个字母四线格描红与汉字标准米字格练习纸，可直接调用浏览器 window.print() 打印！
 */
import { useState } from 'react';
import { sfxTap } from '@/lib/sfx';
import { CandyButton } from '@/components/ui/Button';

export function WorksheetGenerator() {
  const [mode, setMode] = useState<'letters' | 'hanzi'>('letters');

  const printWorksheet = () => {
    sfxTap();
    window.print();
  };

  return (
    <div className="space-y-4 rounded-3xl border-4 border-pink-200 bg-white p-6 shadow-fluffy">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-pink-100 pb-4">
        <div>
          <h3 className="text-xl font-black text-pink-900">🖨️ 幼儿线下打印练习册生成器</h3>
          <p className="text-sm font-bold text-pink-600">
            一键生成标准的英语字母四线格与汉字米字格连线描红卡，方便连接打印机打印！
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { sfxTap(); setMode('letters'); }}
            className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
              mode === 'letters' ? 'bg-pink-500 text-white shadow-sm' : 'bg-pink-50 text-pink-700'
            }`}
          >
            🔤 字母四线格
          </button>
          <button
            onClick={() => { sfxTap(); setMode('hanzi'); }}
            className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
              mode === 'hanzi' ? 'bg-purple-500 text-white shadow-sm' : 'bg-purple-50 text-purple-700'
            }`}
          >
            🈲 汉字米字格
          </button>
        </div>
      </div>

      {/* 可打印预览区 */}
      <div className="printable-area rounded-2xl border border-pink-100 bg-pink-50/40 p-4 min-h-[300px]">
        {mode === 'letters' ? (
          <div className="space-y-4">
            <h4 className="text-center font-black text-pink-900">《宝贝学习乐园 · 26 个字母描红练习册》</h4>
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
        ) : (
          <div className="space-y-4">
            <h4 className="text-center font-black text-purple-900">《宝贝学习乐园 · 基础汉字米字格描红册》</h4>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {['一', '二', '三', '人', '大', '天', '口', '日', '月', '水', '火', '山', '石', '田', '土'].map((hz) => (
                <div key={hz} className="relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-purple-300 bg-white p-2 shadow-sm">
                  {/* 米字格虚线背景 */}
                  <div className="absolute inset-0 border-r border-b border-dashed border-purple-100" />
                  <span className="relative z-10 text-4xl font-black text-purple-700">{hz}</span>
                  <span className="relative z-10 text-xs font-bold text-purple-400">mǐ zì gé</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <CandyButton tone="pink" size="md" onClick={printWorksheet}>
          🖨️ 连连接打印机 · 导出打印 PDF
        </CandyButton>
      </div>
    </div>
  );
}
