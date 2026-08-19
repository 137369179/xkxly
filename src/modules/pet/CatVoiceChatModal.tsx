import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'motion/react';
import { CyberMasterCat3D } from '@/components/CyberMasterCat3D';
import { useAiStream } from '@/lib/ai/useAi';
import { companionChatTask } from '@/lib/ai/tasks/companion';
import { speak, stopSpeaking } from '@/lib/speech';
import { speechRecog, requestMicPermission } from '@/lib/ai/speechRecog';
import { guardInput } from '@/lib/ai/guard';
import { sfxTap } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { useTtsStore } from '@/store/useTtsStore';
import { useTranslation } from '@/i18n/useTranslation';
import { CatPurrIcon } from '@/modules/pet/PetIcons';
import type { AiMessage } from '@/lib/ai/types';

interface MessageItem {
  id: string;
  sender: 'user' | 'cat';
  text: string;
}

const QUICK_PHRASE_KEYS = [
  'catCompanion.quickPhrases.0',
  'catCompanion.quickPhrases.1',
  'catCompanion.quickPhrases.2',
  'catCompanion.quickPhrases.3',
  'catCompanion.quickPhrases.4',
  'catCompanion.quickPhrases.5',
];

const EMPTY_OUTFITS: Record<string, string> = {};

/** 连续静默达到该次数后自动暂停「回复完接着听」的免提模式，防止无人对话时反复占麦 */
const MAX_SILENT_FOLLOW = 2;

export function CatVoiceChatModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const addFish = useStore((s) => s.addFish);
  const petCat = useStore((s) => s.petCat);
  const equippedOutfits = useStore((s) => s.progress.equippedOutfits ?? EMPTY_OUTFITS);
  const isTtsSpeaking = useTtsStore((s) => s.isSpeaking);

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'init',
      sender: 'cat',
      text: t('catCompanion.voice.initMsg'),
    },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [callSeconds, setCallSeconds] = useState(0);
  const [expression, setExpression] = useState<'thinking' | 'excited' | 'happy' | 'cute'>('happy');

  const { status, text: aiStreamText, run: runAiStream, stop: stopAi } = useAiStream();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const lastSpokenRef = useRef<string>('');
  const isOpenRef = useRef<boolean>(isOpen);
  const isMutedRef = useRef<boolean>(isMuted);
  const latestTranscriptRef = useRef<string>('');
  const hasSubmittedRef = useRef<boolean>(false);
  const silentStreakRef = useRef<number>(0);
  /** 连续通话模式下 TTS 结束后自动再倾听的 follow-up 定时器，卸载/关闭时清理 */
  const followUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sttNotice, setSttNotice] = useState<string>('');

  // 最新消息快照：供提交查询时取上下文（函数式更新推开渲染闭包）
  const messagesRef = useRef<MessageItem[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 卸载时清理所有待执行定时器
  useEffect(() => {
    return () => {
      if (followUpTimerRef.current) {
        clearTimeout(followUpTimerRef.current);
        followUpTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const handleSendQuery = useCallback(
    (raw: string) => {
      const userText = raw.trim();
      if (!userText) return;

      // 提交前立即停掉正在进行的实时听写，避免短语点击与免提听写互相冲突
      speechRecog.stop();
      setIsListening(false);

      const guarded = guardInput(userText);
      if (!guarded.ok) {
        setTranscript('');
        setSttNotice(guarded.reason || t('catCompanion.voice.sttError'));
        return;
      }

      sfxTap();
      const text = guarded.text;
      silentStreakRef.current = 0; // 有真实发言，重置静默计数

      const userMsg: MessageItem = { id: String(Date.now()), sender: 'user', text };
      setMessages((prev) => [...prev, userMsg]);
      setTranscript('');
      setSttNotice('');
      setExpression('thinking');

      // 带上下文的最近几轮历史
      const history: AiMessage[] = messagesRef.current.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      runAiStream(companionChatTask(text, history));
    },
    [runAiStream, t],
  );

  const startListening = useCallback(async () => {
    if (!isOpenRef.current || isMutedRef.current) return;

    // 预检麦克风权限：被拒时给友好提示且不开麦，而不是等 onerror 沉默
    const perm = await requestMicPermission();
    if (perm === 'denied') {
      setSttNotice(t('catCompanion.voice.micDenied'));
      setIsListening(false);
      return;
    }

    stopSpeaking();
    setIsListening(true);
    setTranscript('');
    setSttNotice('');
    latestTranscriptRef.current = '';
    hasSubmittedRef.current = false;

    speechRecog.start({
      onStart: () => setIsListening(true),
      onResult: (text, isFinal) => {
        const cleanText = text.trim();
        if (cleanText) {
          latestTranscriptRef.current = cleanText;
          setTranscript(cleanText);
          if (isFinal && !hasSubmittedRef.current) {
            hasSubmittedRef.current = true;
            setIsListening(false);
            speechRecog.stop();
            handleSendQuery(cleanText);
          }
        }
      },
      onError: (err) => {
        setIsListening(false);
        if (!latestTranscriptRef.current.trim()) {
          silentStreakRef.current += 1;
          setSttNotice(err || t('catCompanion.voice.sttError'));
        }
      },
      onEnd: () => {
        setIsListening(false);
        const pendingText = latestTranscriptRef.current.trim();
        if (pendingText && !hasSubmittedRef.current) {
          hasSubmittedRef.current = true;
          handleSendQuery(pendingText);
        } else if (!hasSubmittedRef.current) {
          // 真·没听到：累积静默次数，达到阈值后暂停自动再倾听
          silentStreakRef.current += 1;
          if (silentStreakRef.current >= MAX_SILENT_FOLLOW) {
            setSttNotice(t('catCompanion.voice.noSpeakPaused'));
          }
        }
      },
    });
  }, [handleSendQuery, t]);

  // Call duration timer
  useEffect(() => {
    if (!isOpen) {
      setCallSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // 无障碍：打开时聚焦关闭按钮；ESC / 遮罩均可退出；关闭时恢复焦点
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    const focusTimer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 60);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      // 简易焦点圈闭：Tab 循环，避免焦点逃逸到页面
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusables[0] as HTMLElement | undefined;
        const last = focusables[focusables.length - 1] as HTMLElement | undefined;
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
    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  // 关闭/卸载时彻底释放 STT / TTS / AI 资源
  useEffect(() => {
    if (isOpen) return undefined;
    speechRecog.stop();
    stopSpeaking();
    stopAi();
    setIsListening(false);
    silentStreakRef.current = 0;
    lastSpokenRef.current = '';
    return undefined;
  }, [isOpen, stopAi]);

  // AI 流式回复 → 追加小猫气泡 + 朗读 + TTS 结束后自动再倾听（免提连续通话）
  useEffect(() => {
    if (status === 'done' && aiStreamText) {
      const reply = aiStreamText;
      if (lastSpokenRef.current !== reply) {
        lastSpokenRef.current = reply;
        setMessages((prev) => [...prev, { id: String(Date.now()), sender: 'cat', text: reply }]);
        setExpression('excited');
        addFish(1);
        petCat();
        celebrateSmall();

        speak(reply, {
          lang: 'zh-CN',
          onEnd: () => {
            if (!isOpenRef.current || isMutedRef.current) return;
            // 若此前已连续几次没听到，暂停免提自动倾听，提示孩子手动开启
            if (silentStreakRef.current >= MAX_SILENT_FOLLOW) {
              silentStreakRef.current = 0;
              setSttNotice(t('catCompanion.voice.noSpeakPaused'));
              return;
            }
            followUpTimerRef.current = setTimeout(() => {
              followUpTimerRef.current = null;
              if (isOpenRef.current && !isMutedRef.current) {
                void startListening();
              }
            }, 500);
          },
        });
      }
    }
  }, [status, aiStreamText, addFish, petCat, startListening, t]);

  const handleClose = useCallback(() => {
    speechRecog.stop();
    setIsListening(false);
    onClose();
  }, [onClose]);

  // Scroll to bottom on update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiStreamText, transcript]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label={t('catCompanion.voice.title')}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 outline-none"
        >
          {/* 遮罩：点击关闭。整层淡入淡出由外层承担 */}
          <div
            onClick={handleClose}
            aria-hidden="true"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* 面板：移动端底部弹层，桌面居中卡片 */}
          <motion.div
            ref={panelRef}
            initial={{ scale: 0.92, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 32 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="relative z-10 w-full sm:max-w-lg rounded-t-[1.75rem] sm:rounded-[1.75rem] border-t-4 sm:border-4 border-amber-300 bg-gradient-to-b from-slate-900 via-amber-950/90 to-slate-950 text-white shadow-2xl flex flex-col overflow-hidden max-h-[94vh] sm:max-h-[90vh]"
          >
            {/* ---- 顶部通话栏：状态徽标 + 关闭按钮 ---- */}
            <div className="flex items-center justify-between px-4 sm:px-5 pt-3.5 pb-1">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-black tracking-wide text-emerald-300 shadow-xs">
                <span className="inline-block h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                {t('catCompanion.voice.callStatus', { time: formatTime(callSeconds) })}
              </span>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={handleClose}
                aria-label={t('catCompanion.voice.close')}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/10 text-base font-bold text-amber-100 transition-all hover:bg-white/20 active:scale-90"
              >
                ✕
              </button>
            </div>

            {/* ---- 标题区 ---- */}
            <div className="px-4 pb-2 text-center">
              <h2 className="flex items-center justify-center gap-2 text-xl font-black text-amber-200">
                <CatPurrIcon size={26} /> {t('catCompanion.voice.title')}
              </h2>
              <div className="mt-0.5 text-[10px] font-bold text-amber-300/80">
                {t('catCompanion.voice.engine')}
              </div>
            </div>

            {/* ---- 猫咪 3D 舞台 ---- */}
            <div className="relative mx-4 flex flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-3 shadow-inner backdrop-blur-md">
              {isListening && (
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.6, 0.2] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-emerald-400 bg-emerald-400/20"
                />
              )}

              <CyberMasterCat3D
                size={112}
                expression={isTtsSpeaking ? 'excited' : status === 'streaming' ? 'excited' : isListening ? 'cute' : expression}
                hat={equippedOutfits['hat']}
                neck={equippedOutfits['neck']}
              />

              {/* 实时通话状态 */}
              <div className="mt-1.5 flex flex-col items-center gap-1">
                <span
                  className={`flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-black shadow-md ${
                    isTtsSpeaking
                      ? 'bg-purple-600 text-white'
                      : status === 'streaming'
                      ? 'bg-amber-500 text-white'
                      : isListening
                      ? 'bg-emerald-500 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {(isListening || isTtsSpeaking) && (
                    <span className="flex h-3 items-center gap-0.5">
                      {[0, 1, 2, 3].map((i) => (
                        <motion.span
                          key={i}
                          animate={{ height: ['4px', '14px', '4px'] }}
                          transition={{ repeat: Infinity, duration: isTtsSpeaking ? 0.35 : 0.5, delay: i * 0.1 }}
                          className="inline-block w-0.5 rounded-full bg-white"
                        />
                      ))}
                    </span>
                  )}
                  <span>
                    {isTtsSpeaking
                      ? t('catCompanion.voice.speaking')
                      : status === 'streaming'
                      ? t('catCompanion.voice.thinking')
                      : isListening
                      ? t('catCompanion.voice.listening')
                      : isMuted
                      ? t('catCompanion.voice.muted')
                      : t('catCompanion.voice.connected')}
                  </span>
                </span>

                {sttNotice && (
                  <span className="rounded-full border border-amber-500/40 bg-amber-900/80 px-3 py-0.5 text-[10px] font-bold text-amber-200">
                    {sttNotice}
                  </span>
                )}
              </div>
            </div>

            {/* ---- 对话列表 ---- */}
            <div className="mx-4 mt-3 flex min-h-[130px] max-h-[200px] flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      m.sender === 'user' ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-white'
                    }`}
                  >
                    {m.sender === 'user' ? '🧑‍🎓' : '🐱'}
                  </div>
                  <div className={`flex max-w-[80%] flex-col gap-1 ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`rounded-2xl px-3 py-2 text-xs font-bold shadow-xs ${
                        m.sender === 'user'
                          ? 'rounded-tr-none bg-indigo-600 text-white'
                          : 'rounded-tl-none bg-amber-100 text-amber-950'
                      }`}
                    >
                      {m.text}
                    </div>
                    {m.sender === 'cat' && (
                      <button
                        type="button"
                        onClick={() => {
                          sfxTap();
                          speak(m.text, { lang: 'zh-CN' });
                        }}
                        className="flex items-center gap-1 self-start rounded-full border border-amber-500/30 bg-amber-900/60 px-2 py-0.5 text-[10px] font-bold text-amber-300 transition-transform active:scale-95"
                      >
                        {t('catCompanion.voice.replay')}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {status === 'streaming' && (
                <div className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-white">
                    🐱
                  </div>
                  <div className="max-w-[80%] animate-pulse rounded-2xl rounded-tl-none bg-amber-100 px-3 py-2 text-xs font-bold text-amber-950">
                    {aiStreamText || t('catCompanion.voice.organizing')}
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* ---- 快速提问词组 ---- */}
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-4 pb-1 pt-2">
              {QUICK_PHRASE_KEYS.map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendQuery(t(phrase).replace(/^[\p{Emoji}\s]+/u, ''))}
                  className="flex-shrink-0 rounded-full border border-white/20 bg-white/20 px-3 py-1 text-[11px] font-extrabold text-amber-100 shadow-xs transition-all hover:bg-white/30 active:scale-95"
                >
                  {t(phrase)}
                </button>
              ))}
            </div>

            {/* ---- 通话控制台 ---- */}
            <div className="grid grid-cols-3 gap-2 border-t border-white/10 px-4 pb-3 pt-2 sm:px-5 sm:pb-4">
              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  const next = !isMuted;
                  setIsMuted(next);
                  if (next) {
                    speechRecog.stop();
                    setIsListening(false);
                  } else {
                    void startListening();
                  }
                }}
                className={`flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-black transition-all active:scale-95 ${
                  isMuted
                    ? 'border border-amber-400 bg-amber-600 text-white'
                    : 'border border-white/20 bg-white/10 text-amber-100 hover:bg-white/20'
                }`}
              >
                {isMuted ? t('catCompanion.voice.unmute') : t('catCompanion.voice.muteOn')}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 py-2.5 text-xs font-black text-white shadow-lg transition-all hover:from-rose-700 hover:to-red-700 active:scale-95"
              >
                {t('catCompanion.voice.hangUp')}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isListening) {
                    speechRecog.stop();
                    setIsListening(false);
                    const pendingText = latestTranscriptRef.current.trim() || transcript.trim();
                    if (pendingText && !hasSubmittedRef.current) {
                      hasSubmittedRef.current = true;
                      handleSendQuery(pendingText);
                    }
                  } else {
                    void startListening();
                  }
                }}
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2.5 text-xs font-black text-white shadow-md transition-all hover:bg-emerald-700 active:scale-95"
              >
                {isListening ? t('catCompanion.voice.doneSpeaking') : t('catCompanion.voice.speakAgain')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}