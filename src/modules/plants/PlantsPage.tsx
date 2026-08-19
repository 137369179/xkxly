/**
 * 3D 羊毛毡奇妙植物与生态小花园 🪴 (Felt Plants & Ecology)
 * ------------------------------------------------------------
 * 1. 3D 羊毛毡奇妙植物百科 (向日葵/仙人掌/含羞草/捕蝇草)
 * 2. 小园丁阳光水滴浇水成长实验室 (种子->发芽->开花->结果)
 */

import { useState } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useTranslation } from '@/i18n/useTranslation';
import { useStore, useMastery } from '@/store/useStore';

interface Plant {
  id: string;
  nameZh: string;
  nameEn: string;
  emoji: string;
  feature: string;
  secret: string;
}

const PLANTS: Plant[] = [
  { id: 'sunflower', nameZh: '向日葵', nameEn: 'Sunflower', emoji: '🌻', feature: '大花盘总是跟着金灿灿的太阳转动！', secret: '成熟后会结出可以吃的葵花籽哦！' },
  { id: 'cactus', nameZh: '仙人掌', nameEn: 'Cactus', emoji: '🌵', feature: '身上长满小刺，能在干旱的大沙漠里生活！', secret: '它的小刺其实是退化的叶子，能防止水分蒸发！' },
  { id: 'shy_plant', nameZh: '含羞草', nameEn: 'Mimosa', emoji: '🌿', feature: '只要用小手指轻轻一碰，叶子就会害羞地合拢！', secret: '这是它保护自己不被小动物吃掉的小本领！' },
  { id: 'flytrap', nameZh: '捕蝇草', nameEn: 'Venus Flytrap', emoji: '🪴', feature: '叶子像夹子一样，专门捕捉靠近的小飞虫！', secret: '它是会“吃肉”的奇妙植物高手！' },
  { id: 'fanqie', nameZh: '番茄', nameEn: 'Tomato', emoji: '🍅', feature: '红彤彤的果实酸甜多汁，是蔬菜也是水果！', secret: '番茄最早来自南美洲的安第斯山脉！' },
  { id: 'caomei', nameZh: '草莓', nameEn: 'Strawberry', emoji: '🍓', feature: '鲜红的心形果子上长着一粒粒小种子！', secret: '草莓表面的小点才是它真正的果实哦！' },
  { id: 'huluobo', nameZh: '胡萝卜', nameEn: 'Carrot', emoji: '🥕', feature: '橙色的根藏在泥土里，上面长着绿色叶子！', secret: '胡萝卜最早是紫色的，橙色品种是后来培育的！' },
  { id: 'xigua', nameZh: '西瓜', nameEn: 'Watermelon', emoji: '🍉', feature: '圆滚滚的大个子，切开来是红瓤黑籽甜甜的！', secret: '西瓜百分之九十二都是水分，所以叫水瓜！' },
  { id: 'yumi', nameZh: '玉米', nameEn: 'Corn', emoji: '🌽', feature: '穿着绿色外套，头顶金色头发，粒粒金黄！', secret: '每根玉米上的粒数总是偶数行哦！' },
  { id: 'pugongying', nameZh: '蒲公英', nameEn: 'Dandelion', emoji: '🌼', feature: '黄色小花变成白色绒球，风一吹就飘走！', secret: '每颗蒲公英种子都带着小伞，能飞到很远的地方！' },
  { id: 'bamboo', nameZh: '竹子', nameEn: 'Bamboo', emoji: '🎋', feature: '一节一节往上长，是世界上长得最快的植物！', secret: '竹子其实是草本植物，不是树哦！' },
  { id: 'yinxing', nameZh: '银杏', nameEn: 'Ginkgo', emoji: '🍃', feature: '扇形叶子秋天变成金灿灿的黄色，美极了！', secret: '银杏树活了二亿年，是恐龙时代的活化石！' },
  { id: 'moli', nameZh: '茉莉花', nameEn: 'Jasmine', emoji: '🤍', feature: '小小白花散发迷人清香，可以泡茶喝！', secret: '茉莉花茶是用茶叶吸收茉莉花香制成的！' },
  { id: 'tudou', nameZh: '土豆', nameEn: 'Potato', emoji: '🥔', feature: '圆滚滚的块茎埋在土里，可以做成薯条！', secret: '土豆的绿叶部分是有毒的，只能吃地下的块茎！' },
  { id: 'mogu', nameZh: '蘑菇', nameEn: 'Mushroom', emoji: '🍄', feature: '雨天草地里冒出来的小伞，可爱又好吃！', secret: '蘑菇其实不是植物，它属于真菌大家族！' },
];

export default function PlantsPage() {
  const { t: tr } = useTranslation();
  const mastery = useMastery();
  const { learnSkill, tickTime, practice } = useStore();
  const [selectedP, setSelectedP] = useState<Plant>(PLANTS[0]!);
  const [growthStage, setGrowthStage] = useState<number>(0); // 0: 种子 🌰, 1: 发芽 🌱, 2: 开花 🌸, 3: 结果 🍎
  const [waterCount, setWaterCount] = useState<number>(0);
  const [sunCount, setSunCount] = useState<number>(0);

  // 计算已认识的植物数量（mastery 中 plant:{id} 的 lv >= 0 即接触过）
  const knownPlantCount = PLANTS.filter(p => {
    const m = mastery[`plant:${p.id}`];
    return m && m.lv >= 0;
  }).length;

  const handleSelectP = (p: Plant) => {
    sfxTap();
    setSelectedP(p);
    speak(`${p.nameZh}，${p.nameEn}。特点：${p.feature}秘密：${p.secret}`, { lang: 'zh-CN' });
    learnSkill(`plant:${p.id}`);
    tickTime(5);
  };

  const addSun = () => {
    sfxTap();
    setSunCount(c => c + 1);
    tickTime(3);
    checkGrowth(sunCount + 1, waterCount);
  };

  const addWater = () => {
    sfxTap();
    setWaterCount(c => c + 1);
    tickTime(3);
    checkGrowth(sunCount, waterCount + 1);
  };

  const checkGrowth = (s: number, w: number) => {
    const total = s + w;
    if (total >= 6 && growthStage < 3) {
      setGrowthStage(3);
      sfxCorrect();
      speak('哇！小植物在阳光和甜甜水滴养育下，结出了丰硕的果实！', { lang: 'zh-CN' });
      practice('plant:garden', true, 1, 1);
      practice('plant:garden-master', true, 3, 2);
    } else if (total >= 4 && growthStage < 2) {
      setGrowthStage(2);
      sfxTap();
      speak('开出美丽的花朵啦！', { lang: 'zh-CN' });
      practice('plant:garden', true, 1, 1);
    } else if (total >= 2 && growthStage < 1) {
      setGrowthStage(1);
      sfxTap();
      speak('小嫩芽破土而出啦！', { lang: 'zh-CN' });
      practice('plant:garden', true, 1, 1);
    }
  };

  const resetGarden = () => {
    sfxTap();
    setGrowthStage(0);
    setWaterCount(0);
    setSunCount(0);
  };

  const STAGE_ICONS = ['🌰', '🌱', '🌸', '🍎'];
  const STAGE_NAMES = ['泥土中的小种子', '破土而出的小嫩芽', '盛开的花朵', '硕果累累的大苹果'];

  return (
    <div className="space-y-5">
      <PageHeader
        iconType="town"
        title={tr('plants.title')}
        subtitle={tr('plants.subtitle')}
        tone="green"
      />

      {/* 奇妙植物百科 */}
      <Panel className="border-2 border-emerald-300 bg-emerald-50 text-center space-y-4">
        <h3 className="text-lg font-black text-emerald-900">🌿 {tr('plants.encyclopediaTitle')}</h3>

        {/* 进度展示 */}
        <div className="text-sm font-bold text-emerald-700">
          🌱 已认识 {knownPlantCount}/{PLANTS.length} 种植物
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {PLANTS.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectP(p)}
              className={`rounded-2xl border-2 px-2 py-2.5 text-xs font-black transition-transform active:scale-95 ${
                selectedP.id === p.id ? 'bg-emerald-600 text-white border-emerald-700 scale-105 shadow-md' : 'bg-white text-emerald-900 border-emerald-200 hover:scale-102'
              }`}
            >
              <span className="text-2xl block mb-0.5">{p.emoji}</span>
              {p.nameZh}
            </button>
          ))}
        </div>

        {/* 植物详情卡片 */}
        <div className="mx-auto max-w-lg rounded-3xl border-2 border-emerald-300 bg-white p-5 text-left shadow-fluffy">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-4xl shadow-sm">
              {selectedP.emoji}
            </div>
            <div>
              <h4 className="text-xl font-black text-emerald-900">{selectedP.nameZh} <span className="text-sm font-extrabold opacity-80">({selectedP.nameEn})</span></h4>
              <p className="text-xs font-bold text-emerald-700">🌟 {tr('plants.featureLabel')}：{selectedP.feature}</p>
            </div>
          </div>
          <p className="text-xs font-bold text-emerald-800">💡 {tr('plants.secretLabel')}：{selectedP.secret}</p>
        </div>
      </Panel>

      {/* 小园丁浇水成长实验室 */}
      <Panel className="border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-orange-50 text-center space-y-4">
        <h3 className="text-lg font-black text-amber-900">🪴 {tr('plants.labTitle')}</h3>

        <div className="rounded-3xl border-2 border-amber-200 bg-white p-6 shadow-sm mx-auto max-w-md space-y-4">
          <div className="text-6xl animate-bounce">
            {STAGE_ICONS[growthStage]}
          </div>
          <div className="text-base font-black text-amber-900">
            {tr('plants.growthStage')}：{STAGE_NAMES[growthStage]}
          </div>

          <div className="flex justify-center gap-6 text-sm font-extrabold text-amber-800">
            <span>☀️ {tr('plants.sun')}：{sunCount} {tr('plants.times')}</span>
            <span>💧 {tr('plants.water')}：{waterCount} {tr('plants.times')}</span>
          </div>

          <div className="flex justify-center gap-3">
            <CandyButton tone="orange" size="md" onClick={addSun}>
              ☀️ {tr('plants.addSun')}
            </CandyButton>
            <CandyButton tone="blue" size="md" onClick={addWater}>
              💧 {tr('plants.addWater')}
            </CandyButton>
          </div>

          {growthStage === 3 && (
            <div className="pt-2">
              <CandyButton tone="purple" variant="soft" size="sm" onClick={resetGarden}>
                {tr('plants.replant')}
              </CandyButton>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
