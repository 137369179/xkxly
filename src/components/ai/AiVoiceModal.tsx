import { useState, useEffect, useRef, useCallback, useActionState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSafeTimeout } from '@/lib/useTimer';
import { useTranslation } from '@/i18n/useTranslation';
import { isSpeechRecogSupported, speechRecog, requestMicPermission } from '@/lib/ai/speechRecog';
import { guardInput, guardOutput, guardForScene } from '@/lib/ai/guard';
import { chatStream } from '@/lib/ai/client';
import { speak, stopSpeaking } from '@/lib/speech';
import { sfxTap, sfxCorrect } from '@/lib/sfx';

interface AiVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiVoiceModal({ isOpen, onClose }: AiVoiceModalProps) {
  const { t: tr } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [displayResponse, setDisplayResponse] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const supported = isSpeechRecogSupported();
  const activeStreamRef = useRef<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const scheduleFocus = useSafeTimeout();

  const statusRef = useRef(status);
  const transcriptRef = useRef(transcript);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    scheduleFocus(() => closeBtnRef.current?.focus(), 60);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        activeStreamRef.current = false;
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0] as HTMLElement | undefined;
        const last = focusable[focusable.length - 1] as HTMLElement | undefined;
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      speechRecog.stop();
      stopSpeaking();
      setStatus('idle');
      setTranscript('');
      setDisplayResponse('');
      setErrorMsg('');
      return undefined;
    }
    const autoTimer = setTimeout(() => {
      handleStartListening();
    }, 400);
    return () => {
      clearTimeout(autoTimer);
      abortRef.current?.abort();
      speechRecog.stop();
      stopSpeaking();
      setStatus('idle');
      setTranscript('');
      setDisplayResponse('');
      setErrorMsg('');
    };
  }, [isOpen]);

  useEffect(() => {
    return () => { speechRecog.stop(); };
  }, []);

  // useActionState 管理 AI 请求的生命周期，isPending 自动跟踪请求进行中状态，
  // 替代手动 setStatus('thinking') / setStatus('idle') 的模式
  const [, sendToAi, isAiPending] = useActionState(async (_prev: string, raw: string) => {
    const guarded = guardInput(raw);
    if (!guarded.ok) {
      setErrorMsg(guarded.reason || '这个问题我们换个说法聊聊吧～');
      return '';
    }
    const question = guarded.text;
    activeStreamRef.current = true;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    let fullText = '';
    try {
      const generator = chatStream({
        scene: 'quiz.extend',
        messages: [
{ role: 'system', content: '你是一个面向5岁小朋友的智慧好朋友小智。回答要极为亲切、活泼、充满童趣，使用极其简单通俗的语言，尽量多用比喻。最重要的是：讲的知识必须准确专业有依据，不确定就明确说「我们一起查一查吧」，绝不编造；先给出准确结论，再用比喻展开。回答控制在3句话、90字以内。' },
          { role: 'user', content: question },
        ],
        signal: ac.signal,
      });
      for await (const chunk of generator) {
        if (!activeStreamRef.current) break;
        if (chunk.type === 'text') {
          fullText += chunk.text;
          setDisplayResponse(fullText);
        }
      }
      // 出口护栏（P0-4）：最终展示/朗读的内容必须过 quiz.extend 场景 guardOutput，
      // 不通过则替换为安全话术，绝不把孩子没过滤的内容念出来。
      const guardedOut = guardOutput(fullText, guardForScene('quiz.extend'));
      const safeText = guardedOut.ok ? guardedOut.text : '';
      if (safeText && activeStreamRef.current) {
        setDisplayResponse(safeText);
        setStatus('speaking');
        sfxCorrect();
        speak(safeText, {
          lang: 'zh-CN', rate: 0.8, pitch: 1.2,
          onEnd: () => { if (activeStreamRef.current) setStatus('idle'); },
        });
      } else {
        if (fullText.trim()) {
          const fallback = '小茜没听懂这个问题，我们换个问题问吧～';
          setDisplayResponse(fallback);
        }
      }
    } catch (err) {
      // 主动取消（关闭弹窗/重新提问）不算失败，静默退出即可
      if (ac.signal.aborted) return _prev;
      if (import.meta.env.DEV) console.error('AI Voice error:', err);
      const fallback = '小茜刚刚走神啦，宝贝再问我一次好不好呀？';
      setDisplayResponse(fallback);
      speak(fallback);
    }
    return '';
  }, '');

  // 复合状态：AI 请求进行中（isPending）且未进入播报阶段时，视为 'thinking'
  const derivedStatus = isAiPending && status !== 'speaking' ? 'thinking' : status;

  const handleStartListening = useCallback(async () => {
    if (!supported) {
      setErrorMsg('你的浏览器暂不支持直接语音对话，试试用文字提问吧～');
      return;
    }
    // 预检麦克风权限：被拒时直接给出友好提示，而非等 onerror 静默失败
    const perm = await requestMicPermission();
    if (perm === 'denied') {
      setErrorMsg(tr('voice.micDenied'));
      return;
    }
    stopSpeaking();
    setTranscript('');
    setDisplayResponse('');
    setErrorMsg('');
    setStatus('listening');
    sfxTap();
    speechRecog.start({
      interimResults: true,
      onResult: (text, isFinal) => {
        setTranscript(text);
        if (isFinal && text.trim()) {
          speechRecog.stop();
          sendToAi(text.trim());
        }
      },
      onError: (err) => {
        setStatus('idle');
        setErrorMsg(err);
      },
      onEnd: () => {
        const currentStatus = statusRef.current;
        const currentTranscript = transcriptRef.current;
        if (currentStatus === 'listening' && currentTranscript.trim()) {
          sendToAi(currentTranscript.trim());
        } else if (currentStatus === 'listening') {
          setStatus('idle');
        }
      },
    });
  }, [supported, sendToAi, tr]);

  const handleStopListening = () => {
    speechRecog.stop();
    if (transcript.trim() && status === 'listening') {
      sendToAi(transcript.trim());
    } else {
      setStatus('idle');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="小茜语音对话"
        tabIndex={-1}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
      >
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => { activeStreamRef.current = false; onClose(); }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border-4 border-candy-yellow text-center"
        >
          <button
            ref={closeBtnRef}
            onClick={() => { activeStreamRef.current = false; abortRef.current?.abort(); onClose(); }}
            aria-label="关闭语音对话"
            className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-cream-dark text-ink-soft hover:bg-candy-yellow transition-colors font-bold text-xl"
          >
            ✕
          </button>
          <div className="mx-auto my-3 flex justify-center">
            <motion.div
              animate={
                derivedStatus === 'listening'
                  ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }
                  : derivedStatus === 'thinking'
                  ? { rotate: [0, 360] }
                  : derivedStatus === 'speaking'
                  ? { y: [0, -6, 0] }
                  : {}
              }
              transition={{ repeat: Infinity, duration: derivedStatus === 'thinking' ? 2 : 1.2 }}
              className="relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-tr from-candy-blue to-candy-purple shadow-lg text-5xl border-4 border-white"
            >
              🤖
              {derivedStatus === 'listening' && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-candy-red opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-candy-red"></span>
                </span>
              )}
            </motion.div>
          </div>
          <h3 className="text-2xl font-black text-ink-main">小茜语音好朋友</h3>
          <p className="mt-1 text-sm font-bold text-ink-soft">按住下方大按钮，跟小茜说话吧！</p>
          <div className="mt-5 min-h-[100px] max-h-[160px] overflow-y-auto rounded-2xl bg-cream-light p-4 text-left border-2 border-dashed border-candy-blue/30">
            {transcript && (
              <div className="mb-3 text-right">
                <span className="inline-block rounded-2xl rounded-tr-none bg-candy-blue px-3 py-2 text-sm font-bold text-white shadow-sm">
                  🗣️ {transcript}
                </span>
              </div>
            )}
            {derivedStatus === 'thinking' && (
              <div className="text-left font-bold text-candy-purple animate-pulse flex items-center gap-2">
                <span>💭 小茜正在动脑筋思考中…</span>
              </div>
            )}
            {displayResponse && (
              <div className="text-left">
                <span className="inline-block rounded-2xl rounded-tl-none bg-white border-2 border-candy-green px-3 py-2 text-sm font-bold text-ink-main shadow-sm">
                  🤖 {displayResponse}
                </span>
              </div>
            )}
            {!transcript && !displayResponse && derivedStatus === 'idle' && (
              <div className="py-6 text-center text-sm font-medium text-ink-muted">
                你可以问我："为什么天空是蓝色的？" 或 "告诉我一个小狮子的故事" 🦁
              </div>
            )}
            {errorMsg && (
              <div className="mt-2 text-center text-xs font-bold text-candy-red">{errorMsg}</div>
            )}
          </div>
          <div className="mt-6 flex flex-col items-center gap-3">
            {derivedStatus === 'listening' && (
              <div className="flex items-center justify-center gap-1.5 py-1">
                {[0.4, 0.8, 1, 0.7, 0.3].map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 rounded-full bg-candy-red"
                    animate={{ height: ['8px', `${h * 28}px`, '8px'] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.6,
                      delay: i * 0.1,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            )}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                if (derivedStatus === 'speaking') {
                  stopSpeaking();
                  setStatus('idle');
                } else {
                  handleStartListening();
                }
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                if (derivedStatus === 'listening') handleStopListening();
              }}
              onPointerCancel={handleStopListening}
              aria-label={
                derivedStatus === 'listening' ? tr('voice.listeningSend')
                : derivedStatus === 'thinking' ? tr('voice.thinking')
                : derivedStatus === 'speaking' ? '点击打断小茜播报'
                : tr('voice.startTalk')
              }
              className={`relative flex h-20 w-full items-center justify-center gap-3 rounded-full text-xl font-black text-white shadow-xl transition-all active:scale-95 ${
                derivedStatus === 'listening' ? 'bg-gradient-to-r from-candy-red to-pink-500 animate-pulse'
                : derivedStatus === 'thinking' ? 'bg-candy-purple opacity-80 cursor-wait'
                : derivedStatus === 'speaking' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-105'
                : 'bg-gradient-to-r from-candy-green via-candy-blue to-candy-purple hover:brightness-105'
              }`}
            >
              <span className="text-3xl">{derivedStatus === 'listening' ? '🎙️' : derivedStatus === 'speaking' ? '⏹️' : '🎤'}</span>
              <span>
                {derivedStatus === 'listening' ? tr('voice.listeningSend')
                : derivedStatus === 'thinking' ? tr('voice.thinking')
                : derivedStatus === 'speaking' ? '点击打断播报 🛑'
                : tr('voice.startTalk')}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
