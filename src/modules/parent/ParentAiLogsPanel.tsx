import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { aiLogs, onAiLog } from '@/lib/ai/client';
import type { AiLogEntry } from '@/lib/ai/types';

export function ParentAiLogsPanel() {
  const { t: translate } = useTranslation();
  const [logs, setLogs] = useState<readonly AiLogEntry[]>(() => aiLogs());

  useEffect(() => onAiLog(() => setLogs(aiLogs())), []);

  return (
    <Panel>
      <PanelTitle emoji="🤖" title={translate('parent.aiLogsTitle')} subtitle={translate('parent.aiLogsSubtitle')} tone="purple" />
      {logs.length === 0 ? (
        <p className="py-2 text-center text-sm font-bold text-ink-soft">{translate('parent.noAiLogs')}</p>
      ) : (
        <div className="space-y-1.5">
          {logs.slice(0, 12).map((e, i) => (
            <div key={`e-${i}`} className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold">
              <span className="shrink-0 rounded-full bg-candy-purple-soft px-2 py-0.5 text-candy-purple-deep">{e.scene}</span>
              <span className={e.ok ? 'text-emerald-700' : 'text-rose-600'}>{e.ok ? (e.cached ? translate('parent.cacheHit') : translate('parent.aiOk')) : translate('parent.aiFail')}</span>
              <span className="text-ink-soft">{e.ms}ms</span>
              {e.model && e.model !== 'cache' && <span className="text-ink-soft/70">{e.model}</span>}
              {e.errCode && <span className="text-rose-500">{e.errCode}</span>}
              <span className="ml-auto text-ink-soft/70">
                {new Date(e.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
