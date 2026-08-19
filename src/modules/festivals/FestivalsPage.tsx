/**
 * 3D 羊毛毡二十四节气与传统节日文化馆 📜 (Solar Terms & Festivals)
 * ------------------------------------------------------------
 * 1. 3D 羊毛毡 24 节气四时风物志 (春/夏/秋/冬)
 * 2. 中华传统节日风俗问答 (春节/端午/中秋)
 */

import { useState, useMemo } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useAiStream } from '@/lib/ai/useAi';
import { festivalTalkTask } from '@/lib/ai/tasks/culture';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '@/i18n/useTranslation';
import { useStore, useMastery } from '@/store/useStore';

interface SolarTerm {
  name: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  emoji: string;
  chant: string;
  custom: string;
}

const SOLAR_TERMS: SolarTerm[] = [
  { name: '立春', season: 'spring', emoji: '🌱', chant: '立春东风解冻，万物复苏发新芽！', custom: '吃春卷、打春牛，迎来春天' },
  { name: '惊蛰', season: 'spring', emoji: '⚡', chant: '春雷响，万物长，小虫子醒过来啦！', custom: '吃梨润肺，听春雷响' },
  { name: '清明', season: 'spring', emoji: '🌧️', chant: '清明时节雨纷纷，踏青插柳好时节！', custom: '踏青放风筝、吃青团' },
  { name: '谷雨', season: 'spring', emoji: '🌾', chant: '谷雨雨生百谷，秧苗喝饱水茁壮！', custom: '赏牡丹花、喝谷雨茶' },

  { name: '立夏', season: 'summer', emoji: '☀️', chant: '立夏槐夏荫浓，小荷才露尖尖角！', custom: '尝鲜吃蚕豆、斗蛋玩' },
  { name: '夏至', season: 'summer', emoji: '🍦', chant: '夏至白昼最长，听取蝉鸣一片片！', custom: '吃夏至面、尝冰镇西瓜' },

  { name: '立秋', season: 'autumn', emoji: '🍁', chant: '立秋凉风至，高粱红红稻花香！', custom: '贴秋膘、啃秋瓜' },
  { name: '霜降', season: 'autumn', emoji: '柿', chant: '霜降红叶满山，柿子甜甜挂树梢！', custom: '吃红柿子、赏枫叶' },

  { name: '立冬', season: 'winter', emoji: '❄️', chant: '立冬水始冰，小雪飘飘冬日来！', custom: '吃水饺、喝热汤' },
  { name: '冬至', season: 'winter', emoji: '🥟', chant: '冬至夜最长，吃碗热饺子不冻耳朵！', custom: '北方吃饺子、南方吃汤圆' },
];

interface FestivalQuiz {
  name: string;
  emoji: string;
  customs: string[];
  question: string;
  options: string[];
  answerIdx: number;
}

const FESTIVALS: FestivalQuiz[] = [
  { name: '春节', emoji: '🧨', customs: ['贴春联', '吃年夜饭', '发红包'], question: '春节时，小朋友会收到长辈送的什么呢？', options: ['压岁钱红包', '粽子', '月饼'], answerIdx: 0 },
  { name: '端午节', emoji: '🚣‍♂️', customs: ['划龙舟', '吃粽子', '挂艾草'], question: '端午节大家会在江面上赛什么呢？', options: ['赛跑', '划龙舟', '骑自行车'], answerIdx: 1 },
  { name: '中秋节', emoji: '🥮', customs: ['赏月', '吃月饼', '猜灯谜'], question: '中秋节大家一家人围在一起吃什么甜甜的美食？', options: ['汤圆', '月饼', '青团'], answerIdx: 1 },
];

export default function FestivalsPage() {
  const { t: tr } = useTranslation();
  const [selectedTerm, setSelectedTerm] = useState<SolarTerm>(SOLAR_TERMS[0]!);
  const [fQuiz, setFQuiz] = useState<FestivalQuiz | null>(null);
  const [feedback, setFeedback] = useState('');
  const [showAi, setShowAi] = useState(false);
  const festivalAi = useAiStream();

  const { learnSkill, practice, tickTime } = useStore();
  const mastery = useMastery();

  // 已了解的节气数量：mastery 中存在 festival:term-{name} 且 lv>=0 即接触过
  const termsLearned = useMemo(
    () => SOLAR_TERMS.filter(t => {
      const m = mastery[`festival:term-${t.name}`];
      return m !== undefined && m.lv >= 0;
    }).length,
    [mastery],
  );

  const handleSelectTerm = (t: SolarTerm) => {
    sfxTap();
    setSelectedTerm(t);
    speak(`${t.name}。${t.chant}风俗：${t.custom}。`, { lang: 'zh-CN' });
    learnSkill(`festival:term-${t.name}`);
  };

  const startFestivalQuiz = () => {
    sfxTap();
    setFeedback('');
    const target = FESTIVALS[Math.floor(Math.random() * FESTIVALS.length)]!
    setFQuiz(target);
    speak(`传统节日知识问答：${target.question}`, { lang: 'zh-CN' });
  };

  const handleAnswer = (idx: number) => {
    if (!fQuiz) return;
    if (idx === fQuiz.answerIdx) {
      sfxCorrect();
      setFeedback(tr('festivals.correctMsg'));
      speak(`太棒啦！答对了！${fQuiz.name}有这个传统风俗！`, { lang: 'zh-CN' });
      practice(`festival:quiz-${fQuiz.name}`, true, 2, 2);
      tickTime(10);
    } else {
      sfxWrong();
      setFeedback(tr('festivals.wrongMsg'));
      practice(`festival:quiz-${fQuiz.name}`, false, 0, 2);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        iconType="town"
        title={tr('festivals.title')}
        subtitle={tr('festivals.subtitle')}
        tone="pink"
      />

      {/* 24 节气风物志 */}
      <Panel className="border-2 border-pink-300 bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 text-center space-y-4">
        <h3 className="text-lg font-black text-pink-900">🌸 {tr('festivals.termsTitle')}</h3>

        {/* 进度展示 */}
        <div className="text-sm font-black text-pink-700">
          📖 已了解 {termsLearned}/{SOLAR_TERMS.length} 个节气
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {SOLAR_TERMS.map(t => (
            <button
              key={t.name}
              onClick={() => handleSelectTerm(t)}
              className={`rounded-2xl border-2 px-3 py-1.5 text-xs font-black transition-transform active:scale-95 ${
                selectedTerm.name === t.name ? 'bg-pink-600 text-white border-pink-700 scale-105 shadow-md' : 'bg-white text-pink-900 border-pink-200 hover:scale-102'
              }`}
            >
              {t.emoji} {t.name}
            </button>
          ))}
        </div>

        {/* 节气详情 */}
        <div className="mx-auto max-w-lg rounded-3xl border-2 border-pink-300 bg-white p-5 text-left shadow-fluffy">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-100 text-4xl shadow-sm">
              {selectedTerm.emoji}
            </div>
            <div>
              <h4 className="text-xl font-black text-pink-900">{selectedTerm.name}</h4>
              <p className="text-xs font-bold text-pink-700">📜 {tr('festivals.chantLabel')}：{selectedTerm.chant}</p>
            </div>
          </div>
          <p className="text-xs font-bold text-pink-800">💡 {tr('festivals.customLabel')}：{selectedTerm.custom}</p>

          <div className="mt-3 flex justify-center gap-2">
            <CandyButton
              tone="purple"
              size="sm"
              onClick={() => {
                sfxTap();
                setShowAi(true);
                tickTime(5);
                festivalAi.run(festivalTalkTask(selectedTerm.name, selectedTerm.season, selectedTerm.chant, selectedTerm.custom));
              }}
            >
              🤖 {tr('festivals.aiTalk')}
            </CandyButton>
          </div>

          <AnimatePresence>
            {showAi && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 rounded-2xl border-2 border-purple-200 bg-purple-50 p-3"
              >
                <div className="mb-1 flex items-center gap-2 text-xs font-black text-purple-700">
                  <span>🤖</span> {tr('festivals.aiSays')}
                  {festivalAi.status === 'thinking' && <span className="text-purple-400">{tr('festivals.thinking')}</span>}
                </div>
                <p className="text-sm font-bold leading-relaxed text-purple-900">
                  {festivalAi.text || tr('festivals.aiEmpty')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Panel>

      {/* 传统节日问答 */}
      <Panel className="border-2 border-amber-300 bg-amber-50 text-center space-y-4">
        <h3 className="text-lg font-black text-amber-900">🧨 {tr('festivals.quizTitle')}</h3>

        {!fQuiz ? (
          <CandyButton tone="orange" size="md" onClick={startFestivalQuiz}>
            🏮 {tr('festivals.quizStart')}
          </CandyButton>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 text-base font-black text-amber-900 shadow-sm inline-block">
              {fQuiz.emoji} {fQuiz.question}
            </div>

            <div className="flex justify-center flex-wrap gap-3">
              {fQuiz.options.map((opt, i) => (
                <button
                  key={opt}
                  onClick={() => handleAnswer(i)}
                  className="rounded-2xl border-2 border-amber-200 bg-white px-5 py-3 text-base font-black text-amber-900 shadow-sm hover:scale-105 active:scale-95 transition-transform"
                >
                  {opt}
                </button>
              ))}
            </div>

            {feedback && (
              <div className="text-sm font-black text-amber-800">
                {feedback}
              </div>
            )}

            <div>
              <CandyButton tone="purple" variant="soft" size="sm" onClick={startFestivalQuiz}>
                {tr('common.nextQuestion')}
              </CandyButton>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
