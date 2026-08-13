import { useState, useRef, useEffect } from "react";
import { motion } from 'motion/react';
import { CyberMasterCat3D } from '@/components/CyberMasterCat3D';
import { useAiStream } from '@/lib/ai/useAi';
import { companionChatTask } from '@/lib/ai/tasks/companion';
import { speak, stopSpeaking } from '@/lib/speech';
import { speechRecog } from '@/lib/ai/speechRecog';
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
  const [, setTextInput] = useState('');
  const [callSeconds, setCallSeconds] = useState(0);
  const [expression, setExpression] = useState<'thinking' | 'excited' | 'happy' | 'cute'>('happy');

  const { status, text: aiStreamText, run: runAiStream, stop: stopAi } = useAiStream();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const lastSpokenRef = useRef<string>('');
  const isOpenRef = useRef<boolean>(isOpen);
  const isMutedRef = useRef<boolean>(isMuted);
  const latestTranscriptRef = useRef<string>('');
  const hasSubmittedRef = useRef<boolean>(false);
  /** 连续通话模式下 TTS 结束后的 follow-up 定时器，卸载时清理 */
  const followUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sttNotice, setSttNotice] = useState<string>('');

  // 卸载时清理所有待执行的定时器
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

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiStreamText, transcript]);

  // Handle TTS & Continuous Real-Time Voice Call Loop
  useEffect(() => {
    if (status === 'done' && aiStreamText) {
      const reply = aiStreamText;
      // Avoid duplicate speaking for same reply
      if (lastSpokenRef.current !== reply) {
        lastSpokenRef.current = reply;
        setMessages((prev) => [...prev, { id: String(Date.now()), sender: 'cat', text: reply }]);
        setExpression('excited');
        addFish(1);
        petCat();
        celebrateSmall();

        // AI Model Voice Output via TTS
        speak(reply, {
          lang: 'zh-CN',
          onEnd: () => {
            // Automatically restart listening for hands-free continuous call
            if (isOpenRef.current && !isMutedRef.current) {
              followUpTimerRef.current = setTimeout(() => {
                followUpTimerRef.current = null;
                if (isOpenRef.current && !isMutedRef.current) {
                  startListening();
                }
              }, 500);
            }
          },
        });
      }
    }
  }, [status, aiStreamText, addFish, petCat]);

  // AUTO START CALL WHEN MODAL OPENS
  useEffect(() => {
    if (!isOpen) {
      isOpenRef.current = false;
      speechRecog.stop();
      stopSpeaking();
      stopAi();
      setIsListening(false);
      lastSpokenRef.current = '';
      return undefined;
    }
    isOpenRef.current = true;
    lastSpokenRef.current = '';
    const autoStartTimer = setTimeout(() => {
      if (isOpenRef.current && !isMutedRef.current) {
        startListening();
      }
    }, 400);

    return () => {
      clearTimeout(autoStartTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const startListening = () => {
    if (!isOpenRef.current || isMutedRef.current) return;
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
          setSttNotice(err || t('catCompanion.voice.sttError'));
        }
      },
      onEnd: () => {
        setIsListening(false);
        const pendingText = latestTranscriptRef.current.trim();
        if (pendingText && !hasSubmittedRef.current) {
          hasSubmittedRef.current = true;
          handleSendQuery(pendingText);
        }
      },
    });
  };

  const handleSendQuery = (userText: string) => {
    if (!userText.trim()) return;
    sfxTap();

    // Add user message
    const userMsg: MessageItem = { id: String(Date.now()), sender: 'user', text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setTextInput('');
    setTranscript('');
    setSttNotice('');
    setExpression('thinking');

    // Build history
    const history: AiMessage[] = messages.slice(-6).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    // Stream reply via default model (Qwen3.6-35B-A3B)
    runAiStream(companionChatTask(userText, history));
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3">
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        className="relative w-full max-w-lg rounded-3xl border-4 border-amber-300 bg-gradient-to-b from-slate-900 via-amber-950/90 to-slate-950 text-white shadow-2xl p-4 sm:p-6 space-y-3.5 max-h-[94vh] flex flex-col overflow-hidden"
      >
        {/* Header - Phone Call Top Bar */}
        <div className="text-center space-y-1 relative pt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>{t('catCompanion.voice.callStatus', { time: formatTime(callSeconds) })}</span>
          </div>

          <h2 className="text-xl font-black text-amber-200 flex items-center justify-center gap-2">
            <CatPurrIcon size={26} /> {t('catCompanion.voice.title')}
          </h2>

          <div className="text-[10px] font-bold text-amber-300/80">
            {t('catCompanion.voice.engine')}
          </div>
        </div>

        {/* 猫咪 3D 舞台 */}
        <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-inner relative">
          {/* Soundwave pulse animation during call */}
          {isListening && (
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.6, 0.2] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="absolute inset-0 rounded-2xl bg-emerald-400/20 border-2 border-emerald-400 pointer-events-none"
            />
          )}

          <CyberMasterCat3D
            size={120}
            expression={isTtsSpeaking ? 'excited' : status === 'streaming' ? 'excited' : isListening ? 'cute' : expression}
            hat={equippedOutfits['hat']}
            neck={equippedOutfits['neck']}
          />

          {/* Real-time Call Status Pill */}
          <div className="mt-2 flex flex-col items-center gap-1">
            <span
              className={`text-xs font-black px-3.5 py-1 rounded-full shadow-md flex items-center gap-2 ${
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
                <span className="flex items-center gap-0.5 h-3">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ height: ['4px', '14px', '4px'] }}
                      transition={{ repeat: Infinity, duration: isTtsSpeaking ? 0.35 : 0.5, delay: i * 0.1 }}
                      className="w-0.5 bg-white rounded-full inline-block"
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
              <span className="text-[10px] font-bold text-amber-200 bg-amber-900/80 px-3 py-0.5 rounded-full border border-amber-500/40">
                {sttNotice}
              </span>
            )}
          </div>
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-black/40 rounded-2xl border border-white/10 min-h-[150px] max-h-[210px]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                  m.sender === 'user' ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                {m.sender === 'user' ? '🧑‍🎓' : '🐱'}
              </div>
              <div className="flex flex-col gap-1 max-w-[80%]">
                <div
                  className={`rounded-2xl px-3 py-2 text-xs font-bold shadow-xs ${
                    m.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-amber-100 text-amber-950 rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
                {m.sender === 'cat' && (
                  <button
                    onClick={() => {
                      sfxTap();
                      speak(m.text, { lang: 'zh-CN' });
                    }}
                    className="self-start text-[10px] font-bold text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 active:scale-95 transition-transform"
                  >
                    {t('catCompanion.voice.replay')}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Stream Response In-Progress */}
          {status === 'streaming' && (
            <div className="flex items-start gap-2 flex-row">
              <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black">
                🐱
              </div>
              <div className="max-w-[80%] rounded-2xl px-3 py-2 text-xs font-bold bg-amber-100 text-amber-950 rounded-tl-none animate-pulse">
                {aiStreamText || t('catCompanion.voice.organizing')}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Phrase Shortcuts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_PHRASE_KEYS.map((phrase, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(t(phrase).replace(/^[\p{Emoji}\s]+/u, ''))}
              className="flex-shrink-0 text-[11px] font-extrabold bg-white/20 border border-white/20 text-amber-100 px-3 py-1 rounded-full hover:bg-white/30 shadow-xs active:scale-95 transition-all"
            >
              {t(phrase)}
            </button>
          ))}
        </div>

        {/* Real-time Phone Call Control Panel */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
          {/* Mute/Unmute toggle */}
          <button
            onClick={() => {
              sfxTap();
              setIsMuted(!isMuted);
              if (!isMuted) {
                speechRecog.stop();
                setIsListening(false);
              } else {
                startListening();
              }
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 border ${
              isMuted
                ? 'bg-amber-600 text-white border-amber-400'
                : 'bg-white/10 text-amber-100 border-white/20 hover:bg-white/20'
            }`}
          >
            <span>{isMuted ? t('catCompanion.voice.unmute') : t('catCompanion.voice.muteOn')}</span>
          </button>

          {/* Hang Up Button */}
          <button
            onClick={() => {
              sfxTap();
              onClose();
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-rose-600 to-red-600 text-white border border-rose-400 shadow-lg hover:from-rose-700 hover:to-red-700 active:scale-95"
          >
            <span>{t('catCompanion.voice.hangUp')}</span>
          </button>

          {/* Manual Speak Force Button */}
          <button
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
                startListening();
              }
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-black bg-emerald-600 text-white border border-emerald-400 shadow-md hover:bg-emerald-700 active:scale-95"
          >
            <span>{isListening ? t('catCompanion.voice.doneSpeaking') : t('catCompanion.voice.speakAgain')}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
