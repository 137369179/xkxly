import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useProgress, useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import {
  buildBackup,
  parseBackup,
  downloadBackup,
  readBackupFile,
  type BackupPayload,
} from '@/lib/backup';

export function ParentBackupSection() {
  const { t: translate } = useTranslation();
  // buildBackup 需要完整序列化整个 progress（所有学习字段），无法拆成细粒度 selector，
  // 是 useProgress() 的全仓唯一保留使用点（已标 @deprecated）。
  const progress = useProgress();
  const settings = useSettingsStore((s) => s.settings);
  const restoreProgress = useStore((s) => s.restoreProgress);

  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState<BackupPayload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (importMsgTimerRef.current) clearTimeout(importMsgTimerRef.current);
  }, []);

  /* —— 备份导出 —— */
  const handleExport = async () => {
    const payload = await buildBackup(progress, settings);
    downloadBackup(payload);
    setImportMsg({ ok: true, text: translate('parent.backupDownloaded') });
    if (importMsgTimerRef.current) clearTimeout(importMsgTimerRef.current);
    importMsgTimerRef.current = setTimeout(() => setImportMsg(null), 4000);
  };

  /* —— 备份导入：读取文件 → 校验 → 弹确认 —— */
  const handleFilePicked = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await readBackupFile(file);
      const payload = await parseBackup(text);
      if (!payload) {
        setImportMsg({ ok: false, text: translate('parent.backupInvalid') });
        return;
      }
      setShowImportConfirm(payload);
    } catch {
      setImportMsg({ ok: false, text: translate('parent.backupReadFail') });
    }
  };

  /* —— 确认导入：覆盖当前进度 —— */
  const handleConfirmImport = () => {
    if (!showImportConfirm) return;
    restoreProgress(showImportConfirm.progress);
    const date = new Date(showImportConfirm.exportedAt).toLocaleDateString('zh-CN');
    setShowImportConfirm(null);
    setImportMsg({ ok: true, text: translate('parent.backupRestored', { date }) });
    if (importMsgTimerRef.current) clearTimeout(importMsgTimerRef.current);
    importMsgTimerRef.current = setTimeout(() => setImportMsg(null), 6000);
  };

  return (
    <>
      {/* 数据备份与恢复 */}
      <Panel>
        <PanelTitle emoji="💾" title={translate('parent.backupTitle')} subtitle={translate('parent.backupSubtitle')} tone="blue" />
        <div className="space-y-3">
          <p className="text-xs font-bold text-ink-soft">
            {translate('parent.backupDesc')}
          </p>
          <div className="flex flex-wrap gap-2">
            <CandyButton tone="blue" size="sm" onClick={handleExport}>
              {translate('parent.exportBackup')}
            </CandyButton>
            <CandyButton
              tone="purple"
              variant="soft"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {translate('parent.importRestore')}
            </CandyButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                void handleFilePicked(f);
                // 重置 value 允许重复选同一文件
                e.target.value = '';
              }}
            />
          </div>
          {importMsg && (
            <p
              className={`text-sm font-bold ${importMsg.ok ? 'text-candy-green-deep' : 'text-candy-orange-deep'}`}
            >
              {importMsg.ok ? '✅ ' : '⚠️ '}
              {importMsg.text}
            </p>
          )}
        </div>
      </Panel>

      {/* 导入确认弹窗 */}
      {showImportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h3 className="mb-2 text-lg font-extrabold text-ink-main">{translate('parent.confirmRestore')}</h3>
            <p className="mb-4 text-sm font-bold text-ink-soft">
              {translate('parent.restoreWarn1')}
              <span className="text-candy-orange-deep">{translate('parent.restoreWarnStrong')}</span>
              {translate('parent.restoreWarn2')}
            </p>
            <p className="mb-4 text-xs font-bold text-ink-soft">
              {translate('parent.backupTime')}
              {new Date(showImportConfirm.exportedAt).toLocaleString('zh-CN')}
              <br />
              {translate('parent.backupStars', { stars: showImportConfirm.progress.stars, badges: showImportConfirm.progress.badges.length })}
            </p>
            <div className="flex gap-3">
              <CandyButton tone="orange" size="md" fullWidth onClick={handleConfirmImport}>
                {translate('parent.confirmOverwrite')}
              </CandyButton>
              <button
                onClick={() => setShowImportConfirm(null)}
                className="rounded-2xl bg-cream-dark px-5 py-2.5 font-bold text-ink-soft hover:bg-candy-yellow"
              >
                {translate('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
