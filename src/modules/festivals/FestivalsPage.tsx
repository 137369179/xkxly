/**
 * 3D 羊毛毡二十四节气与传统节日文化馆 📜 (Solar Terms & Festivals Pro)
 * -----------------------------------------------------------------
 * 1. 24 节气四时风物全景长卷（春/夏/秋/冬 4 季 24 节气）；
 * 2. 8 大传统节日风俗互动问答（春节/元宵/清明/端午/七夕/中秋/重阳/除夕）；
 * 3. AI 伴学小老师节气文化解说与自然时令感知。
 */

import { useState, useMemo } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { useAiStream } from '@/lib/ai/useAi';
import { festivalTalkTask } from '@/lib/ai/tasks/culture';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '@/i18n/useTranslation';
import { useStore, useMastery } from '@/store/useStore';

export interface SolarTerm {
  name: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  emoji: string;
  chant: string;
  custom: string;
}

export const SOLAR_TERMS: SolarTerm[] = [
  // 春季 6 节气
  { name: '立春', season: 'spring', emoji: '🌱', chant: '立春东风解冻，万物复苏发新芽！', custom: '吃春卷、打春牛，迎来生机盎然的春天' },
  { name: '雨水', season: 'spring', emoji: '🌧️', chant: '雨水草木萌动，春雨贵如油润大地！', custom: '拉保保、占稻色，迎接春耕好雨' },
  { name: '惊蛰', season: 'spring', emoji: '⚡', chant: '春雷响，万物长，小虫子冬眠醒来啦！', custom: '吃梨润肺、听第一声春雷' },
  { name: '春分', season: 'spring', emoji: '🌸', chant: '春分昼夜平分，春暖花开燕归来！', custom: '竖鸡蛋、放风筝、吃春菜' },
  { name: '清明', season: 'spring', emoji: '🪁', chant: '清明时节雨纷纷，踏青插柳好时节！', custom: '踏青放风筝、吃软糯青团' },
  { name: '谷雨', season: 'spring', emoji: '🌾', chant: '谷雨雨生百谷，秧苗喝饱水茁壮！', custom: '赏牡丹花、喝谷雨新茶' },

  // 夏季 6 节气
  { name: '立夏', season: 'summer', emoji: '☀️', chant: '立夏槐夏荫浓，小荷才露尖尖角！', custom: '尝鲜吃蚕豆、称体重、斗蛋玩' },
  { name: '小满', season: 'summer', emoji: '🌾', chant: '小满江河水满，麦粒渐渐渐饱满！', custom: '吃苦菜、祭车神、抢水灌溉' },
  { name: '芒种', season: 'summer', emoji: '🌻', chant: '芒种有芒的麦子快收，有芒的稻子可种！', custom: '送花神、煮青梅酒' },
  { name: '夏至', season: 'summer', emoji: '🍉', chant: '夏至白昼最长，听取蝉鸣一片片！', custom: '吃夏至面、尝冰镇清甜西瓜' },
  { name: '小暑', season: 'summer', emoji: '🍧', chant: '小暑温风至，池塘莲花格外香！', custom: '食新米、吃伏羊、晒伏衣' },
  { name: '大暑', season: 'summer', emoji: '🌊', chant: '大暑热蒸湿，雷雨阵阵清凉来！', custom: '喝消暑老鸭汤、煎荷叶水' },

  // 秋季 6 节气
  { name: '立秋', season: 'autumn', emoji: '🍁', chant: '立秋凉风至，高粱红红稻花香！', custom: '贴秋膘、啃秋西瓜、晒秋景' },
  { name: '处暑', season: 'autumn', emoji: '🍂', chant: '处暑秋意渐浓，炎热暑气渐渐消散！', custom: '吃百合鸭、放河灯' },
  { name: '白露', season: 'autumn', emoji: '💧', chant: '白露秋夜凉，草木挂满晶莹晨露！', custom: '喝白露茶、吃香甜龙眼' },
  { name: '秋分', season: 'autumn', emoji: '🌾', chant: '秋分秋高气爽，丹桂飘香蟹脚痒！', custom: '吃秋菜、庆中国农民丰收节' },
  { name: '寒露', season: 'autumn', emoji: '🪶', chant: '寒露露水更凉，大雁排队飞向南方！', custom: '赏菊花、吃花糕、登高远眺' },
  { name: '霜降', season: 'autumn', emoji: '柿', chant: '霜降红叶满山，柿子甜甜挂树梢！', custom: '吃红柿子、赏枫叶、防寒保暖' },

  // 冬季 6 节气
  { name: '立冬', season: 'winter', emoji: '❄️', chant: '立冬水始冰，小动物准备冬眠啦！', custom: '吃热腾腾水饺、喝暖胃热汤' },
  { name: '小雪', season: 'winter', emoji: '🌨️', chant: '小雪天渐冷，雪花轻轻飘落屋顶！', custom: '腌腊肉、吃香甜糍粑' },
  { name: '大雪', season: 'winter', emoji: '⛄', chant: '大雪雪满天，大地披上雪白厚棉被！', custom: '堆雪人、打雪仗、进补羊肉' },
  { name: '冬至', season: 'winter', emoji: '🥟', chant: '冬至夜最长，吃碗热饺子不冻耳朵！', custom: '北方吃水饺、南方煮甜汤圆' },
  { name: '小寒', season: 'winter', emoji: '🧣', chant: '小寒寒气重，腊梅迎着风霜盛开！', custom: '吃腊八粥、糯米饭' },
  { name: '大寒', season: 'winter', emoji: '🔥', chant: '大寒岁末近，辞旧迎新盼过大年！', custom: '蒸年糕、办年货、迎新春' },
];

export interface FestivalQuiz {
  name: string;
  emoji: string;
  customs: string[];
  question: string;
  options: string[];
  answerIdx: number;
  explanation: string;
}

export const FESTIVALS: FestivalQuiz[] = [
  {
    name: '春节',
    emoji: '🧨',
    customs: ['贴春联', '吃年夜饭', '拜年发红包'],
    question: '春节过大年时，小朋友会收到长辈送的什么吉祥礼物呢？',
    options: ['压岁钱红包', '粽子', '月饼'],
    answerIdx: 0,
    explanation: '长辈给小朋友发红包压岁钱，寓意平平安安、健康成长！',
  },
  {
    name: '元宵节',
    emoji: '🏮',
    customs: ['吃元宵汤圆', '赏花灯', '猜灯谜'],
    question: '正月十五元宵节，夜里大家会去看什么五彩斑斓的景物？',
    options: ['赏花灯与猜灯谜', '赛龙舟', '包饺子'],
    answerIdx: 0,
    explanation: '元宵节街道上挂满兔子灯、荷花灯，大家一起猜灯谜吃汤圆！',
  },
  {
    name: '清明节',
    emoji: '🍃',
    customs: ['踏青', '放风筝', '吃青团'],
    question: '清明节春意盎然，小朋友们最喜欢在草地上玩什么户外游戏？',
    options: ['放风筝与踏青', '吃月饼', '赏雪景'],
    answerIdx: 0,
    explanation: '清明春暖花开，正是到郊外踏青草、放飞漂亮风筝的好时节！',
  },
  {
    name: '端午节',
    emoji: '🚣‍♂️',
    customs: ['划龙舟', '吃香甜粽子', '挂艾草辟邪'],
    question: '农历五月初五端午节，江面上会举行什么激动人心的水上比赛？',
    options: ['赛跑', '赛龙舟', '骑自行车'],
    answerIdx: 1,
    explanation: '端午节大家擂鼓呐喊划龙舟，纪念爱国诗人屈原，还要吃美味粽子！',
  },
  {
    name: '七夕节',
    emoji: '🌌',
    customs: ['仰望银河', '拜织女祈巧', '吃巧果'],
    question: '七夕节传说中，喜鹊会在银河上搭起什么让牛郎织女相会？',
    options: ['木桥', '鹊桥', '彩虹桥'],
    answerIdx: 1,
    explanation: '无数喜鹊飞到银河上搭起美丽的鹊桥，让牛郎和织女相聚！',
  },
  {
    name: '中秋节',
    emoji: '🥮',
    customs: ['一家团圆赏月', '吃香甜月饼', '赏桂花'],
    question: '八月十五中秋节，大家围坐在一起吃什么圆圆的传统美食？',
    options: ['粽子', '香甜月饼', '青团'],
    answerIdx: 1,
    explanation: '月饼圆圆象征着全家团圆美满，在中秋圆月下吃月饼最幸福啦！',
  },
  {
    name: '重阳节',
    emoji: '⛰️',
    customs: ['登高望远', '赏菊花', '佩插茱萸敬老'],
    question: '九月初九重阳节，人们会陪伴家里的爷爷奶奶做哪项传统活动？',
    options: ['登高赏菊与敬老', '放爆竹', '吃粽子'],
    answerIdx: 0,
    explanation: '重阳节是尊老敬老的节日，大家登高远眺、赏菊花、吃重阳糕！',
  },
  {
    name: '除夕夜',
    emoji: '🎉',
    customs: ['守岁', '包饺子', '吃年夜饭'],
    question: '一年中的最后一夜叫除夕，全家人聚在一起吃的丰盛大餐叫什么？',
    options: ['野餐', '年夜饭(团圆饭)', '早餐'],
    answerIdx: 1,
    explanation: '年夜饭又叫团圆饭，全家人开开心心围坐在一起迎接新一年的到来！',
  },
];

const FALLBACK_TERM: SolarTerm = SOLAR_TERMS[0] ?? {
  name: '立春',
  season: 'spring',
  emoji: '🌱',
  chant: '立春东风解冻，万物复苏发新芽！',
  custom: '吃春卷、打春牛，迎来生机盎然的春天',
};

const FALLBACK_FESTIVAL: FestivalQuiz = FESTIVALS[0] ?? {
  name: '春节',
  emoji: '🧨',
  customs: ['贴春联', '吃年夜饭', '拜年发红包'],
  question: '春节过大年时，小朋友会收到长辈送的什么吉祥礼物呢？',
  options: ['压岁钱红包', '粽子', '月饼'],
  answerIdx: 0,
  explanation: '长辈给小朋友发红包压岁钱，寓意平平安安、健康成长！',
};

export default function FestivalsPage() {
  const { t: tr } = useTranslation();
  const [selectedSeason, setSelectedSeason] = useState<'all' | 'spring' | 'summer' | 'autumn' | 'winter'>('all');
  const [selectedTerm, setSelectedTerm] = useState<SolarTerm>(SOLAR_TERMS[0] ?? FALLBACK_TERM);
  const [fQuiz, setFQuiz] = useState<FestivalQuiz | null>(null);
  const [feedback, setFeedback] = useState('');
  const [showAi, setShowAi] = useState(false);
  const festivalAi = useAiStream();

  const { learnSkill, practice, tickTime, addStars } = useStore();
  const mastery = useMastery();

  const filteredTerms = useMemo(() => {
    if (selectedSeason === 'all') return SOLAR_TERMS;
    return SOLAR_TERMS.filter((t) => t.season === selectedSeason);
  }, [selectedSeason]);

  // 已了解的节气数量
  const termsLearned = useMemo(
    () =>
      SOLAR_TERMS.filter((t) => {
        const m = mastery[`festival:term-${t.name}`];
        return m !== undefined && m.lv >= 0;
      }).length,
    [mastery],
  );

  const handleSelectTerm = (t: SolarTerm) => {
    sfxTap();
    setSelectedTerm(t);
    void speak(`${t.name}。${t.chant}风俗：${t.custom}。`, { lang: 'zh-CN' });
    learnSkill(`festival:term-${t.name}`);
  };

  const startFestivalQuiz = () => {
    sfxTap();
    setFeedback('');
    const target = FESTIVALS[Math.floor(Math.random() * FESTIVALS.length)] ?? FALLBACK_FESTIVAL;
    setFQuiz(target);
    void speak(`传统节日知识问答：${target.question}`, { lang: 'zh-CN' });
  };

  const handleAnswer = (idx: number) => {
    if (!fQuiz) return;
    if (idx === fQuiz.answerIdx) {
      sfxCorrect();
      celebrateBig();
      sfxWin();
      addStars(1);
      setFeedback(`🎉 答对啦！${fQuiz.explanation}`);
      void speak(`太棒啦！答对了！${fQuiz.name}，${fQuiz.explanation}`, { lang: 'zh-CN' });
      practice(`festival:quiz-${fQuiz.name}`, true, 2, 2);
      tickTime(10);
    } else {
      sfxWrong();
      celebrateSmall();
      setFeedback('再仔细想一想哦~ 试着选出正确的传统风俗吧！');
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

      {/* 24 节气四时风物长卷 */}
      <Panel className="border-2 border-pink-300 bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 text-center space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-black text-pink-900">🌸 24 节气四时风物长卷</h3>
          <div className="text-xs font-black text-pink-700 bg-white/80 px-3 py-1.5 rounded-full border border-pink-200 shadow-sm">
            📖 已点亮 {termsLearned} / {SOLAR_TERMS.length} 个节气
          </div>
        </div>

        {/* 季节筛选栏 */}
        <div className="flex flex-wrap justify-center gap-1.5 bg-white/60 p-1.5 rounded-2xl max-w-md mx-auto border border-pink-200">
          {[
            { key: 'all', label: '🌸 全部 24 节气' },
            { key: 'spring', label: '🌱 春季 (6)' },
            { key: 'summer', label: '☀️ 夏季 (6)' },
            { key: 'autumn', label: '🍁 秋季 (6)' },
            { key: 'winter', label: '❄️ 冬季 (6)' },
          ].map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                sfxTap();
                setSelectedSeason(s.key as typeof selectedSeason);
              }}
              className={`py-1.5 px-3 rounded-xl font-black text-xs transition-all ${
                selectedSeason === s.key
                  ? 'bg-pink-600 text-white shadow-sm scale-105'
                  : 'text-slate-600 hover:text-pink-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* 节气药丸按钮网格 */}
        <div className="flex flex-wrap justify-center gap-2">
          {filteredTerms.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => handleSelectTerm(t)}
              className={`rounded-2xl border-2 px-3 py-1.5 text-xs font-black transition-transform active:scale-95 flex items-center gap-1 shadow-sm ${
                selectedTerm.name === t.name
                  ? 'bg-pink-600 text-white border-pink-700 scale-105 shadow-md ring-2 ring-pink-300'
                  : 'bg-white text-pink-900 border-pink-200 hover:scale-102'
              }`}
            >
              <span>{t.emoji}</span>
              <span>{t.name}</span>
            </button>
          ))}
        </div>

        {/* 节气详情卡片 */}
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

      {/* 8 大传统节日问答 */}
      <Panel className="border-2 border-amber-300 bg-amber-50 text-center space-y-4">
        <h3 className="text-lg font-black text-amber-900">🧨 8 大传统节日风俗大闯关</h3>

        {!fQuiz ? (
          <CandyButton tone="orange" size="md" onClick={startFestivalQuiz}>
            🏮 开始节日知识大挑战
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
                  type="button"
                  onClick={() => handleAnswer(i)}
                  className="rounded-2xl border-2 border-amber-200 bg-white px-5 py-3 text-base font-black text-amber-900 shadow-sm hover:scale-105 active:scale-95 transition-transform"
                >
                  {opt}
                </button>
              ))}
            </div>

            {feedback && (
              <div className="text-sm font-black text-amber-800 bg-white/90 p-3 rounded-2xl border border-amber-200 max-w-md mx-auto">
                {feedback}
              </div>
            )}

            <div>
              <CandyButton tone="purple" variant="soft" size="sm" onClick={startFestivalQuiz}>
                🏮 挑战下一道节日趣题
              </CandyButton>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
