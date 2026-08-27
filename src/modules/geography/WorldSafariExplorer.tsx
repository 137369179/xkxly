/**
 * 🧭 宝宝巴士/国家地理幼儿版级「全球七大洲五大洋 3D 环球探险与护照打卡」 (World Safari Explorer Pro)
 * ------------------------------------------------------------------------------------------
 * 1. 🌏 七大洲与 🌊 五大洋全景探索（地形气候、著名地标、代表性野生动植物）；
 * 2. 🏛️ 世界地标名胜（万里长城、金字塔、埃菲尔铁塔、悉尼歌剧院、自由女神、亚马逊雨林、南极冰川、马里亚纳海沟）；
 * 3. 🐼 代表性珍稀动植物（大熊猫、非洲狮、白头海雕、羊驼、袋鼠、帝企鹅、蓝鲸、大白鲨、海龟）；
 * 4. 🛂 「小小环球探险家」12 洲洋护照集章大冒险、双语原声科普、Streak 连击条与通关荣誉勋章！
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWin } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { StreakBar } from '@/components/study/StreakBar';

export interface SafariContinent {
  id: string;
  category: 'continent' | 'ocean';
  nameZh: string;
  nameEn: string;
  emoji: string;
  bgGradient: string;
  themeColor: string;
  landmarkZh: string;
  landmarkEn: string;
  landmarkEmoji: string;
  animalZh: string;
  animalEn: string;
  animalEmoji: string;
  stampEmoji: string;
  funFact: string;
  quizQuestion: string;
  quizOptions: string[];
  correctAnswer: string;
}

export const SAFARI_CONTINENTS: SafariContinent[] = [
  // ── 七大洲 ──
  {
    id: 'asia',
    category: 'continent',
    nameZh: '亚洲',
    nameEn: 'Asia',
    emoji: '🐼',
    bgGradient: 'from-emerald-100 via-teal-50 to-amber-50',
    themeColor: 'border-emerald-400 bg-emerald-50 text-emerald-950',
    landmarkZh: '万里长城与喜马拉雅山脉',
    landmarkEn: 'Great Wall & Himalayas',
    landmarkEmoji: '🏯',
    animalZh: '国宝大熊猫与孟加拉虎',
    animalEn: 'Giant Panda',
    animalEmoji: '🐼',
    stampEmoji: '🎋',
    funFact: '亚洲是世界上面积最大、人口最多的大洲，世界最高峰珠穆朗玛峰就在亚洲！',
    quizQuestion: '世界上最喜欢吃竹子、被称为国宝的大熊猫生活在哪一个大洲？',
    quizOptions: ['亚洲', '欧洲', '非洲', '大洋洲'],
    correctAnswer: '亚洲',
  },
  {
    id: 'africa',
    category: 'continent',
    nameZh: '非洲',
    nameEn: 'Africa',
    emoji: '🦁',
    bgGradient: 'from-amber-100 via-orange-50 to-yellow-50',
    themeColor: 'border-amber-400 bg-amber-50 text-amber-950',
    landmarkZh: '古埃及金字塔与东非大草原',
    landmarkEn: 'Pyramids & Savannah',
    landmarkEmoji: '🏜️',
    animalZh: '草原之王狮子与长颈鹿',
    animalEn: 'Lion & Giraffe',
    animalEmoji: '🦁',
    stampEmoji: '🌴',
    funFact: '非洲拥有广阔的野生动物大草原，以及世界上最长的大河——尼罗河！',
    quizQuestion: '壮观的古老金字塔和广阔的塞伦盖蒂大草原位于哪个大洲？',
    quizOptions: ['非洲', '南极洲', '欧洲', '北美洲'],
    correctAnswer: '非洲',
  },
  {
    id: 'europe',
    category: 'continent',
    nameZh: '欧洲',
    nameEn: 'Europe',
    emoji: '🏰',
    bgGradient: 'from-blue-100 via-indigo-50 to-sky-50',
    themeColor: 'border-blue-400 bg-blue-50 text-blue-950',
    landmarkZh: '巴黎埃菲尔铁塔与童话古堡',
    landmarkEn: 'Eiffel Tower & Castles',
    landmarkEmoji: '🗼',
    animalZh: '刺猬、驯鹿与白天鹅',
    animalEn: 'Reindeer & Hedgehog',
    animalEmoji: '🦔',
    stampEmoji: '👑',
    funFact: '欧洲有很多美丽的古堡和童话发源地，还有充满浪漫气息的阿尔卑斯雪山！',
    quizQuestion: '高耸浪漫的埃菲尔铁塔和童话古堡坐落在哪个大洲？',
    quizOptions: ['欧洲', '南美洲', '大洋洲', '南极洲'],
    correctAnswer: '欧洲',
  },
  {
    id: 'north_america',
    category: 'continent',
    nameZh: '北美洲',
    nameEn: 'North America',
    emoji: '🦅',
    bgGradient: 'from-indigo-100 via-purple-50 to-blue-50',
    themeColor: 'border-indigo-400 bg-indigo-50 text-indigo-950',
    landmarkZh: '自由女神像与科罗拉多大峡谷',
    landmarkEn: 'Statue of Liberty & Grand Canyon',
    landmarkEmoji: '🗽',
    animalZh: '白头海雕与海狸',
    animalEn: 'Bald Eagle & Beaver',
    animalEmoji: '🦅',
    stampEmoji: '🍁',
    funFact: '北美洲有红彤彤的枫树森林、壮观的大峡谷和五大淡水湖群！',
    quizQuestion: '高举火炬的自由女神像和壮丽的大峡谷位于哪个大洲？',
    quizOptions: ['北美洲', '非洲', '亚洲', '南美洲'],
    correctAnswer: '北美洲',
  },
  {
    id: 'south_america',
    category: 'continent',
    nameZh: '南美洲',
    nameEn: 'South America',
    emoji: '🦙',
    bgGradient: 'from-green-100 via-emerald-50 to-lime-50',
    themeColor: 'border-green-400 bg-green-50 text-green-950',
    landmarkZh: '亚马逊热带雨林与天空之城马丘比丘',
    landmarkEn: 'Amazon Rainforest & Machu Picchu',
    landmarkEmoji: '🌴',
    animalZh: '可爱羊驼与彩虹巨嘴鸟',
    animalEn: 'Llama & Toucan',
    animalEmoji: '🦙',
    stampEmoji: '🦜',
    funFact: '亚马逊热带雨林被称为“地球之肺”，生长着世界上最丰富的植物与神奇鸟类！',
    quizQuestion: '被称为“地球之肺”的亚马逊热带雨林和可爱的羊驼在哪里？',
    quizOptions: ['南美洲', '欧洲', '亚洲', '南极洲'],
    correctAnswer: '南美洲',
  },
  {
    id: 'oceania',
    category: 'continent',
    nameZh: '大洋洲',
    nameEn: 'Oceania',
    emoji: '🦘',
    bgGradient: 'from-rose-100 via-pink-50 to-orange-50',
    themeColor: 'border-rose-400 bg-rose-50 text-rose-950',
    landmarkZh: '悉尼贝壳歌剧院与大堡礁珊瑚海',
    landmarkEn: 'Sydney Opera House & Great Barrier Reef',
    landmarkEmoji: '⛵',
    animalZh: '袋鼠妈妈与考拉树袋熊',
    animalEn: 'Kangaroo & Koala',
    animalEmoji: '🦘',
    stampEmoji: '🐨',
    funFact: '大洋洲被蔚蓝大海环抱，袋鼠和考拉妈妈都有一个神奇的“育儿袋”！',
    quizQuestion: '口袋里装着小宝宝跳跃奔跑的袋鼠和抱着桉树睡觉的考拉生活在哪？',
    quizOptions: ['大洋洲', '欧洲', '北美洲', '非洲'],
    correctAnswer: '大洋洲',
  },
  {
    id: 'antarctica',
    category: 'continent',
    nameZh: '南极洲',
    nameEn: 'Antarctica',
    emoji: '🐧',
    bgGradient: 'from-sky-100 via-cyan-50 to-blue-50',
    themeColor: 'border-sky-400 bg-sky-50 text-sky-950',
    landmarkZh: '万年冰川极地与绚丽极光',
    landmarkEn: 'Glaciers & Aurora',
    landmarkEmoji: '❄️',
    animalZh: '耐寒帝企鹅与海豹海狮',
    animalEn: 'Emperor Penguin & Seal',
    animalEmoji: '🐧',
    stampEmoji: '🧊',
    funFact: '南极洲是地球上最冷、风最大的地方，几乎整片大陆都被厚厚的冰雪覆盖！',
    quizQuestion: '排着整齐队伍在冰雪上滑行、不怕严寒的帝企鹅家园在哪里？',
    quizOptions: ['南极洲', '亚洲', '非洲', '大洋洲'],
    correctAnswer: '南极洲',
  },

  // ── 五大洋 ──
  {
    id: 'pacific',
    category: 'ocean',
    nameZh: '太平洋',
    nameEn: 'Pacific Ocean',
    emoji: '🐋',
    bgGradient: 'from-blue-100 via-cyan-50 to-indigo-50',
    themeColor: 'border-blue-400 bg-blue-50 text-blue-950',
    landmarkZh: '马里亚纳海沟（地球最深处）',
    landmarkEn: 'Mariana Trench (Deepest Sea)',
    landmarkEmoji: '🌊',
    animalZh: '巨型蓝鲸与五彩热带鱼群',
    animalEn: 'Blue Whale & Tropical Fish',
    animalEmoji: '🐋',
    stampEmoji: '🌊',
    funFact: '太平洋是地球上最大、最深的大洋，占了地球表面积的三分之一！',
    quizQuestion: '地球上面积最大、拥有最深马里亚纳海沟的超级大洋是哪个？',
    quizOptions: ['太平洋', '大西洋', '北冰洋', '印度洋'],
    correctAnswer: '太平洋',
  },
  {
    id: 'atlantic',
    category: 'ocean',
    nameZh: '大西洋',
    nameEn: 'Atlantic Ocean',
    emoji: '🦈',
    bgGradient: 'from-teal-100 via-sky-50 to-blue-50',
    themeColor: 'border-teal-400 bg-teal-50 text-teal-950',
    landmarkZh: '大西洋中脊与百慕大群岛',
    landmarkEn: 'Mid-Atlantic Ridge & Bermuda',
    landmarkEmoji: '🧭',
    animalZh: '大白鲨与座头鲸',
    animalEn: 'Great White Shark & Humpback',
    animalEmoji: '🦈',
    stampEmoji: '⚓',
    funFact: '大西洋形状像一个巨大的英文字母“S”，连接着欧洲、美洲和非洲！',
    quizQuestion: '形状像一个大大的英文字母“S”的大洋是哪一个？',
    quizOptions: ['大西洋', '印度洋', '太平洋', '南冰洋'],
    correctAnswer: '大西洋',
  },
  {
    id: 'indian',
    category: 'ocean',
    nameZh: '印度洋',
    nameEn: 'Indian Ocean',
    emoji: '🐢',
    bgGradient: 'from-cyan-100 via-emerald-50 to-teal-50',
    themeColor: 'border-cyan-400 bg-cyan-50 text-cyan-950',
    landmarkZh: '马尔代夫环礁与温暖季风海流',
    landmarkEn: 'Maldives Atolls & Monsoons',
    landmarkEmoji: '🏝️',
    animalZh: '大海龟与儒艮美人鱼',
    animalEn: 'Sea Turtle & Dugong',
    animalEmoji: '🐢',
    stampEmoji: '🐚',
    funFact: '印度洋水温温暖，拥有许多美丽的珊瑚礁岛屿和小海龟繁衍的沙滩！',
    quizQuestion: '水温温暖、有很多可爱海龟与珊瑚岛礁的大洋是哪一个？',
    quizOptions: ['印度洋', '北冰洋', '大西洋', '南极洲'],
    correctAnswer: '印度洋',
  },
  {
    id: 'arctic',
    category: 'ocean',
    nameZh: '北冰洋',
    nameEn: 'Arctic Ocean',
    emoji: '🐻‍❄️',
    bgGradient: 'from-slate-100 via-sky-50 to-blue-100',
    themeColor: 'border-slate-400 bg-slate-50 text-slate-950',
    landmarkZh: '北极点与终年浮冰群',
    landmarkEn: 'North Pole & Sea Ice',
    landmarkEmoji: '🧊',
    animalZh: '北极熊与一角鲸独角兽',
    animalEn: 'Polar Bear & Narwhal',
    animalEmoji: '🐻‍❄️',
    stampEmoji: '❄️',
    funFact: '北冰洋是世界上最小、最浅的大洋，洋面上覆盖着厚厚的浮冰，是北极熊的乐园！',
    quizQuestion: '世界上最小、最冷，生活着威风凛凛北极熊的大洋是哪一个？',
    quizOptions: ['北冰洋', '印度洋', '太平洋', '大西洋'],
    correctAnswer: '北冰洋',
  },
  {
    id: 'southern',
    category: 'ocean',
    nameZh: '南冰洋',
    nameEn: 'Southern Ocean',
    emoji: '🦭',
    bgGradient: 'from-blue-100 via-indigo-50 to-cyan-100',
    themeColor: 'border-indigo-400 bg-indigo-50 text-indigo-950',
    landmarkZh: '南极绕极流与巨大冰山群',
    landmarkEn: 'Antarctic Circumpolar Current',
    landmarkEmoji: '🏔️',
    animalZh: '南极磷虾与豹海豹',
    animalEn: 'Antarctic Krill & Leopard Seal',
    animalEmoji: '🦭',
    stampEmoji: '💎',
    funFact: '南冰洋环绕着南极大陆，海水冰冷清澈，生活着数以亿计的微小南极磷虾！',
    quizQuestion: '紧紧环绕着南极大陆、漂浮着巨大蓝色冰山的大洋是哪一个？',
    quizOptions: ['南冰洋', '太平洋', '大西洋', '印度洋'],
    correctAnswer: '南冰洋',
  },
];

const FALLBACK_CONTINENT: SafariContinent = SAFARI_CONTINENTS[0] ?? {
  id: 'asia',
  category: 'continent',
  nameZh: '亚洲',
  nameEn: 'Asia',
  emoji: '🐼',
  bgGradient: 'from-emerald-100 via-teal-50 to-amber-50',
  themeColor: 'border-emerald-400 bg-emerald-50 text-emerald-950',
  landmarkZh: '万里长城与喜马拉雅山脉',
  landmarkEn: 'Great Wall & Himalayas',
  landmarkEmoji: '🏯',
  animalZh: '国宝大熊猫与孟加拉虎',
  animalEn: 'Giant Panda',
  animalEmoji: '🐼',
  stampEmoji: '🎋',
  funFact: '亚洲是世界上面积最大、人口最多的大洲，世界最高峰珠穆朗玛峰就在亚洲！',
  quizQuestion: '世界上最喜欢吃竹子、被称为国宝的大熊猫生活在哪一个大洲？',
  quizOptions: ['亚洲', '欧洲', '非洲', '大洋洲'],
  correctAnswer: '亚洲',
};

export function WorldSafariExplorer() {
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);

  const [activeTab, setActiveTab] = useState<'continents' | 'oceans' | 'passport'>('continents');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [collectedStamps, setCollectedStamps] = useState<string[]>([]);
  const [quizAnswered, setQuizAnswered] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const filteredList = useMemo(() => {
    if (activeTab === 'oceans') {
      return SAFARI_CONTINENTS.filter((c) => c.category === 'ocean');
    }
    return SAFARI_CONTINENTS.filter((c) => c.category === 'continent');
  }, [activeTab]);

  const currentItem = useMemo(() => {
    return filteredList[selectedIdx % filteredList.length] ?? filteredList[0] ?? FALLBACK_CONTINENT;
  }, [filteredList, selectedIdx]);

  // 切换区域
  const handleSelectItem = (idx: number) => {
    sfxTap();
    setSelectedIdx(idx);
    setQuizAnswered(null);
    const target = filteredList[idx] ?? FALLBACK_CONTINENT;
    void speak(`来到${target.nameZh}，${target.nameEn}！这里有${target.landmarkZh}，以及代表生物${target.animalZh}！`, { lang: 'zh-CN' });
  };

  // 答题盖章
  const handleAnswerQuiz = (option: string) => {
    if (quizAnswered) return;

    setQuizAnswered(option);
    if (option === currentItem.correctAnswer) {
      sfxCorrect();
      celebrateSmall();
      const nextStamps = Array.from(new Set([...collectedStamps, currentItem.id]));
      setCollectedStamps(nextStamps);
      addStars(1);
      practice(`geography:${currentItem.id}`, true, 2, 1);

      if (nextStamps.length === SAFARI_CONTINENTS.length) {
        sfxWin();
        celebrateBig();
        setStreak((s) => s + 1);
        addStars(3);
        void speak('恭喜集齐全球七大洲与五大洋全部护照印章！荣获「环球超级探险家」荣誉勋章！', { lang: 'zh-CN' });
      } else {
        void speak(`回答正确！已在护照上盖上【${currentItem.nameZh}】专属印章！`, { lang: 'zh-CN' });
      }
    } else {
      void speak(`再想一想哦，答案是${currentItem.correctAnswer}！`, { lang: 'zh-CN' });
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部主品类切换 (七大洲 / 五大洋 / 探险家护照) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              sfxTap();
              setActiveTab('continents');
              setSelectedIdx(0);
              setQuizAnswered(null);
            }}
            className={`py-1.5 px-3.5 rounded-xl font-black text-xs transition-all ${
              activeTab === 'continents'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            🌍 七大洲探险 ({SAFARI_CONTINENTS.filter((c) => c.category === 'continent').length})
          </button>
          <button
            type="button"
            onClick={() => {
              sfxTap();
              setActiveTab('oceans');
              setSelectedIdx(0);
              setQuizAnswered(null);
            }}
            className={`py-1.5 px-3.5 rounded-xl font-black text-xs transition-all ${
              activeTab === 'oceans'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-blue-700'
            }`}
          >
            🌊 五大洋探秘 ({SAFARI_CONTINENTS.filter((c) => c.category === 'ocean').length})
          </button>
          <button
            type="button"
            onClick={() => {
              sfxTap();
              setActiveTab('passport');
            }}
            className={`py-1.5 px-3.5 rounded-xl font-black text-xs transition-all ${
              activeTab === 'passport'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-amber-700'
            }`}
          >
            🛂 探险家护照 ({collectedStamps.length}/{SAFARI_CONTINENTS.length})
          </button>
        </div>

        <StreakBar streak={streak} target={3} />
      </div>

      {activeTab !== 'passport' ? (
        <>
          {/* 二级快捷切换按钮组 */}
          <div className="flex flex-wrap gap-1.5">
            {filteredList.map((c, idx) => {
              const isSel = selectedIdx === idx;
              const isStamped = collectedStamps.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectItem(idx)}
                  className={`py-2 px-3 rounded-2xl font-black text-xs transition-all border-2 flex items-center gap-1 ${
                    isSel
                      ? activeTab === 'continents'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-105'
                        : 'bg-blue-600 text-white border-blue-700 shadow-md scale-105'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <span className="text-base">{c.emoji}</span>
                  <span>{c.nameZh}</span>
                  {isStamped && <span className="text-xs">✅</span>}
                </button>
              );
            })}
          </div>

          {/* 主探险沙盘与地貌全景 */}
          <div className={`bg-gradient-to-br ${currentItem.bgGradient} rounded-3xl border-3 border-emerald-300 p-5 shadow-sm space-y-4`}>
            {/* 大洲/大洋全景名片 */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/85 backdrop-blur rounded-2xl p-4 border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-2xl bg-white/90 flex items-center justify-center text-4xl shadow-inner border border-emerald-200">
                  {currentItem.emoji}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <span>{currentItem.nameZh}</span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      {currentItem.nameEn}
                    </span>
                  </h3>
                  <p className="text-xs font-bold text-slate-600 mt-1">
                    🏛️ 标志景观：{currentItem.landmarkEmoji} {currentItem.landmarkZh} ({currentItem.landmarkEn})
                  </p>
                  <p className="text-xs font-semibold text-emerald-800 mt-0.5">
                    🐾 代表生物：{currentItem.animalEmoji} {currentItem.animalZh}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => speak(currentItem.funFact, { lang: 'zh-CN' })}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
              >
                🔊 听科普小知识
              </button>
            </div>

            {/* 趣味科普画卷 */}
            <div className="bg-white/90 rounded-2xl p-4 border border-emerald-100 text-left">
              <p className="text-xs font-extrabold text-emerald-900 leading-relaxed">
                💡 <span className="font-black">自然地理与生态百科：</span>
                {currentItem.funFact}
              </p>
            </div>

            {/* 🛂 护照集章打卡小测验 */}
            <div className="bg-white rounded-2xl p-4 border border-emerald-100 space-y-3 text-center">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <span>🛂</span>
                  <span>环球护照集章问答</span>
                  <span className="text-xs font-bold text-emerald-600">
                    (已集 {collectedStamps.length}/{SAFARI_CONTINENTS.length} 处印章)
                  </span>
                </h4>
                <span className="text-2xl">{currentItem.stampEmoji}</span>
              </div>

              <p className="text-sm font-black text-slate-700 text-left">
                ❓ {currentItem.quizQuestion}
              </p>

              {/* 选项按钮组 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {currentItem.quizOptions.map((opt) => {
                  const isSelected = quizAnswered === opt;
                  const isCorrect = opt === currentItem.correctAnswer;
                  const showCorrect = quizAnswered !== null && isCorrect;
                  const showWrong = isSelected && !isCorrect;

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={quizAnswered !== null}
                      onClick={() => handleAnswerQuiz(opt)}
                      className={`py-3 px-4 rounded-2xl font-black text-sm transition-all border-2 shadow-sm ${
                        showCorrect
                          ? 'bg-emerald-500 text-white border-emerald-600 ring-4 ring-emerald-200 scale-105'
                          : showWrong
                            ? 'bg-rose-500 text-white border-rose-600 opacity-75'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* 🛂 环球探险家护照展示展厅 */
        <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-3xl border-3 border-amber-300 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🛂</span>
              <div>
                <h3 className="text-lg font-black text-amber-950">小小环球旅行家 · 签证护照册</h3>
                <p className="text-xs font-bold text-amber-700">探索世界七大洲与五大洋，收集 12 枚专属金色签证印章！</p>
              </div>
            </div>
            <span className="text-sm font-black text-amber-800 bg-amber-200/80 px-3 py-1 rounded-full">
              已收集 {collectedStamps.length} / {SAFARI_CONTINENTS.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {SAFARI_CONTINENTS.map((item) => {
              const isStamped = collectedStamps.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border-2 text-center transition-all ${
                    isStamped
                      ? 'bg-white border-amber-400 shadow-md ring-2 ring-amber-200/50'
                      : 'bg-white/50 border-dashed border-slate-300 opacity-60'
                  }`}
                >
                  <div className="text-3xl mb-1">{isStamped ? item.stampEmoji : '🔒'}</div>
                  <div className="text-sm font-black text-slate-800">{item.nameZh}</div>
                  <div className="text-[10px] font-bold text-slate-500">{item.nameEn}</div>
                  <div className="mt-2 text-[11px] font-extrabold">
                    {isStamped ? (
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">已认证签证</span>
                    ) : (
                      <span className="text-slate-400">待探险打卡</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {collectedStamps.length === SAFARI_CONTINENTS.length && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-amber-500 to-yellow-600 rounded-2xl p-5 text-white text-center shadow-lg space-y-1"
            >
              <p className="text-lg font-black">👑 荣获【全球地理超级小博士】金质勋章！</p>
              <p className="text-xs font-extrabold opacity-95">
                你已经完成了全球七大洲与五大洋的全部地理挑战，足迹遍布整个地球！
              </p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
