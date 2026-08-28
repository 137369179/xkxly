/**
 * 诗人作品集浏览器 🌸 (N3)
 * 按诗人聚合展示其全部诗作，含生平简介 + 代表作
 */
import { useState, useMemo } from 'react';
import { POETS } from '@/data/poets';
import POEMS, { type PoemIndex } from '@/data/poemsIndex';
import { navigate } from '@/lib/router';
import { sfxTap } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';

const POET_LIST = Object.entries(POETS).map(([key, p]) => ({ key, ...p }));
POET_LIST.sort((a, b) => {
  const da = a.life.match(/\d+/) ? Number(a.life.match(/\d+/)?.[0]) : 9999;
  const db = b.life.match(/\d+/) ? Number(b.life.match(/\d+/)?.[0]) : 9999;
  return da - db;
});

export function PoetWorks() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const poet = useMemo(() => selected ? POET_LIST.find(p => p.key === selected) : null, [selected]);
  const works = useMemo(() =>
    selected ? POEMS.filter((pi: PoemIndex) => pi.author === selected) : [],
    [selected],
  );



  return (
    <div className="space-y-4">
      {!selected ? (
        <div className="space-y-3">
          <h3 className="text-center text-lg font-extrabold text-ink">{t('poetWorks.title')}</h3>
          <p className="text-center text-xs font-bold text-ink-soft">
            {t('poetWorks.tip')}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {POET_LIST.map(p => (
              <button
                key={p.key}
                onClick={() => { sfxTap(); setSelected(p.key); }}
                className="card-candy p-3 text-left transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="text-lg font-extrabold text-ink">{p.name}</div>
                <div className="mt-0.5 text-xs font-bold text-ink-soft">{p.life}</div>
                <div className="mt-0.5 text-xs font-semibold text-ink-muted">{p.epithet || p.style?.split('，')[0]}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => setSelected(null)}
            className="text-sm font-bold text-ink-soft hover:text-ink"
          >
            {t('poetWorks.back')}
          </button>
          {poet && (
            <div className="card-candy p-4">
              <h3 className="text-2xl font-extrabold text-ink">{poet.name}</h3>
              <p className="mt-1 text-sm font-bold text-ink-soft">{poet.life} · {poet.epithet || ''}</p>
              <p className="mt-2 text-xs font-medium text-ink-muted leading-relaxed">{poet.bio}</p>
              {poet.works && poet.works.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs font-bold text-candy-pink-deep">{t('poetWorks.representative')}</span>
                  <span className="text-xs font-medium text-ink-soft">{poet.works.slice(0, 4).join('、')}</span>
                </div>
              )}
            </div>
          )}
          {works.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {works.map((pi: PoemIndex) => (
                <button
                  key={pi.id}
                  onClick={() => { sfxTap(); navigate('poems', pi.id); }}
                  className="card-candy p-3 text-left transition-all hover:scale-[1.01]"
                >
                  <div className="font-extrabold text-ink">{pi.title}</div>
                  <div className="mt-0.5 text-xs font-semibold text-ink-soft">
                    {pi.dynasty} · {pi.genre} · {t('poetWorks.level', { n: pi.level })}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PoetWorks;

