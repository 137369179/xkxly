/**
 * 3D 羊毛毡健康生活与安全防护馆 🩺 (Safety & Health)
 * ------------------------------------------------------------
 * 1. 2分钟羊毛毡小兔刷牙伴读计时器 (Brushing Timer)
 * 2. 交通安全与红绿灯 (Traffic Lights)
 * 3. 紧急求助电话拨号练习 (Emergency 110/119/120 Dialing)
 */

import { useState, useEffect, useRef } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useAiStream } from '@/lib/ai/useAi';
import { safetySceneTask } from '@/lib/ai/tasks/culture';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '@/i18n/useTranslation';
import { useStore, useMastery } from '@/store/useStore';

/** 新增场景（scene9–scene12）的内置默认中文文案：当 i18n 缺失时作为 fallback。 */
const DEFAULT_TEXTS: Record<string, { scene: string; safe: string; danger: string }> = {
  scene9: {
    scene: '过马路的时候，红灯亮着',
    safe: '停下来等绿灯亮了再走，走斑马线过马路',
    danger: '不看红绿灯，直接跑过去',
  },
  scene10: {
    scene: '夏天到了，小伙伴约你去河边池塘玩水',
    safe: '不去，没有大人陪同不能靠近河边池塘',
    danger: '自己去或和小伙伴一起去玩水',
  },
  scene11: {
    scene: '陌生人说认识你爸爸妈妈，让你跟他走',
    safe: '不跟他走，也不吃他给的东西，赶紧找大人',
    danger: '相信他，跟他走',
  },
  scene12: {
    scene: '手刚洗完还是湿的，想插电视插头',
    safe: '把手擦干再去碰插头和电器',
    danger: '湿着手直接插插头',
  },
};

/**
 * 安全情景题库：i18n 键索引（真实文案在 locales 里）。
 * scene9–scene12 若 i18n 缺失，则回退到 DEFAULT_TEXTS 内置默认中文文案。
 */
const SAFETY_SCENES = [
  { key: 'scene1', scene: 'safety.scene1', safe: 'safety.scene1Safe', danger: 'safety.scene1Danger' },
  { key: 'scene2', scene: 'safety.scene2', safe: 'safety.scene2Safe', danger: 'safety.scene2Danger' },
  { key: 'scene3', scene: 'safety.scene3', safe: 'safety.scene3Safe', danger: 'safety.scene3Danger' },
  { key: 'scene4', scene: 'safety.scene4', safe: 'safety.scene4Safe', danger: 'safety.scene4Danger' },
  { key: 'scene5', scene: 'safety.scene5', safe: 'safety.scene5Safe', danger: 'safety.scene5Danger' },
  { key: 'scene6', scene: 'safety.scene6', safe: 'safety.scene6Safe', danger: 'safety.scene6Danger' },
  { key: 'scene7', scene: 'safety.scene7', safe: 'safety.scene7Safe', danger: 'safety.scene7Danger' },
  { key: 'scene8', scene: 'safety.scene8', safe: 'safety.scene8Safe', danger: 'safety.scene8Danger' },
  { key: 'scene9', scene: 'safety.scene9', safe: 'safety.scene9Safe', danger: 'safety.scene9Danger' },
  { key: 'scene10', scene: 'safety.scene10', safe: 'safety.scene10Safe', danger: 'safety.scene10Danger' },
  { key: 'scene11', scene: 'safety.scene11', safe: 'safety.scene11Safe', danger: 'safety.scene11Danger' },
  { key: 'scene12', scene: 'safety.scene12', safe: 'safety.scene12Safe', danger: 'safety.scene12Danger' },
];

/**
 * 翻译辅助：若 translate 返回值等于 key 本身（i18n 缺失），
 * 则回退到 DEFAULT_TEXTS 内置默认中文文案。
 */
function resolveText(translate: (key: string) => string, key: string, field: 'scene' | 'safe' | 'danger'): string {
  const value = translate(key);
  if (value === key) {
    // i18n 缺失，尝试从默认文案中回退
    const sceneKey = key.match(/safety\.(scene\d+)/)?.[1];
    if (sceneKey && DEFAULT_TEXTS[sceneKey]) {
      return DEFAULT_TEXTS[sceneKey][field];
    }
  }
  return value;
}

export default function SafetyPage() {
  const { t: translate } = useTranslation();
  const practice = useStore((s) => s.practice);
  const tickTime = useStore((s) => s.tickTime);
  const mastery = useMastery();
  // 刷牙计时
  const [brushing, setBrushing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  // 用 ref 记录「正在刷牙」真实状态，避免 timeLeft===0 时重复触发朗读
  const brushingRef = useRef(false);

  // 紧急电话练习
  const [dialNum, setDialNum] = useState('');
  const [dialFeedback, setDialFeedback] = useState('');

  // AI 安全情景对话
  const [safetyIdx, setSafetyIdx] = useState(0);
  const [safetyChosen, setSafetyChosen] = useState<string | null>(null);
  const [showSafetyAi, setShowSafetyAi] = useState(false);
  const safetyAi = useAiStream();

  // 计时器：依赖仅 [brushing]，避免每秒重建 interval 造成计时漂移
  useEffect(() => {
    if (!brushing) return;
    brushingRef.current = true;
    const timer = setInterval(() => {
      setTimeLeft(t => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [brushing]);

  // 完成检测：依赖仅 [timeLeft]，用 brushingRef 确保只朗读一次
  useEffect(() => {
    if (timeLeft === 0 && brushingRef.current) {
      brushingRef.current = false;
      setBrushing(false);
      sfxCorrect();
      speak('2分钟刷牙完成啦！牙齿白又亮！', { lang: 'zh-CN' });
      practice('safety:brushing', true, 2, 1);
      tickTime(120);
    }
  }, [timeLeft, practice, tickTime]);

  const handleStartBrush = () => {
    sfxTap();
    setTimeLeft(120);
    setBrushing(true);
    speak('开始刷牙啦！上下刷、左右刷，小牙齿真干净！', { lang: 'zh-CN' });
  };

  const handleDialDigit = (digit: string) => {
    sfxTap();
    if (dialNum.length >= 3) return;
    const newNum = dialNum + digit;
    setDialNum(newNum);

    if (newNum === '110') {
      sfxCorrect();
      setDialFeedback('🚓 110 警察叔叔警报电话！有危险找警察！');
      speak('1 1 0，匪警求助电话！警察叔叔来帮忙！', { lang: 'zh-CN' });
      practice('safety:dial-110', true, 2, 1);
    } else if (newNum === '119') {
      sfxCorrect();
      setDialFeedback('🚒 119 火警电话！着火了打 119！');
      speak('1 1 9，火警救灾电话！消防员叔叔来灭火！', { lang: 'zh-CN' });
      practice('safety:dial-119', true, 2, 1);
    } else if (newNum === '120') {
      sfxCorrect();
      setDialFeedback('🚑 120 医疗急救电话！有人受伤打 120！');
      speak('1 2 0，急救电话！医生护士救护车！', { lang: 'zh-CN' });
      practice('safety:dial-120', true, 2, 1);
    }
  };

  const handleClearDial = () => {
    sfxTap();
    setDialNum('');
    setDialFeedback('');
  };

  // 统计已掌握的安全情景数（mastery 中 safety:scene-{i} 的 lv >= 1）
  const masteredScenes = SAFETY_SCENES.filter((_, i) => {
    const m = mastery[`safety:scene-${i + 1}`];
    return m != null && m.lv >= 1;
  }).length;

  return (
    <div className="space-y-5">
      <PageHeader
        iconType="town"
        title={translate('safety.pageTitle')}
        subtitle={translate('safety.pageSubtitle')}
        tone="blue"
      />

      {/* 安全知识掌握进度条 */}
      <Panel className="border-2 border-blue-200 bg-blue-50/50">
        <ProgressBar
          value={masteredScenes}
          max={SAFETY_SCENES.length}
          label={`🛡️ 安全知识掌握 ${masteredScenes}/${SAFETY_SCENES.length} 场景`}
          color="blue"
          size="sm"
          showValue={false}
        />
      </Panel>

      {/* 2分钟刷牙伴读 */}
      <Panel className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 text-center space-y-3">
        <h3 className="text-lg font-black text-blue-900">🦷 {translate('safety.brushTitle')}</h3>
        <p className="text-xs font-bold text-blue-600">
          {translate('safety.brushTip')}
        </p>

        <div className="text-4xl font-black text-blue-900">
          ⏱️ {Math.floor(timeLeft / 60)} : {String(timeLeft % 60).padStart(2, '0')}
        </div>

        <div>
          {!brushing ? (
            <CandyButton tone="blue" size="md" onClick={handleStartBrush}>
              🪥 {translate('safety.startBrush')}
            </CandyButton>
          ) : (
            <CandyButton tone="pink" size="md" onClick={() => setBrushing(false)}>
              ⏸️ {translate('safety.pause')}
            </CandyButton>
          )}
        </div>
      </Panel>

      {/* 紧急求助电话模拟 */}
      <Panel className="border-2 border-pink-300 bg-rose-50 text-center space-y-4">
        <h3 className="text-lg font-black text-rose-900">📞 {translate('safety.dialTitle')}</h3>
        <p className="text-xs font-bold text-rose-600">
          {translate('safety.dialTip')}
        </p>

        <div className="mx-auto flex h-16 w-48 items-center justify-center rounded-2xl border-2 border-rose-300 bg-white text-3xl font-black tracking-widest text-rose-900 shadow-inner">
          {dialNum || '---'}
        </div>

        {dialFeedback && (
          <div className="rounded-2xl bg-white p-3 text-sm font-black text-rose-800 shadow-sm inline-block">
            {dialFeedback}
          </div>
        )}

        <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '110', '119'].map(d => (
            <button
              key={d}
              onClick={() => d.length > 1 ? (setDialNum(d), handleDialDigit('')) : handleDialDigit(d)}
              className="rounded-2xl border-2 border-rose-200 bg-white p-3 text-lg font-black text-rose-900 shadow-sm active:scale-95 transition-transform"
            >
              {d}
            </button>
          ))}
        </div>

        <div>
          <CandyButton tone="pink" variant="soft" size="sm" onClick={handleClearDial}>
            🔄 {translate('safety.clearDial')}
          </CandyButton>
        </div>
      </Panel>

      {/* AI 安全情景判断 */}
      <Panel className="border-2 border-green-300 bg-green-50 text-center space-y-3">
        <h3 className="text-lg font-black text-green-900">🦺 {translate('safety.aiTitle')}</h3>
        <p className="text-xs font-bold text-green-600">
          {translate('safety.aiTip')}
        </p>

        <div className="mx-auto max-w-lg rounded-2xl border-2 border-green-200 bg-white p-4">
          <div className="mb-3 text-base font-black text-green-900">
            {resolveText(translate, SAFETY_SCENES[safetyIdx]!.scene, 'scene')}
          </div>
          <div className="flex flex-col gap-2">
            {[SAFETY_SCENES[safetyIdx]!.safe, SAFETY_SCENES[safetyIdx]!.danger].map((optKey) => {
              const isSafeOpt = optKey === SAFETY_SCENES[safetyIdx]!.safe;
              const optText = resolveText(translate, optKey, isSafeOpt ? 'safe' : 'danger');
              return (
                <button
                  key={optKey}
                  onClick={() => {
                    sfxTap();
                    setSafetyChosen(optText);
                    setShowSafetyAi(true);
                    const isSafe = optKey === SAFETY_SCENES[safetyIdx]!.safe;
                    practice(`safety:scene-${safetyIdx + 1}`, isSafe, isSafe ? 2 : 0, 2);
                    safetyAi.run(safetySceneTask(resolveText(translate, SAFETY_SCENES[safetyIdx]!.scene, 'scene'), optText));
                  }}
                  className={`rounded-2xl border-2 px-4 py-2.5 text-sm font-black transition-all active:scale-95 ${
                    safetyChosen === optText
                      ? 'border-green-500 bg-green-100 text-green-900 shadow-md'
                      : 'border-green-200 bg-white text-green-800 hover:scale-102'
                  }`}
                >
                  {optText}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {showSafetyAi && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-lg rounded-2xl border-2 border-blue-200 bg-blue-50 p-3 text-left"
            >
              <div className="mb-1 flex items-center gap-2 text-xs font-black text-blue-700">
                <span>🤖</span> 小智说
                {safetyAi.status === 'thinking' && <span className="text-blue-400">正在想…</span>}
              </div>
              <p className="text-sm font-bold leading-relaxed text-blue-900">
                {safetyAi.text || translate('safety.aiHint')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center gap-2">
          <CandyButton
            tone="green"
            size="sm"
            onClick={() => {
              sfxTap();
              setSafetyIdx((i) => (i + 1) % SAFETY_SCENES.length);
              setSafetyChosen(null);
              setShowSafetyAi(false);
            }}
          >
            🔄 {translate('safety.nextScene')}
          </CandyButton>
        </div>
      </Panel>
    </div>
  );
}
