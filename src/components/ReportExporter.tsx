/**
 * AI 学习报告导出
 * 生成周报/月报文本，支持复制、打印和图片导出（PNG，适配手机保存 / 微信分享）
 *
 * 性能优化（核心加强 S）：复用 PdfExport 的 canvas 绘制能力，
 * 把周报/月报也渲染成 PNG 图片，让家长能直接保存或分享给老师。
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useProgress } from '@/store/useStore';
import type { Progress } from '@/types';
import { dateKey } from '@/lib/dailyPlan';
import { touchedCount, masteredCount, masteryRate, weakSkills, skillLabel } from '@/lib/srs';
import POEMS from '@/data/poems';
import { useTranslation } from '@/i18n/useTranslation';

const poemTitle = (id: string) => POEMS.find(p => p.id === id)?.title ?? id;

type ReportPeriod = 'week' | 'month';

/** 报告数据结构（用于文本渲染和 PDF 绘制） */
interface ReportData {
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalMin: number;
  totalItems: number;
  totalOk: number;
  /** 报告周期内获得的星星 */
  periodStars: number;
  accuracy: number;
  streak: number;
  touched: number;
  mastered: number;
  masteryRatePct: number;
  weak: { skill: string; ok: number; ng: number }[];
  dailyLogs: { date: string; min: number; items: number; ok: number; stars: number }[];
  badgeCount: number;
  /** 累计星星（与 periodStars 区分） */
  cumulativeStars: number;
  suggestion: string;
}

function buildReportData(progress: Progress, period: ReportPeriod, t: (k: string, p?: Record<string, string | number>) => string): ReportData {
  const now = new Date();
  const days = period === 'week' ? 7 : 30;
  const startDate = new Date(now.getTime() - days * 86400000);

  const dailyLogs: ReportData['dailyLogs'] = [];
  let totalSec = 0;
  let totalItems = 0;
  let totalOk = 0;
  let totalStars = 0;

  for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
    const key = dateKey(d.getTime());
    const entry = progress.dailyLog[key];
    if (entry) {
      const min = Math.floor((entry.sec ?? 0) / 60);
      totalSec += entry.sec ?? 0;
      totalItems += entry.items ?? 0;
      totalOk += entry.ok ?? 0;
      totalStars += entry.stars ?? 0;
      if (min > 0) {
        dailyLogs.push({
          date: key,
          min,
          items: entry.items ?? 0,
          ok: entry.ok ?? 0,
          stars: entry.stars ?? 0,
        });
      }
    }
  }

  const totalMin = Math.floor(totalSec / 60);
  const accuracy = totalItems > 0 ? Math.round((totalOk / totalItems) * 100) : 0;
  const weak = weakSkills(progress, 5).map(w => ({
    skill: skillLabel(w.skill, poemTitle),
    ok: w.m.ok,
    ng: w.m.ng,
  }));

  return {
    period,
    startDate: dateKey(startDate.getTime()),
    endDate: dateKey(Date.now()),
    totalDays: dailyLogs.length,
    totalMin,
    totalItems,
    totalOk,
    periodStars: totalStars,
    accuracy,
    streak: progress.streak,
    touched: touchedCount(progress),
    mastered: masteredCount(progress),
    masteryRatePct: Math.round(masteryRate(progress) * 100),
    weak,
    dailyLogs,
    badgeCount: progress.badges.length,
    cumulativeStars: progress.stars,
    suggestion: weak.length > 0
      ? t('report.suggestion', { skills: weak.map(w => w.skill).join('、') })
      : t('report.suggestionOk'),
  };
}

function dataToText(d: ReportData, t: (k: string, p?: Record<string, string | number>) => string): string {
  const lines = [
    `${t('common.appName')} · ${d.period === 'week' ? t('report.weekly') : t('report.monthly')}`,
    t('report.generatedDate', { date: d.endDate }),
    t('report.period', { start: d.startDate, end: d.endDate }),
    ``,
    t('report.overview'),
    t('report.days', { count: d.totalDays }),
    t('report.totalTime', { hours: Math.floor(d.totalMin / 60), minutes: d.totalMin % 60 }),
    t('report.questions', { count: d.totalItems }),
    t('report.accuracy', { percent: d.accuracy }),
    t('report.starsGot', { count: d.periodStars }),
    t('report.streak', { count: d.streak }),
    ``,
    t('report.mastery'),
    t('report.touched', { count: d.touched }),
    t('report.mastered', { count: d.mastered }),
    t('report.masteryRate', { percent: d.masteryRatePct }),
    ``,
    t('report.weakTop'),
    ...d.weak.map(w => t('report.weakItem', { skill: w.skill, ok: w.ok, ng: w.ng })),
    ``,
    t('report.daily'),
    ...d.dailyLogs.map(l => t('report.dailyItem', { date: l.date, min: l.min, items: l.items, ok: l.ok, stars: l.stars })),
    ``,
    t('report.suggest'),
    d.suggestion,
    ``,
    t('report.badges'),
    t('report.badgeCount', { count: d.badgeCount }),
    t('report.cumulative', { count: d.cumulativeStars }),
  ];
  return lines.join('\n');
}

/**
 * 用 canvas 绘制报告图片（复用 PdfExport 的绘制模式）
 * 返回 PNG data URL，可直接作为 img src 或下载链接
 */
function dataToPdf(d: ReportData, t: (k: string, p?: Record<string, string | number>) => string): string {
  const W = 800;
  // 月报日志可能多，动态计算高度
  const H = Math.max(1200, 600 + d.dailyLogs.length * 24 + d.weak.length * 24 + 200);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 不可用');

  // 背景渐变
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#f0faf4');
  grad.addColorStop(1, '#dcecfa');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 标题
  ctx.fillStyle = '#33a863';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t('report.learnHeader', { period: d.period === 'week' ? t('report.weekly') : t('report.monthly') }), W / 2, 60);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText(t('report.period', { start: d.startDate, end: d.endDate }), W / 2, 85);

  let y = 130;

  // 学习概览
  ctx.fillStyle = '#1B5E20';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(t('report.pin'), 40, y);
  y += 32;

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#333';
  const overview = [
    t('report.overviewDays', { count: d.totalDays }),
    t('report.overviewTime', { hours: Math.floor(d.totalMin / 60), minutes: d.totalMin % 60 }),
    t('report.overviewQs', { count: d.totalItems, ok: d.totalOk }),
    t('report.overviewAcc', { percent: d.accuracy }),
    t('report.overviewStars', { count: d.periodStars }),
    t('report.overviewStreak', { count: d.streak }),
  ];
  for (const s of overview) {
    ctx.fillText(s, 60, y);
    y += 24;
  }
  y += 10;

  // 知识掌握
  ctx.fillStyle = '#1B5E20';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(t('report.book'), 40, y);
  y += 32;

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#333';
  const mastery = [
    t('report.masteryTouched', { count: d.touched }),
    t('report.masteryDone', { count: d.mastered }),
    t('report.masteryRate2', { percent: d.masteryRatePct }),
  ];
  for (const s of mastery) {
    ctx.fillText(s, 60, y);
    y += 24;
  }
  y += 10;

  // 薄弱知识点
  if (d.weak.length > 0) {
    ctx.fillStyle = '#1B5E20';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(t('report.weakHeader'), 40, y);
    y += 32;

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#C62828';
    for (const w of d.weak) {
      ctx.fillText(t('report.weakLine', { skill: w.skill, ok: w.ok, ng: w.ng }), 60, y);
      y += 24;
    }
    y += 10;
  }

  // 每日明细
  if (d.dailyLogs.length > 0) {
    ctx.fillStyle = '#1B5E20';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(t('report.dailyHeader'), 40, y);
    y += 32;

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#333';
    for (const l of d.dailyLogs) {
      ctx.fillText(t('report.dailyLine', { date: l.date, min: l.min, items: l.items, ok: l.ok, stars: l.stars }), 60, y);
      y += 22;
    }
    y += 10;
  }

  // 建议
  ctx.fillStyle = '#1B5E20';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(t('report.tipHeader'), 40, y);
  y += 32;

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#333';
  // 长建议换行
  const maxCharsPerLine = 38;
  const suggestion = d.suggestion;
  for (let i = 0; i < suggestion.length; i += maxCharsPerLine) {
    ctx.fillText(suggestion.slice(i, i + maxCharsPerLine), 60, y);
    y += 22;
  }

  // 底部
  ctx.fillStyle = '#888';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t('report.footer'), W / 2, H - 30);

  return canvas.toDataURL('image/png');
}

export function ReportExporter() {
  const { t } = useTranslation();
  const progress = useProgress();
  const [period, setPeriod] = useState<ReportPeriod>('week');
  const [copied, setCopied] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 卸载时清理
  useEffect(() => () => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
  }, []);

  const reportData = useMemo(() => buildReportData(progress, period, t), [progress, period, t]);
  const report = useMemo(() => dataToText(reportData, t), [reportData, t]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = report;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const doc = win.document;
    // 安全：用 DOM API 构建，report 含儿童姓名等用户输入，必须以 textContent 注入，
    // 杜绝 document.write('<pre>${report}</pre>') 的字符串插值 XSS（全仓唯一 document.write）。
    const title = doc.createElement('title');
    title.textContent = t('report.title');
    const style = doc.createElement('style');
    style.textContent = `
      body { font-family: -apple-system, sans-serif; padding: 40px; max-width: 600px; margin: auto; }
      pre { white-space: pre-wrap; font-size: 14px; line-height: 1.8; }
      h1 { text-align: center; }
    `;
    const h1 = doc.createElement('h1');
    h1.textContent = t('report.title');
    const pre = doc.createElement('pre');
    pre.textContent = report;
    doc.head.appendChild(title);
    doc.head.appendChild(style);
    doc.body.appendChild(h1);
    doc.body.appendChild(pre);
    doc.close();
    win.print();
  };

  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t('report.title')}_${period === 'week' ? t('report.weekly') : t('report.monthly')}_${dateKey(Date.now())}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 核心加强 S：生成 PDF，复用 PdfExport 的 canvas 绘制方式
  const handleGeneratePdf = () => {
    setPdfLoading(true);
    try {
      // canvas 绘制是同步操作，但包一层 setTimeout 避免阻塞 UI 显示 loading
      setTimeout(() => {
        try {
          const url = dataToPdf(reportData, t);
          setPdfUrl(url);
        } catch (e) {
          if (import.meta.env.DEV) console.error('生成 PDF 失败', e);
        } finally {
          setPdfLoading(false);
        }
      }, 50);
    } catch (e) {
      if (import.meta.env.DEV) console.error('pdf', e);
      setPdfLoading(false);
    }
  };

  return (
    <Panel>
      <PanelTitle emoji="📤" title={t('report.pageTitle')} subtitle={t('report.subtitle')} tone="green" />

      <div className="mb-3 flex gap-2">
        <CandyButton
          tone={period === 'week' ? 'green' : 'purple'}
          variant={period === 'week' ? 'solid' : 'soft'}
          size="sm"
          onClick={() => { setPeriod('week'); setPdfUrl(null); }}
        >
          📅 {t('report.week')}
        </CandyButton>
        <CandyButton
          tone={period === 'month' ? 'green' : 'purple'}
          variant={period === 'month' ? 'solid' : 'soft'}
          size="sm"
          onClick={() => { setPeriod('month'); setPdfUrl(null); }}
        >
          📆 {t('report.month')}
        </CandyButton>
      </div>

      <pre className="max-h-80 overflow-auto rounded-2xl bg-candy-green-soft p-3 text-xs font-bold text-ink whitespace-pre-wrap">
        {report}
      </pre>

      <div className="mt-3 flex flex-wrap gap-2">
        <CandyButton tone="green" size="sm" onClick={handleCopy}>
          {copied ? t('report.copied') : t('report.copy')}
        </CandyButton>
        <CandyButton tone="blue" variant="soft" size="sm" onClick={handleDownload}>
          💾 {t('report.downloadTxt')}
        </CandyButton>
        <CandyButton tone="purple" variant="soft" size="sm" onClick={handlePrint}>
          🖨️ {t('report.print')}
        </CandyButton>
        <CandyButton
          tone="orange"
          variant="soft"
          size="sm"
          onClick={handleGeneratePdf}
          disabled={pdfLoading}
        >
          {pdfLoading ? t('report.generating') : t('report.exportImage')}
        </CandyButton>
      </div>

      {/* PDF 预览 */}
      {pdfUrl && (
        <div className="mt-4">
          <img
            src={pdfUrl}
            alt={t('report.preview')}
            className="mx-auto max-h-96 w-auto rounded-2xl border-4 border-candy-orange-soft"
          />
          <div className="mt-2 flex justify-center gap-2">
            <a
              href={pdfUrl}
                download={`${t('report.title')}_${period === 'week' ? t('report.weekly') : t('report.monthly')}_${dateKey(Date.now())}.png`}
                target="_blank"
                rel="noopener"
              >
                <CandyButton tone="green" size="sm">📥 {t('report.saveImage')}</CandyButton>
            </a>
            <CandyButton tone="purple" variant="soft" size="sm" onClick={handleGeneratePdf}>
              🔄 {t('report.regenerate')}
            </CandyButton>
          </div>
        </div>
      )}
    </Panel>
  );
}
