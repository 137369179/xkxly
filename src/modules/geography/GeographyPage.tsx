/**
 * 3D 羊毛毡地理空间与世界文化馆 🧭 (Geography & World Explorer)
 * ------------------------------------------------------------
 * 1. 3D 羊毛毡七大洲与五大洋探索地图 (Seven Continents & Oceans)
 * 2. 世界代表动物与地标中英文双语朗读
 * 3. 地理探索护照小挑战 (Geography Explorer Quiz)
 */

import { useState } from 'react';
import { shuffle } from "@/lib/utils";
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useTranslation } from '@/i18n/useTranslation';
import { useStore, useMastery } from '@/store/useStore';

interface Continent {
  id: string;
  nameZh: string;
  nameEn: string;
  emoji: string;
  animalZh: string;
  animalEn: string;
  landmark: string;
  desc: string;
  color: string;
}

const CONTINENTS: Continent[] = [
  { id: 'asia', nameZh: '亚洲', nameEn: 'Asia', emoji: '🐼', animalZh: '大熊猫', animalEn: 'Giant Panda', landmark: '万里长城', desc: '世界上最大的洲，有可爱的熊猫和雄伟的长城！', color: 'bg-emerald-100 border-emerald-300 text-emerald-900' },
  { id: 'europe', nameZh: '欧洲', nameEn: 'Europe', emoji: '🏰', animalZh: '刺猬', animalEn: 'Hedgehog', landmark: '埃菲尔铁塔', desc: '有好多漂亮的古堡和美丽的童话故事！', color: 'bg-blue-100 border-blue-300 text-blue-900' },
  { id: 'africa', nameZh: '非洲', nameEn: 'Africa', emoji: '🦁', animalZh: '草原之王狮子', animalEn: 'Lion', landmark: '金字塔', desc: '广阔的大草原，有狮子、长颈鹿和大象！', color: 'bg-amber-100 border-amber-300 text-amber-900' },
  { id: 'north_america', nameZh: '北美洲', nameEn: 'North America', emoji: '🦅', animalZh: '白头海雕', animalEn: 'Bald Eagle', landmark: '自由女神', desc: '有壮丽的峡谷、森林和巨大的枫树！', color: 'bg-indigo-100 border-indigo-300 text-indigo-900' },
  { id: 'south_america', nameZh: '南美洲', nameEn: 'South America', emoji: '🦙', animalZh: '羊驼与大嘴鸟', animalEn: 'Llama', landmark: '亚马逊雨林', desc: '有世界上最大最神奇的亚马逊热带雨林！', color: 'bg-purple-100 border-purple-300 text-purple-900' },
  { id: 'oceania', nameZh: '大洋洲', nameEn: 'Oceania', emoji: '🦘', animalZh: '袋鼠与考拉', animalEn: 'Kangaroo & Koala', landmark: '悉尼歌剧院', desc: '大海环绕的大洲，袋鼠妈妈口袋里装着小宝贝！', color: 'bg-rose-100 border-rose-300 text-rose-900' },
  { id: 'antarctica', nameZh: '南极洲', nameEn: 'Antarctica', emoji: '🐧', animalZh: '帝企鹅', animalEn: 'Emperor Penguin', landmark: '冰川与极光', desc: '被冰雪覆盖的冷冰冰世界，是企鹅家族的快乐家园！', color: 'bg-sky-100 border-sky-300 text-sky-900' },
];

export default function GeographyPage() {
  const { t: tr } = useTranslation();
  const { learnSkill, practice, tickTime } = useStore();
  const mastery = useMastery();
  const [selected, setSelected] = useState<Continent>(CONTINENTS[0]!);
  const [quizItem, setQuizItem] = useState<{ c: Continent; options: Continent[] } | null>(null);
  const [feedback, setFeedback] = useState('');

  const exploredCount = CONTINENTS.filter(c => {
    const m = mastery[`geo:${c.id}`];
    return m && m.lv >= 0;
  }).length;

  const handleSelect = (c: Continent) => {
    sfxTap();
    setSelected(c);
    learnSkill(`geo:${c.id}`);
    tickTime(5);
    speak(`${c.nameZh}，${c.nameEn}。代表动物是${c.animalZh}。`, { lang: 'zh-CN' });
  };

  const startQuiz = () => {
    sfxTap();
    setFeedback('');
    const target = CONTINENTS[Math.floor(Math.random() * CONTINENTS.length)]!
    const shuffledOpts = shuffle(CONTINENTS).slice(0, 3);
    if (!shuffledOpts.find(o => o.id === target.id)) {
      shuffledOpts[0] = target;
    }
    const finalOpts = shuffledOpts;
    setQuizItem({ c: target, options: finalOpts });

    speak(`请问，${target.animalZh}生活的${target.nameZh}在哪儿？`, { lang: 'zh-CN' });
  };

  const handleAnswer = (picked: Continent) => {
    if (!quizItem) return;
    if (picked.id === quizItem.c.id) {
      sfxCorrect();
      setFeedback(tr('geography.correctMsg'));
      practice(`geo:quiz-${quizItem.c.id}`, true, 2, 2);
      tickTime(5);
      speak(`太棒啦！答对了！${quizItem.c.nameZh}！`, { lang: 'zh-CN' });
    } else {
      sfxWrong();
      setFeedback(tr('geography.wrongMsg'));
      practice(`geo:quiz-${quizItem.c.id}`, false, 0, 2);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        iconType="town"
        title={tr('geography.title')}
        subtitle={tr('geography.subtitle')}
        tone="green"
      />

      {/* 大洲探索选择 */}
      <Panel className="border-2 border-green-300 bg-emerald-50 text-center space-y-4">
        <h3 className="text-lg font-black text-emerald-900">🌏 {tr('geography.exploreTitle')}</h3>

        <div className="text-sm font-bold text-emerald-700">
          📖 已探索 {exploredCount}/7 大洲
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {CONTINENTS.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelect(c)}
              className={`rounded-2xl border-2 px-3.5 py-2 text-sm font-black transition-transform active:scale-95 ${
                selected.id === c.id ? 'bg-emerald-600 text-white border-emerald-700 scale-105 shadow-md' : 'bg-white text-emerald-900 border-emerald-200 hover:scale-102'
              }`}
            >
              {c.emoji} {c.nameZh}
            </button>
          ))}
        </div>

        {/* 详情卡片 */}
        <div className={`mx-auto max-w-lg rounded-3xl border-2 p-5 text-left shadow-fluffy transition-all ${selected.color}`}>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-4xl shadow-sm">
              {selected.emoji}
            </div>
            <div>
              <h4 className="text-xl font-black">{selected.nameZh} <span className="text-sm font-extrabold opacity-80">({selected.nameEn})</span></h4>
              <p className="text-xs font-bold opacity-90">🏛️ {tr('geography.landmark')}：{selected.landmark} | 🐾 {tr('geography.animal')}：{selected.animalZh} ({selected.animalEn})</p>
            </div>
          </div>
          <p className="text-xs font-bold leading-relaxed opacity-95">{selected.desc}</p>
        </div>
      </Panel>

      {/* 地理知识问答护照 */}
      <Panel className="border-2 border-blue-300 bg-blue-50 text-center space-y-4">
        <h3 className="text-lg font-black text-blue-900">🛂 {tr('geography.passportTitle')}</h3>

        {!quizItem ? (
          <CandyButton tone="blue" size="md" onClick={startQuiz}>
            🌍 {tr('geography.startQuiz')}
          </CandyButton>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 text-base font-black text-blue-900 shadow-sm inline-block">
              {quizItem.c.emoji} {tr('geography.quizQ', { animal: quizItem.c.animalZh, animalEn: quizItem.c.animalEn })}
            </div>

            <div className="flex justify-center flex-wrap gap-3">
              {quizItem.options.map(o => (
                <button
                  key={o.id}
                  onClick={() => handleAnswer(o)}
                  className="rounded-2xl border-2 border-blue-200 bg-white px-5 py-3 text-base font-black text-blue-900 shadow-sm hover:scale-105 active:scale-95 transition-transform"
                >
                  {o.emoji} {o.nameZh}
                </button>
              ))}
            </div>

            {feedback && (
              <div className="text-sm font-black text-emerald-800">
                {feedback}
              </div>
            )}

            <div>
              <CandyButton tone="purple" variant="soft" size="sm" onClick={startQuiz}>
                {tr('common.nextQuestion')}
              </CandyButton>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
