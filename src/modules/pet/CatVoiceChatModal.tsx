import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'motion/react';
import { useAiStream } from '@/lib/ai/useAi';
import { companionChatTask } from '@/lib/ai/tasks/companion';
import { speak, stopSpeaking } from '@/lib/speech';
import { speechRecog, requestMicPermission, isSpeechRecogSupported } from '@/lib/ai/speechRecog';
import { guardInput } from '@/lib/ai/guard';
import { sfxTap } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { useTtsStore } from '@/store/useTtsStore';
import { useTranslation } from '@/i18n/useTranslation';
import type { AiMessage } from '@/lib/ai/types';
import { VoiceHeader } from '@/modules/pet/voice/VoiceHeader';
import { VoiceTitle, VoiceCatStage } from '@/modules/pet/voice/VoiceCatStage';
import { VoiceMessageList, type VoiceMessage } from '@/modules/pet/voice/VoiceMessageList';
import { VoiceControls, QuickPhrases } from '@/modules/pet/voice/VoiceControls';

const EMPTY_OUTFITS: Record<string, string> = {};

/** 连续静默达到该次数后自动暂停「回复完接着听」的免提模式，防止无人对话时反复占麦 */
const MAX_SILENT_FOLLOW = 2;

export function CatVoiceChatModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const addFish = useStore((s) => s.addFish);
  const petCat = useStore((s) => s.petCat);
  const equippedOutfits = useStore((s) => s.progress.equippedOutfits ?? EMPTY_OUTFITS);
  const isTtsSpeaking = useTtsStore((s) => s.isSpeaking);

  const [messages, setMessages] = useState<VoiceMessage[]>([
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
  const messagesRef = useRef<VoiceMessage[]>(messages);
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

      const userMsg: VoiceMessage = { id: String(Date.now()), sender: 'user', text };
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

    // C：严格能力检测 —— Safari 无 SpeechRecognition，直接提示用文字，不开麦
    if (!isSpeechRecogSupported()) {
      setSttNotice(t('catCompanion.voice.unsupported'));
      setIsListening(false);
      return;
    }

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

  const toggleMute = () => {
    sfxTap();
    const next = !isMuted;
    setIsMuted(next);
    if (next) {
      speechRecog.stop();
      setIsListening(false);
    } else {
      void startListening();
    }
  };

  const toggleListen = () => {
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
            {/* 顶部通话栏 */}
            <VoiceHeader seconds={callSeconds} onClose={handleClose} closeBtnRef={closeBtnRef} />

            {/* 标题区 */}
            <VoiceTitle />

            {/* 猫咪 3D 舞台 */}
            <VoiceCatStage
              isListening={isListening}
              isTtsSpeaking={isTtsSpeaking}
              isMuted={isMuted}
              status={status}
              expression={expression}
              outfits={equippedOutfits}
              sttNotice={sttNotice}
            />

            {/* 对话列表 */}
            <VoiceMessageList
              messages={messages}
              streaming={status === 'streaming'}
              streamingText={aiStreamText}
              endRef={chatEndRef}
            />

            {/* 快速提问词组 */}
            <QuickPhrases onSend={handleSendQuery} />

            {/* 通话控制台 */}
            <VoiceControls
              isMuted={isMuted}
              isListening={isListening}
              onToggleMute={toggleMute}
              onHangUp={handleClose}
              onToggleListen={toggleListen}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}