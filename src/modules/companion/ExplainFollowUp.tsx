/**
 * ExplainFollowUp —— 知识追问面板
 * ------------------------------------------------------------------
 * 讲解完一个主题后，孩子可以继续追问：
 *   1. 调用 companionFollowUpTask 流式获取追问问题
 *   2. 显示追问问题 + AiChat 输入框
 *   3. 孩子回答后流式显示小智反馈
 *   4. 支持多轮（3 轮后结束）
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSafeTimeout } from '@/lib/useTimer';
import { AiAvatar } from '@/components/ai/AiAvatar';
import { useAiStream } from '@/lib/ai/useAi';
import { companionFollowUpTask } from '@/lib/ai/tasks';
import { guardInput } from '@/lib/ai/guard';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { TONE_STYLE } from '@/lib/tones';
import { sfxTap } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';

const MAX_ROUNDS = 3;

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export function ExplainFollowUp({
  topicTitle,
  explainText,
  onDone,
}: {
  topicTitle: string;
  explainText?: string;
  onDone?: () => void;
}) {
  const { t: tr } = useTranslation();
  const tone = TONE_STYLE.purple;
  const askStream = useAiStream();  // 生成追问问题
  const answerStream = useAiStream(); // 生成回答反馈

  const [round, setRound] = useState(0);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<'asking' | 'answering' | 'done'>('asking');
  const [guardMsg, setGuardMsg] = useState('');
  const startedRef = useRef(false);
  const explainRef = useRef(explainText ?? '');
  const schedule = useSafeTimeout();

  // 构建追问问题（初始 + 每轮回答后）
  const startAsking = useCallback(() => {
    setPhase('asking');
    askStream.run(
      companionFollowUpTask(topicTitle, explainRef.current, `第${round + 1}轮追问`),
    );
  }, [askStream, round, topicTitle, turns]);

  // 首次自动启动
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startAsking();
  }, [startAsking]);

  // 追问问题生成完毕 → 进入回答阶段
  useEffect(() => {
    if (askStream.status === 'done' && phase === 'asking') {
      const question = askStream.text.trim();
      if (question) {
        setTurns((prev) => [...prev, { role: 'assistant', content: question }]);
        setPhase('answering');
      }
    }
  }, [askStream.status, phase]); // intentional: reset question on status/phase change

  // 回答反馈生成完毕 → 记录 + 判断是否继续
  useEffect(() => {
    if (answerStream.status !== 'done') return;
    const answer = answerStream.text.trim();
    if (!answer) return;

    setTurns((prev) => [...prev, { role: 'assistant', content: answer }]);

    const nextRound = round + 1;
    if (nextRound >= MAX_ROUNDS) {
      setPhase('done');
      onDone?.();
    } else {
      setRound(nextRound);
      // 下一轮追问：使用 useSafeTimeout 确保组件卸载后定时器自动清理
      schedule(() => {
        startAsking();
      }, 1000);
    }
  }, [answerStream.status]); // intentional: handle answer completion

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || phase !== 'answering') return;
    // 入口护栏（P0-4）：孩子追问的自由文本必须先过 guardInput，再进 AI
    const guarded = guardInput(text, 80);
    if (!guarded.ok) {
      setGuardMsg(guarded.reason ?? '这个问题我们换一个说法聊聊吧～');
      return;
    }
    setGuardMsg('');
    sfxTap();
    setTurns((prev) => [...prev, { role: 'user', content: guarded.text }]);
    setInput('');

    // 构建历史上下文
    answerStream.run(
      companionFollowUpTask(topicTitle, explainRef.current, guarded.text),
    );
  };

  const busy = askStream.status === 'thinking' || askStream.status === 'streaming'
    || answerStream.status === 'thinking' || answerStream.status === 'streaming';

  return (
    <Panel>
      <PanelTitle
        emoji="🤔"
        title={tr('followup.title')}
        subtitle={tr('followup.subtitle', { topic: topicTitle, round: Math.min(round + 1, MAX_ROUNDS), total: MAX_ROUNDS })}
        tone="purple"
      />

      {/* 对话历史 */}
      <div className="space-y-3 mb-4">
        <AnimatePresence initial={false}>
          {turns.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {t.role === 'assistant' && <AiAvatar size={28} mood="talking" className="mr-2 mt-1" />}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-base font-medium ${
                  t.role === 'user'
                    ? 'rounded-br-md'
                    : 'rounded-tl-md bg-white shadow-sm'
                }`}
                style={
                  t.role === 'user'
                    ? { background: tone.main, color: tone.on }
                    : { color: '#5c2e3d' }
                }
              >
                {t.role === 'assistant' && (
                  <span className="text-xs font-bold block mb-1" style={{ color: tone.deep }}>
                    {tr('common.xiaozhi')}
                  </span>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{t.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 正在生成追问问题 */}
      {phase === 'asking' && askStream.status !== 'done' && (
        <div className="flex items-center gap-2 py-2">
          <AiAvatar size={30} mood="thinking" />
          <span className="text-sm font-bold text-ink-soft">{tr('followup.thinkingQuestion')}</span>
        </div>
      )}

      {/* 正在生成回答反馈 */}
      {phase === 'answering' && answerStream.status !== 'done' && answerStream.status !== 'idle' && (
        <div className="flex items-center gap-2 py-2">
          <AiAvatar size={30} mood="thinking" />
          <span className="text-sm font-bold text-ink-soft">{tr('followup.thinkingAnswer')}</span>
        </div>
      )}

      {/* 输入框（仅在回答阶段且不忙时显示） */}
      {phase === 'answering' && !busy && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); if (guardMsg) setGuardMsg(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim() && !busy) handleSubmit();
            }}
            placeholder={tr('followup.placeholder')}
            maxLength={80}
            aria-label={tr('followup.inputLabel')}
            className="min-h-[48px] flex-1 rounded-2xl border-2 bg-white px-4 text-base font-medium outline-none"
            style={{ borderColor: `${tone.main}55` }}
          />
          <button
            type="button"
            disabled={!input.trim()}
            onClick={handleSubmit}
            aria-label={tr('followup.sendLabel')}
            className="min-h-[48px] min-w-[64px] rounded-2xl px-4 text-base font-extrabold transition active:translate-y-[3px] disabled:opacity-50"
            style={{ background: tone.main, color: tone.on, boxShadow: `0 4px 0 0 ${tone.deep}` }}
          >
            回答
          </button>
        </motion.div>
      )}
      {guardMsg && phase === 'answering' && (
        <p className="mt-1 text-xs font-bold" style={{ color: tone.deep }}>
          🙈 {guardMsg}
        </p>
      )}

      {/* 全部结束 */}
      {phase === 'done' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-center"
        >
          <div className="text-4xl mb-2">🎓</div>
          <p className="text-base font-extrabold" style={{ color: tone.deep }}>
            {tr('followup.complete', { count: MAX_ROUNDS })}
          </p>
          <p className="text-sm font-bold text-ink-soft mt-1">
            {tr('followup.deeper', { topic: topicTitle })}
          </p>
          {onDone && (
            <button
              type="button"
              onClick={() => {
                sfxTap();
                onDone();
              }}
              className="mt-3 min-h-[44px] rounded-full px-6 text-sm font-extrabold transition active:translate-y-[2px]"
              style={{
                background: tone.main,
                color: tone.on,
                boxShadow: `0 3px 0 0 ${tone.deep}`,
              }}
            >
              {tr('common.back')}
            </button>
          )}
        </motion.div>
      )}

      {/* 轮次进度指示 */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {Array.from({ length: MAX_ROUNDS }, (_, i) => (
          <div
            key={i}
            className="h-2 w-8 rounded-full transition"
            style={{
              background: i < round ? tone.main : i === round ? `${tone.main}88` : '#f0dde2',
            }}
          />
        ))}
      </div>
    </Panel>
  );
}
