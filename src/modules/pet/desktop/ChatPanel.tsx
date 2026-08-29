/**
 * AI 对话面板：5 种性格预设、上下文连贯、SSE 流式；失败时本地性格化兜底。
 */
import { useRef, useState } from 'react';
import { PERSONALITIES, type PersonalityId } from './data';

export interface ChatMsg { role: 'user' | 'assistant'; content: string }

interface Props {
  personality: PersonalityId;
  onPersonalityChange: (id: PersonalityId) => void;
  onTalk: () => void;
}

function localReply(q: string, pid: PersonalityId): string {
  const p = PERSONALITIES.find((x) => x.id === pid)!;
  if (q.includes('名字')) return `${p.emoji} 我是你的小宠物呀～你可以叫我小豆！`;
  if (q.includes('故事')) return `${p.emoji} 从前有只小兔子...（${p.systemHint.slice(0, 12)}）要不要我讲完？`;
  return `${p.emoji} 哇，这个问题好有趣！我最喜欢聊这个啦～`;
}

export function ChatPanel({ personality, onPersonalityChange, onTalk }: Props) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    onTalk();
    const history: ChatMsg[] = [...msgs, { role: 'user', content: text }];
    setMsgs(history);
    setBusy(true);

    const meta = PERSONALITIES.find((p) => p.id === personality)!;
    const systemMsg = `${meta.emoji} 你是一只可爱的桌面宠物，性格设定：${meta.systemHint} 用适合小朋友的口吻回答，简短自然。`;

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          scene: 'companion.chat',
          stream: true,
          messages: [
            { role: 'system', content: systemMsg },
            ...history.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });
      if (!res.ok || !res.body) throw new Error('chat');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      setMsgs([...history, { role: 'assistant', content: '' }]);

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const obj = JSON.parse(payload) as { content?: string };
            acc += obj.content ?? '';
            setMsgs([...history, { role: 'assistant', content: acc }]);
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      setMsgs([...history, { role: 'assistant', content: localReply(text, meta.id) }]);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PERSONALITIES.map((p) => (
          <button
            key={p.id}
            onClick={() => onPersonalityChange(p.id)}
            className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
              p.id === personality ? 'bg-purple-500 text-candy-purple-on' : 'bg-white/70 text-ink hover:bg-white'
            }`}
          >
            {p.emoji} {p.label}
          </button>
        ))}
      </div>

      <div className="max-h-52 space-y-2 overflow-y-auto rounded-2xl bg-white/60 p-2">
        {msgs.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-ink/60">和我的小宠物聊聊天吧～（性格可切换）</p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm leading-relaxed ${
                m.role === 'user' ? 'bg-purple-500 text-candy-purple-on' : 'bg-white text-ink'
              }`}
            >
              {m.content || '思考中…'}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl border-2 border-white/80 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-purple-400"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
          placeholder="输入想说的话…"
          aria-label="聊天输入"
        />
        <button
          onClick={() => void send()}
          disabled={busy}
          className="rounded-xl bg-purple-500 px-4 py-2 text-sm font-bold text-candy-purple-on transition active:translate-y-[1px] disabled:opacity-50"
        >
          {busy ? '…' : '发送'}
        </button>
      </div>
    </div>
  );
}