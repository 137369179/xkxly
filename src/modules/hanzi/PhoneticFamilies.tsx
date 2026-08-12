/**
 * 字族学习（形声字系统）
 * ------------------------------------------------------------------
 * 专业依据：汉字 80%+ 是形声字，「声旁表音、形旁表意」是识字量
 * 倍增的关键策略（洪恩「字族文」/帮帮「偏旁归类」均以此为核心）。
 *
 * 把字库按「拼音声旁」分族：同声旁的字排在一起，
 * 孩子一眼看出「包 → 跑/泡/抱/饱」式的规律。
 */
import { useMemo, useState } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { HANZI_DATA } from '@/data/hanzi';
import { type HanziEntry } from '@/data/hanziIndex';
import { speak } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { useMastery, useStore } from '@/store/useStore';
import { TONE_STYLE } from '@/lib/tones';

interface Family {
  /** 拼音（不带声调） */
  key: string;
  chars: HanziEntry[];
}

export function PhoneticFamilies({ onLearn }: { onLearn?: (h: HanziEntry) => void }) {
  const mastery = useMastery();
  const learnSkill = useStore((s) => s.learnSkill);
  const [open, setOpen] = useState<string | null>(null);

  const families = useMemo<Family[]>(() => {
    const map = new Map<string, HanziEntry[]>();
    for (const h of HANZI_DATA) {
      if (!h.p) continue;
      const arr = map.get(h.p) ?? [];
      arr.push(h);
      map.set(h.p, arr);
    }
    // 只保留 ≥2 字的族（有家族可比才有学习价值），按族大小降序
    return [...map.entries()]
      .filter(([, arr]) => arr.length >= 2)
      .map(([key, arr]) => ({
        key,
        chars: arr.sort((a, b) => a.strokes - b.strokes),
      }))
      .sort((a, b) => b.chars.length - a.chars.length);
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        emoji="🧬"
        title="字族学习"
        subtitle="同声旁的字读音相同或相近，一串一串记"
        tone="purple"
      />

      <Panel>
        <p className="text-sm font-bold text-ink-soft">
          💡 发现规律：汉字里很多字「读音相同偏旁不同」，意思跟偏旁走、读音跟声旁走。
          学会一族，比一个一个背快多啦！
        </p>
      </Panel>

      <div className="space-y-3">
        {families.map((f) => {
          const isOpen = open === f.key;
          const learnedCount = f.chars.filter(
            (h) => (mastery[`hanzi:${h.c}`]?.lv ?? 0) >= 1,
          ).length;
          return (
            <Panel key={f.key}>
              <button
                className="flex w-full items-center gap-3 text-left"
                onClick={() => { sfxTap(); setOpen(isOpen ? null : f.key); }}
              >
                <span className="rounded-full bg-candy-purple-soft px-3 py-1 text-lg font-black text-candy-purple-deep">
                  {f.key}
                </span>
                <span className="flex-1 text-sm font-bold text-ink-soft">
                  {f.chars.length} 个字 · 已学 {learnedCount}
                </span>
                <span className="text-lg">{isOpen ? '🔼' : '🔽'}</span>
              </button>

              {isOpen && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {f.chars.map((h) => {
                      const learned = (mastery[`hanzi:${h.c}`]?.lv ?? 0) >= 1;
                      return (
                        <button
                          key={h.c}
                          onClick={() => {
                            sfxTap();
                            speak(h.c, { lang: 'zh-CN', rate: 0.7 });
                            learnSkill(`hanzi:${h.c}`);
                            onLearn?.(h);
                          }}
                          className="flex min-w-[72px] flex-col items-center rounded-2xl border-2 p-2 transition-all active:translate-y-[1px]"
                          style={{
                            borderColor: learned ? '#22c55e66' : '#e5e0f0',
                            background: learned ? '#f0fdf4' : 'white',
                          }}
                        >
                          <span className="text-3xl font-black text-ink">{h.c}</span>
                          <span className="text-xs font-bold text-candy-purple-deep">{h.pd}</span>
                          <span className="text-[10px] font-bold text-ink-soft">{h.radical}部</span>
                          {learned && <span className="text-[10px]">✅</span>}
                        </button>
                      );
                    })}
                  </div>
                  {/* 族规律提示 */}
                  <div
                    className="rounded-xl p-3 text-sm font-semibold"
                    style={{ background: TONE_STYLE.purple.soft, color: TONE_STYLE.purple.deep }}
                  >
                    🔍 这一族都读「{f.key}」附近的音：{
                      f.chars.map((h) => `${h.c}(${h.pd})`).join('、')
                    }。偏旁不同，意思就不同——{f.chars.slice(0, 3).map((h) => `「${h.c}」是${h.radical}部和${h.words[0]}`).join('，')}。
                  </div>
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      <p className="text-center text-xs font-bold text-ink-soft">
        共 {families.length} 个字族 · 点开一族开始探索
      </p>
    </div>
  );
}
