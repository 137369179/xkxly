/**
 * 备份恢复UI组件
 * ------------------------------------------------------------
 * 用于在检测到数据损坏时展示恢复向导
 */
import { useState, useEffect } from 'react';
import { getBackupHistory, detectStorageCorruption } from '@/lib/autoBackup';
import { useStore } from '@/store/useStore';

export function BackupRestorePanel({ onRestoreComplete }: { onRestoreComplete: () => void }) {
  const [backups, setBackups] = useState<Awaited<ReturnType<typeof getBackupHistory>>>([]);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    // 启动时检测并加载备份列表
    detectStorageCorruption();
    setBackups(getBackupHistory());
  }, []);

  const handleRestore = async (backupId: string) => {
    setRestoring(true);
    try {
      // 在实际实现中，这里会从备份恢复进度数据
      // 由于简化演示，仅记录日志（生产环境不输出，与全仓 DEV 守卫约定一致）
      if (import.meta.env.DEV) {
        console.log('[BackupRestore] 正在恢复备份:', backupId);
      }
      
      // 模拟恢复过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onRestoreComplete();
    } finally {
      setRestoring(false);
    }
  };

  const handleExport = () => {
    const progress = useStore.getState().progress;
    
    // 触发浏览器下载备份文件
    const payload = {
      app: 'baby-learning-park',
      version: 1,
      exportedAt: new Date().toISOString(),
      progress,
      settings: {
        sound: true,
        showPinyin: true,
      }
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `宝贝学习乐园-备份-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (backups.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-extrabold text-ink">检测到数据异常</h2>
        <p className="mt-2 text-sm text-ink-soft">
          系统检测到您的学习进度可能已损坏。请选择从历史备份恢复，或导出当前进度以便修复。
        </p>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold text-ink-soft">最近备份:</p>
          {backups.map((backup) => (
            <button
              key={backup.id}
              onClick={() => handleRestore(backup.id)}
              disabled={restoring}
              className="flex w-full items-center justify-between rounded-xl border-2 border-candy-purple-soft p-3 text-left transition hover:border-candy-purple active:translate-y-[1px]"
            >
              <span className="text-sm font-bold">{new Date(backup.timestamp).toLocaleString('zh-CN')}</span>
              <span className="text-xs text-ink-soft">{backup.id}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 rounded-xl bg-candy-purple py-3 text-base font-extrabold text-candy-purple-on transition active:translate-y-[2px]"
          >
            导出当前进度
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 rounded-xl bg-gray-200 py-3 text-base font-extrabold text-ink transition active:translate-y-[2px]"
          >
            重置重新开始
          </button>
        </div>
      </div>
    </div>
  );
}
