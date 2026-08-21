/**
 * 桌面常驻 3D 羊毛毡梦幻粉色猫咪 (Desktop Floating Pink Cat & Petting)
 * ------------------------------------------------------------
 * 1. 梦幻粉色系高颜值造型 (Cute Cat Model)
 * 2. 摸头与抚摸互动有丰富反馈 (爱心飘升、咕噜咕噜声、金光特效)
 * 3. 气泡伴读提示与直接与猫咪对话 Modal
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '@/store/useStore';
import { sfxCorrect, sfxPurr } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useSafeTimeout } from '@/lib/useTimer';
import { useAiStream } from '@/lib/ai/useAi';
import { useTranslation } from '@/i18n/useTranslation';
import { CatVoiceChatModal } from '@/modules/pet/CatVoiceChatModal';
type Expression = 'happy' | 'cute' | 'thinking' | 'sleepy' | 'love' | 'excited';

/** 猫咪动作 → 统一羊毛毡图片映射 */
const COMPANION_ACTION_IMG: Record<string, string> = {
  idle: '/cat/cat-idle-default.jpg',
  dance: '/cat/cat-dance-celebrate.jpg',
  stretch: '/cat/cat-stretch-yoga.jpg',
  roll: '/cat/cat-roll-playful.jpg',
  jump: '/cat/cat-jump-excited.jpg',
  purr: '/cat/cat-purr-love.jpg',
};

export function CatCompanion() {
  const { t } = useTranslation();
  const fishCount = useStore((s) => s.progress.fishCount ?? 10);
  const catFullness = useStore((s) => s.progress.catFullness ?? 80);
  const stars = useStore((s) => s.progress.stars ?? 0);
  const addFish = useStore((s) => s.addFish);


  const [expression, setExpression] = useState<Expression>('happy');
  const [actionMsg, setActionMsg] = useState(t('catCompanion.welcome'));
  const [showChatModal, setShowChatModal] = useState(false);
  const [animAction, setAnimAction] = useState<'idle' | 'dance' | 'stretch' | 'roll' | 'jump' | 'purr'>('idle');

  // 摸摸特效爱心粒子
  const [hearts, setHearts] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const [, setChatLog] = useState<Array<{ sender: 'user' | 'cat'; text: string }>>([
    { sender: 'cat', text: t('catCompanion.welcomeChat') },
  ]);
  const schedule = useSafeTimeout();

  // AI 陪伴对话：流式回答 + 本地兜底（AI 挂了小猫也不会哑巴）
  const stream = useAiStream();

  // 对话期间的表情跟随（用 ref 避免闭包陈旧）
  const statusRef = useRef<string>('');
  const textRef = useRef<string>('');
  useEffect(() => {
    statusRef.current = stream.status;
    if (stream.status === 'thinking') setExpression('thinking');
    else if (stream.status === 'streaming') setExpression('excited');
  }, [stream.status]);

  // 流式回答完成后：写入聊天记录 + 语音读出来
  useEffect(() => {
    textRef.current = stream.text;
    if (stream.status !== 'done' || !stream.text.trim()) return;
    const reply = stream.text.trim();
    setChatLog((prev) => [...prev, { sender: 'cat', text: reply }]);
    setExpression('happy');
    speak(reply, { lang: 'zh-CN', rate: 0.95 });
  }, [stream.status, stream.text]);

  // 卸载时中止进行中的请求
  useEffect(() => () => { stream.stop(); }, []);

  // 1. 监听星星增加 (Learn to Earn) -> 触发开心庆祝动画
  const prevStarsRef = useRef(stars);
  useEffect(() => {
    if (stars > prevStarsRef.current) {
      // 增加了星星
      sfxCorrect();
      setExpression('excited');
      setAnimAction('dance');
      setActionMsg(t('catCompanion.starGain'));
      speak('太棒啦！赚到了小鱼干！', { lang: 'zh-CN' });
      
      schedule(() => {
        setExpression('happy');
        setAnimAction('idle');
        setActionMsg(t('catCompanion.welcome'));
      }, 3000);
    }
    prevStarsRef.current = stars;
  }, [stars, schedule]);

  // 2. 监听饥饿度 -> 主动催促学习（拆分后避免 expression 作为依赖造成的潜在循环）
  useEffect(() => {
    if (catFullness < 30 && animAction === 'idle') {
      setExpression('sleepy');
      setActionMsg(t('catCompanion.hungry'));
    }
  }, [catFullness, animAction]);

  useEffect(() => {
    if (catFullness >= 30 && expression === 'sleepy') {
      setExpression('happy');
      setActionMsg(t('catCompanion.welcome'));
    }
    // intentional: only react to catFullness threshold, not other deps
  }, [catFullness]);

  // 摸头/抚摸小猫反馈
  const handlePetCat = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfxPurr();

    // 产生爱心飘升特效
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHearts((prev) => [...prev, { id: Date.now(), x, y }]);
    schedule(() => {
      setHearts((prev) => prev.slice(1));
    }, 1000);

    // 状态与动作反馈
    setExpression('love');
    setAnimAction('purr');
    addFish(1);

    const msgs = [
      t('catCompanion.petMsg1'),
      t('catCompanion.petMsg2'),
      t('catCompanion.petMsg3'),
      t('catCompanion.petMsg4'),
    ];
    const pickedMsg = msgs[Math.floor(Math.random() * msgs.length)]!
    setActionMsg(pickedMsg);
    speak(pickedMsg, { lang: 'zh-CN', rate: 0.95 });

    schedule(() => setAnimAction('idle'), 1600);
  };
  return (
    <>
      {/* 桌面常驻 3D 梦幻粉色猫咪 Widget */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-1 select-none">
        {/* 对话气泡提示 */}
        <AnimatePresence>
          {actionMsg && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="max-w-[210px] rounded-2xl border-2 border-pink-300 bg-white/95 backdrop-blur-xs p-2.5 text-xs font-black text-pink-900 shadow-xl relative"
            >
              {actionMsg}
              <div className="absolute -bottom-2 right-6 border-4 border-transparent border-t-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 桌面悬浮羊毛毡猫咪（统一图片风格） */}
        <motion.div
          animate={
            animAction === 'dance' ? { rotate: [0, -8, 8, -8, 0], y: [0, -10, 0, -10, 0] } :
            animAction === 'stretch' ? { scaleX: [1, 1.1, 1], scaleY: [1, 0.9, 1] } :
            animAction === 'roll' ? { rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] } :
            animAction === 'jump' ? { y: [0, -30, 0], scaleY: [1, 1.15, 0.9, 1] } :
            animAction === 'purr' ? { rotate: [0, 5, -5, 3, 0], x: [0, -3, 3, 0] } :
            { y: [0, -4, 0] }
          }
          transition={{ duration: animAction === 'roll' ? 0.8 : 0.6, repeat: animAction === 'idle' ? Infinity : 1 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handlePetCat}
          className="relative cursor-pointer"
        >
          {/* 统一羊毛毡风格猫咪图片 */}
          <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-pink-300 bg-white shadow-xl">
            <img
              src={COMPANION_ACTION_IMG[animAction] ?? COMPANION_ACTION_IMG.idle}
              alt="羊毛毡猫咪"
              className="h-full w-full object-cover"
              decoding="async"
            />
          </div>





          {/* 摸摸头飘升的爱心特效 */}
          {hearts.map((h) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -45, scale: 1.4 }}
              transition={{ duration: 0.9 }}
              style={{ left: h.x, top: h.y }}
              className="absolute pointer-events-none text-xl z-50"
            >
              💖
            </motion.div>
          ))}

          {/* 小鱼干徽章数量 */}
          <div className="absolute -top-1 -left-1 flex h-6 px-2 items-center justify-center rounded-full border border-pink-300 bg-pink-500 text-[10px] font-black text-white shadow-md">
            🐟 {fishCount}
          </div>

          {/* 打开直接聊天 Modal 按钮 */}
          <button
            type="button"
            aria-label={t('catCompanion.chatTitle')}
            onClick={(e) => {
              e.stopPropagation();
              setShowChatModal(true);
            }}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-purple-600 via-pink-500 to-rose-400 text-sm font-bold text-white shadow-lg transition-all hover:scale-115 active:scale-90"
            title={t('catCompanion.chatTitle')}
          >
            <span className="relative flex items-center justify-center">
              💬
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
            </span>
          </button>
        </motion.div>
      </div>

      {/* 🎙️ 语音聊天与互动对话 Modal */}
      <CatVoiceChatModal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
      />
    </>
  );
}
