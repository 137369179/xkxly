import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { motion, AnimatePresence } from 'motion/react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useDailyLog } from '@/store/useStore';
import type { DailyStat } from '@/types';
import { speak } from '@/lib/speech';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

/**
 * 学习伙伴系统
 * 小智化身实体化：首页有一个可爱小动物伙伴
 * 伙伴有心情系统：孩子学得好它开心，长时间不学它想你了
 * 伙伴等级：随孩子学习总时长升级
 */

const PETS = [
  { id: 'cat', emoji: '🐱', name: '小猫咪', sound: '喵～' },
  { id: 'dog', emoji: '🐶', name: '小狗', sound: '汪汪！' },
  { id: 'rabbit', emoji: '🐰', name: '小兔子', sound: '蹦蹦～' },
  { id: 'panda', emoji: '🐼', name: '熊猫', sound: '嗯嗯～' },
] as const;

type Mood = 'happy' | 'excited' | 'thinking' | 'missing' | 'sleeping';

const MOOD_EMOJI: Record<Mood, string> = {
  happy: '😊',
  excited: '🤩',
  thinking: '🤔',
  missing: '🥺',
  sleeping: '😴',
};

const MOOD_MSG: Record<Mood, string[]> = {
  happy: ['今天学得真棒呀！', '继续加油哦～', '你又变聪明了！'],
  excited: ['哇！你太厉害了！', '超级棒！给你点赞！', '你是学习小达人！'],
  thinking: ['要不要一起学一会？', '今天想学什么呢？', '小智陪你一起学！'],
  missing: ['好久没见面了，想你了～', '快回来学习吧！', '等你哦～'],
  sleeping: ['zzZ...', '伙伴在休息...', '嘘～小声点～'],
};

function getMood(progress: { dailyLog: Record<string, DailyStat> }): Mood {
  const today = new Date().toISOString().slice(0, 10);
  const todayLog = progress.dailyLog?.[today]!;
  const lastLearn = Object.values(progress.dailyLog || {}).filter((d) => d.items > 0).pop();

  if (todayLog?.items! > 0 && todayLog.items >= 10) return 'excited';
  if (todayLog?.items! > 0) return 'happy';

  // 检查多久没学
  if (lastLearn) {
    const lastDate = new Date(today);
    const days = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
    if (days >= 3) return 'missing';
    if (days >= 2) return 'thinking';
  } else if (!todayLog?.items) {
    return 'thinking';
  }

  // 晚上超过 22 点
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) return 'sleeping';

  return 'happy';
}

function getPetLevel(totalItems: number): number {
  return Math.min(10, 1 + Math.floor(totalItems / 30));
}

export function Companion() {
  const { t } = useTranslation();
  // 核心加强 O：细粒度 selector，只订阅 dailyLog，星星/徽章变化不再触发重渲染
  const dailyLog = useDailyLog();
  const [petId, setPetId] = useState<string>(() => safeGetItem('companion-pet') || 'cat');
  const [mood, setMood] = useState<Mood>('happy');
  const [message, setMessage] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const pet = PETS.find(p => p.id === petId) || PETS[0];
  const totalItems = useMemo(() => {
    return Object.values(dailyLog || {}).reduce((s: number, d: DailyStat) => s + (d.items || 0), 0);
  }, [dailyLog]);

  const level = getPetLevel(totalItems);

  const [isNudging, setIsNudging] = useState(false);

  useEffect(() => {
    setMood(getMood({ dailyLog }));
  }, [dailyLog]);

  useEffect(() => {
    const msgs = MOOD_MSG[mood]!!
    setMessage(msgs[Math.floor(Math.random() * msgs.length)]!);
  }, [mood]);

  /** 5 秒无操作“摇摇唤醒”机制 (参考帮帮识字适龄逻辑) */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      setIsNudging(false);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsNudging(true);
        setMessage(t('companion.nudge'));
      }, 6000);
    };

    window.addEventListener('pointerdown', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, []);


  const pickPet = (id: string) => {
    setPetId(id);
    safeSetItem('companion-pet', id);
    setShowPicker(false);
    speak(`${PETS.find(p => p.id === id)?.name}！${pet.sound}`, { lang: 'zh-CN', rate: 0.9 });
  };

  const petClick = () => {
    const msgs = MOOD_MSG[mood]!!
    const msg = msgs[Math.floor(Math.random() * msgs.length)]!
    setMessage(msg);
    speak(msg, { lang: 'zh-CN', rate: 0.92 });
  };

  return (
    <Panel className="!py-3">
      <div className="flex items-center gap-3">
        {/* 宠物头像 */}
        <button
          onClick={petClick}
          aria-label={t('companion.clickInteract', { name: pet.name, mood: mood === 'sleeping' ? t('companion.moodSleeping') : mood === 'excited' ? t('companion.moodExcited') : t('companion.moodHappy') })}
          className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-candy-yellow-soft text-4xl active:scale-95"
        >
          <motion.span
            animate={
              isNudging
                ? { rotate: [0, -15, 15, -15, 15, 0], scale: [1, 1.2, 1] }
                : mood === 'excited'
                  ? { rotate: [0, -10, 10, 0] }
                  : { y: [0, -3, 0] }
            }
            transition={{ repeat: Infinity, duration: isNudging ? 0.8 : mood === 'excited' ? 0.5 : 2 }}
          >

            {pet.emoji}
          </motion.span>
          <span className="absolute -top-1 -right-1 text-base">{MOOD_EMOJI[mood]}</span>
          <span className="absolute -bottom-1 -right-1 rounded-full bg-candy-orange-main px-1.5 py-0.5 text-[9px] font-black text-white">Lv{level}</span>
        </button>

        {/* 对话 */}
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-candy-blue-soft p-2.5">
            <p className="text-xs font-bold text-candy-blue-deep">{pet.name}</p>
            <AnimatePresence mode="wait">
              <motion.p
                key={message}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm font-semibold text-ink"
              >
                {message}
              </motion.p>
            </AnimatePresence>
          </div>
          <button
            onClick={() => setShowPicker(s => !s)}
            className="mt-1 text-[11px] font-bold text-ink-soft"
          >
            {t('companion.switchPet')}
          </button>
        </div>
      </div>

      {/* 宠物选择 */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex gap-2">
              {PETS.map(p => (
                <CandyButton
                  key={p.id}
                  tone={petId === p.id ? 'green' : 'purple'}
                  variant={petId === p.id ? 'solid' : 'soft'}
                  size="sm"
                  onClick={() => pickPet(p.id)}
                >
                  {p.emoji} {p.name}
                </CandyButton>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}
