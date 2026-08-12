/**
 * 成就海报 - 一键生成学习成就海报
 */

import { useState, useRef } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useProgress } from '@/store/useStore';
import { generateAchievementPoster } from '@/lib/posterGenerator';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';

export function PosterCard() {
  const progress = useProgress();
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const generate = async () => {
    sfxTap();
    setLoading(true);
    try {
      const url = await generateAchievementPoster({ progress });
      setPosterUrl(url);
      sfxStar();
      celebrateSmall();
    } catch (e) {
      if (import.meta.env.DEV) console.error('poster', e);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!posterUrl) return;
    sfxTap();
    const a = linkRef.current;
    if (a) {
      a.href = posterUrl;
      a.download = `学习成就海报_${Date.now()}.png`;
      a.click();
    }
  };

  return (
    <Panel>
      <PanelTitle emoji="🖼️" title="成就海报" subtitle="生成宝贝的学习海报" tone="pink" />
      <div className="text-center">
        {!posterUrl ? (
          <div className="py-6">
            <div className="text-5xl">🏆</div>
            <p className="mt-2 text-sm font-bold text-ink-soft">
              一键生成精美海报，记录宝贝的成长
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-bold">
              <div className="rounded-lg bg-candy-yellow-soft p-2">
                <div className="text-lg font-black text-candy-yellow-deep">⭐ {progress.stars}</div>
                <div className="text-ink-soft">星星</div>
              </div>
              <div className="rounded-lg bg-candy-orange-soft p-2">
                <div className="text-lg font-black text-candy-orange-deep">🏅 {progress.badges.length}</div>
                <div className="text-ink-soft">徽章</div>
              </div>
              <div className="rounded-lg bg-candy-green-soft p-2">
                <div className="text-lg font-black text-candy-green-deep">🔥 {progress.streak}</div>
                <div className="text-ink-soft">连续天数</div>
              </div>
            </div>
            <CandyButton tone="pink" size="lg" className="mt-4" onClick={generate} disabled={loading}>
              {loading ? '⏳ 生成中...' : '🎨 生成海报'}
            </CandyButton>
          </div>
        ) : (
          <div className="py-4">
            <img src={posterUrl} alt="学习成就海报" loading="lazy" decoding="async" className="mx-auto max-w-full rounded-2xl shadow-lg" />
            <div className="mt-3 flex justify-center gap-2">
              <CandyButton tone="green" size="sm" onClick={download}>
                📥 下载
              </CandyButton>
              <CandyButton tone="purple" variant="soft" size="sm" onClick={generate}>
                🔄 重新生成
              </CandyButton>
            </div>
            <a ref={linkRef} className="hidden" />
          </div>
        )}
      </div>
    </Panel>
  );
}
