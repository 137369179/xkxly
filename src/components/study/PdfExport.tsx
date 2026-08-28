/**
 * 学习档案导出 - 生成完整成长海报（PNG，高清适配手机保存 / 微信分享）
 *
 * 注意：浏览器 Canvas 不支持直接编码 PDF，旧实现用了
 * `canvas.toDataURL('application/pdf')`（该 MIME 会被忽略，实际仍是 PNG），
 * 却配了 .pdf 文件名，导致家长下载后多数设备打不开。
 * 这里改为真正可靠的「导出 PNG 图片」方案，契合移动端分享场景。
 */

import { useState } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import type { Progress } from '@/types';
import { useSettingsStore } from '@/store/useSettingsStore';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { touchedCount, masteredCount, masteryRate } from '@/lib/srs';
import { dateKey } from '@/lib/dailyPlan';
import { BADGES } from '@/data/badges';
import { useTranslation } from '@/i18n/useTranslation';
import { SUBJECTS } from '@/components/charts/ParentEnhance';

export function PdfExport() {
  const { t: tr } = useTranslation();
  // generateReport 仅读取 mastery / badges / stars / streak（含 touchedCount/masteryRate → mastery）
  const progress = useStore(
    useShallow(
      (s) =>
        ({
          mastery: s.progress.mastery,
          badges: s.progress.badges,
          stars: s.progress.stars,
          streak: s.progress.streak,
        }) as Progress,
    ),
  );
  const settings = useSettingsStore((s) => s.settings);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  const generate = async () => {
    sfxTap();
    setLoading(true);
    try {
      const url = await generateReport(progress, settings.sound ?? true);
      setUrl(url);
      sfxStar();
      celebrateSmall();
    } catch (e) {
      if (import.meta.env.DEV) console.error('report', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel>
      <PanelTitle emoji="🖼️" title={tr('report.posterTitle')} subtitle={tr('report.posterSubtitle')} tone="green" />
      <div className="text-center">
        {!url ? (
          <div className="py-4">
            <div className="text-5xl">📋</div>
            <p className="mt-2 text-sm font-bold text-ink-soft">
              {tr('report.posterDesc')}
            </p>
            <CandyButton tone="green" size="lg" className="mt-3" onClick={generate} disabled={loading}>
              {loading ? tr('common.generating') : tr('report.genPoster')}
            </CandyButton>
          </div>
        ) : (
          <div className="py-4">
            <img
              src={url}
              alt={tr('report.posterTitle')}
              className="mx-auto max-h-96 w-auto rounded-2xl border-4 border-candy-green-soft"
            />
            <div className="mt-3 flex justify-center gap-2">
              <a href={url} download={`成长档案_${dateKey()}.png`} target="_blank" rel="noopener">
                <CandyButton tone="green" size="sm">
                  📥 保存图片
                </CandyButton>
              </a>
              <CandyButton tone="purple" variant="soft" size="sm" onClick={generate}>
                🔄 重新生成
              </CandyButton>
            </div>
            <p className="mt-2 text-xs font-bold text-ink-soft">
              手机上长按图片即可保存到相册，或直接分享到微信
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}

async function generateReport(
  progress: Progress,
  _sound: boolean,
): Promise<string> {
  const W = 820;

  // 学科掌握率聚合（与 SubjectBalance 口径一致：lv/5 平均）
  const subj = SUBJECTS.map((s) => {
    const items = Object.entries(progress.mastery).filter(([k]) => k.startsWith(s.key + ':'));
    const pct = items.length
      ? items.reduce((sum, [, m]) => sum + (m.lv ?? 0), 0) / (items.length * 5)
      : 0;
    return { ...s, pct };
  });
  const earned = BADGES.filter((b) => progress.badges.includes(b.id));

  // 动态高度
  const H = 200 + subj.length * 34 + earned.length * 26 + 260;

  const canvas = document.createElement('canvas');
  const scale = 2; // 高清
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 不可用');
  ctx.scale(scale, scale);

  // 背景渐变
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#f0faf4');
  grad.addColorStop(1, '#dcecfa');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 标题
  ctx.fillStyle = '#33a863';
  ctx.font = 'bold 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📊 宝贝成长档案', W / 2, 62);

  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText(`生成日期：${new Date().toLocaleDateString('zh-CN')}`, W / 2, 90);

  let y = 130;

  // 概览
  ctx.fillStyle = '#1B5E20';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('📌 学习概览', 40, y);
  y += 32;

  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#333';
  const stats = [
    `⭐ 累计星星：${progress.stars}`,
    `🏅 已获徽章：${progress.badges.length} / ${BADGES.length}`,
    `🔥 连续学习：${progress.streak} 天`,
    `📚 接触知识点：${touchedCount(progress)} 个`,
    `✅ 已熟练：${masteredCount(progress)} 个`,
    `📈 整体掌握率：${Math.round(masteryRate(progress) * 100)}%`,
    `📖 已读古诗：${(progress.poemsRead ?? []).length} 首`,
    `❌ 错题本：${(progress.wrongBook ?? []).length} 题`,
  ];
  for (const s of stats) {
    ctx.fillText(s, 60, y);
    y += 26;
  }

  y += 14;

  // 学科掌握率
  ctx.fillStyle = '#1B5E20';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('📊 学科掌握率', 40, y);
  y += 28;
  const barX = 150;
  const barW = 440;
  const barH = 14;
  for (const s of subj) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = s.color;
    ctx.textAlign = 'left';
    ctx.fillText(s.label, 60, y + 11);
    // 背景条
    ctx.fillStyle = '#f7edf0';
    roundRect(ctx, barX, y, barW, barH, 7);
    ctx.fill();
    // 前景条
    const w = Math.max(0, Math.min(1, s.pct)) * barW;
    if (w > 1.5) {
      ctx.fillStyle = s.color;
      roundRect(ctx, barX, y, w, barH, 7);
      ctx.fill();
    }
    // 百分比
    ctx.fillStyle = '#333';
    ctx.fillText(`${Math.round(s.pct * 100)}%`, barX + barW + 12, y + 11);
    y += 26;
  }

  y += 16;

  // 已获徽章
  ctx.fillStyle = '#1B5E20';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('🏅 已获徽章', 40, y);
  y += 30;
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#333';
  if (earned.length === 0) {
    ctx.fillText('暂无徽章，加油学习解锁吧！', 60, y);
    y += 24;
  } else {
    for (const b of earned) {
      ctx.fillText(`${b.emoji} ${b.name}`, 60, y);
      y += 24;
    }
  }

  y += 16;

  // 近 7 天
  if (y < H - 200) {
    ctx.fillStyle = '#1B5E20';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('📅 近 7 天学习记录', 40, y);
    y += 30;

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#333';
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const log = progress.dailyLog[key];
      if (log) {
        const min = Math.floor((log.sec ?? 0) / 60);
        ctx.fillText(`${key}：${min}分钟 / ${log.items ?? 0}题 / ✅${log.ok ?? 0} / ⭐${log.stars ?? 0}`, 60, y);
      } else {
        ctx.fillText(`${key}：未学习`, 60, y);
      }
      y += 24;
      if (y > H - 60) break;
    }
  }

  // 底部
  ctx.fillStyle = '#888';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('— 宝贝学习乐园 · 成长档案 —', W / 2, H - 30);

  return canvas.toDataURL('image/png');
}

/** 圆角矩形 path（canvas 原生 roundRect 老设备不支持，手写兼容） */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
