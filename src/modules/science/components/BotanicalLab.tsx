/**
 * 🌿 蒙特梭利/宝宝巴士级「植物生长实验室与昆虫微观生态馆 Pro」 (Montessori Botanical & Insect Lab Pro)
 * ---------------------------------------------------------------------------------------------------------
 * 1. 🌱 8 大植物生命周期模拟器：
 *    - 金色向日葵 🌻 / 多汁小番茄 🍅 / 甜美红草莓 🍓 / 参天大橡树 🌲 /
 *    - 脆甜大西瓜 🍉 / 金黄甜玉米 🌽 / 水中圣洁荷花 🪷 / 沙漠神奇仙人掌 🌵
 * 2. 🎛️ 真实自然培育环境仓：
 *    - 水分浇灌 💧 / 光照能量 ☀️ / 沃土养分 🧪 / 翻土透气 🪓 / 昼夜交替 ☀️/🌙
 * 3. 🐛 8 大昆虫变态发育微观生态瓶：
 *    - 蝴蝶破茧羽化 🦋 / 蜜蜂筑巢采蜜 🐝 / 七星瓢虫森林卫士 🐞 / 蚂蚁地下王国 🐜 /
 *    - 独角仙铁甲斗士 🪲 / 夜光萤火虫冷光 💡 / 飞天蜻蜓复眼之王 🪰 / 捕食螳螂绿色猎手 🦗
 * 4. 🔬 显微镜微观解构观察台 (Microscope X-Ray Inspector)：
 *    - 叶片微观气孔与叶绿体光合作用 / 根系木质部导管泵水 / 昆虫「头、胸、腹」三段式解剖
 * 5. 🐝 植物-昆虫共生互动模拟园 (Eco-Symbiosis Garden)：
 *    - 蜜蜂传粉授粉 / 瓢虫消灭蚜虫害虫 / 蚯蚓翻土透气
 * 6. 🎯 自然小博士 6 关生态闯关挑战赛
 * 7. 🎵 WebAudio 真实自然声景合成（水滴涌动 / 阳光暖音 / 养分滋润 / 泥土翻动 / 昆虫振翅 / 蜜蜂嗡鸣 / 萤火虫冷光）
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateBig, celebrateSmall } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { StreakBar } from '@/components/study/StreakBar';
import { getAudioContext } from '@/lib/audioContext';
import { ScienceAiPanel } from './ScienceAiPanel';

// ── 国际标准植物全生命周期物候发育阶段 (BBCH & V/R Phenology) ──
export interface BotanicalPhenologyStage {
  stageIndex: number;
  dayStart: number;
  dayEnd: number;
  bbchCode: string;
  stageName: string;
  emoji: string;
  heightCm: number;
  rootDepthCm: number;
  leafCount: number;
  aboveGroundDesc: string;
  underGroundDesc: string;
  physiologicalPrinciple: string;
  realPhotoUrl: string;
  realPhotoCaption: string;
}

export const SUNFLOWER_BBCH_STAGES: BotanicalPhenologyStage[] = [
  {
    stageIndex: 0,
    dayStart: 0,
    dayEnd: 5,
    bbchCode: 'BBCH 00-05 (萌发期)',
    stageName: '种子吸水与胚根初萌',
    emoji: '🌰',
    heightCm: 0,
    rootDepthCm: 4,
    leafCount: 0,
    aboveGroundDesc: '种子深埋在湿润肥沃的深色土壤中，地表暂未破土。',
    underGroundDesc: '坚硬种皮吸胀裂开，白色胚根（Radicle）突破种皮垂直向下扎入深土，萌生微细初生根毛吸取水分。',
    physiologicalPrinciple: '【吸胀与水解酶激活】：种子胶体快速吸水，赤霉素（GA）诱导合成淀粉水解酶，将胚乳营养转化为可溶性葡萄糖驱动胚根细胞高速有丝分裂。',
    realPhotoUrl: '/images/plants/sunflower_stage_0.jpg',
    realPhotoCaption: '真实微距实拍：饱满黑白向日葵籽在湿润泥土中吸水膨胀萌动',
  },
  {
    stageIndex: 1,
    dayStart: 6,
    dayEnd: 10,
    bbchCode: 'BBCH 07-09 (VE 出苗期)',
    stageName: '胚轴拱土与双子叶破土',
    emoji: '🌱',
    heightCm: 6,
    rootDepthCm: 12,
    leafCount: 2,
    aboveGroundDesc: '下胚轴呈弯钩拱形顶破泥土硬壳，带出种壳，两片肉质翠绿的肥厚子叶在晨光下迎风舒展。',
    underGroundDesc: '初生主根向下垂直扎入 10-12 cm，微细侧根与根毛网开始形成。',
    physiologicalPrinciple: '【光敏色素与首缕光合】：光敏色素感受阳光红光信号，抑制下胚轴徒长，促使子叶转绿并启动叶绿体光反应制造生命第一批光合糖分。',
    realPhotoUrl: '/images/plants/sunflower_stage_1.jpg',
    realPhotoCaption: '真实微距实拍：向日葵嫩芽破土而出，舒展翠绿对生子叶与细毛茎',
  },
  {
    stageIndex: 2,
    dayStart: 11,
    dayEnd: 25,
    bbchCode: 'BBCH 10-14 (V2-V4 真叶期)',
    stageName: '初生真叶与侧根网扩张',
    emoji: '🌿',
    heightCm: 25,
    rootDepthCm: 35,
    leafCount: 6,
    aboveGroundDesc: '生长点抽出第 1-4 片具有清晰羽状脉与锯齿边缘的真叶，幼茎表面密布防虫保护性茸毛。',
    underGroundDesc: '主根深达 35 cm，大量一级侧根向四周横向辐射延伸，构筑强大的吸水吸肥根网。',
    physiologicalPrinciple: '【真叶形态建成与蒸腾拉力】：真叶气孔与导管系统发育成熟，蒸腾拉力形成，根系以每小时数毫升的速率逆重力向上泵送矿物质水溶液。',
    realPhotoUrl: '/images/plants/sunflower_stage_1.jpg',
    realPhotoCaption: '真实微距实拍：向日葵幼苗舒展具有清晰锯齿羽状叶脉的翠绿真叶',
  },
  {
    stageIndex: 3,
    dayStart: 26,
    dayEnd: 45,
    bbchCode: 'BBCH 16-19 (V8-V12 拔节期)',
    stageName: '快速营养拔节与向日摆动',
    emoji: '🌲',
    heightCm: 150,
    rootDepthCm: 90,
    leafCount: 18,
    aboveGroundDesc: '茎秆粗壮高大快速拔节，宽大心形叶片呈斐波那契黄金螺旋（137.5°）排布；幼茎顶端白天追随太阳由东向西摆动。',
    underGroundDesc: '主根深扎至 90 cm，粗壮木质化，牢固锚定高大茎秆抗强风。',
    physiologicalPrinciple: '【向日性与生长素横向运输】：单侧光诱导生长素（IAA）在背光侧聚集，背光侧细胞伸长加快，驱动幼茎白天由东向西随太阳转动，夜间自动回摆。',
    realPhotoUrl: '/images/plants/sunflower_stage_1.jpg',
    realPhotoCaption: '真实微距实拍：高大挺拔、拔节旺盛生长的向日葵嫩绿壮年植株',
  },
  {
    stageIndex: 4,
    dayStart: 46,
    dayEnd: 60,
    bbchCode: 'BBCH 51-55 (R1-R3 现蕾期)',
    stageName: '星状幼蕾与总苞包被',
    emoji: '⭐',
    heightCm: 185,
    rootDepthCm: 120,
    leafCount: 26,
    aboveGroundDesc: '茎顶分生组织转化为生殖花序，顶端形成被数十层绿色叶状总苞片紧密包裹的星状花蕾（Star Bud）。',
    underGroundDesc: '根系对磷钾等矿质营养的吸收进入全生命周期最旺盛的高峰期。',
    physiologicalPrinciple: '【成花素与花芽分化】：叶片合成成花素（FT 蛋白）经韧皮部运抵顶端生长点，激活花发育核心基因，启动从营养生长向生殖生长的根本转变。',
    realPhotoUrl: '/images/plants/sunflower_stage_1.jpg',
    realPhotoCaption: '真实微距实拍：向日葵顶端星状幼蕾被层层绿色总苞片严密包裹',
  },
  {
    stageIndex: 5,
    dayStart: 61,
    dayEnd: 75,
    bbchCode: 'BBCH 61-69 (R4-R5 盛花期)',
    stageName: '盛花绽放与盘花螺旋吐蕊',
    emoji: '🌻',
    heightCm: 205,
    rootDepthCm: 140,
    leafCount: 30,
    aboveGroundDesc: '外围金黄色舌状花平展如太阳光芒，中心数千朵管状盘花自外向内逐层呈斐波那契双螺旋绽开，释放花粉吸引蜜蜂。',
    underGroundDesc: '根系每日蒸腾泵水量达 1-2 升，持续输送充盈水分维持花盘与花瓣饱满挺拔。',
    physiologicalPrinciple: '【头状花序与斐波那契排列】：1000-2000 朵管状花以 34/55 或 55/89 条对数螺旋线紧凑交织排布，最大化提升昆虫采蜜授粉效率。',
    realPhotoUrl: '/images/plants/sunflower_stage_2.jpg',
    realPhotoCaption: '真实微距实拍：朝阳下盛开的金色向日葵大花盘与密布花粉管状花',
  },
  {
    stageIndex: 6,
    dayStart: 76,
    dayEnd: 90,
    bbchCode: 'BBCH 71-85 (R6-R7 灌浆期)',
    stageName: '授粉受精与瘦果灌浆膨大',
    emoji: '🌰',
    heightCm: 210,
    rootDepthCm: 150,
    leafCount: 28,
    aboveGroundDesc: '外围舌状花逐渐枯萎脱落，受精子房迅速膨大发育成瘦果（葵花籽），种仁迅速积累油脂灌浆充实，花盘背面开始由绿转金黄。',
    underGroundDesc: '根系吸水减缓，植物体内全部糖分、氨基酸全速向花盘种子集聚转运。',
    physiologicalPrinciple: '【光合产物源-库流动】：叶片制造的蔗糖通过韧皮部全速转运至发育中的种子（库），合成储存甘油三酯与蛋白质。',
    realPhotoUrl: '/images/plants/sunflower_stage_2.jpg',
    realPhotoCaption: '真实微距实拍：向日葵花盘中心数千粒葵花籽受精灌浆逐渐饱满',
  },
  {
    stageIndex: 7,
    dayStart: 95,
    dayEnd: 110,
    bbchCode: 'BBCH 89-99 (R8-R9 成熟期)',
    stageName: '生理完全成熟与花盘低头丰收',
    emoji: '🌾',
    heightCm: 200,
    rootDepthCm: 150,
    leafCount: 20,
    aboveGroundDesc: '花盘背面转为深黄褐色，茎叶干枯自然衰老；满载数千粒成熟黑白条纹葵花籽的花盘因重力自然向下低垂，进入丰收采集期！',
    underGroundDesc: '根系完成生命使命，木质化休眠。',
    physiologicalPrinciple: '【成熟低头与种子休眠】：花盘重力低垂不仅保护成熟葵花籽免受雨水浸泡发霉，还能抵御鸟类采食；种皮木质化变硬，进入生理后熟休眠。',
    realPhotoUrl: '/images/plants/sunflower_stage_3.jpg',
    realPhotoCaption: '真实微距实拍：成熟花盘沉甸甸低垂，密密麻麻排列数千颗香脆葵花籽',
  },
];

export const TOMATO_BBCH_STAGES: BotanicalPhenologyStage[] = [
  {
    stageIndex: 0,
    dayStart: 0,
    dayEnd: 6,
    bbchCode: 'BBCH 00-05 (萌发期)',
    stageName: '种子吸水与胚根初萌',
    emoji: '🌰',
    heightCm: 0,
    rootDepthCm: 4,
    leafCount: 0,
    aboveGroundDesc: '幼嫩扁平的番茄小种子埋在肥沃透气的湿润泥土中吸水膨胀。',
    underGroundDesc: '胚根突破硬质种皮，垂直向下钻入泥土深处，初生根毛开始吸收微量水肥。',
    physiologicalPrinciple: '【吸胀与酶激活】：番茄种子在25℃适温下快速吸胀，激活赤霉素分解胚乳蛋白质与淀粉，驱动细胞分裂。',
    realPhotoUrl: '/images/plants/tomato_stage_0.jpg',
    realPhotoCaption: '真实微距实拍：番茄金黄小种子在湿润沃土中萌发洁白初生小胚根',
  },
  {
    stageIndex: 1,
    dayStart: 7,
    dayEnd: 12,
    bbchCode: 'BBCH 07-09 (出苗期)',
    stageName: '弯钩拱土与双子叶舒展',
    emoji: '🌱',
    heightCm: 5,
    rootDepthCm: 10,
    leafCount: 2,
    aboveGroundDesc: '幼茎呈弯钩形顶出土壤硬壳，展开两片窄长平滑的嫩绿子叶，茎表密布细腺毛。',
    underGroundDesc: '主根扎入10cm深，侧根网络呈辐射状初生。',
    physiologicalPrinciple: '【光形态建成】：阳光激活叶绿体合成叶绿素a/b，子叶迅速变绿启动自养光反应。',
    realPhotoUrl: '/images/plants/tomato_stage_0.jpg',
    realPhotoCaption: '真实微距实拍：番茄嫩芽拱土破壳，长出细密初生根系与幼茎',
  },
  {
    stageIndex: 2,
    dayStart: 13,
    dayEnd: 25,
    bbchCode: 'BBCH 10-15 (真叶期)',
    stageName: '羽状真叶与分枝初生',
    emoji: '🌿',
    heightCm: 20,
    rootDepthCm: 25,
    leafCount: 6,
    aboveGroundDesc: '生长点抽出具羽状深裂与腺毛的特征真叶，触碰散发浓郁清新的番茄青草香气。',
    underGroundDesc: '主根与大量一级侧根在土壤中交织成致密浅根网。',
    physiologicalPrinciple: '【气孔与腺毛防御】：叶面腺毛分泌萜类挥发物趋避害虫，气孔昼开夜闭调控蒸腾与碳同化。',
    realPhotoUrl: '/images/plants/tomato_stage_1.jpg',
    realPhotoCaption: '真实微距实拍：番茄幼苗拔节，舒展对生子叶与密布腺毛的深裂真叶',
  },
  {
    stageIndex: 3,
    dayStart: 26,
    dayEnd: 45,
    bbchCode: 'BBCH 21-29 (分枝拔节)',
    stageName: '侧枝繁茂与茎秆木质化',
    emoji: '🌲',
    heightCm: 60,
    rootDepthCm: 50,
    leafCount: 14,
    aboveGroundDesc: '植株分枝旺盛，主茎粗壮挺拔并开始木质化，深绿色复叶层层叠叠。',
    underGroundDesc: '须根系横向扩展直径达60cm，高效吸收氮磷钾养分。',
    physiologicalPrinciple: '【顶端优势与分生组织】：细胞分裂素促使腋芽萌发侧枝，叶片光合产能达到峰值。',
    realPhotoUrl: '/images/plants/tomato_stage_1.jpg',
    realPhotoCaption: '真实微距实拍：高大健壮木质化生长的番茄丛林植株与羽状深裂大复叶',
  },
  {
    stageIndex: 4,
    dayStart: 46,
    dayEnd: 55,
    bbchCode: 'BBCH 51-59 (现蕾开花)',
    stageName: '聚伞花序与金黄星花',
    emoji: '⭐',
    heightCm: 85,
    rootDepthCm: 70,
    leafCount: 20,
    aboveGroundDesc: '节间抽出总状聚伞花序，绽放出金黄色五角星形小花，花药紧密聚合成筒状包围柱头。',
    underGroundDesc: '根系对磷和硼元素吸收旺盛，保障花粉管顺利萌发。',
    physiologicalPrinciple: '【自花授粉与振翅传粉】：花药通过微风或蜜蜂高频振翅（Buzz Pollination）震落花粉完成受精。',
    realPhotoUrl: '/images/plants/tomato_stage_2.jpg',
    realPhotoCaption: '真实微距实拍：番茄藤蔓盛开金黄色五星小花与娇嫩花蕾',
  },
  {
    stageIndex: 5,
    dayStart: 56,
    dayEnd: 68,
    bbchCode: 'BBCH 71-75 (坐果幼果)',
    stageName: '授粉受精与幼绿果成串',
    emoji: '🍅',
    heightCm: 100,
    rootDepthCm: 85,
    leafCount: 26,
    aboveGroundDesc: '花瓣脱落，星形绿色花萼包裹着初生子房迅速膨大，结成一串串硬实晶莹的幼绿番茄。',
    underGroundDesc: '根系每日泵送大量水肥直供膨大幼果。',
    physiologicalPrinciple: '【生长素驱动果实膨大】：受精胚珠分泌高浓度生长素和赤霉素，刺激子房壁薄壁细胞高速分裂与吸水膨大。',
    realPhotoUrl: '/images/plants/tomato_stage_2.jpg',
    realPhotoCaption: '真实微距实拍：枝头五星小花下方挂着晶莹剔透的硬实幼绿小番茄',
  },
  {
    stageIndex: 6,
    dayStart: 69,
    dayEnd: 80,
    bbchCode: 'BBCH 81-85 (转色绿熟)',
    stageName: '绿熟转色与茄红素积累',
    emoji: '🍊',
    heightCm: 110,
    rootDepthCm: 90,
    leafCount: 28,
    aboveGroundDesc: '果实停止体积增大，表皮叶绿素逐渐降解，由青绿转为浅橙黄、粉红，内部胶状胎座发育饱满。',
    underGroundDesc: '根系维持适度水分，防止水分突变造成裂果。',
    physiologicalPrinciple: '【乙烯释放与色素转换】：呼吸跃变期释放内源乙烯，叶绿体转化为有色体，大量积累番茄红素与芳香挥发物。',
    realPhotoUrl: '/images/plants/tomato_stage_2.jpg',
    realPhotoCaption: '真实微距实拍：番茄藤蔓上小番茄由青绿转色积累番茄红素',
  },
  {
    stageIndex: 7,
    dayStart: 81,
    dayEnd: 90,
    bbchCode: 'BBCH 89-99 (成熟丰收)',
    stageName: '鲜红多汁完全成熟丰收',
    emoji: '🍅✨',
    heightCm: 110,
    rootDepthCm: 90,
    leafCount: 26,
    aboveGroundDesc: '一串串深红晶莹发亮的多汁番茄沉甸甸挂满枝头，果肉甜酸多汁，果皮薄韧，进入盛大采摘丰收！',
    underGroundDesc: '地下根系完成主产期养分供应使命。',
    physiologicalPrinciple: '【糖酸比与完全成熟】：果胶酶软化果壁细胞，果糖与葡萄糖占干重50%以上，抗氧化番茄红素达到巅峰。',
    realPhotoUrl: '/images/plants/tomato_stage_3.jpg',
    realPhotoCaption: '真实微距实拍：成串红亮诱人、挂满晨露的饱满多汁大番茄',
  },
];

export const STRAWBERRY_BBCH_STAGES: BotanicalPhenologyStage[] = [
  {
    stageIndex: 0,
    dayStart: 0,
    dayEnd: 5,
    bbchCode: 'BBCH 00-05 (萌动期)',
    stageName: '瘦果细种吸水萌发',
    emoji: '🌰',
    heightCm: 0,
    rootDepthCm: 3,
    leafCount: 0,
    aboveGroundDesc: '微小的草莓瘦果种子在湿润微酸性松软腐殖土中萌动。',
    underGroundDesc: '极细的初生胚根扎入浅层土壤。',
    physiologicalPrinciple: '【光需与吸胀】：草莓种子具需光萌发特性，微光与湿润促进吸胀萌发。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1509223197845-458d87318791?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：微小的草莓瘦果种子在湿润土壤中萌发',
  },
  {
    stageIndex: 1,
    dayStart: 6,
    dayEnd: 12,
    bbchCode: 'BBCH 07-09 (出苗期)',
    stageName: '初生嫩叶破土舒展',
    emoji: '🌱',
    heightCm: 3,
    rootDepthCm: 8,
    leafCount: 2,
    aboveGroundDesc: '纤细胚轴带出两片幼嫩的心形子叶。',
    underGroundDesc: '主根扎入8cm，初生须根开始分化。',
    physiologicalPrinciple: '【初生光合】：子叶受光合成叶绿素，开启光合营养自给。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：草莓幼苗顶出土壤展开翠绿双叶',
  },
  {
    stageIndex: 2,
    dayStart: 13,
    dayEnd: 25,
    bbchCode: 'BBCH 10-14 (真叶期)',
    stageName: '经典三出复叶展开',
    emoji: '🌿',
    heightCm: 12,
    rootDepthCm: 18,
    leafCount: 5,
    aboveGroundDesc: '短缩茎基部抽出具有明显锯齿边缘的典型三出复叶，表面覆有细柔茸毛。',
    underGroundDesc: '浅根须根系在表土20cm深度横向蔓延。',
    physiologicalPrinciple: '【三出复叶形态建成】：叶原基规则对称分裂形成三枚独立小叶，最大化受光面积。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1596720426673-e4e14290f0cc?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：短缩茎上舒展的标准三出锯齿边缘草莓绿叶',
  },
  {
    stageIndex: 3,
    dayStart: 26,
    dayEnd: 40,
    bbchCode: 'BBCH 21-29 (抽蔓期)',
    stageName: '匍匐走茎向四周延伸',
    emoji: '🌱',
    heightCm: 18,
    rootDepthCm: 28,
    leafCount: 10,
    aboveGroundDesc: '母株叶腋处伸出红褐色细长的匍匐茎（走茎），在节上萌生出具根系的新子株。',
    underGroundDesc: '地下根群繁密，吸收磷钾为花芽分化积蓄营养。',
    physiologicalPrinciple: '【营养克隆繁殖】：长日照与温暖诱导赤霉素释放，驱动匍匐茎节间高速伸长无性克隆。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1588693951525-6b94326554b7?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '田间实拍：草莓母株向四周延伸红色匍匐茎与健壮绿叶',
  },
  {
    stageIndex: 4,
    dayStart: 41,
    dayEnd: 50,
    bbchCode: 'BBCH 51-60 (现蕾开花)',
    stageName: '聚伞花序与纯白五瓣花',
    emoji: '🌸',
    heightCm: 22,
    rootDepthCm: 35,
    leafCount: 14,
    aboveGroundDesc: '短缩茎抽出多歧聚伞花序，盛开出洁白如雪的五瓣花，中心环绕着金黄雄蕊与隆起的绿色花托。',
    underGroundDesc: '根系对钙硼微量元素吸收活跃。',
    physiologicalPrinciple: '【花托与聚合心皮】：中心凸起的花托密布数百个离生心皮，吸引蜜蜂传粉受精。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：草莓株丛中盛开的洁白五瓣小花与金黄雄蕊花心',
  },
  {
    stageIndex: 5,
    dayStart: 51,
    dayEnd: 60,
    bbchCode: 'BBCH 71-75 (花托膨大)',
    stageName: '花托肉质膨大与绿瘦果',
    emoji: '🍓',
    heightCm: 24,
    rootDepthCm: 38,
    leafCount: 16,
    aboveGroundDesc: '白花瓣凋落，中央肉质花托迅速膨大呈锥形，表面密密麻麻镶嵌着嫩绿色的真果（小瘦果）。',
    underGroundDesc: '根系高效吸水，水分源源不断输往膨大花托。',
    physiologicalPrinciple: '【瘦果生长素刺激假果】：每个受精瘦果产生生长素，协同刺激邻近花托薄壁细胞分裂膨大。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1543528176-61b239494933?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：授粉后花托肉质膨大，表面密布青绿色小瘦果籽粒',
  },
  {
    stageIndex: 6,
    dayStart: 61,
    dayEnd: 70,
    bbchCode: 'BBCH 81-85 (转白转色)',
    stageName: '白熟期与甜香物质合成',
    emoji: '🤍',
    heightCm: 25,
    rootDepthCm: 40,
    leafCount: 16,
    aboveGroundDesc: '果实停止体积暴增，果皮由青绿褪色转为乳白色，随后自果尖向果基部泛出浅粉红晕。',
    underGroundDesc: '水分控制恰到好处，积蓄浓缩糖分。',
    physiologicalPrinciple: '【花青素积累与果实软化】：脱落酸（ABA）激活查尔酮合成酶，花青素苷大量合成，果胶分解使果肉柔嫩。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1596720426673-e4e14290f0cc?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：由乳白转为浅粉红的草莓白熟转色期',
  },
  {
    stageIndex: 7,
    dayStart: 71,
    dayEnd: 80,
    bbchCode: 'BBCH 89-99 (成熟丰收)',
    stageName: '红艳诱人鲜甜草莓丰收',
    emoji: '🍓✨',
    heightCm: 25,
    rootDepthCm: 40,
    leafCount: 15,
    aboveGroundDesc: '整颗草莓完全转为晶莹鲜红的红宝石色，金色瘦果均匀点缀，散发馥郁浓烈的香甜气息！',
    underGroundDesc: '根群健康稳定，为持续开花坐果储备体力。',
    physiologicalPrinciple: '【酯类芳香与维生素C】：合成数十种呋喃酮与酯类特征香气分子，可溶性固形物达12%以上。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：娇艳欲滴、晶莹剔透、香气扑鼻的成熟红草莓',
  },
];

export const OAK_BBCH_STAGES: BotanicalPhenologyStage[] = [
  {
    stageIndex: 0,
    dayStart: 0,
    dayEnd: 10,
    bbchCode: 'BBCH 00-05 (萌动期)',
    stageName: '坚硬橡果吸润裂壳',
    emoji: '🌰',
    heightCm: 0,
    rootDepthCm: 6,
    leafCount: 0,
    aboveGroundDesc: '坚硬褐色的橡果在森林厚重落叶腐殖土中裂开尖端。',
    underGroundDesc: '粗壮有力的白色胚根突破壳体，以强大穿透力直扎坚硬底土。',
    physiologicalPrinciple: '【主根优先策略】：橡树幼苗将子叶内全部淀粉优先供给胚根下扎，建立深水保障。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1509223197845-458d87318791?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：林地深处坚硬橡果裂开长出粗壮白色胚根',
  },
  {
    stageIndex: 1,
    dayStart: 11,
    dayEnd: 20,
    bbchCode: 'BBCH 07-09 (出苗期)',
    stageName: '强劲主根深钻与幼芽出土',
    emoji: '🌱',
    heightCm: 8,
    rootDepthCm: 22,
    leafCount: 2,
    aboveGroundDesc: '红褐色幼嫩木质茎破土而出，顶端展开最初两片微带红晕的幼叶。',
    underGroundDesc: '地下主根深度已达22cm，深达株高的三倍，牢牢锚定大地。',
    physiologicalPrinciple: '【向地性与生长素平衡】：根冠平衡石感受重力，生长素不对称沉降引导根尖垂直向下寻水。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：幼嫩橡树苗顶破腐殖土，展开初生波状红绿色嫩叶',
  },
  {
    stageIndex: 2,
    dayStart: 21,
    dayEnd: 40,
    bbchCode: 'BBCH 10-15 (真叶期)',
    stageName: '波浪羽裂革质叶展开',
    emoji: '🌿',
    heightCm: 30,
    rootDepthCm: 45,
    leafCount: 8,
    aboveGroundDesc: '抽出具经典圆钝波状深裂的革质橡树叶，叶脉清晰，表面覆有厚实角质层抗旱。',
    underGroundDesc: '粗壮主根深入45cm，并延伸出强力侧生锚定根。',
    physiologicalPrinciple: '【革质叶耐旱结构】：上表皮角质层显著增厚，海绵组织紧密排列，显著降低强烈日光下的水分散失。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：阳光下舒展的典型波浪形羽状深裂翠绿橡树叶',
  },
  {
    stageIndex: 3,
    dayStart: 41,
    dayEnd: 65,
    bbchCode: 'BBCH 31-39 (拔节木质化)',
    stageName: '主干木栓形成与年轮增粗',
    emoji: '🌲',
    heightCm: 120,
    rootDepthCm: 80,
    leafCount: 25,
    aboveGroundDesc: '主干挺拔坚硬，树皮形成致密木栓层与纵向裂纹，树冠分枝层层拓展。',
    underGroundDesc: '木质化大根深入80cm深土，与菌根真菌共生构建水网。',
    physiologicalPrinciple: '【维管形成层与年轮次生生长】：形成层向内分化次生木质部（坚硬木材），向外分化次生韧皮部，形成年轮。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '森林实拍：苍翠挺拔、树皮苍劲木质化的壮年橡树主干',
  },
  {
    stageIndex: 4,
    dayStart: 66,
    dayEnd: 80,
    bbchCode: 'BBCH 51-59 (现蕾花序)',
    stageName: '垂吊柔荑花序与风媒授粉',
    emoji: '🌾',
    heightCm: 180,
    rootDepthCm: 110,
    leafCount: 50,
    aboveGroundDesc: '春风吹拂下，枝头垂下一串串金黄色的雄性柔荑花序，释放亿万粒微小风媒花粉。',
    underGroundDesc: '强大的深层主根系稳稳支撑庞大树体抵御狂风。',
    physiologicalPrinciple: '【雌雄同株异花与风媒】：雄花序下垂随风摆动释放轻质花粉，雌花微小生于幼枝叶腋捕捉花粉。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：橡树枝头垂下一串串随风飘摇的金黄雄柔荑花序',
  },
  {
    stageIndex: 5,
    dayStart: 81,
    dayEnd: 95,
    bbchCode: 'BBCH 71-75 (幼果壳斗)',
    stageName: '小碗壳斗包裹幼嫩橡果',
    emoji: '🌰',
    heightCm: 220,
    rootDepthCm: 135,
    leafCount: 70,
    aboveGroundDesc: '雌花受精后基部总苞发育为布满鳞片的小碗状壳斗（Cupule），稳稳托住青绿色的幼小橡果。',
    underGroundDesc: '根系持续为树冠输送矿物质，滋养数千颗坚果发育。',
    physiologicalPrinciple: '【壳斗保护与单宁沉淀】：壳斗合成高浓度苦涩单宁酸，保护内部发育中的橡果免受昆虫与鸟类啃食。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：鳞片状木质小碗壳斗中托着的青嫩幼小橡果',
  },
  {
    stageIndex: 6,
    dayStart: 96,
    dayEnd: 110,
    bbchCode: 'BBCH 81-85 (坚果硬化)',
    stageName: '橡果木质化坚硬深褐',
    emoji: '🌰',
    heightCm: 240,
    rootDepthCm: 150,
    leafCount: 80,
    aboveGroundDesc: '橡果体积膨大饱满，果壳坚硬如骨，由青绿转为光泽油亮的深栗褐色，内部充满淀粉。',
    underGroundDesc: '深根系统深入岩层缝隙，吸收极深地下水。',
    physiologicalPrinciple: '【坚果营养储备】：胚乳淀粉与脂肪高度浓缩凝固，含水量降低进入休眠抗寒保护状态。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：枝头成熟坚硬、带有木质条纹的深褐色饱满橡果',
  },
  {
    stageIndex: 7,
    dayStart: 111,
    dayEnd: 120,
    bbchCode: 'BBCH 89-99 (成熟丰收)',
    stageName: '橡果落林与千年参天巨树',
    emoji: '🌲✨',
    heightCm: 250,
    rootDepthCm: 160,
    leafCount: 85,
    aboveGroundDesc: '饱满橡果自然脱落铺满森林地表，大橡树枝繁叶茂如同一座宏伟的绿色森林城堡！',
    underGroundDesc: '深广根网牢牢巩固水土，傲立千百年。',
    physiologicalPrinciple: '【动物传播与林火生态】：坚果掉落供松鼠埋藏传播，巨木构建森林生物多样性庇护所。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '森林全景：参天雄伟、遮天蔽日的古老百年大橡树',
  },
];

export const WATERMELON_BBCH_STAGES: BotanicalPhenologyStage[] = [
  {
    stageIndex: 0,
    dayStart: 0,
    dayEnd: 5,
    bbchCode: 'BBCH 00-05 (萌发期)',
    stageName: '黑亮瓜子吸水破壳',
    emoji: '🌰',
    heightCm: 0,
    rootDepthCm: 5,
    leafCount: 0,
    aboveGroundDesc: '黑色坚硬西瓜子在沙质温润土壤中吸水苏醒。',
    underGroundDesc: '白色胚根突破坚硬种脐，垂直向下扎根。',
    physiologicalPrinciple: '【沙壤吸胀】：在28-30℃高温与透气沙土中，瓜子吸水激活脂肪酶与淀粉酶。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1509223197845-458d87318791?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：黑亮饱满的西瓜子在湿润沙土中吸水萌动',
  },
  {
    stageIndex: 1,
    dayStart: 6,
    dayEnd: 12,
    bbchCode: 'BBCH 07-09 (出苗期)',
    stageName: '肥厚椭圆子叶破土',
    emoji: '🌱',
    heightCm: 4,
    rootDepthCm: 14,
    leafCount: 2,
    aboveGroundDesc: '下胚轴伸展将种壳脱落，展开两片肥厚浓绿的大椭圆子叶。',
    underGroundDesc: '主根深扎14cm，侧根开始横向扩散。',
    physiologicalPrinciple: '【子叶储能释放】：肥厚子叶内丰富的脂肪转化为糖分，供应生长点分化。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：破土而出的西瓜幼芽与肥厚嫩绿双子叶',
  },
  {
    stageIndex: 2,
    dayStart: 13,
    dayEnd: 25,
    bbchCode: 'BBCH 10-15 (真叶期)',
    stageName: '深裂掌状真叶与卷须',
    emoji: '🌿',
    heightCm: 12,
    rootDepthCm: 30,
    leafCount: 6,
    aboveGroundDesc: '抽出深羽状深裂的特征真叶，叶腋处生出灵敏卷曲的螺旋状攀缘卷须（Tendrils）。',
    underGroundDesc: '主根粗壮深扎，一级侧根网络覆盖表层沙土。',
    physiologicalPrinciple: '【卷须向触性】：卷须接触障碍物后内侧细胞收缩形成螺旋弹簧，牢固固定匍匐藤蔓。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：西瓜藤蔓抽出深裂掌状真叶与灵动卷须',
  },
  {
    stageIndex: 3,
    dayStart: 26,
    dayEnd: 45,
    bbchCode: 'BBCH 21-29 (抽蔓期)',
    stageName: '主侧蔓匍匐伸展铺地',
    emoji: '🌱',
    heightCm: 15,
    rootDepthCm: 60,
    leafCount: 18,
    aboveGroundDesc: '主蔓与多条侧蔓贴地飞速延伸长达数米，密生刚毛，叶片宽大如一把把绿伞铺满沙地。',
    underGroundDesc: '匍匐深广的吸水根系横向扩展超1米，吸纳广阔沙层水汽。',
    physiologicalPrinciple: '【匍匐地被与光能拦截】：藤蔓平铺地面最大化接收无遮挡直射阳光，节节萌生不定根增强吸水。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '田间实拍：西瓜藤蔓在沙土地上繁茂匍匐伸展',
  },
  {
    stageIndex: 4,
    dayStart: 46,
    dayEnd: 55,
    bbchCode: 'BBCH 51-60 (开花期)',
    stageName: '雌雄同株黄色漏斗花',
    emoji: '🌼',
    heightCm: 18,
    rootDepthCm: 75,
    leafCount: 24,
    aboveGroundDesc: '藤蔓上绽放黄色漏斗状花朵，雌花子房基部带有一颗毛茸茸的迷你小瓜纽。',
    underGroundDesc: '根系对磷钾肥料吸收达到最高峰。',
    physiologicalPrinciple: '【单性花与虫媒授粉】：雌雄同株单性花依赖蜜蜂清晨采蜜传粉，子房柱头分泌黏液促花粉管生长。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：西瓜藤上盛开的黄色花朵与带毛幼瓜纽',
  },
  {
    stageIndex: 5,
    dayStart: 56,
    dayEnd: 70,
    bbchCode: 'BBCH 71-75 (幼瓜膨大)',
    stageName: '蜜蜂授粉与幼瓜急速膨大',
    emoji: '🍉',
    heightCm: 20,
    rootDepthCm: 90,
    leafCount: 28,
    aboveGroundDesc: '受精幼瓜每天以惊人速度膨大，褪去表皮密毛，显现出翠绿明晰的深浅波浪条纹。',
    underGroundDesc: '根系每日泵送数升甘霖直通庞大果实。',
    physiologicalPrinciple: '【大果型细胞膨大机制】：果肉薄壁细胞液泡体积暴增数十倍，大量蓄积水分与有机酸。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：沙地上快速膨大的带深浅条纹翠绿幼西瓜',
  },
  {
    stageIndex: 6,
    dayStart: 71,
    dayEnd: 85,
    bbchCode: 'BBCH 81-85 (糖分转化)',
    stageName: '果肉转红与糖分高密度积聚',
    emoji: '🍉',
    heightCm: 22,
    rootDepthCm: 100,
    leafCount: 30,
    aboveGroundDesc: '瓜皮光滑坚韧呈深墨绿虎皮花纹，瓜瓤由浅白转为粉红再到鲜红，中心含糖量飞速飙升。',
    underGroundDesc: '昼夜温差大促使光合产物全速向瓜瓤转化。',
    physiologicalPrinciple: '【蔗糖转运与茄红素积累】：番茄红素赋予瓜瓤鲜红色，转化酶将蔗糖分解为高甜度果糖与葡萄糖。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1589533610925-1cffc309ebaa?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '田间实拍：阳光下个头硕大、虎皮纹路清晰的碧绿大西瓜',
  },
  {
    stageIndex: 7,
    dayStart: 86,
    dayEnd: 100,
    bbchCode: 'BBCH 89-99 (完全成熟)',
    stageName: '瓜蒂卷须干枯与脆甜大瓜丰收',
    emoji: '🍉✨',
    heightCm: 22,
    rootDepthCm: 100,
    leafCount: 28,
    aboveGroundDesc: '瓜纽卷须干枯发黄，瓜脐深凹，轻敲发出清脆“咚咚”声，沙瓤多汁、清甜解渴的大西瓜成熟！',
    underGroundDesc: '根系完成全季供水供肥使命。',
    physiologicalPrinciple: '【含水量92%与清甜丰收】：细胞完全充满富含氨基酸、维生素与果糖的甘甜汁水，达到最佳赏味期。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1563114773-84221bd62daa?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '特写实拍：切开后鲜红诱人、黑籽点缀、汁水丰盈的脆甜西瓜',
  },
];

export const CORN_BBCH_STAGES: BotanicalPhenologyStage[] = [
  {
    stageIndex: 0,
    dayStart: 0,
    dayEnd: 5,
    bbchCode: 'BBCH 00-05 (萌动期)',
    stageName: '坚硬玉米籽粒破壳',
    emoji: '🌰',
    heightCm: 0,
    rootDepthCm: 5,
    leafCount: 0,
    aboveGroundDesc: '金黄扁平的玉米种子在湿润温暖土壤中吸水萌动。',
    underGroundDesc: '初生胚根突破种皮向下扎入深层土壤。',
    physiologicalPrinciple: '【盾片营养转运】：单子叶植物胚中盾片吸收胚乳淀粉分解物，供给胚根生长。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1509223197845-458d87318791?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：金黄饱满的玉米籽粒在土壤中吸水萌发初生胚根',
  },
  {
    stageIndex: 1,
    dayStart: 6,
    dayEnd: 12,
    bbchCode: 'BBCH 07-09 (出苗期)',
    stageName: '胚芽鞘破土与第一叶展开',
    emoji: '🌱',
    heightCm: 8,
    rootDepthCm: 15,
    leafCount: 2,
    aboveGroundDesc: '硬挺如矛的针状胚芽鞘顶破土层，抽出第一片具平行叶脉的宽带形翠绿小叶。',
    underGroundDesc: '主根深扎15cm，节根开始萌生。',
    physiologicalPrinciple: '【胚芽鞘保护出土】：坚韧的胚芽鞘保护内部娇嫩真叶顺利穿越土壤硬壳，出土后裂开。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：玉米胚芽鞘破土而出展开青翠挺拔第一叶',
  },
  {
    stageIndex: 2,
    dayStart: 13,
    dayEnd: 25,
    bbchCode: 'BBCH 11-15 (苗期壮苗)',
    stageName: '互生波浪长叶展开',
    emoji: '🌿',
    heightCm: 35,
    rootDepthCm: 35,
    leafCount: 6,
    aboveGroundDesc: '茎秆直立，互生抽出宽大长带状平行脉长叶，叶缘微呈波浪状。',
    underGroundDesc: '地下初生根群与次生节根群交织成强力水肥吸收网。',
    physiologicalPrinciple: '【C4高光效光合作用】：具有典型的花环结构（Kranz Anatomy），PEP羧化酶高效捕获低浓度CO₂。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '田间实拍：玉米幼苗互生舒展带有清晰平行叶脉的宽带状绿叶',
  },
  {
    stageIndex: 3,
    dayStart: 26,
    dayEnd: 45,
    bbchCode: 'BBCH 31-39 (拔节期)',
    stageName: '粗壮拔节与轮生气生支持根',
    emoji: '🌲',
    heightCm: 120,
    rootDepthCm: 70,
    leafCount: 12,
    aboveGroundDesc: '茎秆粗壮高耸快速拔节，茎基部近地面数节长出轮生红褐色的坚韧气生支柱根（Brace Roots）。',
    underGroundDesc: '地下根群深入70cm，支持根直插土壤强化抗倒伏。',
    physiologicalPrinciple: '【气生支柱根力学支持】：气生根木质化程度极高，兼具强力机械支撑与额外吸收地表水功能。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实特写：高大粗壮拔节生长的玉米茎秆与基部轮生气生支柱根',
  },
  {
    stageIndex: 4,
    dayStart: 46,
    dayEnd: 60,
    bbchCode: 'BBCH 51-59 (抽雄期)',
    stageName: '顶端抽出羽状雄穗（天花）',
    emoji: '🌾',
    heightCm: 190,
    rootDepthCm: 95,
    leafCount: 16,
    aboveGroundDesc: '植株顶端抽出金黄色的分枝圆锥花序（雄花天花），在风中摇曳散落数百万粒花粉。',
    underGroundDesc: '根系吸收水肥进入全盛期。',
    physiologicalPrinciple: '【风媒抽雄】：雄花高居植株顶端，借助高空气流将花粉远距离散播至下方雌花花丝。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '田间特写：高高耸立在玉米植株顶端的金黄色羽状分枝雄穗',
  },
  {
    stageIndex: 5,
    dayStart: 61,
    dayEnd: 70,
    bbchCode: 'BBCH 61-69 (吐丝授粉)',
    stageName: '雌穗吐出红粉花丝（玉米须）',
    emoji: '🌽',
    heightCm: 210,
    rootDepthCm: 110,
    leafCount: 18,
    aboveGroundDesc: '中层叶腋处结出雌穗，顶端吐出一大束粉红娇嫩的修长花丝（玉米须），每根花丝对应一粒胚珠。',
    underGroundDesc: '持续保持充足水分以防花丝干枯影响结实。',
    physiologicalPrinciple: '【花丝受粉与双受精】：花粉落于黏性花丝上迅速萌发花粉管，直达子房胚珠完成双受精。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：玉米棒顶端吐出娇嫩粉红的长长玉米须花丝',
  },
  {
    stageIndex: 6,
    dayStart: 71,
    dayEnd: 85,
    bbchCode: 'BBCH 71-85 (灌浆乳熟)',
    stageName: '籽粒灌浆乳熟与糖分积聚',
    emoji: '🌽',
    heightCm: 210,
    rootDepthCm: 115,
    leafCount: 16,
    aboveGroundDesc: '花丝萎蔫变褐，玉米棒内整齐排列的数百颗籽粒吸水膨大，颗粒饱满充满清甜乳白色汁液。',
    underGroundDesc: '光合产物全速向玉米穗转运。',
    physiologicalPrinciple: '【胚乳淀粉合成】：蔗糖合成酶将糖分转入胚乳细胞，聚合为支链淀粉与甜玉米特征水溶性多糖。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：剥开苞叶露出一排排饱满透亮乳熟灌浆的黄色玉米粒',
  },
  {
    stageIndex: 7,
    dayStart: 86,
    dayEnd: 100,
    bbchCode: 'BBCH 89-99 (成熟丰收)',
    stageName: '苞叶干黄与金黄玉米棒丰收',
    emoji: '🌽✨',
    heightCm: 200,
    rootDepthCm: 115,
    leafCount: 14,
    aboveGroundDesc: '外层苞叶干枯变为米黄色纸质，籽粒硬化为金光闪闪的黄金玉米棒，颗粒饱满香甜，丰收开采！',
    underGroundDesc: '根系完成全季养分供应使命。',
    physiologicalPrinciple: '【完全脱水休眠与硬质胚乳】：籽粒含水量降至14%以下，蛋白质与淀粉致密排列进入休眠。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '田间实拍：颗粒金黄璀璨、紧密排列、香甜软糯的熟透金黄玉米',
  },
];

export const LOTUS_BBCH_STAGES: BotanicalPhenologyStage[] = [
  {
    stageIndex: 0,
    dayStart: 0,
    dayEnd: 7,
    bbchCode: 'BBCH 00-05 (萌动期)',
    stageName: '水底淤泥藕鞭顶芽萌动',
    emoji: '🌰',
    heightCm: 0,
    rootDepthCm: 8,
    leafCount: 0,
    aboveGroundDesc: '水底深厚黑色沃泥中，休眠的肥大莲藕顶芽萌发，伸出嫩黄色的地下茎（藕鞭）。',
    underGroundDesc: '藕节处萌发一圈圈白色须状不定根，深入淤泥吸纳有机质。',
    physiologicalPrinciple: '【水下厌氧耐受与通气】：莲藕体内拥有高度发达的通气组织孔道，在缺氧水底淤泥中畅通呼吸。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1509223197845-458d87318791?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '水下微距：淤泥深处洁白肥嫩的莲藕顶芽萌发生长',
  },
  {
    stageIndex: 1,
    dayStart: 8,
    dayEnd: 16,
    bbchCode: 'BBCH 07-09 (浮叶期)',
    stageName: '纤细长柄带钱叶浮出水面',
    emoji: '🌱',
    heightCm: 10,
    rootDepthCm: 15,
    leafCount: 2,
    aboveGroundDesc: '细长带刺的叶柄穿过水层，在水面上平平展开第一批硬币大小的嫩绿圆形浮水叶（钱叶）。',
    underGroundDesc: '水下藕鞭在泥中横向穿行分枝。',
    physiologicalPrinciple: '【上表皮气孔与浮水适应】：浮水叶气孔全部生于叶面上表皮，下表皮紧贴水面防止水淹窒息。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '水面实拍：静静漂浮在清澈水面上的小巧翠绿圆形钱叶',
  },
  {
    stageIndex: 2,
    dayStart: 17,
    dayEnd: 30,
    bbchCode: 'BBCH 10-15 (立叶期)',
    stageName: '挺拔粗壮大立叶破水高擎',
    emoji: '🌿',
    heightCm: 45,
    rootDepthCm: 25,
    leafCount: 5,
    aboveGroundDesc: '粗壮多刺的叶柄如长枪般高高挺出水面数十厘米，展开巨大的深绿色盾形荷叶，滴水成珠（荷叶效应）。',
    underGroundDesc: '藕节不定根深扎淤泥，通气组织不断加粗。',
    physiologicalPrinciple: '【荷叶超疏水纳米效应】：叶表面微米-纳米双重乳突与疏水蜡质结晶，使水滴形成球状滚落并带走灰尘。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：挺拔出水的巨大碧绿荷叶上水珠晶莹剔透流转',
  },
  {
    stageIndex: 3,
    dayStart: 31,
    dayEnd: 45,
    bbchCode: 'BBCH 31-39 (走茎繁茂)',
    stageName: '水下藕节分枝与通气孔道',
    emoji: '🌲',
    heightCm: 80,
    rootDepthCm: 35,
    leafCount: 9,
    aboveGroundDesc: '满塘荷叶层层叠叠如碧绿伞盖，叶柄内部贯穿4-8条通气大孔道直通水下地下茎。',
    underGroundDesc: '水底藕鞭横向分枝成复杂地下网络。',
    physiologicalPrinciple: '【对流换气机制】：日光照热荷叶驱动热渗透效应，将新鲜空气从立叶强行压入水底莲藕。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '荷塘实拍：接天莲叶无穷碧、层层挺拔高擎的盛夏荷叶丛',
  },
  {
    stageIndex: 4,
    dayStart: 46,
    dayEnd: 55,
    bbchCode: 'BBCH 51-59 (现蕾期)',
    stageName: '尖尖角粉白花蕾破水挺立',
    emoji: '🌸',
    heightCm: 110,
    rootDepthCm: 40,
    leafCount: 12,
    aboveGroundDesc: '“小荷才露尖尖角”，一枝修长花梗托起粉白相间的饱满花苞高高凌波挺出水面。',
    underGroundDesc: '水底根系吸收大量磷钾养分供花蕾发育。',
    physiologicalPrinciple: '【光周期与成花反应】：夏至长日照与温暖水温激活花分生组织，花被片层层紧扣防雨水侵入。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：清晨水露中含苞待放的粉尖白瓣娇嫩荷花蕾',
  },
  {
    stageIndex: 5,
    dayStart: 56,
    dayEnd: 68,
    bbchCode: 'BBCH 61-69 (盛花期)',
    stageName: '圣洁粉白荷花晨曦绽放',
    emoji: '🪷',
    heightCm: 125,
    rootDepthCm: 45,
    leafCount: 14,
    aboveGroundDesc: '重叠的花瓣在晨曦中优雅舒展，中央露出金黄雄蕊与嫩黄漏斗状初生小莲蓬，清香幽雅四溢。',
    underGroundDesc: '地下藕鞭开始蓄积营养准备后期膨大。',
    physiologicalPrinciple: '【花温自调控与香气挥发】：花托产热维持在30℃恒温，挥发1,4-二甲氧基苯等香气吸引甲虫采蜜传粉。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1606293926075-69a00dbfde81?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：朝阳下盛开的圣洁粉红荷花与金黄雄蕊花芯',
  },
  {
    stageIndex: 6,
    dayStart: 69,
    dayEnd: 80,
    bbchCode: 'BBCH 71-75 (莲蓬结子)',
    stageName: '花瓣脱落与翠绿莲蓬孕子',
    emoji: '🪷',
    heightCm: 120,
    rootDepthCm: 45,
    leafCount: 12,
    aboveGroundDesc: '花瓣自然飘落，海绵质花托发育为翠绿色的倒圆锥形莲蓬，孔洞中数十颗小莲子受精灌浆。',
    underGroundDesc: '水下藕鞭节间迅速停止伸长，开始变粗膨大。',
    physiologicalPrinciple: '【果实与地下茎双库竞争】：地上莲蓬灌浆固化，地下藕节同时高速积累高分子支链淀粉。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1596720426673-e4e14290f0cc?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：花瓣褪去后高高挺立的翠绿倒圆锥形莲蓬与莲子',
  },
  {
    stageIndex: 7,
    dayStart: 81,
    dayEnd: 90,
    bbchCode: 'BBCH 89-99 (成熟丰收)',
    stageName: '香甜莲子与肥嫩多节大莲藕',
    emoji: '🪷✨',
    heightCm: 110,
    rootDepthCm: 45,
    leafCount: 10,
    aboveGroundDesc: '莲蓬变褐干硬，莲子完全成熟坚硬；水下淤泥中膨大出三至四节雪白肥嫩、清甜爽脆的大莲藕！',
    underGroundDesc: '肥大莲藕进入休眠越冬状态，储藏极其丰富的淀粉糖分。',
    physiologicalPrinciple: '【莲子千年寿命与休眠机制】：莲子具致密坚硬果皮与酚类抗氧化层，可在泥中休眠上千年依然能发芽！',
    realPhotoUrl: 'https://images.unsplash.com/photo-1606293926075-69a00dbfde81?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '实拍特写：成熟干褐莲蓬露出的清香莲子与水下挖出的肥美鲜嫩白莲藕',
  },
];

export const CACTUS_BBCH_STAGES: BotanicalPhenologyStage[] = [
  {
    stageIndex: 0,
    dayStart: 0,
    dayEnd: 7,
    bbchCode: 'BBCH 00-05 (萌动期)',
    stageName: '微型黑种吸水萌发',
    emoji: '🌰',
    heightCm: 0,
    rootDepthCm: 2,
    leafCount: 0,
    aboveGroundDesc: '细如沙粒的黑色坚硬仙人掌种子在透气干燥的粗砂碎石中吸纳微量水分。',
    underGroundDesc: '极短初生胚根破壳扎入表层砂石。',
    physiologicalPrinciple: '【荒漠机会主义萌发】：种子含有发芽抑制剂，仅在罕见充分降雨淋洗后才迅速萌发。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1509223197845-458d87318791?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：干燥沙石颗粒中吸水苏醒的微型仙人掌细种',
  },
  {
    stageIndex: 1,
    dayStart: 8,
    dayEnd: 18,
    bbchCode: 'BBCH 07-09 (出苗期)',
    stageName: '绿色球状肉质胚轴',
    emoji: '🌱',
    heightCm: 2,
    rootDepthCm: 6,
    leafCount: 0,
    aboveGroundDesc: '破土长出一个肉乎乎、圆鼓鼓的绿色微型小肉球（肉质胚轴），顶部出现微小绒毛刺座。',
    underGroundDesc: '浅层毛细根向四周地表辐射延伸。',
    physiologicalPrinciple: '【肉质化与低蒸腾比】：幼苗呈球体形态，拥有最小的表面积与体积比，最大程度锁住体内水分。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：萌发出圆嘟嘟绿色肉质小球与初生白绒毛的幼苗',
  },
  {
    stageIndex: 2,
    dayStart: 19,
    dayEnd: 35,
    bbchCode: 'BBCH 10-15 (刺座分化)',
    stageName: '刺座分化与防蒸发硬刺',
    emoji: '🌵',
    heightCm: 8,
    rootDepthCm: 12,
    leafCount: 0,
    aboveGroundDesc: '肉质茎表面分化出规则排列的刺座（Areoles），生长出尖锐坚硬的辐射状硬刺。',
    underGroundDesc: '地表浅层根系扩展成广袤吸水网。',
    physiologicalPrinciple: '【叶退化变刺与冷凝水收集】：叶片完全特化为尖刺减少蒸腾，硬刺尖端能在清晨将荒漠雾气冷凝为水珠滴落根部。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1509223197845-458d87318791?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：仙人掌肉茎表面规则密布的白色刺座与锋利尖刺',
  },
  {
    stageIndex: 3,
    dayStart: 36,
    dayEnd: 60,
    bbchCode: 'BBCH 31-39 (肉质茎储水)',
    stageName: '肉质茎肥厚膨大储水',
    emoji: '🌵',
    heightCm: 25,
    rootDepthCm: 20,
    leafCount: 0,
    aboveGroundDesc: '形成具多道纵向波浪折叠棱沟的肥厚肉质茎，内部储藏数公斤纯净甘泉，表面覆厚蜡质层。',
    underGroundDesc: '广袤浅根网可在暴雨落下30分钟内吸饱地表水分。',
    physiologicalPrinciple: '【景天酸代谢（CAM光合）】：夜晚凉爽时开放气孔吸入CO₂固定为苹果酸储存，白天关闭气孔借助阳光合成糖分，滴水不漏！',
    realPhotoUrl: 'https://images.unsplash.com/photo-1508873696983-2df57046475a?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '沙漠实拍：具有深邃折叠波浪储水棱沟、肥厚饱满的绿色仙人掌茎',
  },
  {
    stageIndex: 4,
    dayStart: 61,
    dayEnd: 80,
    bbchCode: 'BBCH 51-59 (现蕾期)',
    stageName: '肉茎顶端孕育鲜艳花苞',
    emoji: '🌸',
    heightCm: 45,
    rootDepthCm: 28,
    leafCount: 0,
    aboveGroundDesc: '在烈日炙烤的肉茎顶部刺座旁，奇迹般钻出紧实饱满、被鳞片包被的硕大娇艳花苞。',
    underGroundDesc: '根系高效调配水分直供花蕾发育。',
    physiologicalPrinciple: '【干旱休眠打破与生殖触发】：极度温差诱导内源激素重组，驱动顶部刺座生长点转变为花芽。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：仙人掌刺座旁破茧而出的火红鲜艳娇嫩大花苞',
  },
  {
    stageIndex: 5,
    dayStart: 81,
    dayEnd: 92,
    bbchCode: 'BBCH 61-69 (盛花期)',
    stageName: '绚丽火红沙漠大花绽放',
    emoji: '🌺',
    heightCm: 55,
    rootDepthCm: 32,
    leafCount: 0,
    aboveGroundDesc: '盛开出如丝绸般轻盈娇艳的火红/金黄色巨大花朵，多层花瓣重叠，中心数十枚金黄雄蕊包围翠绿柱头。',
    underGroundDesc: '根系维持极高渗透压保证花瓣挺拔水灵。',
    physiologicalPrinciple: '【短命花与荒漠传粉】：花朵通常仅盛开1-2天，释放浓烈芳香与丰沛花蜜，吸引沙漠蜜蜂和夜行天蛾飞速传粉。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实特写：荒漠烈日下傲然盛开的丝绸质感艳丽火红仙人掌大花',
  },
  {
    stageIndex: 6,
    dayStart: 93,
    dayEnd: 105,
    bbchCode: 'BBCH 71-75 (浆果膨大)',
    stageName: '多肉浆果仙人掌果膨大',
    emoji: '🌵',
    heightCm: 55,
    rootDepthCm: 34,
    leafCount: 0,
    aboveGroundDesc: '花冠萎蔫脱落，下部子房迅速发育为椭圆肉质的浆果（仙人掌果），表皮由青绿逐渐泛出紫红。',
    underGroundDesc: '母体将有机物和花青素注入果实。',
    physiologicalPrinciple: '【浆果种子保护】：果肉富含黏液多糖与甜菜红素，既保护种子抗干旱，又吸引鸟类啄食散播种子。',
    realPhotoUrl: 'https://images.unsplash.com/photo-1508873696983-2df57046475a?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '真实微距：仙人掌顶端结出的多汁饱满红紫色仙人掌浆果',
  },
  {
    stageIndex: 7,
    dayStart: 106,
    dayEnd: 120,
    bbchCode: 'BBCH 89-99 (成熟丰收)',
    stageName: '深紫仙人掌果成熟与绿洲卫士',
    emoji: '🌵✨',
    heightCm: 55,
    rootDepthCm: 35,
    leafCount: 0,
    aboveGroundDesc: '仙人掌果完全转为浓郁深紫红色，果肉甜美多汁清凉解渴；仙人掌树粗壮坚挺傲立戈壁千年！',
    underGroundDesc: '广袤浅根系终年守护沙漠水土。',
    physiologicalPrinciple: '【荒漠绿洲生命庇护】：蓄积数百公斤清泉与高能抗氧化物，是沙漠生态系统中无可替代的生命之树！',
    realPhotoUrl: 'https://images.unsplash.com/photo-1508873696983-2df57046475a?w=800&auto=format&fit=crop&q=80',
    realPhotoCaption: '荒漠全景：烈日戈壁中结满红熟仙人掌果、雄伟苍劲的千年仙人掌树',
  },
];

export const PLANT_PHENOLOGY_MAP: Record<string, BotanicalPhenologyStage[]> = {
  sunflower: SUNFLOWER_BBCH_STAGES,
  tomato: TOMATO_BBCH_STAGES,
  strawberry: STRAWBERRY_BBCH_STAGES,
  oak: OAK_BBCH_STAGES,
  watermelon: WATERMELON_BBCH_STAGES,
  corn: CORN_BBCH_STAGES,
  lotus: LOTUS_BBCH_STAGES,
  cactus: CACTUS_BBCH_STAGES,
};

// ── 植物物种与生命周期 ──
export type PlantStage = 0 | 1 | 2 | 3; // 兼容四阶段简版

export interface PlantStageInfo {
  stageName: string;
  emoji: string;
  desc: string;
  growthFactor: number;
  realPhotoUrl: string;
  realPhotoCaption: string;
}

export interface PlantSpec {
  id: string;
  name: string;
  emoji: string;
  themeColor: string;
  bgGradient: string;
  funFact: string;
  rootType: string;
  stages: [PlantStageInfo, PlantStageInfo, PlantStageInfo, PlantStageInfo];
}

/** 📸 真实自然生长微距实拍照片卡片 */
export function RealPhotoDisplayCard({
  url,
  caption,
  plantId,
  stage,
  className = '',
}: {
  url: string;
  caption: string;
  plantId: string;
  stage: PlantStage;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasValidUrl = Boolean(url && url.trim().length > 0 && !imgError);

  return (
    <div className={`relative rounded-3xl overflow-hidden shadow-lg border-3 border-emerald-400/50 bg-slate-950 group flex flex-col items-center justify-center min-h-[220px] ${className}`}>
      {hasValidUrl ? (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 animate-pulse text-emerald-400 text-xs font-black z-10">
              📸 正在加载真实微距自然照片...
            </div>
          )}
          <img
            src={url}
            alt={caption}
            onLoad={() => setIsLoaded(true)}
            onError={() => setImgError(true)}
            className={`w-full h-56 object-cover transition-transform duration-700 group-hover:scale-105 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-3 text-left z-20">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black mr-1.5 shadow-sm">
              📸 真实生长实拍
            </span>
            <p className="text-xs font-black text-white leading-tight mt-1 drop-shadow">
              {caption}
            </p>
          </div>
        </>
      ) : (
        <div className="p-4 flex flex-col items-center justify-between bg-gradient-to-b from-emerald-950/60 to-slate-950 w-full min-h-[224px] text-white">
          <div className="w-full flex items-center justify-between pb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
              🌿 科学矢量物候图解
            </span>
            <span className="text-xs text-slate-400 font-mono">HIGH-RES ANATOMY</span>
          </div>
          <div className="py-2 flex items-center justify-center">
            <PlantGraphicIllustration plantId={plantId} stage={stage} className="scale-110 drop-shadow-md" />
          </div>
          <div className="w-full bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-2.5 text-left">
            <p className="text-xs font-bold text-emerald-200 leading-tight">
              {caption || '精细解剖物候图解展示'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** 🔬 地上与地下剖面连续延时生长画板 (数学锚定 · 零错位 · 8 大植物真实高精解剖形态) */
export function BotanicalCrossSectionCanvas({
  plantId = 'sunflower',
  day,
  isNight = false,
  className = '',
}: {
  plantId?: string;
  day: number;
  isNight?: boolean;
  className?: string;
}) {
  // ── 平滑连续生长时间轴物理量计算 ──
  const stemHeight =
    day <= 5
      ? 0
      : day <= 10
      ? 3 + ((day - 5) / 5) * 12
      : day <= 45
      ? 15 + ((day - 10) / 35) * 50
      : day <= 80
      ? 65 + ((day - 45) / 35) * 35
      : 100;

  const rootDepth =
    day <= 5
      ? (day / 5) * 12
      : day <= 25
      ? 12 + ((day - 5) / 20) * 28
      : day <= 80
      ? 40 + ((day - 25) / 55) * 25
      : 65;

  const leafScale = Math.min(1, Math.max(0, (day - 6) / 35));
  const sunX = 30 + ((day * 2.5) % 240);

  const isSprout = day > 0 && day <= 10;
  const isGrowing = day >= 11;
  const isBudding = day >= 46 && day <= 60;
  const isBlooming = day >= 61 && day <= 80;
  const isMature = day >= 81;

  return (
    <div className={`relative rounded-3xl overflow-hidden shadow-inner border-2 border-emerald-500/40 bg-gradient-to-b ${isNight ? 'from-slate-950 via-indigo-950 to-amber-950' : 'from-sky-100 via-sky-50 to-amber-950'} ${className}`}>
      <svg viewBox="0 0 320 280" className="w-full h-64 select-none">
        <defs>
          {/* 土壤层渐变 */}
          <linearGradient id="soilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={plantId === 'cactus' ? '#d97706' : plantId === 'lotus' ? '#1e293b' : '#78350f'} />
            <stop offset="40%" stopColor={plantId === 'cactus' ? '#b45309' : plantId === 'lotus' ? '#0f172a' : '#582403'} />
            <stop offset="100%" stopColor={plantId === 'cactus' ? '#78350f' : plantId === 'lotus' ? '#020617' : '#291102'} />
          </linearGradient>
          {/* 天空渐变 */}
          <linearGradient id="skyGradDay" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="60%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#f0fdf4" />
          </linearGradient>
          {/* 荷花专属水层渐变 */}
          <linearGradient id="waterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.85" />
          </linearGradient>
          {/* 太阳光晕 */}
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
            <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          {/* 绿叶渐变 */}
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          {/* 番茄红果高光渐变 */}
          <radialGradient id="tomatoShine" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="40%" stopColor="#ef4444" />
            <stop offset="90%" stopColor="#991b1b" />
          </radialGradient>
          {/* 草莓心形高光渐变 */}
          <radialGradient id="strawberryShine" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fecdd3" />
            <stop offset="45%" stopColor="#f43f5e" />
            <stop offset="90%" stopColor="#881337" />
          </radialGradient>
        </defs>

        {/* ── 1. 天空背景与环境大气 (y: 0 ~ 170) ── */}
        <rect x="0" y="0" width="320" height="170" fill={isNight ? '#020617' : 'url(#skyGradDay)'} opacity={isNight ? 0.95 : 0.9} />

        {/* 天空中的微尘光斑/花粉微粒 */}
        {!isNight && (
          <g opacity="0.4">
            <circle cx="50" cy="50" r="1" fill="#fbbf24" />
            <circle cx="110" cy="80" r="1.5" fill="#facc15" />
            <circle cx="210" cy="40" r="1" fill="#fef08a" />
            <circle cx="280" cy="90" r="1.2" fill="#fbbf24" />
          </g>
        )}

        {/* 太阳或月亮 */}
        {!isNight ? (
          <g transform={`translate(${sunX}, 35)`}>
            {/* 外围柔和光晕 */}
            <circle cx="0" cy="0" r="22" fill="url(#sunGlow)" opacity="0.4" />
            {/* 太阳金盘 */}
            <circle cx="0" cy="0" r="13" fill="#f59e0b" stroke="#fbbf24" strokeWidth="2" />
            <circle cx="0" cy="0" r="10" fill="#fbbf24" />
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <line key={deg} x1="0" y1="-16" x2="0" y2="-23" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" transform={`rotate(${deg})`} />
            ))}
          </g>
        ) : (
          <g transform="translate(260, 35)">
            <circle cx="0" cy="0" r="13" fill="#fef08a" opacity="0.9" />
            <circle cx="6" cy="-4" r="11" fill="#020617" />
          </g>
        )}

        {/* 🪷 荷花专属水体层 (y: 110 ~ 170，水面在 y: 110) */}
        {plantId === 'lotus' && (
          <g>
            <rect x="0" y="110" width="320" height="60" fill="url(#waterGrad)" />
            {/* 水面微波涟漪线 */}
            <path d="M0,110 Q40,108 80,110 T160,110 T240,110 T320,110" stroke="#bae6fd" strokeWidth="2" fill="none" opacity="0.85" />
            <path d="M20,118 Q60,116 100,118 T180,118 T260,118" stroke="#e0f2fe" strokeWidth="1" strokeDasharray="12,8" fill="none" opacity="0.5" />
            {/* 水中上升微气泡 */}
            <circle cx="95" cy="140" r="1.5" fill="#ffffff" opacity="0.6" />
            <circle cx="102" cy="128" r="2" fill="#ffffff" opacity="0.7" />
            <circle cx="215" cy="145" r="1.8" fill="#ffffff" opacity="0.6" />
            <circle cx="222" cy="132" r="2.2" fill="#ffffff" opacity="0.7" />
          </g>
        )}

        {/* ── 2. 地平线与土壤剖面分层 (y: 170 ~ 280) ── */}
        <rect x="0" y="170" width="320" height="110" fill="url(#soilGrad)" />

        {/* 土壤中的有机质颗粒与碎石 (逼真地质剖面) */}
        <g opacity={plantId === 'cactus' ? 0.6 : 0.35}>
          {plantId === 'cactus' ? (
            /* 沙漠碎石 */
            <>
              <ellipse cx="40" cy="190" rx="4" ry="2.5" fill="#fde68a" />
              <ellipse cx="85" cy="230" rx="6" ry="3.5" fill="#d97706" />
              <ellipse cx="130" cy="205" rx="5" ry="3" fill="#fbbf24" />
              <ellipse cx="230" cy="220" rx="4" ry="2.5" fill="#b45309" />
              <ellipse cx="280" cy="195" rx="5" ry="3" fill="#fde68a" />
            </>
          ) : (
            /* 沃土腐殖质与深层岩土微粒 */
            <>
              <circle cx="50" cy="195" r="2" fill="#451a03" />
              <circle cx="90" cy="225" r="3" fill="#291102" />
              <circle cx="130" cy="245" r="2.5" fill="#451a03" />
              <circle cx="210" cy="210" r="2" fill="#291102" />
              <circle cx="260" cy="240" r="3" fill="#451a03" />
            </>
          )}
        </g>

        {/* 地表水平基准线 */}
        <path
          d="M0,170 Q80,169 160,170 T320,170"
          stroke={plantId === 'cactus' ? '#f59e0b' : plantId === 'lotus' ? '#0284c7' : '#15803d'}
          strokeWidth="3.5"
          fill="none"
        />
        <line x1="0" y1="170" x2="320" y2="170" stroke="#4ade80" strokeWidth="1" strokeDasharray="6,4" opacity="0.6" />

        {/* 地表文字标识 */}
        <text x="12" y="164" fill={isNight ? '#94a3b8' : plantId === 'lotus' ? '#0369a1' : '#15803d'} fontSize="9.5" fontWeight="900" opacity="0.9">
          {plantId === 'lotus' ? '水上与浮水层 (WATER SURFACE)' : '地上部分 (STEM & LEAF)'}
        </text>
        <text x="12" y="186" fill={plantId === 'lotus' ? '#38bdf8' : '#fcd34d'} fontSize="9.5" fontWeight="900" opacity="0.9">
          {plantId === 'lotus' ? '水底淤泥莲藕 (RHIZOME IN MUD)' : '地下根系 (ROOT SYSTEM)'}
        </text>

        {/* ── 3. 地下根系部分 (统一以 (160, 170) 为原点，Y >= 0 向下深钻) ── */}
        <g transform="translate(160, 170)">
          {/* 阶段 0 种子 */}
          {day <= 10 && plantId !== 'lotus' && (
            <ellipse cx="0" cy="5" rx="6.5" ry="4.5" fill="#1e293b" stroke="#fef08a" strokeWidth="1.2" />
          )}

          {/* 🪷 荷花：水底淤泥莲藕横生 */}
          {plantId === 'lotus' ? (
            <g transform="translate(-20, 20)">
              {/* 节间分枝莲藕 (具藕节横缢纹与气孔) */}
              <g>
                <ellipse cx="0" cy="0" rx={Math.min(22, 8 + day * 0.15)} ry={Math.min(10, 4 + day * 0.07)} fill="#fde68a" stroke="#d97706" strokeWidth="1.8" />
                <ellipse cx="32" cy="1" rx={Math.min(20, 6 + day * 0.14)} ry={Math.min(9, 4 + day * 0.06)} fill="#fef08a" stroke="#d97706" strokeWidth="1.8" />
                {day >= 35 && (
                  <ellipse cx="60" cy="3" rx={Math.min(18, 5 + day * 0.12)} ry={Math.min(8, 3 + day * 0.05)} fill="#fef3c7" stroke="#d97706" strokeWidth="1.8" />
                )}
                {/* 藕节缢缩节环 */}
                <line x1="16" y1="-8" x2="16" y2="8" stroke="#b45309" strokeWidth="1.5" strokeDasharray="2,2" />
                <line x1="46" y1="-7" x2="46" y2="9" stroke="#b45309" strokeWidth="1.5" strokeDasharray="2,2" />
                {/* 节部萌发须根 */}
                {[-10, 0, 10, 16, 22, 32, 42, 46, 52, 60].map((rx) => (
                  <path key={rx} d={`M${rx},6 Q${rx - 3},20 ${rx + 1},32`} stroke="#fef08a" strokeWidth="1.2" fill="none" opacity="0.8" />
                ))}
              </g>
            </g>
          ) : plantId === 'cactus' ? (
            /* 🌵 仙人掌：荒漠浅层辐射吸水根网 */
            <g stroke="#fde68a" strokeWidth="1.5" fill="none" opacity="0.9">
              <path d="M0,4 Q-45,8 -85,12" />
              <path d="M0,5 Q45,9 85,14" />
              <path d="M0,8 Q-35,16 -65,22" />
              <path d="M0,9 Q35,18 65,24" />
              <path d="M-30,6 Q-50,14 -75,18" strokeWidth="1" opacity="0.7" />
              <path d="M30,7 Q50,15 75,20" strokeWidth="1" opacity="0.7" />
            </g>
          ) : plantId === 'corn' ? (
            /* 🌽 玉米：深层主须根 + 地表以上气生支柱根 */
            <g>
              {rootDepth > 0 && (
                <path d={`M0,4 L0,${rootDepth}`} stroke="#fef08a" strokeWidth="3.5" fill="none" />
              )}
              {day >= 12 && (
                <g stroke="#fef08a" strokeWidth="1.5" fill="none" opacity="0.9">
                  <path d={`M0,15 Q-25,30 -${Math.min(50, day * 0.6)},${Math.min(45, 20 + day * 0.3)}`} />
                  <path d={`M0,15 Q25,30 ${Math.min(50, day * 0.6)},${Math.min(45, 20 + day * 0.3)}`} />
                  <path d={`M0,28 Q-35,45 -${Math.min(65, day * 0.7)},${Math.min(60, 30 + day * 0.35)}`} />
                  <path d={`M0,28 Q35,45 ${Math.min(65, day * 0.7)},${Math.min(60, 30 + day * 0.35)}`} />
                </g>
              )}
              {/* 基部轮生气生支柱根 (从地上茎节扎入土中支撑) */}
              {day >= 26 && (
                <g stroke="#dc2626" strokeWidth="2.5" fill="none" strokeLinecap="round">
                  <path d="M-3,-8 Q-12,-2 -18,6" />
                  <path d="M3,-8 Q12,-2 18,6" />
                  <path d="M-4,-16 Q-18,-4 -26,8" />
                  <path d="M4,-16 Q18,-4 26,8" />
                </g>
              )}
            </g>
          ) : (
            /* 🌻🍅🍓🌲🍉 通用主根与侧根系 */
            <g>
              {rootDepth > 0 && (
                <path
                  d={`M0,4 Q${Math.sin(day * 0.2) * 3},${rootDepth * 0.5} 0,${rootDepth}`}
                  stroke="#fef08a"
                  strokeWidth={plantId === 'oak' ? Math.max(3, 7 - day / 30) : Math.max(2, 4.5 - day / 60)}
                  fill="none"
                  strokeLinecap="round"
                />
              )}
              {day >= 11 && (
                <g stroke="#fef08a" strokeWidth={plantId === 'oak' ? 2.2 : 1.4} fill="none" opacity="0.9">
                  <path d={`M0,16 Q-25,22 -${Math.min(55, day * 0.65)},${Math.min(38, 18 + day * 0.25)}`} />
                  <path d={`M0,20 Q25,26 ${Math.min(55, day * 0.65)},${Math.min(42, 20 + day * 0.3)}`} />
                  {day >= 28 && (
                    <>
                      <path d={`M0,35 Q-35,42 -${Math.min(70, day * 0.75)},${Math.min(58, 35 + day * 0.25)}`} />
                      <path d={`M0,38 Q35,46 ${Math.min(70, day * 0.75)},${Math.min(62, 38 + day * 0.25)}`} />
                    </>
                  )}
                </g>
              )}
            </g>
          )}

          {/* 根毛区吸水微流光 */}
          {day >= 6 && (
            <g fill="#38bdf8" opacity="0.85">
              <circle cx="-12" cy={Math.min(rootDepth, 22)} r="1.8" />
              <circle cx="14" cy={Math.min(rootDepth, 32)} r="1.8" />
              <circle cx="-25" cy={Math.min(rootDepth, 42)} r="1.4" />
            </g>
          )}
        </g>

        {/* ── 4. 地上植株生长形态 (统一以 (160, 170) 为原点，Y <= 0 向上生长) ── */}
        <g transform="translate(160, 170)">
          {/* 幼苗萌发期通用双子叶 (Day 1-10) */}
          {isSprout && plantId !== 'lotus' && (
            <g>
              <path d={`M0,0 Q-2,-${stemHeight * 0.5} 0,-${stemHeight}`} stroke="#22c55e" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <ellipse cx="-6" cy={`-${stemHeight}`} rx="6" ry="3.5" fill="#4ade80" stroke="#16a34a" strokeWidth="1.2" transform={`rotate(-22, -6, -${stemHeight})`} />
              <ellipse cx="6" cy={`-${stemHeight}`} rx="6" ry="3.5" fill="#22c55e" stroke="#16a34a" strokeWidth="1.2" transform={`rotate(22, 6, -${stemHeight})`} />
            </g>
          )}

          {/* 🍅 1. 番茄：分枝灌木、羽状深裂叶、金黄五星花、成串鲜红多汁番茄 */}
          {plantId === 'tomato' && isGrowing && (
            <g>
              {/* 主茎与侧分枝 */}
              <path d={`M0,0 Q-4,-${stemHeight * 0.5} 0,-${stemHeight}`} stroke="#15803d" strokeWidth="5.5" fill="none" strokeLinecap="round" />
              <path d={`M0,-${stemHeight * 0.4} Q-18,-${stemHeight * 0.52} -32,-${stemHeight * 0.65}`} stroke="#15803d" strokeWidth="3.8" fill="none" strokeLinecap="round" />
              <path d={`M0,-${stemHeight * 0.5} Q18,-${stemHeight * 0.62} 32,-${stemHeight * 0.75}`} stroke="#15803d" strokeWidth="3.8" fill="none" strokeLinecap="round" />

              {/* 羽状复叶 (带叶脉细线) */}
              <g transform={`scale(${leafScale})`}>
                {/* 顶端嫩叶 */}
                <g transform={`translate(0, -${stemHeight + 5})`}>
                  <ellipse cx="0" cy="0" rx="14" ry="7" fill="url(#leafGrad)" stroke="#16a34a" strokeWidth="1.2" />
                  <line x1="-10" y1="0" x2="10" y2="0" stroke="#86efac" strokeWidth="1" />
                </g>
                {/* 左枝叶片 */}
                <g transform={`translate(-34, -${stemHeight * 0.66}) rotate(-25)`}>
                  <ellipse cx="0" cy="0" rx="13" ry="6.5" fill="url(#leafGrad)" stroke="#16a34a" strokeWidth="1.2" />
                  <line x1="-9" y1="0" x2="9" y2="0" stroke="#86efac" strokeWidth="1" />
                </g>
                {/* 右枝叶片 */}
                <g transform={`translate(34, -${stemHeight * 0.76}) rotate(25)`}>
                  <ellipse cx="0" cy="0" rx="13" ry="6.5" fill="url(#leafGrad)" stroke="#16a34a" strokeWidth="1.2" />
                  <line x1="-9" y1="0" x2="9" y2="0" stroke="#86efac" strokeWidth="1" />
                </g>
              </g>

              {/* 金黄五星小花 (Day 46-60) */}
              {isBudding && (
                <g transform={`translate(16, -${stemHeight * 0.6})`}>
                  <path d="M-16,0 L0,0" stroke="#15803d" strokeWidth="2.2" fill="none" />
                  {[0, 72, 144, 216, 288].map((deg) => (
                    <polygon key={deg} points="0,-10 3,-3 0,0 -3,-3" fill="#facc15" stroke="#eab308" transform={`rotate(${deg})`} />
                  ))}
                  <circle cx="0" cy="0" r="3" fill="#ca8a04" />
                </g>
              )}

              {/* 幼绿番茄果串 (Day 61-75) */}
              {isBlooming && (
                <g transform={`translate(18, -${stemHeight * 0.55})`}>
                  <path d="M-18,0 L0,0" stroke="#15803d" strokeWidth="2.2" fill="none" />
                  <circle cx="0" cy="0" r="8.5" fill="#4ade80" stroke="#16a34a" strokeWidth="1.5" />
                  <circle cx="13" cy="5" r="7.5" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
                  {[0, 72, 144, 216, 288].map((deg) => (
                    <line key={deg} x1="0" y1="0" x2="0" y2="-6.5" stroke="#15803d" strokeWidth="2" strokeLinecap="round" transform={`rotate(${deg})`} />
                  ))}
                </g>
              )}

              {/* 鲜红熟透多汁番茄 (Day >= 76，高光与立体质感) */}
              {isMature && (
                <g transform={`translate(20, -${stemHeight * 0.55})`}>
                  <path d="M-20,0 L0,0" stroke="#15803d" strokeWidth="2.5" fill="none" />
                  {/* 主果 */}
                  <circle cx="0" cy="0" r="14" fill="url(#tomatoShine)" stroke="#991b1b" strokeWidth="1.8" />
                  <circle cx="-4" cy="-4" r="3.5" fill="#ffffff" opacity="0.65" />
                  {/* 侧果 1 */}
                  <circle cx="17" cy="6" r="11" fill="url(#tomatoShine)" stroke="#991b1b" strokeWidth="1.5" />
                  <circle cx="14" cy="3" r="2.5" fill="#ffffff" opacity="0.6" />
                  {/* 侧果 2 */}
                  <circle cx="-15" cy="4" r="10" fill="url(#tomatoShine)" stroke="#991b1b" strokeWidth="1.5" />
                  {/* 绿色星状萼片 */}
                  {[0, 72, 144, 216, 288].map((deg) => (
                    <line key={deg} x1="0" y1="0" x2="0" y2="-10" stroke="#15803d" strokeWidth="2.8" strokeLinecap="round" transform={`rotate(${deg})`} />
                  ))}
                  <text x="0" y="26" textAnchor="middle" fill="#ef4444" fontSize="9.5" fontWeight="bold">🍅 鲜红熟透</text>
                </g>
              )}
            </g>
          )}

          {/* 🍓 2. 草莓：短缩茎、三出锯齿叶、红色匍匐走茎、心形草莓 */}
          {plantId === 'strawberry' && isGrowing && (
            <g>
              {/* 短缩茎冠部 */}
              <g transform={`scale(${leafScale})`}>
                {/* 左三出叶 */}
                <path d="M0,-4 Q-18,-12 -32,-18" stroke="#16a34a" strokeWidth="2.2" fill="none" />
                <ellipse cx="-32" cy="-18" rx="12" ry="7.5" fill="url(#leafGrad)" stroke="#15803d" strokeWidth="1.2" />
                {/* 右三出叶 */}
                <path d="M0,-4 Q18,-12 32,-18" stroke="#16a34a" strokeWidth="2.2" fill="none" />
                <ellipse cx="32" cy="-18" rx="12" ry="7.5" fill="url(#leafGrad)" stroke="#15803d" strokeWidth="1.2" />
                {/* 中央挺立真叶 */}
                <path d="M0,-4 Q0,-18 0,-28" stroke="#16a34a" strokeWidth="2.2" fill="none" />
                <ellipse cx="0" cy="-28" rx="13" ry="8.5" fill="url(#leafGrad)" stroke="#15803d" strokeWidth="1.2" />
              </g>

              {/* 红色匍匐走茎 (匍匐贴地延伸并扎下新苗) */}
              {day >= 26 && (
                <g>
                  <path d="M0,-2 Q35,-6 65,0" stroke="#b91c1c" strokeWidth="2.2" fill="none" />
                  {/* 子株苗与小须根 */}
                  <ellipse cx="65" cy="-5" rx="5.5" ry="3.5" fill="#4ade80" stroke="#16a34a" strokeWidth="1.2" />
                  <line x1="65" y1="0" x2="65" y2="8" stroke="#fef08a" strokeWidth="1.8" />
                </g>
              )}

              {/* 纯白五瓣小花 (Day 41-55) */}
              {isBudding && (
                <g transform="translate(-18, -12)">
                  <path d="M18,8 L0,0" stroke="#16a34a" strokeWidth="1.8" fill="none" />
                  {[0, 72, 144, 216, 288].map((deg) => (
                    <ellipse key={deg} cx="0" cy="-7.5" rx="5" ry="7" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.2" transform={`rotate(${deg})`} />
                  ))}
                  <circle cx="0" cy="0" r="4" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
                </g>
              )}

              {/* 饱满红熟心形草莓 (Day >= 56) */}
              {(isBlooming || isMature) && (
                <g transform="translate(-20, -8)">
                  <path d="M20,4 L0,0" stroke="#16a34a" strokeWidth="1.8" fill="none" />
                  <g transform="translate(0, 8)">
                    {/* 心形果肉 */}
                    <path
                      d="M0,20 C-15,11 -16,-7 -9,-11 C-3,-14 0,-9 0,-9 C0,-9 3,-14 9,-11 C16,-7 15,11 0,20 Z"
                      fill={isMature ? 'url(#strawberryShine)' : '#86efac'}
                      stroke={isMature ? '#881337' : '#16a34a'}
                      strokeWidth="1.8"
                    />
                    {/* 金黄瘦果种子点 */}
                    {[-5, 0, 5].map((x) =>
                      [-2, 5, 11].map((y) => (
                        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#facc15" stroke="#ca8a04" strokeWidth="0.4" />
                      ))
                    )}
                    {/* 顶部翠绿萼片 */}
                    {[-30, 0, 30].map((deg) => (
                      <path key={deg} d="M0,-10 Q-3,-17 0,-19 Q3,-17 0,-10" fill="#15803d" transform={`rotate(${deg}, 0, -10)`} />
                    ))}
                  </g>
                  {isMature && (
                    <text x="0" y="34" textAnchor="middle" fill="#ef4444" fontSize="9.5" fontWeight="bold">🍓 香甜草莓</text>
                  )}
                </g>
              )}
            </g>
          )}

          {/* 🌲 3. 橡树：粗壮木质主干、分枝年轮、苍翠树冠、小碗壳斗橡果 */}
          {plantId === 'oak' && isGrowing && (
            <g>
              {/* 木质树干 (梯形向上渐细并分叉) */}
              <path
                d={`M-10,0 L-${Math.min(14, 5 + day * 0.08)},-${stemHeight * 0.65} L0,-${stemHeight * 0.9} L${Math.min(14, 5 + day * 0.08)},-${stemHeight * 0.65} L10,0 Z`}
                fill="#78350f"
                stroke="#451a03"
                strokeWidth="2.2"
              />
              {/* 树干木纹深浅刻画 */}
              <line x1="0" y1="-5" x2="0" y2={`-${stemHeight * 0.6}`} stroke="#451a03" strokeWidth="1.8" strokeDasharray="6,4" />

              {/* 苍翠多层树冠 (多层次绿色球团叠加) */}
              <g transform={`translate(0, -${stemHeight * 0.85}) scale(${Math.min(1.2, 0.4 + day * 0.009)})`}>
                <circle cx="0" cy="0" r="33" fill="#15803d" stroke="#14532d" strokeWidth="2.2" />
                <circle cx="-23" cy="6" r="23" fill="#16a34a" />
                <circle cx="23" cy="6" r="23" fill="#15803d" />
                <circle cx="0" cy="-16" r="25" fill="#22c55e" />
                <circle cx="-12" cy="-6" r="18" fill="#4ade80" opacity="0.8" />
              </g>

              {/* 坚硬橡果 (Day >= 75，鳞片小碗壳斗 + 光泽坚果) */}
              {(isBlooming || isMature) && (
                <g transform={`translate(0, -${stemHeight * 0.65})`}>
                  <g transform="translate(-19, 0)">
                    <ellipse cx="0" cy="0" rx="5.5" ry="8.5" fill="#92400e" stroke="#78350f" strokeWidth="1.2" />
                    <path d="M-6,-5 Q0,-10 6,-5 Z" fill="#78350f" stroke="#451a03" strokeWidth="1.2" />
                  </g>
                  <g transform="translate(19, 2)">
                    <ellipse cx="0" cy="0" rx="5.5" ry="8.5" fill="#92400e" stroke="#78350f" strokeWidth="1.2" />
                    <path d="M-6,-5 Q0,-10 6,-5 Z" fill="#78350f" stroke="#451a03" strokeWidth="1.2" />
                  </g>
                  {isMature && (
                    <text x="0" y="22" textAnchor="middle" fill="#92400e" fontSize="9.5" fontWeight="bold">🌰 饱满橡果</text>
                  )}
                </g>
              )}
            </g>
          )}

          {/* 🍉 4. 西瓜：贴地匍匐蔓、卷须、深裂叶、虎皮纹大西瓜 */}
          {plantId === 'watermelon' && isGrowing && (
            <g>
              {/* 贴地匍匐蔓延主侧藤 */}
              <path d="M0,0 Q-40,-5 -80,-2 Q-105,-4 -125,0" stroke="#15803d" strokeWidth="4.5" fill="none" strokeLinecap="round" />
              <path d="M0,0 Q40,-5 80,-2 Q105,-4 125,0" stroke="#16a34a" strokeWidth="4.5" fill="none" strokeLinecap="round" />

              {/* 螺旋卷须 */}
              <path d="M-30,-3 Q-38,-12 -34,-18 Q-28,-14 -32,-8" stroke="#16a34a" strokeWidth="1.8" fill="none" />
              <path d="M30,-3 Q38,-12 34,-18 Q28,-14 32,-8" stroke="#16a34a" strokeWidth="1.8" fill="none" />

              {/* 掌状深裂真叶 */}
              <g transform={`scale(${leafScale})`}>
                <ellipse cx="-45" cy="-8" rx="14" ry="8.5" fill="url(#leafGrad)" />
                <ellipse cx="45" cy="-9" rx="14" ry="8.5" fill="url(#leafGrad)" />
                <ellipse cx="-90" cy="-4" rx="12" ry="7" fill="#15803d" />
                <ellipse cx="90" cy="-5" rx="12" ry="7" fill="#4ade80" />
              </g>

              {/* 黄色小花 (Day 46-60) */}
              {isBudding && (
                <g transform="translate(30, -10)">
                  {[0, 72, 144, 216, 288].map((deg) => (
                    <ellipse key={deg} cx="0" cy="-6.5" rx="4.5" ry="6.5" fill="#facc15" stroke="#eab308" transform={`rotate(${deg})`} />
                  ))}
                  <circle cx="0" cy="0" r="3" fill="#ca8a04" />
                </g>
              )}

              {/* 膨大条纹大西瓜 (底部严密坐落在地表 Y=0) */}
              {(isBlooming || isMature) && (
                (() => {
                  const melonRx = Math.min(27, 9 + day * 0.18);
                  const melonRy = Math.min(21, 7 + day * 0.14);
                  return (
                    <g transform={`translate(-50, -${melonRy})`}>
                      {/* 瓜柄弯卷 */}
                      <path d={`M0,-${melonRy} Q-6,-${melonRy + 10} -15,-${melonRy + 6}`} stroke="#16a34a" strokeWidth="3" fill="none" strokeLinecap="round" />
                      {/* 翡翠绿瓜体 */}
                      <ellipse cx="0" cy="0" rx={melonRx} ry={melonRy} fill="#16a34a" stroke="#14532d" strokeWidth="2.5" />
                      {/* 墨绿虎皮锯齿条纹 */}
                      {[-15, -8, 0, 8, 15].map((x) => (
                        <path key={x} d={`M${x},-${melonRy - 2} Q${x - 4},0 ${x},${melonRy - 2}`} stroke="#052e16" strokeWidth="3" strokeLinecap="round" fill="none" />
                      ))}
                      {isMature && (
                        <text x="0" y={melonRy + 14} textAnchor="middle" fill="#15803d" fontSize="9.5" fontWeight="bold">🍉 脆甜西瓜</text>
                      )}
                    </g>
                  );
                })()
              )}
            </g>
          )}

          {/* 🌽 5. 玉米：直立节间、宽带叶、顶端雄穗(天花)、侧生玉米棒与红须 */}
          {plantId === 'corn' && isGrowing && (
            <g>
              {/* 高大节间粗茎 */}
              <path d={`M0,0 L0,-${stemHeight}`} stroke="#15803d" strokeWidth="7.5" fill="none" strokeLinecap="round" />
              {/* 节间紫色/深绿环箍 */}
              {[-stemHeight * 0.25, -stemHeight * 0.5, -stemHeight * 0.75].map((y) => (
                <line key={y} x1="-4.5" y1={y} x2="4.5" y2={y} stroke="#14532d" strokeWidth="2.2" />
              ))}

              {/* 互生宽带叶 (具中央白色主脉) */}
              <g transform={`scale(${leafScale})`}>
                <g>
                  <path d={`M0,-${stemHeight * 0.3} Q-40,-${stemHeight * 0.4} -68,-${stemHeight * 0.25}`} stroke="#16a34a" strokeWidth="5.5" fill="none" strokeLinecap="round" />
                  <path d={`M0,-${stemHeight * 0.3} Q-40,-${stemHeight * 0.4} -68,-${stemHeight * 0.25}`} stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.6" />
                </g>
                <g>
                  <path d={`M0,-${stemHeight * 0.55} Q40,-${stemHeight * 0.65} 68,-${stemHeight * 0.5}`} stroke="#22c55e" strokeWidth="5.5" fill="none" strokeLinecap="round" />
                  <path d={`M0,-${stemHeight * 0.55} Q40,-${stemHeight * 0.65} 68,-${stemHeight * 0.5}`} stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.6" />
                </g>
                <g>
                  <path d={`M0,-${stemHeight * 0.78} Q-35,-${stemHeight * 0.88} -58,-${stemHeight * 0.72}`} stroke="#15803d" strokeWidth="5" fill="none" strokeLinecap="round" />
                </g>
              </g>

              {/* 顶端羽状雄穗（天花） (Day >= 46) */}
              {day >= 46 && (
                <g transform={`translate(0, -${stemHeight})`}>
                  <line x1="0" y1="0" x2="0" y2="-20" stroke="#eab308" strokeWidth="3" />
                  <line x1="0" y1="-6" x2="-15" y2="-18" stroke="#facc15" strokeWidth="1.8" />
                  <line x1="0" y1="-6" x2="15" y2="-18" stroke="#facc15" strokeWidth="1.8" />
                  <line x1="0" y1="-13" x2="-11" y2="-24" stroke="#facc15" strokeWidth="1.8" />
                  <line x1="0" y1="-13" x2="11" y2="-24" stroke="#facc15" strokeWidth="1.8" />
                  {/* 金黄散落花粉 */}
                  <circle cx="-5" cy="-10" r="1" fill="#fde047" />
                  <circle cx="6" cy="-12" r="1" fill="#fde047" />
                </g>
              )}

              {/* 侧生玉米棒与玉米须 (紧密着生在中部叶腋) */}
              {(isBlooming || isMature) && (
                <g transform={`translate(4, -${stemHeight * 0.5}) rotate(25)`}>
                  <ellipse cx="0" cy="0" rx="8.5" ry="17" fill="#facc15" stroke="#ca8a04" strokeWidth="1.8" />
                  {/* 鲜红柔顺玉米须 */}
                  <path d="M0,-17 Q-5,-25 -8,-30 M0,-17 Q5,-25 8,-30 M-2,-17 Q0,-26 2,-32" stroke="#ef4444" strokeWidth="1.6" fill="none" />
                  {isMature && (
                    <text x="0" y="26" textAnchor="middle" fill="#ca8a04" fontSize="9.5" fontWeight="bold">🌽 金黄玉米</text>
                  )}
                </g>
              )}
            </g>
          )}

          {/* 🪷 6. 荷花：水陆生态 (水面在 Y=-60)、水下莲藕、浮水钱叶、高擎大立叶与圣洁粉荷 */}
          {plantId === 'lotus' && (
            <g>
              {/* 浮水钱叶 (平浮于水面 Y=-60) */}
              {day >= 8 && (
                <g>
                  {/* 水中叶柄：从淤泥 Y=20 穿透水体上升至水面 Y=-60 */}
                  <path d="M-15,20 Q-30,-20 -45,-60" stroke="#16a34a" strokeWidth="2.8" fill="none" />
                  {/* 圆形浮叶 */}
                  <ellipse cx="-45" cy="-60" rx="19" ry="5.5" fill="#4ade80" stroke="#15803d" strokeWidth="1.6" />
                </g>
              )}

              {/* 挺拔高擎立叶 (挺出水面 Y <= -90，具疏水滚动露珠) */}
              {day >= 17 && (
                <g>
                  <path d="M15,20 Q28,-40 38,-110" stroke="#15803d" strokeWidth="3.8" fill="none" />
                  <ellipse cx="38" cy="-110" rx="27" ry="11" fill="url(#leafGrad)" stroke="#14532d" strokeWidth="2.2" />
                  {/* 叶面放射叶脉 */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                    <line key={deg} x1="38" y1="-110" x2={38 + Math.cos((deg * Math.PI) / 180) * 20} y2={-110 + Math.sin((deg * Math.PI) / 180) * 8} stroke="#86efac" strokeWidth="0.8" opacity="0.6" />
                  ))}
                  {/* 超疏水滚动露珠 */}
                  <circle cx="42" cy="-109" r="2.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />
                </g>
              )}

              {/* 荷花蕾与盛开粉白荷花 (升至 Y=-120) */}
              {day >= 46 && (
                <g>
                  {/* 花梗 */}
                  <path d="M0,20 Q-4,-50 0,-120" stroke="#15803d" strokeWidth="3.8" fill="none" />
                  <g transform="translate(0, -120)">
                    {day < 56 ? (
                      /* 尖尖角花苞 */
                      <path d="M0,0 Q-9,-18 0,-26 Q9,-18 0,0 Z" fill="#f472b6" stroke="#db2777" strokeWidth="1.8" />
                    ) : (
                      /* 盛开粉白荷花与黄莲蓬 */
                      <g>
                        {[-45, -25, 0, 25, 45].map((deg) => (
                          <ellipse key={deg} cx="0" cy="-15" rx="8.5" ry="17" fill="#fbcfe8" stroke="#f472b6" strokeWidth="1.2" transform={`rotate(${deg})`} />
                        ))}
                        <ellipse cx="0" cy="-13" rx="6.5" ry="13" fill="#ffffff" stroke="#f472b6" strokeWidth="1.2" />
                        <circle cx="0" cy="-7" r="6.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
                      </g>
                    )}
                    {isMature && (
                      <text x="0" y="-32" textAnchor="middle" fill="#db2777" fontSize="9.5" fontWeight="bold">🪷 圣洁芙蓉</text>
                    )}
                  </g>
                </g>
              )}
            </g>
          )}

          {/* 🌵 7. 仙人掌：荒漠沙土、肉质储水茎、刺座硬刺、顶部艳花与浆果 */}
          {plantId === 'cactus' && isGrowing && (
            (() => {
              const cactusHeight = Math.max(16, stemHeight * 0.75);
              return (
                <g>
                  {/* 肉质粗壮主茎 (圆角柱体) */}
                  <rect
                    x="-16"
                    y={`-${cactusHeight}`}
                    width="32"
                    height={cactusHeight}
                    rx="16"
                    fill="#15803d"
                    stroke="#14532d"
                    strokeWidth="2.2"
                  />
                  {/* 纵向储水深浅棱沟 */}
                  {[-8, 0, 8].map((x) => (
                    <line
                      key={x}
                      x1={x}
                      y1={`-${cactusHeight - 6}`}
                      x2={x}
                      y2="-4"
                      stroke="#166534"
                      strokeWidth="1.8"
                      strokeDasharray="4,5"
                    />
                  ))}

                  {/* 分支肉质小掌节 (Day >= 36) */}
                  {day >= 36 && (
                    <>
                      <ellipse cx="-24" cy={`-${cactusHeight * 0.55}`} rx="8.5" ry="17" fill="#16a34a" stroke="#15803d" strokeWidth="1.6" transform={`rotate(-30, -24, -${cactusHeight * 0.55})`} />
                      <ellipse cx="24" cy={`-${cactusHeight * 0.65}`} rx="8.5" ry="17" fill="#16a34a" stroke="#15803d" strokeWidth="1.6" transform={`rotate(30, 24, -${cactusHeight * 0.65})`} />
                    </>
                  )}

                  {/* 刺座与放射硬刺 (严格分布在植株高度范围内) */}
                  {[-10, 0, 10].map((x) =>
                    [-cactusHeight * 0.25, -cactusHeight * 0.55, -cactusHeight * 0.82].map((y) => (
                      <g key={`${x}-${y}`} transform={`translate(${x}, ${y})`}>
                        <circle cx="0" cy="0" r="1.8" fill="#fef08a" />
                        <line x1="0" y1="0" x2="-4" y2="-4" stroke="#ffffff" strokeWidth="1.2" />
                        <line x1="0" y1="0" x2="4" y2="-4" stroke="#ffffff" strokeWidth="1.2" />
                      </g>
                    ))
                  )}

                  {/* 顶端娇艳沙漠花或仙人掌果 (Day >= 61) */}
                  {day >= 61 && (
                    <g transform={`translate(0, -${cactusHeight})`}>
                      {day < 85 ? (
                        /* 娇艳沙漠大花 */
                        <g>
                          {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg) => (
                            <ellipse key={deg} cx="0" cy="-13" rx="5.5" ry="11" fill="#ec4899" stroke="#be185d" strokeWidth="1.2" transform={`rotate(${deg})`} />
                          ))}
                          <circle cx="0" cy="0" r="6.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1.6" />
                        </g>
                      ) : (
                        /* 红熟仙人掌浆果 */
                        <g>
                          <ellipse cx="0" cy="-9" rx="9.5" ry="13" fill="#9d174d" stroke="#831843" strokeWidth="1.6" />
                          <circle cx="0" cy="-9" r="3" fill="#fb7185" opacity="0.7" />
                          <text x="0" y="-26" textAnchor="middle" fill="#be185d" fontSize="9.5" fontWeight="bold">🌵 浆果成熟</text>
                        </g>
                      )}
                    </g>
                  )}
                </g>
              );
            })()
          )}

          {/* 🌻 8. 向日葵：高大直立粗茎、宽心形真叶、星状绿蕾、双层金黄花盘与低头丰收 */}
          {plantId === 'sunflower' && isGrowing && (
            <g>
              {/* 主茎秆 */}
              {isMature ? (
                /* 成熟期茎秆在顶端微微弯曲低垂 */
                <path
                  d={`M0,0 L0,-${stemHeight - 15} Q0,-${stemHeight} 15,-${stemHeight - 8}`}
                  stroke="#15803d"
                  strokeWidth={Math.min(8.5, 3.5 + day * 0.06)}
                  strokeLinecap="round"
                  fill="none"
                />
              ) : (
                <path
                  d={`M0,0 Q${Math.sin(day * 0.08) * 4},-${stemHeight * 0.5} 0,-${stemHeight}`}
                  stroke="#15803d"
                  strokeWidth={Math.min(8.5, 3.5 + day * 0.06)}
                  strokeLinecap="round"
                  fill="none"
                />
              )}

              {/* 宽心形真叶 (带分叉叶脉) */}
              {day >= 15 && (
                <g transform={`scale(${leafScale})`}>
                  {/* 下层真叶 */}
                  <g transform={`translate(0, -${stemHeight * 0.35})`}>
                    <path d="M0,0 Q-30,-12 -42,-4 C-32,14 -10,8 0,0" fill="url(#leafGrad)" stroke="#14532d" strokeWidth="1.5" />
                    <path d="M0,0 Q30,-12 42,-4 C32,14 10,8 0,0" fill="url(#leafGrad)" stroke="#14532d" strokeWidth="1.5" />
                  </g>
                  {/* 中层真叶 */}
                  {day >= 26 && (
                    <g transform={`translate(0, -${stemHeight * 0.65})`}>
                      <path d="M0,0 Q-38,-15 -48,-6 C-38,15 -10,10 0,0" fill="url(#leafGrad)" stroke="#14532d" strokeWidth="1.5" />
                      <path d="M0,0 Q38,-15 48,-6 C38,15 10,10 0,0" fill="url(#leafGrad)" stroke="#14532d" strokeWidth="1.5" />
                    </g>
                  )}
                  {/* 上层真叶 */}
                  {day >= 45 && (
                    <g transform={`translate(0, -${stemHeight * 0.85})`}>
                      <path d="M0,0 Q-30,-12 -36,-3 C-26,10 -8,6 0,0" fill="#22c55e" stroke="#14532d" strokeWidth="1.5" />
                      <path d="M0,0 Q30,-12 36,-3 C26,10 8,6 0,0" fill="#4ade80" stroke="#14532d" strokeWidth="1.5" />
                    </g>
                  )}
                </g>
              )}

              {/* 现蕾、盛花与成熟低头花盘 */}
              {day >= 46 && (
                <>
                  {/* 现蕾星状花苞 (Day 46-60) */}
                  {isBudding && (
                    <g transform={`translate(0, -${stemHeight}) scale(0.9)`}>
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                        <path key={deg} d="M0,0 Q-6,-16 0,-22 Q6,-16 0,0" fill="#16a34a" stroke="#14532d" strokeWidth="1.2" transform={`rotate(${deg})`} />
                      ))}
                      <circle cx="0" cy="0" r="9.5" fill="#15803d" stroke="#14532d" strokeWidth="1.8" />
                    </g>
                  )}

                  {/* 盛花盛放金色花盘 (Day 61-80，双层舌状花瓣 + 斐波那契点阵) */}
                  {isBlooming && (
                    <g transform={`translate(0, -${stemHeight}) scale(1.15)`}>
                      {/* 外层金黄长花瓣 */}
                      {[0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336].map((deg) => (
                        <ellipse key={deg} cx="0" cy="-25" rx="5.5" ry="13" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.2" transform={`rotate(${deg})`} />
                      ))}
                      {/* 内层交错短花瓣 */}
                      {[12, 36, 60, 84, 108, 132, 156, 180, 204, 228, 252, 276, 300, 324, 348].map((deg) => (
                        <ellipse key={deg} cx="0" cy="-21" rx="4.5" ry="9" fill="#facc15" transform={`rotate(${deg})`} />
                      ))}
                      {/* 棕褐管状花盘 */}
                      <circle cx="0" cy="0" r="16.5" fill="#78350f" stroke="#451a03" strokeWidth="2" />
                      <circle cx="0" cy="0" r="12.5" fill="#92400e" stroke="#b45309" strokeWidth="1.5" strokeDasharray="3,2" />
                      <circle cx="0" cy="0" r="6.5" fill="#f59e0b" opacity="0.85" />
                    </g>
                  )}

                  {/* 成熟结实低头丰收 (Day >= 81，饱满黑亮葵花籽) */}
                  {isMature && (
                    <g transform={`translate(15, -${stemHeight - 8}) rotate(45)`}>
                      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                        <ellipse key={deg} cx="0" cy="-23" rx="4.5" ry="9.5" fill="#b45309" opacity="0.8" transform={`rotate(${deg})`} />
                      ))}
                      <circle cx="0" cy="0" r="21" fill="#1e293b" stroke="#78350f" strokeWidth="2.8" />
                      <circle cx="0" cy="0" r="17" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,2" />
                      <circle cx="0" cy="0" r="11" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="2,2" />
                      <text x="0" y="4.5" textAnchor="middle" fill="#fcd34d" fontSize="9.5" fontWeight="bold">🌻 丰收</text>
                    </g>
                  )}
                </>
              )}
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

/** 🌻 植物高清矢量画板与实物图渲染器 (高精细节 · 唯美自然光影) */
export function PlantGraphicIllustration({ plantId, stage, className = '' }: { plantId: string; stage: PlantStage; className?: string }) {
  switch (plantId) {
    case 'sunflower':
      if (stage === 0) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <ellipse cx="80" cy="120" rx="60" ry="22" fill="#451a03" opacity="0.5" />
            <path d="M15,115 Q80,100 145,115 L145,155 L15,155 Z" fill="#582403" />
            {/* 黑白条纹向日葵饱满瘦果种子 */}
            <g transform="translate(68, 98) rotate(-18)">
              <ellipse cx="14" cy="14" rx="14" ry="8.5" fill="#0f172a" stroke="#475569" strokeWidth="1.2" />
              <path d="M4,14 Q14,9 24,14" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,2" fill="none" />
              <path d="M6,17 Q14,12 22,17" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3,2" fill="none" />
            </g>
            {/* 正在吸水露白的小胚根 */}
            <path d="M84,114 Q92,122 88,130" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="88" cy="130" r="1.5" fill="#fef08a" />
          </svg>
        );
      } else if (stage === 1) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,125 Q80,115 145,125 L145,155 L15,155 Z" fill="#582403" />
            {/* 粗壮幼茎 */}
            <path d="M80,125 Q78,95 80,68" stroke="#16a34a" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            {/* 肥厚双子叶 (带高光与边缘) */}
            <g transform="translate(80, 75)">
              <path d="M0,0 Q-28,-18 -32,-2 C-28,14 -8,10 0,0" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
              <path d="M0,0 Q28,-18 32,-2 C28,14 8,10 0,0" fill="#4ade80" stroke="#15803d" strokeWidth="1.5" />
              <circle cx="0" cy="-6" r="3" fill="#86efac" />
            </g>
            {/* 拱出的种子壳碎片 */}
            <ellipse cx="64" cy="116" rx="5" ry="3" fill="#1e293b" transform="rotate(30, 64, 116)" />
            {/* 下扎胚根 */}
            <path d="M80,125 Q74,140 68,148 M80,130 Q88,142 92,148" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        );
      } else if (stage === 2) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,135 Q80,130 145,135 L145,155 L15,155 Z" fill="#582403" />
            <path d="M80,135 Q77,95 80,52" stroke="#15803d" strokeWidth="7.5" strokeLinecap="round" fill="none" />
            {/* 宽大心形真叶 */}
            <g transform="translate(78, 102)">
              <path d="M0,0 Q-38,-15 -46,-4 C-36,15 -10,10 0,0" fill="#16a34a" stroke="#14532d" strokeWidth="1.8" />
              <line x1="-5" y1="0" x2="-35" y2="-4" stroke="#86efac" strokeWidth="1" />
            </g>
            <g transform="translate(82, 84)">
              <path d="M0,0 Q38,-15 46,-4 C36,15 10,10 0,0" fill="#22c55e" stroke="#14532d" strokeWidth="1.8" />
              <line x1="5" y1="0" x2="35" y2="-4" stroke="#86efac" strokeWidth="1" />
            </g>
            {/* 盛放的金色向日葵花盘 */}
            <g transform="translate(80, 48)">
              {/* 外层金黄长花瓣 */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                <ellipse key={deg} cx="0" cy="-28" rx="6.5" ry="14" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.2" transform={`rotate(${deg})`} />
              ))}
              {/* 内层橙黄花瓣 */}
              {[15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345].map((deg) => (
                <ellipse key={deg} cx="0" cy="-24" rx="5" ry="10" fill="#facc15" transform={`rotate(${deg})`} />
              ))}
              {/* 棕褐花盘核心 */}
              <circle cx="0" cy="0" r="18" fill="#78350f" stroke="#451a03" strokeWidth="2.2" />
              <circle cx="0" cy="0" r="14" fill="#92400e" stroke="#b45309" strokeWidth="1.5" strokeDasharray="3,2" />
              <circle cx="0" cy="0" r="8" fill="#f59e0b" opacity="0.85" />
            </g>
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,135 Q80,130 145,135 L145,155 L15,155 Z" fill="#582403" />
            {/* 成熟粗茎弯曲低垂 */}
            <path d="M80,135 L80,75 Q80,50 98,52" stroke="#15803d" strokeWidth="8.5" strokeLinecap="round" fill="none" />
            <path d="M78,105 Q35,95 28,110 C40,125 70,115 78,105" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
            <path d="M82,90 Q125,80 132,95 C120,110 90,100 82,90" fill="#15803d" stroke="#14532d" strokeWidth="2" />
            {/* 低头丰收的饱满葵花盘 */}
            <g transform="translate(98, 52) rotate(35)">
              {[0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336].map((deg) => (
                <ellipse key={deg} cx="0" cy="-30" rx="6.5" ry="13" fill="#d97706" opacity="0.8" transform={`rotate(${deg})`} />
              ))}
              <circle cx="0" cy="0" r="23" fill="#1e293b" stroke="#78350f" strokeWidth="2.8" />
              {/* 斐波那契葵花籽阵列 */}
              {[-12, -6, 0, 6, 12].map((x) =>
                [-12, -6, 0, 6, 12].map((y) => (
                  (x*x + y*y <= 240) ? <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="#0f172a" stroke="#fcd34d" strokeWidth="0.6" /> : null
                ))
              )}
            </g>
          </svg>
        );
      }

    case 'tomato':
      if (stage === 0) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,115 Q80,105 145,115 L145,155 L15,155 Z" fill="#582403" />
            {/* 扁平微毛番茄种子 */}
            <g transform="translate(80, 118)">
              <ellipse cx="0" cy="0" rx="7" ry="9" fill="#ca8a04" stroke="#a16207" strokeWidth="1.5" />
              <circle cx="2" cy="-2" r="2" fill="#fef08a" opacity="0.8" />
              {/* 表面细绒毛 */}
              <line x1="-7" y1="0" x2="-10" y2="-2" stroke="#fef08a" strokeWidth="1" />
              <line x1="7" y1="0" x2="10" y2="-2" stroke="#fef08a" strokeWidth="1" />
            </g>
          </svg>
        );
      } else if (stage === 1) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,125 Q80,120 145,125 L145,155 L15,155 Z" fill="#582403" />
            <line x1="90" y1="35" x2="90" y2="135" stroke="#a16207" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M75,125 Q80,95 78,65" stroke="#16a34a" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            {/* 羽状初生深裂叶 */}
            <g transform="translate(56, 82) rotate(-20)">
              <ellipse cx="0" cy="0" rx="14" ry="7" fill="#22c55e" stroke="#15803d" strokeWidth="1.2" />
              <line x1="-8" y1="0" x2="8" y2="0" stroke="#86efac" strokeWidth="1" />
            </g>
            <g transform="translate(100, 72) rotate(20)">
              <ellipse cx="0" cy="0" rx="14" ry="7" fill="#4ade80" stroke="#15803d" strokeWidth="1.2" />
              <line x1="-8" y1="0" x2="8" y2="0" stroke="#86efac" strokeWidth="1" />
            </g>
          </svg>
        );
      } else if (stage === 2) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,130 Q80,125 145,130 L145,155 L15,155 Z" fill="#582403" />
            <path d="M80,130 Q82,90 75,52" stroke="#15803d" strokeWidth="5.5" strokeLinecap="round" fill="none" />
            {/* 黄色星花花序 */}
            <g transform="translate(58, 62)">
              {[0, 72, 144, 216, 288].map((deg) => (
                <polygon key={deg} points="0,-12 3.5,-4 0,0 -3.5,-4" fill="#facc15" stroke="#eab308" strokeWidth="1" transform={`rotate(${deg})`} />
              ))}
              <circle cx="0" cy="0" r="3.5" fill="#ca8a04" />
            </g>
            {/* 幼绿番茄小果 */}
            <g transform="translate(98, 72)">
              <circle cx="0" cy="0" r="11" fill="#86efac" stroke="#16a34a" strokeWidth="1.8" />
              <circle cx="-3" cy="-3" r="3.5" fill="#ffffff" opacity="0.7" />
              {[0, 72, 144, 216, 288].map((deg) => (
                <line key={deg} x1="0" y1="0" x2="0" y2="-9" stroke="#15803d" strokeWidth="2" strokeLinecap="round" transform={`rotate(${deg})`} />
              ))}
            </g>
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,135 Q80,130 145,135 L145,155 L15,155 Z" fill="#582403" />
            <path d="M80,135 Q82,85 75,42" stroke="#15803d" strokeWidth="6.5" strokeLinecap="round" fill="none" />
            {/* 大熟番茄 */}
            <g transform="translate(62, 78)">
              <circle cx="0" cy="0" r="23" fill="#dc2626" stroke="#991b1b" strokeWidth="2.2" />
              <circle cx="-7" cy="-7" r="6" fill="#f87171" opacity="0.8" />
              <circle cx="-7" cy="-7" r="3" fill="#ffffff" opacity="0.9" />
              {/* 五角星绿色萼片 */}
              {[0, 72, 144, 216, 288].map((deg) => (
                <path key={deg} d="M0,0 L-3,-10 L0,-14 L3,-10 Z" fill="#15803d" transform={`translate(0, -20) rotate(${deg})`} />
              ))}
            </g>
            {/* 串生第二颗番茄 */}
            <g transform="translate(104, 94)">
              <circle cx="0" cy="0" r="18" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.8" />
              <circle cx="-5" cy="-5" r="4.5" fill="#fca5a5" opacity="0.8" />
              <circle cx="-5" cy="-5" r="2.2" fill="#ffffff" opacity="0.9" />
              {[0, 72, 144, 216, 288].map((deg) => (
                <path key={deg} d="M0,0 L-2.5,-8 L0,-11 L2.5,-8 Z" fill="#15803d" transform={`translate(0, -15) rotate(${deg})`} />
              ))}
            </g>
          </svg>
        );
      }

    case 'strawberry':
      if (stage === 0) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,115 Q80,105 145,115 L145,155 L15,155 Z" fill="#582403" />
            <circle cx="80" cy="115" r="4" fill="#ca8a04" stroke="#78350f" strokeWidth="1.2" />
            <circle cx="81" cy="113" r="1.2" fill="#fef08a" />
          </svg>
        );
      } else if (stage === 1) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,125 Q80,120 145,125 L145,155 L15,155 Z" fill="#582403" />
            <path d="M80,125 Q70,95 65,75" stroke="#16a34a" strokeWidth="3.5" fill="none" />
            <path d="M80,125 Q90,95 95,75" stroke="#16a34a" strokeWidth="3.5" fill="none" />
            {/* 经典三出复叶 */}
            <g transform="translate(65, 70)">
              <ellipse cx="-13" cy="0" rx="11" ry="8" fill="#22c55e" stroke="#15803d" strokeWidth="1.2" transform="rotate(-30)" />
              <ellipse cx="13" cy="0" rx="11" ry="8" fill="#22c55e" stroke="#15803d" strokeWidth="1.2" transform="rotate(30)" />
              <ellipse cx="0" cy="-13" rx="12" ry="9" fill="#16a34a" stroke="#15803d" strokeWidth="1.2" />
            </g>
          </svg>
        );
      } else if (stage === 2) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,130 Q80,125 145,130 L145,155 L15,155 Z" fill="#582403" />
            <g transform="translate(80, 65)">
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse key={deg} cx="0" cy="-15" rx="10" ry="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.6" transform={`rotate(${deg})`} />
              ))}
              <circle cx="0" cy="0" r="9" fill="#facc15" stroke="#ca8a04" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="5.5" fill="#eab308" />
            </g>
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,135 Q80,130 145,135 L145,155 L15,155 Z" fill="#582403" />
            {/* 硕大鲜红心形草莓 */}
            <g transform="translate(80, 72)">
              <path d="M0,45 C-28,28 -30,-12 -16,-22 C-6,-30 0,-16 0,-16 C0,-16 6,-30 16,-22 C30,-12 28,28 0,45 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="2.2" />
              <path d="M-14,-6 Q-18,10 -9,24" stroke="#fca5a5" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              {/* 金黄瘦果种子点 */}
              {[-12, -6, 0, 6, 12].map((x) =>
                [-10, 0, 10, 20, 30].map((y) => (
                  <circle key={`${x}-${y}`} cx={x + (y % 20 === 0 ? 3 : -3)} cy={y} r="1.3" fill="#fde047" stroke="#ca8a04" strokeWidth="0.6" />
                ))
              )}
              {/* 顶部翠绿萼叶 */}
              {[-35, -15, 0, 15, 35].map((deg) => (
                <path key={deg} d="M0,-20 Q-5,-32 0,-36 Q5,-32 0,-20" fill="#15803d" transform={`rotate(${deg}, 0, -20)`} />
              ))}
            </g>
          </svg>
        );
      }

    case 'watermelon':
      if (stage === 0) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,115 Q80,105 145,115 L145,155 L15,155 Z" fill="#582403" />
            <ellipse cx="80" cy="115" rx="8" ry="4.5" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <circle cx="82" cy="114" r="1.2" fill="#cbd5e1" />
          </svg>
        );
      } else if (stage === 1) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,125 Q80,120 145,125 L145,155 L15,155 Z" fill="#582403" />
            <path d="M35,120 Q60,95 80,120 Q100,100 125,122" stroke="#16a34a" strokeWidth="4.5" fill="none" />
            <path d="M60,105 Q45,85 55,95 Q70,95 60,105" fill="#22c55e" stroke="#15803d" strokeWidth="1.2" />
            <path d="M100,105 Q115,85 105,95 Q90,95 100,105" fill="#16a34a" stroke="#15803d" strokeWidth="1.2" />
            {/* 卷须 */}
            <path d="M125,122 Q132,112 128,106 Q122,110 126,115" stroke="#16a34a" strokeWidth="1.8" fill="none" />
          </svg>
        );
      } else if (stage === 2) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,130 Q80,125 145,130 L145,155 L15,155 Z" fill="#582403" />
            <path d="M25,125 Q80,110 135,125" stroke="#15803d" strokeWidth="4.5" fill="none" />
            <g transform="translate(90, 105)">
              <ellipse cx="0" cy="0" rx="15" ry="12" fill="#4ade80" stroke="#16a34a" strokeWidth="1.8" />
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse key={deg} cx="0" cy="-15" rx="5.5" ry="8.5" fill="#facc15" stroke="#eab308" transform={`rotate(${deg})`} />
              ))}
              <circle cx="0" cy="0" r="3" fill="#ca8a04" />
            </g>
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,135 Q80,130 145,135 L145,155 L15,155 Z" fill="#582403" />
            {/* 虎皮大西瓜 */}
            <g transform="translate(80, 82)">
              <ellipse cx="0" cy="0" rx="36" ry="30" fill="#16a34a" stroke="#14532d" strokeWidth="2.5" />
              {[-22, -11, 0, 11, 22].map((x) => (
                <path key={x} d={`M${x},-28 Q${x - 6},0 ${x},28`} stroke="#052e16" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              ))}
              {/* 弯曲瓜柄 */}
              <path d="M0,-30 Q-6,-40 -14,-36" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            </g>
          </svg>
        );
      }

    case 'oak':
      if (stage === 0) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,115 Q80,105 145,115 L145,155 L15,155 Z" fill="#582403" />
            <g transform="translate(80, 108)">
              <ellipse cx="0" cy="9" rx="11" ry="15" fill="#92400e" stroke="#78350f" strokeWidth="1.8" />
              <path d="M-12,0 Q0,-14 12,0 Z" fill="#78350f" stroke="#451a03" strokeWidth="1.8" />
              <line x1="0" y1="-9" x2="0" y2="-14" stroke="#451a03" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          </svg>
        );
      } else if (stage === 1) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,120 Q80,115 145,120 L145,155 L15,155 Z" fill="#582403" />
            <path d="M80,120 Q78,90 80,58" stroke="#78350f" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            {/* 波浪羽裂橡树叶 */}
            <path d="M80,58 Q50,42 60,65 Q80,75 80,58" fill="#22c55e" stroke="#15803d" strokeWidth="1.8" />
            <path d="M80,68 Q110,52 100,75 Q80,85 80,68" fill="#16a34a" stroke="#15803d" strokeWidth="1.8" />
            {/* 强力直下主根 */}
            <path d="M80,120 L80,150 M80,132 Q70,142 65,147 M80,136 Q90,144 95,149" stroke="#92400e" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
        );
      } else if (stage === 2) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,135 Q80,130 145,135 L145,155 L15,155 Z" fill="#582403" />
            <path d="M72,135 L76,78 L84,78 L88,135 Z" fill="#78350f" stroke="#451a03" strokeWidth="2.2" />
            <circle cx="80" cy="52" r="34" fill="#16a34a" stroke="#15803d" strokeWidth="2.2" />
            <circle cx="60" cy="60" r="23" fill="#22c55e" />
            <circle cx="100" cy="60" r="23" fill="#15803d" />
            <circle cx="80" cy="38" r="25" fill="#4ade80" />
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,135 Q80,130 145,135 L145,155 L15,155 Z" fill="#582403" />
            <path d="M66,135 L73,68 L87,68 L94,135 Z" fill="#582403" stroke="#3b1d00" strokeWidth="2.5" />
            <g transform="translate(80, 48)">
              <circle cx="0" cy="0" r="44" fill="#14532d" stroke="#052e16" strokeWidth="2.5" />
              <circle cx="-26" cy="6" r="30" fill="#16a34a" />
              <circle cx="26" cy="6" r="30" fill="#15803d" />
              <circle cx="0" cy="-20" r="32" fill="#22c55e" />
              <circle cx="-14" cy="-10" r="24" fill="#4ade80" />
              {/* 挂在枝头的橡果 */}
              <circle cx="-22" cy="16" r="4.5" fill="#b45309" stroke="#78350f" strokeWidth="1" />
              <circle cx="20" cy="14" r="4.5" fill="#b45309" stroke="#78350f" strokeWidth="1" />
              <circle cx="2" cy="20" r="4.5" fill="#b45309" stroke="#78350f" strokeWidth="1" />
            </g>
          </svg>
        );
      }

    case 'corn':
      if (stage === 0) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,115 Q80,105 145,115 L145,155 L15,155 Z" fill="#582403" />
            <ellipse cx="80" cy="115" rx="8" ry="10" fill="#facc15" stroke="#ca8a04" strokeWidth="1.8" />
            <ellipse cx="78" cy="113" rx="3" ry="5" fill="#fef08a" />
          </svg>
        );
      } else if (stage === 1) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,125 Q80,120 145,125 L145,155 L15,155 Z" fill="#582403" />
            <path d="M80,125 L80,48" stroke="#16a34a" strokeWidth="6.5" strokeLinecap="round" />
            {/* 宽带互生平行叶 */}
            <path d="M80,98 Q38,82 28,98 Q58,92 80,98" fill="#22c55e" stroke="#15803d" strokeWidth="1.8" />
            <path d="M80,82 Q122,68 132,82 Q102,78 80,82" fill="#16a34a" stroke="#15803d" strokeWidth="1.8" />
          </svg>
        );
      } else if (stage === 2) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,135 Q80,130 145,135 L145,155 L15,155 Z" fill="#582403" />
            <path d="M80,135 L80,32" stroke="#15803d" strokeWidth="7.5" strokeLinecap="round" />
            {/* 顶端天花雄穗 */}
            <g transform="translate(80, 22)">
              <line x1="0" y1="10" x2="0" y2="-14" stroke="#eab308" strokeWidth="2.5" />
              <line x1="0" y1="0" x2="-12" y2="-12" stroke="#eab308" strokeWidth="2.5" />
              <line x1="0" y1="0" x2="12" y2="-12" stroke="#eab308" strokeWidth="2.5" />
            </g>
            {/* 侧生幼玉米与红丝 */}
            <ellipse cx="94" cy="74" rx="9" ry="17" fill="#86efac" stroke="#16a34a" strokeWidth="1.8" transform="rotate(20, 94, 74)" />
            <path d="M98,58 Q108,52 110,68" stroke="#ef4444" strokeWidth="2.2" fill="none" />
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,135 Q80,130 145,135 L145,155 L15,155 Z" fill="#582403" />
            {/* 黄金玉米棒 */}
            <g transform="translate(80, 72) rotate(-10)">
              <rect x="-15" y="-38" width="30" height="66" rx="15" fill="#facc15" stroke="#ca8a04" strokeWidth="2.2" />
              {/* 金黄籽粒点阵 */}
              {[-9, 0, 9].map((x) =>
                [-28, -18, -8, 2, 12, 22].map((y) => (
                  <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="3.2" ry="4" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
                ))
              )}
              {/* 包裹苞叶 */}
              <path d="M-15,22 Q-26,-10 -20,-38 Q-10,0 -15,22" fill="#4ade80" stroke="#15803d" strokeWidth="1.8" />
              <path d="M15,22 Q26,-10 20,-38 Q10,0 15,22" fill="#22c55e" stroke="#15803d" strokeWidth="1.8" />
            </g>
          </svg>
        );
      }

    case 'lotus':
      if (stage === 0) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,110 Q80,105 145,110 L145,155 L15,155 Z" fill="#0284c7" opacity="0.35" />
            <path d="M15,125 Q80,120 145,125 L145,155 L15,155 Z" fill="#1e293b" />
            <ellipse cx="80" cy="125" rx="9" ry="7" fill="#0f172a" stroke="#334155" strokeWidth="1.8" />
          </svg>
        );
      } else if (stage === 1) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,95 Q80,90 145,95 L145,155 L15,155 Z" fill="#0284c7" opacity="0.4" />
            {/* 浮水钱叶 */}
            <ellipse cx="80" cy="95" rx="36" ry="13" fill="#22c55e" stroke="#15803d" strokeWidth="2.2" />
            <ellipse cx="80" cy="95" rx="3.5" ry="2" fill="#ca8a04" />
            <circle cx="94" cy="93" r="2.5" fill="#ffffff" opacity="0.9" />
          </svg>
        );
      } else if (stage === 2) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,110 Q80,105 145,110 L145,155 L15,155 Z" fill="#0284c7" opacity="0.4" />
            <path d="M80,110 L80,52" stroke="#16a34a" strokeWidth="4.5" />
            {/* 尖尖角荷花蕾 */}
            <g transform="translate(80, 48)">
              <path d="M0,22 C-20,6 -14,-22 0,-32 C14,-22 20,6 0,22 Z" fill="#f472b6" stroke="#db2777" strokeWidth="1.8" />
              <path d="M0,20 C-9,6 -7,-16 0,-27 C7,-16 9,6 0,20 Z" fill="#fbcfe8" />
            </g>
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,120 Q80,115 145,120 L145,155 L15,155 Z" fill="#0284c7" opacity="0.4" />
            <path d="M80,120 L80,72" stroke="#15803d" strokeWidth="5.5" />
            {/* 圣洁大荷花盛开 */}
            <g transform="translate(80, 56)">
              {[-50, -25, 0, 25, 50].map((deg) => (
                <ellipse key={deg} cx="0" cy="-20" rx="12" ry="24" fill="#f472b6" stroke="#db2777" strokeWidth="1.8" transform={`rotate(${deg})`} />
              ))}
              {[-30, -10, 10, 30].map((deg) => (
                <ellipse key={deg} cx="0" cy="-16" rx="9" ry="20" fill="#fbcfe8" stroke="#f472b6" strokeWidth="1.2" transform={`rotate(${deg})`} />
              ))}
              <circle cx="0" cy="0" r="11" fill="#facc15" stroke="#ca8a04" strokeWidth="1.8" />
              <circle cx="-3" cy="-3" r="1.8" fill="#713f12" />
              <circle cx="3" cy="-3" r="1.8" fill="#713f12" />
              <circle cx="0" cy="3" r="1.8" fill="#713f12" />
            </g>
          </svg>
        );
      }

    case 'cactus':
      if (stage === 0) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,115 Q80,105 145,115 L145,155 L15,155 Z" fill="#ca8a04" opacity="0.6" />
            <circle cx="80" cy="115" r="3.5" fill="#0f172a" />
          </svg>
        );
      } else if (stage === 1) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,125 Q80,120 145,125 L145,155 L15,155 Z" fill="#ca8a04" opacity="0.7" />
            {/* 肉质胚轴球 */}
            <ellipse cx="80" cy="98" rx="15" ry="24" fill="#22c55e" stroke="#15803d" strokeWidth="2.2" />
            <line x1="65" y1="92" x2="58" y2="89" stroke="#fef08a" strokeWidth="1.8" />
            <line x1="95" y1="92" x2="102" y2="89" stroke="#fef08a" strokeWidth="1.8" />
            <line x1="67" y1="106" x2="60" y2="108" stroke="#fef08a" strokeWidth="1.8" />
            <line x1="93" y1="106" x2="100" y2="108" stroke="#fef08a" strokeWidth="1.8" />
          </svg>
        );
      } else if (stage === 2) {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,130 Q80,125 145,130 L145,155 L15,155 Z" fill="#ca8a04" opacity="0.7" />
            <rect x="65" y="62" width="30" height="70" rx="15" fill="#16a34a" stroke="#15803d" strokeWidth="2.2" />
            {/* 顶端娇艳花朵 */}
            <g transform="translate(80, 54)">
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <ellipse key={deg} cx="0" cy="-11" rx="5.5" ry="10" fill="#ec4899" stroke="#be185d" strokeWidth="1.2" transform={`rotate(${deg})`} />
              ))}
              <circle cx="0" cy="0" r="4.5" fill="#facc15" />
            </g>
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 160 160" className={`w-36 h-36 ${className}`}>
            <path d="M15,135 Q80,130 145,135 L145,155 L15,155 Z" fill="#ca8a04" opacity="0.7" />
            <g transform="translate(80, 92)">
              <rect x="-15" y="-58" width="30" height="96" rx="15" fill="#15803d" stroke="#14532d" strokeWidth="2.2" />
              {/* 左右侧掌节臂 */}
              <path d="M-15,-16 L-34,-16 Q-42,-16 -42,-26 L-42,-48" stroke="#15803d" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M-15,-16 L-34,-16 Q-42,-16 -42,-26 L-42,-48" stroke="#14532d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M15,-6 L34,-6 Q42,-6 42,-16 L42,-38" stroke="#15803d" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M15,-6 L34,-6 Q42,-6 42,-16 L42,-38" stroke="#14532d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              {/* 刺座与放射刺 */}
              {[-14, -4, 6, 16].map((y) => (
                <g key={y}>
                  <line x1="-15" y1={y} x2="-22" y2={y - 3} stroke="#fef08a" strokeWidth="1.8" />
                  <line x1="15" y1={y} x2="22" y2={y - 3} stroke="#fef08a" strokeWidth="1.8" />
                </g>
              ))}
            </g>
          </svg>
        );
      }

    default:
      return null;
  }
}

/** 🦋 昆虫高清矢量解剖与变态发育蜕变画板 (4 阶段全物种高清插画) */
export function InsectGraphicIllustration({ insectId, step, className = '' }: { insectId: string; step: number; className?: string }) {
  switch (insectId) {
    case 'butterfly':
      if (step === 0) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            {/* 嫩绿树叶背面 */}
            <path d="M15,70 Q70,15 125,70 Q70,125 15,70 Z" fill="#22c55e" stroke="#15803d" strokeWidth="2.5" />
            <path d="M15,70 Q70,68 125,70" stroke="#86efac" strokeWidth="2" fill="none" />
            {/* 晶莹圆润小蝶卵 */}
            <ellipse cx="60" cy="55" rx="6.5" ry="9" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
            <circle cx="62" cy="53" r="2" fill="#ffffff" />
            <ellipse cx="78" cy="62" rx="6" ry="8.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
            <circle cx="80" cy="60" r="1.8" fill="#ffffff" />
          </svg>
        );
      } else if (step === 1) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            {/* 啃食树枝与叶片 */}
            <line x1="15" y1="110" x2="125" y2="40" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />
            <g transform="translate(30, 60) rotate(-30)">
              {/* 毛毛虫多节体态 */}
              {[-12, 4, 20, 36, 52, 68].map((x, idx) => (
                <circle key={x} cx={x} cy={Math.sin(idx * 1.2) * 5} r="10.5" fill={idx === 5 ? '#f59e0b' : '#84cc16'} stroke="#4d7c0f" strokeWidth="1.8" />
              ))}
              {/* 头部与触须 */}
              <circle cx="72" cy="-2" r="3" fill="#1e293b" />
              <path d="M74,-6 Q80,-14 86,-12" stroke="#1e293b" strokeWidth="1.8" fill="none" />
              <path d="M72,-6 Q76,-16 80,-16" stroke="#1e293b" strokeWidth="1.8" fill="none" />
              {/* 短足 */}
              {[-8, 8, 24, 40].map((x) => (
                <line key={x} x1={x} y1="10" x2={x} y2="15" stroke="#4d7c0f" strokeWidth="2.2" strokeLinecap="round" />
              ))}
            </g>
          </svg>
        );
      } else if (step === 2) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            {/* 树枝 */}
            <line x1="20" y1="25" x2="120" y2="25" stroke="#78350f" strokeWidth="6.5" strokeLinecap="round" />
            {/* 倒挂丝柄与绿蝶蛹 */}
            <line x1="70" y1="25" x2="70" y2="42" stroke="#e2e8f0" strokeWidth="2.5" />
            <path d="M70,42 C50,52 48,92 70,118 C92,92 90,52 70,42 Z" fill="#84cc16" stroke="#4d7c0f" strokeWidth="2.5" />
            <path d="M58,62 Q70,72 82,62 M58,82 Q70,92 82,82" stroke="#4d7c0f" strokeWidth="1.8" fill="none" />
            {/* 金色斑点 */}
            <circle cx="70" cy="54" r="2.5" fill="#facc15" stroke="#ca8a04" strokeWidth="0.8" />
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <g transform="translate(70, 70)">
              {/* 左上与左下翅膀 */}
              <path d="M-4,-8 C-42,-48 -62,-18 -52,12 C-46,26 -22,16 -4,2 Z" fill="#ec4899" stroke="#be185d" strokeWidth="2" />
              <circle cx="-34" cy="-16" r="7.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" />
              <path d="M-4,4 C-38,18 -42,42 -22,46 C-8,48 -2,22 -4,4 Z" fill="#f43f5e" stroke="#be185d" strokeWidth="1.8" />
              {/* 右上与右下翅膀 */}
              <path d="M4,-8 C42,-48 62,-18 52,12 C46,26 22,16 4,2 Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="2" />
              <circle cx="34" cy="-16" r="7.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" />
              <path d="M4,4 C38,18 42,42 22,46 C8,48 2,22 4,4 Z" fill="#0ea5e9" stroke="#0284c7" strokeWidth="1.8" />
              {/* 蝴蝶身体与触角 */}
              <ellipse cx="0" cy="4" rx="4.5" ry="20" fill="#1e293b" />
              <circle cx="0" cy="-16" r="5.5" fill="#334155" />
              <path d="M-2,-20 Q-10,-32 -15,-30 M2,-20 Q10,-32 15,-30" stroke="#1e293b" strokeWidth="1.8" fill="none" />
            </g>
          </svg>
        );
      }

    case 'bee':
      if (step === 0) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            {/* 六边形蜂巢格 */}
            <polygon points="70,25 105,45 105,85 70,105 35,85 35,45" fill="#fef3c7" stroke="#d97706" strokeWidth="3" />
            {/* 晶莹蜂卵 */}
            <ellipse cx="70" cy="65" rx="6" ry="12" fill="#ffffff" stroke="#fcd34d" strokeWidth="1.8" />
            <ellipse cx="68" cy="62" rx="2" ry="5" fill="#ffffff" />
          </svg>
        );
      } else if (step === 1) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <polygon points="70,25 105,45 105,85 70,105 35,85 35,45" fill="#fef3c7" stroke="#d97706" strokeWidth="3" />
            {/* 乳白 C 型幼虫 */}
            <path d="M76,48 C56,48 50,82 76,82 C86,82 86,72 76,72 C66,72 66,58 76,58 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
            {/* 黄金花粉球 */}
            <circle cx="85" cy="55" r="4.5" fill="#f59e0b" />
          </svg>
        );
      } else if (step === 2) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <polygon points="70,25 105,45 105,85 70,105 35,85 35,45" fill="#fef3c7" stroke="#d97706" strokeWidth="3" />
            {/* 纯净蜂蜡封盖 */}
            <polygon points="70,30 100,47 100,83 70,100 40,83 40,47" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
            <text x="70" y="70" textAnchor="middle" fill="#78350f" fontSize="11" fontWeight="bold">封盖化蛹</text>
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <g transform="translate(70, 70)">
              {/* 蜜蜂黑黄条纹身体 */}
              <ellipse cx="0" cy="0" rx="23" ry="17" fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
              <path d="M-8,-15 L-8,15 M4,-16 L4,16 M-18,-9 L-18,9" stroke="#1e293b" strokeWidth="4.5" />
              {/* 半透明高频双翅 */}
              <ellipse cx="-10" cy="-22" rx="10" ry="19" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.5" opacity="0.85" transform="rotate(-30, -10, -22)" />
              <ellipse cx="10" cy="-22" rx="10" ry="19" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.5" opacity="0.85" transform="rotate(30, 10, -22)" />
              {/* 头部与复眼 */}
              <circle cx="23" cy="0" r="8.5" fill="#1e293b" />
              <circle cx="25" cy="-2" r="2.5" fill="#ffffff" />
              <path d="M27,-6 Q34,-14 38,-12" stroke="#1e293b" strokeWidth="1.8" fill="none" />
              {/* 尾刺与后腿花粉篮 */}
              <path d="M-23,0 L-30,0" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="-6" cy="18" r="4.5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
            </g>
          </svg>
        );
      }

    case 'ladybug':
      if (step === 0) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <path d="M15,70 Q70,15 125,70 Q70,125 15,70 Z" fill="#22c55e" stroke="#15803d" strokeWidth="2.5" />
            {/* 鹅黄卵群堆积 */}
            {[
              { x: 60, y: 55 }, { x: 70, y: 50 }, { x: 80, y: 55 },
              { x: 55, y: 68 }, { x: 65, y: 65 }, { x: 75, y: 68 }, { x: 85, y: 65 }
            ].map((p, i) => (
              <ellipse key={i} cx={p.x} cy={p.y} rx="4" ry="7" fill="#facc15" stroke="#ca8a04" strokeWidth="1.2" />
            ))}
          </svg>
        );
      } else if (step === 1) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <line x1="15" y1="90" x2="125" y2="50" stroke="#15803d" strokeWidth="4" />
            {/* 凶猛幼虫 (黑橙斑纹) */}
            <g transform="translate(65, 65)">
              <ellipse cx="0" cy="0" rx="22" ry="9" fill="#1e293b" stroke="#0f172a" strokeWidth="1.8" />
              {[-10, 0, 10].map((x) => (
                <circle key={x} cx={x} cy="0" r="3.5" fill="#f97316" />
              ))}
              {/* 头部与大颚 */}
              <circle cx="23" cy="0" r="5" fill="#0f172a" />
              <path d="M26,-3 L32,0 L26,3" stroke="#f97316" strokeWidth="1.8" fill="none" />
              {/* 捕食小蚜虫 */}
              <circle cx="38" cy="0" r="3" fill="#84cc16" />
            </g>
          </svg>
        );
      } else if (step === 2) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <path d="M15,70 Q70,25 125,70 Q70,115 15,70 Z" fill="#22c55e" stroke="#15803d" strokeWidth="2.5" />
            {/* 静止化蛹贴在叶片 */}
            <g transform="translate(70, 70)">
              <ellipse cx="0" cy="0" rx="16" ry="12" fill="#ea580c" stroke="#9a3412" strokeWidth="2" />
              <circle cx="-6" cy="-2" r="2.5" fill="#1e293b" />
              <circle cx="6" cy="-2" r="2.5" fill="#1e293b" />
              <circle cx="0" cy="4" r="2.5" fill="#1e293b" />
            </g>
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <g transform="translate(70, 70)">
              {/* 6 条敏捷爬行足 */}
              <path d="M-20,-15 L-32,-22 M-24,0 L-38,0 M-20,15 L-32,22 M20,-15 L32,-22 M24,0 L38,0 M20,15 L32,22" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" />
              {/* 鲜红半球形鞘翅 */}
              <circle cx="0" cy="0" r="29" fill="#ef4444" stroke="#991b1b" strokeWidth="2.5" />
              <line x1="0" y1="-29" x2="0" y2="29" stroke="#1e293b" strokeWidth="3" />
              {/* 经典七星斑点 */}
              {[-12, 12].map((x) =>
                [-14, 0, 14].map((y) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#1e293b" />
                ))
              )}
              <circle cx="0" cy="18" r="4" fill="#1e293b" />
              {/* 头部与复眼 */}
              <path d="M-15,-24 C-15,-35 15,-35 15,-24 Z" fill="#1e293b" />
              <circle cx="-7" cy="-29" r="2.2" fill="#ffffff" />
              <circle cx="7" cy="-29" r="2.2" fill="#ffffff" />
            </g>
          </svg>
        );
      }

    case 'ant':
      if (step === 0) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            {/* 地下深处恒温王宫 */}
            <rect x="15" y="25" width="110" height="90" rx="20" fill="#451a03" stroke="#291102" strokeWidth="3" />
            {/* 堆积微小蚁卵 */}
            {[
              { x: 55, y: 65 }, { x: 65, y: 60 }, { x: 75, y: 65 }, { x: 85, y: 60 },
              { x: 60, y: 75 }, { x: 70, y: 72 }, { x: 80, y: 75 }
            ].map((p, i) => (
              <ellipse key={i} cx={p.x} cy={p.y} rx="4" ry="6.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
            ))}
          </svg>
        );
      } else if (step === 1) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <rect x="15" y="25" width="110" height="90" rx="20" fill="#451a03" stroke="#291102" strokeWidth="3" />
            {/* 护卵工蚁搬运 */}
            <g transform="translate(60, 70)">
              <ellipse cx="-15" cy="0" rx="8" ry="6" fill="#1e293b" />
              <ellipse cx="0" cy="0" rx="5" ry="4" fill="#334155" />
              <ellipse cx="14" cy="0" rx="6" ry="5" fill="#1e293b" />
              {/* 大颚咬着白色幼虫 */}
              <ellipse cx="26" cy="0" rx="7" ry="4" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
            </g>
          </svg>
        );
      } else if (step === 2) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <rect x="15" y="25" width="110" height="90" rx="20" fill="#451a03" stroke="#291102" strokeWidth="3" />
            {/* 吐丝结茧 */}
            <ellipse cx="70" cy="70" rx="18" ry="12" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2.2" />
            <path d="M60,65 Q70,75 80,65" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,2" fill="none" />
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <g transform="translate(70, 70)">
              {/* 6 条强力足 */}
              <path d="M-8,-5 L-22,-18 M-8,0 L-26,0 M-8,5 L-22,18 M8,-5 L22,-18 M8,0 L26,0 M8,5 L22,18" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" />
              {/* 头胸腹三段式身体 */}
              <ellipse cx="-20" cy="0" rx="14" ry="11" fill="#0f172a" />
              <ellipse cx="0" cy="0" rx="8" ry="6" fill="#1e293b" />
              <ellipse cx="18" cy="0" rx="9" ry="8" fill="#0f172a" />
              {/* 触角与强力大颚 */}
              <path d="M24,-4 Q34,-14 30,-22 M24,4 Q34,14 30,22" stroke="#0f172a" strokeWidth="2.2" fill="none" />
              <path d="M26,-2 L34,0 L26,2" stroke="#f59e0b" strokeWidth="2" fill="none" />
            </g>
          </svg>
        );
      }

    case 'beetle':
      if (step === 0) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            {/* 腐殖土层 */}
            <rect x="15" y="25" width="110" height="90" rx="20" fill="#3b1d00" stroke="#291102" strokeWidth="3" />
            {/* 珍珠白圆卵 */}
            <circle cx="70" cy="70" r="10" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
            <circle cx="67" cy="67" r="3" fill="#f8fafc" />
          </svg>
        );
      } else if (step === 1) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <rect x="15" y="25" width="110" height="90" rx="20" fill="#3b1d00" stroke="#291102" strokeWidth="3" />
            {/* 肥硕 C 型蛴螬 */}
            <g transform="translate(70, 70)">
              <path d="M12,-18 C-18,-18 -22,22 12,22 C22,22 22,12 12,12 C-6,12 -6,-8 12,-8 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2.5" />
              <circle cx="16" cy="-14" r="5.5" fill="#ca8a04" />
            </g>
          </svg>
        );
      } else if (step === 2) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <rect x="15" y="25" width="110" height="90" rx="20" fill="#3b1d00" stroke="#291102" strokeWidth="3" />
            {/* 坚硬泥室中长出 Y 角的蛹 */}
            <g transform="translate(70, 75)">
              <ellipse cx="0" cy="0" rx="18" ry="26" fill="#b45309" stroke="#78350f" strokeWidth="2.2" />
              <path d="M0,-24 L0,-42 L-10,-52 M0,-42 L10,-52" stroke="#ca8a04" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <g transform="translate(70, 75)">
              {/* 粗壮倒钩足 */}
              <path d="M-16,-10 L-32,-22 M-18,5 L-36,5 M-16,20 L-32,32 M16,-10 L32,-22 M18,5 L38,5 M16,20 L32,32" stroke="#291102" strokeWidth="3.5" strokeLinecap="round" />
              {/* 黑曜石光滑鞘翅 */}
              <ellipse cx="0" cy="5" rx="25" ry="34" fill="#451a03" stroke="#291102" strokeWidth="2.5" />
              <line x1="0" y1="-29" x2="0" y2="39" stroke="#1e293b" strokeWidth="2.2" />
              {/* 前胸与威武分叉 Y 型主角 */}
              <ellipse cx="0" cy="-25" rx="19" ry="11" fill="#78350f" stroke="#451a03" strokeWidth="2" />
              <path d="M0,-26 L0,-56 L-15,-70 M0,-56 L15,-70" stroke="#78350f" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
          </svg>
        );
      }

    case 'firefly':
      if (step === 0) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            {/* 潮湿青苔与水草 */}
            <path d="M15,90 Q40,65 70,85 Q100,65 125,90 L125,120 L15,120 Z" fill="#15803d" stroke="#14532d" strokeWidth="2" />
            {/* 湿润青苔小卵 */}
            <circle cx="55" cy="80" r="5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
            <circle cx="72" cy="76" r="5.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
            <circle cx="88" cy="82" r="5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
          </svg>
        );
      } else if (step === 1) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <path d="M15,90 Q70,75 125,90 L125,120 L15,120 Z" fill="#15803d" />
            {/* 捕螺幼虫 (尾部发微光) */}
            <g transform="translate(60, 80)">
              <ellipse cx="0" cy="0" rx="18" ry="7" fill="#334155" />
              <circle cx="-16" cy="0" r="8" fill="#a3e635" opacity="0.6" />
              <circle cx="-16" cy="0" r="4" fill="#facc15" />
            </g>
          </svg>
        );
      } else if (step === 2) {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <rect x="25" y="35" width="90" height="70" rx="15" fill="#166534" stroke="#14532d" strokeWidth="2.5" />
            <ellipse cx="70" cy="70" rx="14" ry="20" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.8" />
            <circle cx="70" cy="82" r="6" fill="#a3e635" opacity="0.7" />
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
            <g transform="translate(70, 65)">
              {/* 浪漫黄绿冷光晕 */}
              <circle cx="0" cy="24" r="22" fill="#a3e635" opacity="0.45" />
              <circle cx="0" cy="24" r="11" fill="#facc15" />
              {/* 身体与前胸背板 */}
              <ellipse cx="0" cy="0" rx="15" ry="22" fill="#334155" stroke="#1e293b" strokeWidth="2.2" />
              <circle cx="0" cy="-20" r="9" fill="#ea580c" />
              {/* 翅膀 */}
              <ellipse cx="-13" cy="-5" rx="6.5" ry="18" fill="#64748b" opacity="0.85" transform="rotate(-20, -13, -5)" />
              <ellipse cx="13" cy="-5" rx="6.5" ry="18" fill="#64748b" opacity="0.85" transform="rotate(20, 13, -5)" />
            </g>
          </svg>
        );
      }

    default:
      return (
        <svg viewBox="0 0 140 140" className={`w-32 h-32 ${className}`}>
          <g transform="translate(70, 70)">
            <ellipse cx="0" cy="0" rx="18" ry="26" fill="#15803d" stroke="#14532d" strokeWidth="2" />
            <circle cx="0" cy="-22" r="10" fill="#16a34a" />
            <path d="M-6,-30 L-14,-42 M6,-30 L14,-42" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
            <path d="M-15,-10 L-30,-20 M-18,5 L-32,5 M-15,20 L-30,30 M15,-10 L30,-20 M18,5 L32,5 M15,20 L30,30" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </svg>
      );
  }
}


export const PLANT_SPECS: PlantSpec[] = [
  {
    id: 'sunflower',
    name: '金色向日葵',
    emoji: '🌻',
    themeColor: 'from-amber-400 to-yellow-500',
    bgGradient: 'from-amber-50 via-yellow-50 to-orange-50',
    funFact: '向日葵的花盘在早晨会朝向东方，随着太阳转动，到了傍晚就朝向西方，这叫作「向光性」！',
    rootType: '深扎主根系，牢牢固定高大茎秆并吸收深层地下水',
    stages: [
      {
        stageName: '泥土播种',
        emoji: '🌰',
        desc: '把饱满黑白条纹的葵花籽埋入松软温润的泥土中。',
        growthFactor: 0,
        realPhotoUrl: '/images/plants/sunflower_stage_0.jpg',
        realPhotoCaption: '真实微距实拍：饱满黑白向日葵籽在湿润肥沃泥土中吸水萌动',
      },
      {
        stageName: '破土萌芽',
        emoji: '🌱',
        desc: '在阳光和水分滋润下，小嫩芽顶开泥土探出翠绿的子叶！',
        growthFactor: 33,
        realPhotoUrl: '/images/plants/sunflower_stage_1.jpg',
        realPhotoCaption: '真实微距实拍：向日葵嫩芽破土而出，舒展翠绿对生子叶与细毛茎',
      },
      {
        stageName: '金黄绽放',
        emoji: '🌼',
        desc: '长出高高粗壮的花茎和巨大的金黄花盘，引来蜜蜂传粉。',
        growthFactor: 66,
        realPhotoUrl: '/images/plants/sunflower_stage_2.jpg',
        realPhotoCaption: '真实微距实拍：朝阳下盛开的金色向日葵大花盘与密布花粉管状花',
      },
      {
        stageName: '成熟结子',
        emoji: '🌻',
        desc: '花盘成熟结满沉甸甸的香脆葵花籽，金灿灿丰收啦！',
        growthFactor: 100,
        realPhotoUrl: '/images/plants/sunflower_stage_3.jpg',
        realPhotoCaption: '真实微距实拍：成熟花盘沉甸甸低垂，密密麻麻排列数千颗香脆葵花籽',
      },
    ],
  },
  {
    id: 'tomato',
    name: '多汁小番茄',
    emoji: '🍅',
    themeColor: 'from-rose-500 to-red-600',
    bgGradient: 'from-rose-50 via-pink-50 to-red-50',
    funFact: '番茄既是美味的水果，也是厨房里常吃的蔬菜，含有丰富的维生素C和番茄红素！',
    rootType: '广展侧根系，向四周泥土蔓延吸取矿物质',
    stages: [
      {
        stageName: '播撒细籽',
        emoji: '🌰',
        desc: '把小小的黄色番茄种子撒在湿润透气的土壤中。',
        growthFactor: 0,
        realPhotoUrl: '/images/plants/tomato_stage_0.jpg',
        realPhotoCaption: '真实微距实拍：番茄金黄种子在湿润沃土中萌发出洁白幼根',
      },
      {
        stageName: '抽枝长叶',
        emoji: '🌿',
        desc: '小番茄苗长出独特的羽状锯齿绿叶，并立起稳固支架。',
        growthFactor: 33,
        realPhotoUrl: '/images/plants/tomato_stage_1.jpg',
        realPhotoCaption: '真实微距实拍：番茄小苗舒展对生子叶与带腺毛的深裂真叶',
      },
      {
        stageName: '黄色小花',
        emoji: '✨🌸',
        desc: '枝头开出一朵朵嫩黄色的小花，花药紧紧聚拢。',
        growthFactor: 66,
        realPhotoUrl: '/images/plants/tomato_stage_2.jpg',
        realPhotoCaption: '真实微距实拍：番茄藤蔓盛开黄色五星小花与晶莹青色幼果',
      },
      {
        stageName: '红透果实',
        emoji: '🍅',
        desc: '青涩的小果子慢慢晒成红彤彤、酸甜多汁的大番茄！',
        growthFactor: 100,
        realPhotoUrl: '/images/plants/tomato_stage_3.jpg',
        realPhotoCaption: '真实微距实拍：成串红亮诱人、挂满露珠的饱满多汁大番茄',
      },
    ],
  },
  {
    id: 'strawberry',
    name: '甜美红草莓',
    emoji: '🍓',
    themeColor: 'from-red-400 to-pink-500',
    bgGradient: 'from-pink-50 via-rose-50 to-red-50',
    funFact: '草莓表面密密麻麻的小黄点，其实才是草莓真正的「小果实（瘦果）」哦！',
    rootType: '浅根须根系，紧贴土壤表层吸收露水',
    stages: [
      {
        stageName: '匍匐播种',
        emoji: '🌰',
        desc: '把草莓种子埋在透气的泥炭土中保持湿润避光。',
        growthFactor: 0,
        realPhotoUrl: '/images/plants/strawberry_stage_0.jpg',
        realPhotoCaption: '真实微距实拍：微小金褐草莓瘦果在湿润苔藓沃土中吸水破壳扎根',
      },
      {
        stageName: '三出复叶',
        emoji: '🌱',
        desc: '长出三片一组的心形锯齿绿叶和四处蔓延的匍匐茎。',
        growthFactor: 33,
        realPhotoUrl: '/images/plants/strawberry_stage_1.jpg',
        realPhotoCaption: '真实微距实拍：草莓带露珠的三出锯齿复叶与向外扎根的匍匐茎',
      },
      {
        stageName: '纯白小花',
        emoji: '🌼',
        desc: '盛开洁白的五瓣小花，花心是嫩黄的花蕊。',
        growthFactor: 66,
        realPhotoUrl: '/images/plants/strawberry_stage_2.jpg',
        realPhotoCaption: '真实微距实拍：盛开的纯白五瓣草莓花、金黄雄蕊与青绿花托幼果',
      },
      {
        stageName: '鲜红草莓',
        emoji: '🍓',
        desc: '草莓由白转粉、红透诱人，散发浓浓果香！',
        growthFactor: 100,
        realPhotoUrl: '/images/plants/strawberry_stage_3.jpg',
        realPhotoCaption: '真实微距实拍：鲜红晶莹欲滴、布满金黄瘦果的饱满成熟大草莓',
      },
    ],
  },
  {
    id: 'oak',
    name: '参天大橡树',
    emoji: '🌲',
    themeColor: 'from-emerald-600 to-green-700',
    bgGradient: 'from-emerald-50 via-teal-50 to-green-50',
    funFact: '橡树能活几百年甚至上千年，它结出的小橡果是松鼠最爱的冬眠美餐！',
    rootType: '磅礴深固木质根系，扎入岩石泥土深处数米',
    stages: [
      {
        stageName: '橡果入土',
        emoji: '🌰',
        desc: '一枚戴着可爱小帽子的坚硬橡果掉落在沃土里。',
        growthFactor: 0,
        realPhotoUrl: '/images/plants/oak_stage_0.jpg',
        realPhotoCaption: '真实微距实拍：坚硬古朴的橡果在潮湿青苔腐殖沃土中破壳扎下粗壮直根',
      },
      {
        stageName: '坚韧小苗',
        emoji: '🌱',
        desc: '破壳而出，扎下深固的木质根，长出波浪边橡树叶。',
        growthFactor: 33,
        realPhotoUrl: '/images/plants/oak_stage_1.jpg',
        realPhotoCaption: '真实微距实拍：橡树幼苗自橡果中破壳挺立，舒展波浪形嫩绿小橡叶',
      },
      {
        stageName: '枝繁叶茂',
        emoji: '🌳',
        desc: '树干越长越粗壮，树冠像一把巨大的绿伞庇护森林小动物。',
        growthFactor: 66,
        realPhotoUrl: '/images/plants/oak_stage_2.jpg',
        realPhotoCaption: '真实微距实拍：夏日阳光下苍翠繁茂、枝头孕育初生小橡果的茁壮橡树',
      },
      {
        stageName: '百年巨木',
        emoji: '🌲✨',
        desc: '结满累累橡果，成为森林里最巍峨古老的生命守护者！',
        growthFactor: 100,
        realPhotoUrl: '/images/plants/oak_stage_3.jpg',
        realPhotoCaption: '真实微距实拍：金秋阳光透过斑驳树影，古老参天橡树挂满金褐丰收橡果',
      },
    ],
  },
  {
    id: 'watermelon',
    name: '脆甜大西瓜',
    emoji: '🍉',
    themeColor: 'from-emerald-500 to-red-500',
    bgGradient: 'from-emerald-50 via-red-50 to-green-50',
    funFact: '西瓜果肉里含有 92% 的清甜水分，瓜皮上的深浅条纹就像天然的迷彩服！',
    rootType: '匍匐深广吸水根系，为庞大瓜果源源不断输水',
    stages: [
      {
        stageName: '黑亮瓜子',
        emoji: '🌰',
        desc: '黑亮的西瓜籽埋入沙质土壤，保持充足热量。',
        growthFactor: 0,
        realPhotoUrl: '/images/plants/watermelon_stage_0.jpg',
        realPhotoCaption: '真实微距实拍：扁平黑亮的饱满西瓜籽在温暖沙壤土中萌发出水灵嫩根',
      },
      {
        stageName: '爬蔓藤须',
        emoji: '🌿',
        desc: '长出长长的卷须藤蔓，在地面密密麻麻地铺展开来。',
        growthFactor: 33,
        realPhotoUrl: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '瓜田里卷曲蔓延的西瓜藤与掌状大绿叶',
      },
      {
        stageName: '金黄雌花',
        emoji: '🌼',
        desc: '藤蔓上开出金黄色小花，雌花底下自带一个小小的毛茸茸微型小瓜！',
        growthFactor: 66,
        realPhotoUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '西瓜雌花下带有毛茸茸的微型小青瓜纽',
      },
      {
        stageName: '脆甜大瓜',
        emoji: '🍉',
        desc: '吸收充足夏日阳光，长成圆滚滚、黑绿条纹的大西瓜！',
        growthFactor: 100,
        realPhotoUrl: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '成熟饱满的黑绿波浪条纹脆甜大西瓜与红瓤切面',
      },
    ],
  },
  {
    id: 'corn',
    name: '金黄甜玉米',
    emoji: '🌽',
    themeColor: 'from-yellow-400 to-amber-600',
    bgGradient: 'from-yellow-50 via-amber-50 to-orange-50',
    funFact: '每一根红褐色的玉米须，其实都连着一粒香甜的玉米粒，负责接收花粉！',
    rootType: '支持根（气生根）环抱地面，像脚架一样防风抗倒伏',
    stages: [
      {
        stageName: '金粒入土',
        emoji: '🌰',
        desc: '把金黄饱满的玉米种子播在温暖湿润的垄沟里。',
        growthFactor: 0,
        realPhotoUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '粒粒金黄干燥的甜玉米种子实拍',
      },
      {
        stageName: '修长剑叶',
        emoji: '🌱',
        desc: '拔节生长，长出像长剑一样笔挺排开的葱郁大绿叶。',
        growthFactor: 33,
        realPhotoUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '玉米田间挺拔拔节的剑状葱郁大绿叶',
      },
      {
        stageName: '吐丝授粉',
        emoji: '🌾',
        desc: '顶端抽出雄花序随风飘洒花粉，中间玉米苞吐出长长花丝！',
        growthFactor: 66,
        realPhotoUrl: 'https://images.unsplash.com/photo-1536657464919-892534f60d6e?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '玉米顶端雄花扬花与苞叶吐出红褐色细软玉米须',
      },
      {
        stageName: '饱满玉米',
        emoji: '🌽',
        desc: '玉米棒粒粒金黄饱满、香甜多汁，整整齐齐排满穗轴！',
        growthFactor: 100,
        realPhotoUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '剥开青绿苞叶、排布整齐晶莹的金黄甜玉米棒',
      },
    ],
  },
  {
    id: 'lotus',
    name: '水中圣洁荷花',
    emoji: '🪷',
    themeColor: 'from-pink-400 to-rose-500',
    bgGradient: 'from-sky-50 via-pink-50 to-cyan-50',
    funFact: '荷叶表面有微小的纳米级毛刺，水滴落上去会滚成水珠带走脏污，这叫作「荷叶效应」！',
    rootType: '水下淤泥莲藕肉质根，内含多个通气孔道',
    stages: [
      {
        stageName: '水底莲子',
        emoji: '🌰',
        desc: '坚硬圆滚的莲子沉入湖底沃泥中吸水膨胀。',
        growthFactor: 0,
        realPhotoUrl: 'https://images.unsplash.com/photo-1508873696983-2df57046475a?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '池塘沃泥中坚硬圆黑的成熟莲子',
      },
      {
        stageName: '浮叶出水',
        emoji: '🍃',
        desc: '小荷才露尖尖角，圆圆的翠绿荷叶漂浮在波光粼粼的水面。',
        growthFactor: 33,
        realPhotoUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '漂浮在碧波水面的圆圆翠绿荷叶与滚动晶莹水珠',
      },
      {
        stageName: '芙蓉盛开',
        emoji: '🪷',
        desc: '花梗亭亭玉立挺出水面，绽放出粉嫩高雅的荷花与嫩黄莲蓬！',
        growthFactor: 66,
        realPhotoUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '水面上亭亭玉立、含苞待放的粉嫩高洁荷花',
      },
      {
        stageName: '莲藕丰收',
        emoji: '🪷✨',
        desc: '花瓣落后结成莲蓬藏满莲子，水底淤泥里沉睡着肥美甜脆的莲藕！',
        growthFactor: 100,
        realPhotoUrl: 'https://images.unsplash.com/photo-1606293926075-69a00dbfde81?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '盛开水芙蓉露出生机莲蓬，水下孕育白嫩脆爽莲藕',
      },
    ],
  },
  {
    id: 'cactus',
    name: '沙漠神奇仙人掌',
    emoji: '🌵',
    themeColor: 'from-emerald-500 to-lime-600',
    bgGradient: 'from-amber-50 via-lime-50 to-emerald-50',
    funFact: '仙人掌身上的尖刺其实是它的退化叶子，用来防止水分蒸发和抵御渴求水源的动物！',
    rootType: '极其广袤的浅层吸水根网，暴雨落下瞬间吸干地表水',
    stages: [
      {
        stageName: '沙漠细种',
        emoji: '🌰',
        desc: '细小的种子埋入透气的粗砂颗粒土壤中。',
        growthFactor: 0,
        realPhotoUrl: 'https://images.unsplash.com/photo-1509223197845-458d87318791?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '干燥沙粒中的微型仙人掌细种',
      },
      {
        stageName: '肉质小掌',
        emoji: '🌱',
        desc: '长出肉乎乎的小茎节，表面开始萌发细软的小刺。',
        growthFactor: 33,
        realPhotoUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '萌发肉嘟嘟绿色小掌节与细密小刺的幼苗',
      },
      {
        stageName: '沙漠奇花',
        emoji: '🌸',
        desc: '在干旱顶端奇迹般绽放出艳丽娇嫩的红黄色大花！',
        growthFactor: 66,
        realPhotoUrl: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '仙人掌肉茎顶端奇迹般盛开的艳丽火红沙漠花',
      },
      {
        stageName: '仙人掌树',
        emoji: '🌵✨',
        desc: '肉质茎储藏成百上千斤甘泉，成为沙漠里最坚强的绿洲卫士！',
        growthFactor: 100,
        realPhotoUrl: 'https://images.unsplash.com/photo-1508873696983-2df57046475a?w=800&auto=format&fit=crop&q=80',
        realPhotoCaption: '烈日荒漠中傲立千年的雄壮巨型多分支仙人掌树',
      },
    ],
  },
];

// ── 昆虫物种与 4 阶段变态发育 ──
export interface InsectStageInfo {
  title: string;
  emoji: string;
  desc: string;
}

export interface InsectSpec {
  id: string;
  name: string;
  emoji: string;
  metamorphosisType: '完全变态 (卵-幼虫-蛹-成虫)' | '不完全变态 (卵-若虫-成虫)';
  cycleStages: [InsectStageInfo, InsectStageInfo, InsectStageInfo, InsectStageInfo];
  funFact: string;
  anatomyDetail: {
    head: string;
    thorax: string;
    abdomen: string;
  };
}

export const INSECT_SPECS: InsectSpec[] = [
  {
    id: 'butterfly',
    name: '彩蝶破茧羽化',
    emoji: '🦋',
    metamorphosisType: '完全变态 (卵-幼虫-蛹-成虫)',
    cycleStages: [
      { title: '① 翠绿虫卵', emoji: '🥚', desc: '蝴蝶妈妈把小小的卵产在嫩绿的树叶背面，安全避开天敌。' },
      { title: '② 贪吃毛毛虫', emoji: '🐛', desc: '孵化成幼虫，大口吃树叶快速长大，蜕皮数次储备丰沛营养。' },
      { title: '③ 结茧成蛹', emoji: '🪺', desc: '把自己倒挂在树枝上，形成神奇的保护蛹，在里面进行全身细胞重组蜕变。' },
      { title: '④ 破茧展翅', emoji: '🦋', desc: '美丽的蝴蝶破茧而出，晾干带有绚丽鳞片的翅膀飞向花丛采蜜！' },
    ],
    funFact: '蝴蝶是用脚上的味觉感受器来品尝叶子味道的哦！',
    anatomyDetail: {
      head: '一对长长的触角用来闻花香，一对大复眼和可以卷起来的吸管口器',
      thorax: '胸部长有 3 对足和 2 对覆盖着微小彩色鳞片的漂亮大翅膀',
      abdomen: '柔软的腹部两侧布满微小的气门呼吸孔，负责呼吸空气',
    },
  },
  {
    id: 'bee',
    name: '蜜蜂采蜜与筑巢',
    emoji: '🐝',
    metamorphosisType: '完全变态 (卵-幼虫-蛹-成虫)',
    cycleStages: [
      { title: '① 蜂卵孵化', emoji: '🥚', desc: '蜂王在精密的六边形蜂房中产下一颗晶莹剔透的卵。' },
      { title: '② 工蜂喂养', emoji: '🐛', desc: '工蜂姐姐用营养的花粉和蜂王浆细心喂养乳白色的幼虫。' },
      { title: '③ 封盖化蛹', emoji: '🪺', desc: '用纯净蜂蜡盖上小房间，幼虫安静化蛹蜕变成强壮成虫。' },
      { title: '④ 飞舞采蜜', emoji: '🐝🌸', desc: '小蜜蜂飞向花海收集花粉花蜜，并在后腿花粉篮里装满黄金花粉！' },
    ],
    funFact: '蜜蜂会通过跳“8字摇摆舞”来告诉同伴哪里有甜美的花蜜！',
    anatomyDetail: {
      head: '发达复眼能看到紫外线花朵图案，灵敏触角感知蜂王信息素',
      thorax: '高速振动的高频双翅（每秒振翅 230 次）与后腿花粉篮刷毛',
      abdomen: '尾部带有分泌蜂蜡的蜡腺以及防卫蜂针',
    },
  },
  {
    id: 'ladybug',
    name: '七星瓢虫森林卫士',
    emoji: '🐞',
    metamorphosisType: '完全变态 (卵-幼虫-蛹-成虫)',
    cycleStages: [
      { title: '① 鹅黄卵群', emoji: '🥚', desc: '瓢虫妈妈在有蚜虫出没的叶片旁产下一堆金黄色小卵。' },
      { title: '② 凶猛幼虫', emoji: '🐛', desc: '幼虫形如小鳄鱼，胃口极大，专门大口捕食危害农作物的害虫蚜虫。' },
      { title: '③ 静止化蛹', emoji: '🪺', desc: '幼虫尾部牢牢贴在叶片表面静止化蛹，外壳逐渐变坚硬。' },
      { title: '④ 鲜红鞘翅', emoji: '🐞🌿', desc: '蜕变为鲜红带有七颗黑斑的美丽瓢虫，守护整座庄稼森林！' },
    ],
    funFact: '七星瓢虫是著名的大自然益虫，一只瓢虫一生能吃掉上千只蚜虫！',
    anatomyDetail: {
      head: '短触角与坚韧咀嚼式口器，能够迅速咬碎蚜虫外壳',
      thorax: '坚硬如盾牌的鲜红鞘翅保护内部薄薄的飞行膜翅，6 条敏捷爬行足',
      abdomen: '受到惊吓时腹部会分泌黄色苦味液体来吓跑鸟类天敌',
    },
  },
  {
    id: 'ant',
    name: '蚂蚁地下迷宫城堡',
    emoji: '🐜',
    metamorphosisType: '完全变态 (卵-幼虫-蛹-成虫)',
    cycleStages: [
      { title: '① 蚁后产卵', emoji: '🥚', desc: '蚁后在地下深处温暖恒温的王宫里产下细小的蚁卵。' },
      { title: '② 护卵工蚁', emoji: '🍼', desc: '工蚁姐姐把幼虫搬运到适宜湿度的育儿室悉心喂食。' },
      { title: '③ 结茧蜕变', emoji: '🪺', desc: '幼虫吐丝结成白色的椭圆小茧，在里面长出六条强壮的足。' },
      { title: '④ 地下城堡', emoji: '🐜🏰', desc: '蚂蚁分工合作修建粮仓、托儿所与通风道，建造庞大地下帝国！' },
    ],
    funFact: '蚂蚁能举起超过自身体重 50 倍的重物，是自然界名副其实的“大力士”！',
    anatomyDetail: {
      head: '膝状弯曲触角用来互相碰触交流信息，强有力的大颚可搬运重物',
      thorax: '胸部肌肉极度发达，连接六条带抓钩的强劲爬行足',
      abdomen: '细腰连接着圆鼓鼓的腹部，内含消化嗉囊用于与同伴分享食物',
    },
  },
  {
    id: 'beetle',
    name: '独角仙铁甲斗士',
    emoji: '🪲',
    metamorphosisType: '完全变态 (卵-幼虫-蛹-成虫)',
    cycleStages: [
      { title: '① 腐殖土卵', emoji: '🥚', desc: '雌虫在森林深处松软肥沃的落叶腐殖土中产下珍珠般的圆卵。' },
      { title: '② 肥硕蛴螬', emoji: '🐛', desc: '幼虫在泥土里啃食腐叶，越长越肥硕，蜷缩成可爱的 C 字形。' },
      { title: '③ 雄壮长角蛹', emoji: '🪺', desc: '在泥土里建造坚硬泥室化蛹，头上长出雄壮威武的 Y 形分叉角！' },
      { title: '④ 铁甲战车', emoji: '🪲🌳', desc: '羽化成为全身披着黑褐色铠甲的独角仙，在树干上品尝甜美树汁！' },
    ],
    funFact: '雄性独角仙的巨大角虽然威风凛凛，但它不咬人，只用于在树干上与对手角斗！',
    anatomyDetail: {
      head: '雄虫头顶长有威武的 Y 字形主角与胸角，能够将对手轻松挑飞',
      thorax: '如同黑曜石般坚硬的光滑鞘翅铠甲，保护下方的宽大折叠膜翅',
      abdomen: '腹部粗壮厚实，足部末端带有锋利倒钩能牢牢抓紧树皮',
    },
  },
  {
    id: 'firefly',
    name: '夜光萤火虫冷光',
    emoji: '💡',
    metamorphosisType: '完全变态 (卵-幼虫-蛹-成虫)',
    cycleStages: [
      { title: '① 湿润水边卵', emoji: '🥚', desc: '萤火虫妈妈把卵产在清澈溪流边潮湿的青苔和泥土中。' },
      { title: '② 捕螺幼虫', emoji: '🐛', desc: '幼虫生活在水边捕食蜗牛与小螺，腹部尾端就会发出微弱荧光！' },
      { title: '③ 青苔化蛹', emoji: '🪺', desc: '在湿润的青苔下造小土室化蛹，静静等待夏夜的到来。' },
      { title: '④ 闪烁流萤', emoji: '💡✨', desc: '成虫在夏夜微风中翩翩起舞，尾部发出黄绿色的浪漫冷光灯信号！' },
    ],
    funFact: '萤火虫发出的光几乎 100% 转化为光能，几乎不产生热量，是真正的高效「冷光源」！',
    anatomyDetail: {
      head: '头部常隐藏在前胸背板下方，触角感知空气湿度',
      thorax: '前胸背板宽大呈半圆形，质地柔软的皮革质鞘翅',
      abdomen: '腹部末端特化出发光器官，荧光素酶与氧气反应发出冷光',
    },
  },
  {
    id: 'dragonfly',
    name: '飞天蜻蜓复眼之王',
    emoji: '🪰',
    metamorphosisType: '不完全变态 (卵-若虫-成虫)',
    cycleStages: [
      { title: '① 蜻蜓点水卵', emoji: '🥚', desc: '蜻蜓点水将卵产入清澈水草中，受水温滋养。' },
      { title: '② 水下水虿', emoji: '🦂', desc: '孵化成水虿若虫，潜伏在水底捕食小鱼小虾，用下唇面罩迅速捕食。' },
      { title: '③ 爬出水面', emoji: '🌿', desc: '若虫顺着芦苇水草爬出水面，背部裂开蜕去外壳。' },
      { title: '④ 空中霸王', emoji: '🪰💨', desc: '展开 4 片透明网状大翅膀，能悬停、倒飞，时速可达 50 公里！' },
    ],
    funFact: '蜻蜓的复眼由 28,000 只小眼组成，视野几乎是 360 度全景无死角！',
    anatomyDetail: {
      head: '巨大的半球形复眼占据几乎整个头部，灵敏感知光影与距离',
      thorax: '强壮的飞行肌肉驱动前后 2 对独立运动的高速透明翅膀',
      abdomen: '修长圆筒状的腹部用于在飞行中保持身体极度平衡',
    },
  },
  {
    id: 'mantis',
    name: '捕食螳螂绿色猎手',
    emoji: '🦗',
    metamorphosisType: '不完全变态 (卵-若虫-成虫)',
    cycleStages: [
      { title: '① 泡沫卵鞘', emoji: '🥚', desc: '秋天在树枝上产下一团像海绵泡沫一样的坚硬卵鞘（螵蛸）越冬。' },
      { title: '② 迷你若虫', emoji: '🦗', desc: '春天数十只迷你小螳螂从卵鞘中钻出，形态与成虫极为相似。' },
      { title: '③ 多次蜕皮', emoji: '🌱', desc: '随着捕食成长，小螳螂蜕皮 6~8 次，慢慢长出翅芽。' },
      { title: '④ 森林刺客', emoji: '🦗🌿', desc: '全身翠绿伪装成树叶，前足高高举起像在祈祷，0.05 秒闪电捕食！' },
    ],
    funFact: '螳螂是唯一一种能够把头转动 180 度四处张望的昆虫！',
    anatomyDetail: {
      head: '三角形头部极度灵活，可自由 180 度旋转，视力极佳',
      thorax: '前胸极度延长，第一对前足特化为布满利刺的折叠大镰刀',
      abdomen: '肥厚的腹部紧贴翅膀下方，能完美拟态成绿叶或枯枝',
    },
  },
];

// ── 自然小博士 6 关生态闯关题库 ──
interface EcoQuizItem {
  id: string;
  category: '植物' | '昆虫' | '生态';
  emoji: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

const ECO_QUIZ_LIST: EcoQuizItem[] = [
  {
    id: 'eq1',
    category: '植物',
    emoji: '☀️',
    question: '绿色植物的叶片吸收阳光和二氧化碳，制造养分并释放什么气体？',
    options: ['氧气', '灰尘', '水汽', '氮气'],
    answer: '氧气',
    explanation: '植物在阳光下进行神奇的光合作用，吸收二氧化碳并释放新鲜纯净的蓝色氧气！',
  },
  {
    id: 'eq2',
    category: '昆虫',
    emoji: '🦋',
    question: '蝴蝶的一生要经历卵、幼虫、蛹和成虫四个阶段，这种发育叫作？',
    options: ['完全变态发育', '不完全变态', '直接生长', '光合作用'],
    answer: '完全变态发育',
    explanation: '蝴蝶幼虫（毛毛虫）与成虫（蝴蝶）形态差异极大，经过结蛹蜕变，属于完全变态！',
  },
  {
    id: 'eq3',
    category: '生态',
    emoji: '🐝',
    question: '蜜蜂飞到向日葵花盘上采集花蜜，同时也帮向日葵完成了什么重要任务？',
    options: ['传粉受精', '除草', '浇水', '遮阳'],
    answer: '传粉受精',
    explanation: '蜜蜂身上沾满花粉，在不同花朵间飞舞传递花粉，帮助植物结出果实！',
  },
  {
    id: 'eq4',
    category: '昆虫',
    emoji: '🐞',
    question: '被称作庄稼森林小卫士、专门捕食害虫蚜虫的益虫是？',
    options: ['七星瓢虫', '蚊子', '苍蝇', '蝗虫'],
    answer: '七星瓢虫',
    explanation: '七星瓢虫不管是幼虫还是成虫，都是消灭农作物蚜虫的大英雄！',
  },
  {
    id: 'eq5',
    category: '植物',
    emoji: '🌵',
    question: '沙漠里的仙人掌身上的硬刺，其实是由什么结构退化变来的？',
    options: ['叶子', '花朵', '根系', '果肉'],
    answer: '叶子',
    explanation: '仙人掌把叶子退化成尖刺，可以最大程度减少水分蒸腾，适应干旱沙漠！',
  },
  {
    id: 'eq6',
    category: '昆虫',
    emoji: '🐜',
    question: '昆虫的身体在生物学上通常清晰地分为哪三个主要部分？',
    options: ['头、胸、腹', '头、颈、尾', '手、脚、身体', '壳、翅膀、尾巴'],
    answer: '头、胸、腹',
    explanation: '所有昆虫都有清晰的「头（触角复眼）、胸（6足双翅）、腹（呼吸气门）」三段式结构！',
  },
];

export type LabMainMode = 'plant' | 'insect' | 'microscope' | 'symbiosis' | 'quiz';

export function BotanicalLab() {
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);

  const [mode, setMode] = useState<LabMainMode>('plant');
  const [plantIdx, setPlantIdx] = useState(0);
  const [plantStage, setPlantStage] = useState<PlantStage>(0);
  const [waterLevel, setWaterLevel] = useState(45);
  const [sunLevel, setSunLevel] = useState(45);
  const [nutrientLevel, setNutrientLevel] = useState(45);
  const [isNight, setIsNight] = useState(false);
  const [streak, setStreak] = useState(0);

  // 连续物候延时生长状态 (Continuous Phenology & Time-Lapse)
  const [growthDay, setGrowthDay] = useState(0); // 0 to 110
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const [plantViewMode, setPlantViewMode] = useState<'timelapse' | 'photo'>('timelapse');

  const currentPlant = useMemo(() => {
    return PLANT_SPECS[plantIdx % PLANT_SPECS.length] ?? PLANT_SPECS[0]!;
  }, [plantIdx]);

  const activePhenologyStages = useMemo(() => {
    return PLANT_PHENOLOGY_MAP[currentPlant.id] ?? SUNFLOWER_BBCH_STAGES;
  }, [currentPlant.id]);

  const currentPhenologyStage = useMemo(() => {
    return (
      activePhenologyStages.find((s) => growthDay >= s.dayStart && growthDay <= s.dayEnd) ??
      activePhenologyStages[activePhenologyStages.length - 1]!
    );
  }, [activePhenologyStages, growthDay]);

  const currentPlantHeight = useMemo(() => {
    const stage = currentPhenologyStage;
    const progressInStage = stage.dayEnd === stage.dayStart ? 1 : (growthDay - stage.dayStart) / (stage.dayEnd - stage.dayStart);
    const prevStage = activePhenologyStages[stage.stageIndex - 1];
    const prevHeight = prevStage ? prevStage.heightCm : 0;
    return Math.round(prevHeight + (stage.heightCm - prevHeight) * Math.min(1, Math.max(0, progressInStage)));
  }, [currentPhenologyStage, activePhenologyStages, growthDay]);

  const currentRootDepth = useMemo(() => {
    const stage = currentPhenologyStage;
    const progressInStage = stage.dayEnd === stage.dayStart ? 1 : (growthDay - stage.dayStart) / (stage.dayEnd - stage.dayStart);
    const prevStage = activePhenologyStages[stage.stageIndex - 1];
    const prevDepth = prevStage ? prevStage.rootDepthCm : 0;
    return Math.round(prevDepth + (stage.rootDepthCm - prevDepth) * Math.min(1, Math.max(0, progressInStage)));
  }, [currentPhenologyStage, activePhenologyStages, growthDay]);

  // 同步 plantStage 0..3 用于兼容旧逻辑
  useEffect(() => {
    if (growthDay <= 10) setPlantStage(0);
    else if (growthDay <= 45) setPlantStage(1);
    else if (growthDay <= 75) setPlantStage(2);
    else setPlantStage(3);
  }, [growthDay]);

  // 延时摄影自动播放循环
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      const maxDays = activePhenologyStages[activePhenologyStages.length - 1]?.dayEnd ?? 110;
      const intervalMs = Math.round(160 / playbackSpeed);
      timer = setInterval(() => {
        setGrowthDay((prev) => {
          if (prev >= maxDays) {
            setIsPlaying(false);
            sfxWin();
            celebrateBig();
            void speak(`${currentPlant.name}全生命周期完整成熟！进入大丰收！`, { lang: 'zh-CN' });
            return maxDays;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, activePhenologyStages, currentPlant]);

  // 昆虫生态模式
  const [insectIdx, setInsectIdx] = useState(0);
  const [insectStep, setInsectStep] = useState(0);

  // 显微镜解构模式
  const [microscopeTarget, setMicroscopeTarget] = useState<'leaf' | 'root' | 'insectAnatomy'>('leaf');
  const [stomaTurgid, setStomaTurgid] = useState(true);
  const [rootZone, setRootZone] = useState<'cap' | 'meristem' | 'elongation' | 'hair'>('hair');

  // 共生互动模式状态
  const [symbiosisAction, setSymbiosisAction] = useState<string | null>(null);

  // 问答模式状态
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  // 生理学化学反应与能量转化速率计算 (Physiological Chemistry & Physics)
  const photosynthesisRate = useMemo(() => {
    if (isNight) return 0;
    const base = Math.min(sunLevel, waterLevel);
    return Math.round(base * (1 + nutrientLevel / 200));
  }, [isNight, sunLevel, waterLevel, nutrientLevel]);

  const respirationRate = useMemo(() => {
    return isNight ? Math.round(nutrientLevel * 0.8 + 20) : Math.round(nutrientLevel * 0.3 + 10);
  }, [isNight, nutrientLevel]);

  const transpirationPull = useMemo(() => {
    if (isNight) return 5;
    return Math.round(sunLevel * 0.6 + waterLevel * 0.4);
  }, [isNight, sunLevel, waterLevel]);

  const currentInsect = useMemo(() => {
    return INSECT_SPECS[insectIdx % INSECT_SPECS.length] ?? INSECT_SPECS[0]!;
  }, [insectIdx]);

  const currentQuiz = useMemo(() => {
    return ECO_QUIZ_LIST[quizIdx % ECO_QUIZ_LIST.length] ?? ECO_QUIZ_LIST[0]!;
  }, [quizIdx]);

  // ── WebAudio 自然声景合成器 ──
  const playWaterSfx = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      [600, 900, 1400].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const offset = idx * 0.05;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + offset);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + offset + 0.1);
        gain.gain.setValueAtTime(0.12, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
      });
    } catch { /* audio context may fail silently */ }
  }, []);

  const playSunSfx = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const offset = idx * 0.06;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.1, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.25);
      });
    } catch { /* audio context may fail silently */ }
  }, []);

  const playNutrientSfx = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch { /* audio context may fail silently */ }
  }, []);

  const playSoilSfx = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch { /* audio context may fail silently */ }
  }, []);

  const playInsectFlutterSfx = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.1);
      osc.frequency.linearRampToValueAtTime(660, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch { /* audio context may fail silently */ }
  }, []);

  const playBeeBuzzSfx = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(230, now);
      osc.frequency.linearRampToValueAtTime(260, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch { /* audio context may fail silently */ }
  }, []);

  // 培育交互逻辑
  const handleWater = useCallback(() => {
    sfxTap();
    triggerHaptic(40);
    playWaterSfx();
    const nextWater = Math.min(100, waterLevel + 35);
    setWaterLevel(nextWater);
    setGrowthDay((d) => Math.min(110, d + 4));
    addStars(1);
    practice('science:botanical-lab', true, 1, 1);
    void speak('浇透清澈的水分！土壤湿润甘甜，根系全速向上泵水！', { lang: 'zh-CN' });
    checkGrowth(nextWater, sunLevel, nutrientLevel);
  }, [waterLevel, sunLevel, nutrientLevel, addStars, practice, playWaterSfx, plantStage]);

  const handleSunlight = useCallback(() => {
    sfxTap();
    triggerHaptic(40);
    playSunSfx();
    const nextSun = Math.min(100, sunLevel + 35);
    setSunLevel(nextSun);
    setGrowthDay((d) => Math.min(110, d + 4));
    addStars(1);
    practice('science:botanical-lab', true, 1, 1);
    void speak('阳光普照！植物叶绿体吸收光子能量，光合作用全速运转！', { lang: 'zh-CN' });
    checkGrowth(waterLevel, nextSun, nutrientLevel);
  }, [waterLevel, sunLevel, nutrientLevel, addStars, practice, playSunSfx, plantStage]);

  const handleFertilizer = useCallback(() => {
    sfxTap();
    triggerHaptic(45);
    playNutrientSfx();
    const nextNutrient = Math.min(100, nutrientLevel + 35);
    setNutrientLevel(nextNutrient);
    setGrowthDay((d) => Math.min(110, d + 5));
    addStars(1);
    practice('science:botanical-lab', true, 1, 1);
    void speak('施加有机沃土养分！氮磷钾矿物质注入根系，加速细胞分裂拔节！', { lang: 'zh-CN' });
    checkGrowth(waterLevel, sunLevel, nextNutrient);
  }, [waterLevel, sunLevel, nutrientLevel, addStars, practice, playNutrientSfx, plantStage]);

  const handleSoilLoosen = useCallback(() => {
    sfxTap();
    triggerHaptic(40);
    playSoilSfx();
    const nextWater = Math.min(100, waterLevel + 15);
    const nextNutrient = Math.min(100, nutrientLevel + 15);
    setWaterLevel(nextWater);
    setNutrientLevel(nextNutrient);
    setGrowthDay((d) => Math.min(110, d + 3));
    addStars(1);
    practice('science:botanical-lab', true, 1, 1);
    void speak('翻土松土！泥土透气性大大增强，根系畅快呼吸向下深扎！', { lang: 'zh-CN' });
    checkGrowth(nextWater, sunLevel, nextNutrient);
  }, [waterLevel, sunLevel, nutrientLevel, addStars, practice, playSoilSfx, plantStage]);

  const checkGrowth = (w: number, s: number, n: number) => {
    if (w >= 65 && s >= 65 && n >= 65 && plantStage < 3) {
      const nextStage = (plantStage + 1) as PlantStage;
      setPlantStage(nextStage);
      setWaterLevel(35);
      setSunLevel(35);
      setNutrientLevel(35);
      celebrateSmall();

      if (nextStage === 3) {
        sfxWin();
        celebrateBig();
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        addStars(2);
        practice('science:botanical-lab', true, 2, 1);
        void speak(`太棒啦！${currentPlant.name}成熟丰收啦！${currentPlant.funFact}`, { lang: 'zh-CN' });
      } else {
        const info = currentPlant.stages[nextStage];
        void speak(`升级啦！进入【${info.stageName}】：${info.desc}`, { lang: 'zh-CN' });
      }
    }
  };

  // 问答处理
  const handleAnswerQuiz = useCallback((option: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option);

    if (option === currentQuiz.answer) {
      sfxCorrect();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      addStars(1);
      practice('science:botanical-quiz', true, 2, 1);

      if (nextStreak >= 3) {
        sfxWin();
        celebrateBig();
      } else {
        celebrateSmall();
      }
      void speak(`回答正确！${currentQuiz.explanation}`, { lang: 'zh-CN' });
    } else {
      sfxWrong();
      setStreak(0);
      void speak(`答错啦，正确答案是【${currentQuiz.answer}】。${currentQuiz.explanation}`, {
        lang: 'zh-CN',
      });
    }
  }, [selectedAnswer, currentQuiz, streak, addStars, practice]);

  const handleNextQuiz = () => {
    sfxTap();
    setSelectedAnswer(null);
    setQuizIdx((i) => (i + 1) % ECO_QUIZ_LIST.length);
  };

  // 键盘快捷控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (mode === 'plant') {
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          setIsPlaying((p) => !p);
          triggerHaptic(25);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setGrowthDay((d) => Math.min(110, d + 3));
          triggerHaptic(20);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setGrowthDay((d) => Math.max(0, d - 3));
          triggerHaptic(20);
        } else if (e.key === '1') {
          handleWater();
        } else if (e.key === '2') {
          handleSunlight();
        } else if (e.key === '3') {
          handleFertilizer();
        } else if (e.key === '4') {
          handleSoilLoosen();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleWater, handleSunlight, handleFertilizer, handleSoilLoosen]);

  return (
    <div className="space-y-4 text-slate-800">
      {/* 顶部主模式导航 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="自然实验室模式切换">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'plant'}
            onClick={() => {
              sfxTap();
              triggerHaptic(25);
              setMode('plant');
            }}
            className={`min-h-[44px] py-2 px-3.5 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 border-2 focus-visible:ring-4 focus-visible:ring-emerald-300 focus:outline-none ${
              mode === 'plant'
                ? 'bg-emerald-600 text-candy-green-on border-emerald-700 shadow-md scale-[1.02]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 active:scale-95'
            }`}
          >
            <span>🌱</span>
            <span>植物培育仓 ({PLANT_SPECS.length}种)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'insect'}
            onClick={() => {
              sfxTap();
              triggerHaptic(25);
              setMode('insect');
            }}
            className={`min-h-[44px] py-2 px-3.5 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 border-2 focus-visible:ring-4 focus-visible:ring-amber-300 focus:outline-none ${
              mode === 'insect'
                ? 'bg-amber-500 text-candy-orange-on border-amber-600 shadow-md scale-[1.02]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 active:scale-95'
            }`}
          >
            <span>🐛</span>
            <span>昆虫生态瓶 ({INSECT_SPECS.length}种)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'microscope'}
            onClick={() => {
              sfxTap();
              triggerHaptic(25);
              setMode('microscope');
            }}
            className={`min-h-[44px] py-2 px-3.5 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 border-2 focus-visible:ring-4 focus-visible:ring-cyan-300 focus:outline-none ${
              mode === 'microscope'
                ? 'bg-cyan-600 text-white border-cyan-700 shadow-md scale-[1.02]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-300 active:scale-95'
            }`}
          >
            <span>🔬</span>
            <span>显微透视台</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'symbiosis'}
            onClick={() => {
              sfxTap();
              triggerHaptic(25);
              setMode('symbiosis');
            }}
            className={`min-h-[44px] py-2 px-3.5 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 border-2 focus-visible:ring-4 focus-visible:ring-purple-300 focus:outline-none ${
              mode === 'symbiosis'
                ? 'bg-purple-600 text-white border-purple-700 shadow-md scale-[1.02]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 active:scale-95'
            }`}
          >
            <span>🐝</span>
            <span>共生互动园</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'quiz'}
            onClick={() => {
              sfxTap();
              triggerHaptic(25);
              setMode('quiz');
            }}
            className={`min-h-[44px] py-2 px-3.5 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 border-2 focus-visible:ring-4 focus-visible:ring-orange-300 focus:outline-none ${
              mode === 'quiz'
                ? 'bg-orange-500 text-candy-orange-on border-orange-600 shadow-md scale-[1.02]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300 active:scale-95'
            }`}
          >
            <span>🎯</span>
            <span>自然小博士</span>
          </button>
        </div>

        <StreakBar streak={streak} target={3} />
      </div>

      {/* ── 模式 1：植物生命周期培育仓 ── */}
      {mode === 'plant' && (
        <div className={`bg-gradient-to-br ${isNight ? 'from-slate-900 via-indigo-950 to-slate-950 text-white' : currentPlant.bgGradient} rounded-3xl border-3 ${isNight ? 'border-indigo-800' : 'border-emerald-200'} p-5 shadow-sm space-y-4 transition-colors duration-700`}>
          {/* 顶部植物选择栏与昼夜控制 */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {PLANT_SPECS.map((p, idx) => {
                const isSel = plantIdx === idx;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      sfxTap();
                      setPlantIdx(idx);
                      setPlantStage(0);
                      setWaterLevel(35);
                      setSunLevel(35);
                      setNutrientLevel(35);
                      void speak(`选择种植：${p.name}！`, { lang: 'zh-CN' });
                    }}
                    className={`py-1.5 px-3 rounded-2xl font-black text-xs transition-all flex items-center gap-1 border-2 ${
                      isSel
                        ? 'bg-emerald-600 text-candy-green-on border-emerald-700 shadow-md scale-105'
                        : isNight
                          ? 'bg-slate-800 text-slate-200 border-slate-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <span>{p.emoji}</span>
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-black border border-emerald-500/30">
                📅 生长历程：第 <span className="font-mono text-sm text-emerald-600 dark:text-emerald-300">{growthDay}</span> 天 / 110天
              </span>

              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  setIsNight(!isNight);
                  if (!isNight) {
                    void speak('夜幕降临！气孔部分闭合，植物正在进行呼吸作用蓄积养分！', { lang: 'zh-CN' });
                  } else {
                    void speak('太阳升起！新的一天光合作用开始啦！', { lang: 'zh-CN' });
                  }
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1 transition-all ${
                  isNight
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                <span>{isNight ? '🌙 夜间呼吸' : '☀️ 白天光合'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  setGrowthDay(0);
                  setPlantStage(0);
                  setIsPlaying(false);
                  setWaterLevel(45);
                  setSunLevel(45);
                  setNutrientLevel(45);
                  void speak('播下种子！重新开始向日葵全生命周期探索！', { lang: 'zh-CN' });
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-black ${isNight ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                🔄 重新播种
              </button>
            </div>
          </div>

          {/* 生长实验观察台 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* 左侧：植物全生命周期连续延时演化舞台 */}
            <div className={`md:col-span-7 ${isNight ? 'bg-slate-950/90 border-indigo-900' : 'bg-white/95 border-emerald-100'} rounded-3xl p-5 border-2 shadow-inner flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden`}>
              {/* 视角切换与延时控制 */}
              <div className="w-full flex flex-wrap items-center justify-between gap-2 z-10">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      sfxTap();
                      setPlantViewMode(plantViewMode === 'timelapse' ? 'photo' : 'timelapse');
                    }}
                    className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-candy-green-on text-xs font-black shadow transition-all flex items-center gap-1 border border-emerald-400/40"
                  >
                    <span>{plantViewMode === 'timelapse' ? '🔬 剖面延时生长' : '📸 真实微距实拍'}</span>
                    <span className="text-xs opacity-75">(点击切换)</span>
                  </button>
                </div>

                {/* 延时播放控制 */}
                <div className="flex items-center gap-1 bg-emerald-950/20 p-1 rounded-2xl border border-emerald-500/30">
                  <button
                    type="button"
                    onClick={() => {
                      sfxTap();
                      setIsPlaying(!isPlaying);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                      isPlaying ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-emerald-600 text-candy-orange-on hover:bg-emerald-500'
                    }`}
                  >
                    {isPlaying ? '⏸️ 暂停' : '▶️ 延时播放'}
                  </button>
                  {[1, 2, 5].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => {
                        sfxTap();
                        setPlaybackSpeed(spd as any);
                      }}
                      className={`px-1.5 py-0.5 rounded-lg text-xs font-mono font-black ${
                        playbackSpeed === spd ? 'bg-emerald-500 text-slate-950' : 'text-slate-500 hover:text-emerald-400'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* 视口主画面 */}
              <div className="w-full relative my-1">
                {plantViewMode === 'timelapse' ? (
                  <BotanicalCrossSectionCanvas plantId={currentPlant.id} day={growthDay} isNight={isNight} className="w-full" />
                ) : (
                  <RealPhotoDisplayCard
                    url={currentPhenologyStage.realPhotoUrl}
                    caption={currentPhenologyStage.realPhotoCaption}
                    plantId={currentPlant.id}
                    stage={plantStage}
                    className="w-full"
                  />
                )}
              </div>

              {/* 连续滑动条时间轴 */}
              <div className="w-full space-y-1.5 px-1 pt-1">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-emerald-700 dark:text-emerald-300">
                    🌱 阶段 {currentPhenologyStage.stageIndex + 1}/8：{currentPhenologyStage.stageName}
                  </span>
                  <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                    {currentPhenologyStage.bbchCode} · 第 {growthDay} 天
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={activePhenologyStages[activePhenologyStages.length - 1]?.dayEnd ?? 110}
                  value={growthDay}
                  onChange={(e) => {
                    setGrowthDay(Number(e.target.value));
                  }}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />
              </div>

              {/* 8 个科学物候里程碑快捷直达按键 */}
              <div className="w-full grid grid-cols-4 sm:grid-cols-8 gap-1 pt-1">
                {activePhenologyStages.map((stg) => {
                  const isCurrent = currentPhenologyStage.stageIndex === stg.stageIndex;
                  return (
                    <button
                      key={stg.stageIndex}
                      type="button"
                      onClick={() => {
                        sfxTap();
                        setGrowthDay(stg.dayStart);
                        void speak(`${stg.stageName}。${stg.aboveGroundDesc}`, { lang: 'zh-CN' });
                      }}
                      className={`py-1 px-0.5 rounded-xl text-xs font-black border transition-all flex flex-col items-center justify-center ${
                        isCurrent
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300 ring-2 ring-emerald-300 shadow-md scale-105'
                          : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                      }`}
                    >
                      <span className="text-xs">{stg.emoji}</span>
                      <span className="truncate max-w-[38px]">{stg.stageName.slice(0, 4)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 右侧：实时生理指标仪表盘与环境培育操作 */}
            <div className={`md:col-span-5 ${isNight ? 'bg-slate-900/90 border-indigo-900 text-white' : 'bg-white/95 border-emerald-100'} rounded-3xl p-5 border-2 shadow-sm space-y-3.5`}>
              {/* 4 项实时连续生理学指标 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center">
                  <span className="text-xs opacity-80 block">株高生长</span>
                  <span className="font-mono font-black text-sm text-emerald-400">{currentPlantHeight} cm</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-center">
                  <span className="text-xs opacity-80 block">根系入土</span>
                  <span className="font-mono font-black text-sm text-amber-400">{currentRootDepth} cm</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-blue-950/20 border border-blue-500/30 text-center">
                  <span className="text-xs opacity-80 block">叶片数量</span>
                  <span className="font-mono font-black text-sm text-blue-400">{currentPhenologyStage.leafCount} 片</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 text-center">
                  <span className="text-xs opacity-80 block">光合产率</span>
                  <span className="font-mono font-black text-sm text-purple-400">{photosynthesisRate} mg/h</span>
                </div>
              </div>

              {/* 当前阶段生物学生态详解 */}
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-1">
                  <div className="font-black text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <span>🟢【地上茎叶形态】</span>
                    <span className="text-xs font-mono text-emerald-600">{currentPhenologyStage.bbchCode}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{currentPhenologyStage.aboveGroundDesc}</p>
                </div>

                <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 space-y-1">
                  <span className="font-black text-amber-800 dark:text-amber-300 block">🟤【地下根系发育】</span>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{currentPhenologyStage.underGroundDesc}</p>
                </div>

                <div className="p-2.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 space-y-1">
                  <span className="font-black text-cyan-800 dark:text-cyan-300 block">🔬【生理学生物学机理】</span>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{currentPhenologyStage.physiologicalPrinciple}</p>
                </div>
              </div>

              {/* 4 大培育操作按钮 (每次操作加速成长) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-black">
                  <span>🌿 自然培育加速仓</span>
                  <span className="text-emerald-500">点击每次加速 +3~5 天</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={handleWater}
                    className="py-2 px-1 rounded-xl bg-blue-500 hover:bg-blue-600 active:scale-95 text-candy-blue-on font-black text-xs shadow transition-all flex flex-col items-center justify-center gap-0.5"
                  >
                    <span className="text-base">💧</span>
                    <span>浇水+4天</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSunlight}
                    className="py-2 px-1 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-candy-orange-on font-black text-xs shadow transition-all flex flex-col items-center justify-center gap-0.5"
                  >
                    <span className="text-base">☀️</span>
                    <span>光照+4天</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFertilizer}
                    className="py-2 px-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-candy-green-on font-black text-xs shadow transition-all flex flex-col items-center justify-center gap-0.5"
                  >
                    <span className="text-base">🧪</span>
                    <span>施肥+5天</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSoilLoosen}
                    className="py-2 px-1 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-black text-xs shadow transition-all flex flex-col items-center justify-center gap-0.5"
                  >
                    <span className="text-base">🪓</span>
                    <span>松土+3天</span>
                  </button>
                </div>
              </div>

              {/* 🔬 生理学原理与化学反应流转 HUD */}
              <div className={`p-3 rounded-2xl border ${isNight ? 'bg-slate-950/70 border-indigo-500/40 text-indigo-200' : 'bg-emerald-950/10 border-emerald-500/30 text-emerald-950'} space-y-1.5 text-xs`}>
                <div className="flex items-center justify-between font-black">
                  <span className="flex items-center gap-1">
                    <span>{isNight ? '🌙' : '☀️'}</span>
                    <span>{isNight ? '夜间呼吸与根系分裂' : '白昼光合能量转化'}</span>
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                    {isNight ? `代谢消耗: ${respirationRate} mg/h` : `光合产率: ${photosynthesisRate} mg/h`}
                  </span>
                </div>

                <div className="font-mono text-xs font-bold p-1.5 rounded-xl bg-white/70 dark:bg-slate-900/80 border border-emerald-500/20 leading-relaxed text-center">
                  {!isNight ? (
                    <span className="text-emerald-700 dark:text-emerald-300">
                      6CO₂ (吸入) + 6H₂O (泵送) + ☀️光能 ➔ C₆H₁₂O₆ (糖分) + 6O₂↑ (清新氧气)
                    </span>
                  ) : (
                    <span className="text-indigo-700 dark:text-indigo-300">
                      C₆H₁₂O₆ (糖分) + 6O₂ ➔ 6CO₂ + 6H₂O + ⚡ATP能量 (驱动根尖分裂扎根)
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1">
                    <span>💧⬆️</span>
                    <span>蒸腾拉力 (水分子内聚力向上逆重力泵水):</span>
                  </span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{transpirationPull} ml/h</span>
                </div>
              </div>

              {/* 根系与科普小贴士 */}
              <div className="space-y-1.5 text-xs">
                <div className="p-2.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-2">
                  <span className="text-base">🪵</span>
                  <div>
                    <span className="font-black text-emerald-400">【根系构造】</span>
                    <p className="text-xs leading-relaxed opacity-90">{currentPlant.rootType}</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-2">
                  <span className="text-base">💡</span>
                  <div>
                    <span className="font-black text-amber-400">【生长冷知识】</span>
                    <p className="text-xs leading-relaxed opacity-90">{currentPlant.funFact}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 模式 2：昆虫变态微观生态馆 ── */}
      {mode === 'insect' && (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-3xl border-3 border-amber-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/40 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {INSECT_SPECS.map((ins, idx) => {
                const isSel = insectIdx === idx;
                return (
                  <button
                    key={ins.id}
                    type="button"
                    onClick={() => {
                      sfxTap();
                      setInsectIdx(idx);
                      setInsectStep(0);
                      void speak(`观察昆虫：${ins.name}！`, { lang: 'zh-CN' });
                    }}
                    className={`py-1.5 px-3 rounded-2xl font-black text-xs transition-all flex items-center gap-1 border-2 ${
                      isSel
                        ? 'bg-amber-500 text-candy-orange-on border-amber-600 shadow-md scale-105'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <span>{ins.emoji}</span>
                    <span>{ins.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 font-bold text-xs">
                {currentInsect.metamorphosisType}
              </span>
              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  playInsectFlutterSfx();
                  void speak(`${currentInsect.name}。${currentInsect.funFact}`, { lang: 'zh-CN' });
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-black text-amber-800 hover:bg-amber-100 flex items-center gap-1"
              >
                <span>🔊</span>
                <span>听微科普</span>
              </button>
            </div>
          </div>

          {/* 昆虫 4 阶段变态图解卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {currentInsect.cycleStages.map((stg, sIdx) => {
              const isCurrent = insectStep === sIdx;
              return (
                <motion.button
                  key={stg.title}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    sfxTap();
                    setInsectStep(sIdx);
                    if (currentInsect.id === 'bee') playBeeBuzzSfx();
                    else playInsectFlutterSfx();
                    sfxCorrect();
                    addStars(1);
                    practice('science:insect-lab', true, 1, 1);
                    void speak(`${stg.title}。${stg.desc}`, { lang: 'zh-CN' });
                  }}
                  className={`p-4 rounded-3xl border-2 text-center flex flex-col items-center justify-between space-y-2 transition-all min-h-[210px] ${
                    isCurrent
                      ? 'bg-white border-amber-400 ring-4 ring-amber-200 shadow-md scale-[1.02]'
                      : 'bg-white/80 border-amber-100 hover:border-amber-300 hover:bg-white shadow-sm'
                  }`}
                >
                  <div className="my-1 flex flex-col items-center justify-center">
                    <InsectGraphicIllustration insectId={currentInsect.id} step={sIdx} className="scale-90" />
                    <div className="text-xl mt-1">{stg.emoji}</div>
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-amber-900">{stg.title}</h5>
                    <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                      {stg.desc}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* 昆虫解剖小知识卡片 */}
          <div className="bg-white rounded-3xl p-4 border-2 border-amber-200 shadow-sm space-y-2 text-xs">
            <h5 className="font-black text-amber-900 flex items-center gap-1.5 text-sm">
              <span>🔍</span>
              <span>{currentInsect.name} 身体解构特征：</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-700">
              <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="font-black text-amber-800 block mb-0.5">【头部 Head】</span>
                <p className="text-xs leading-relaxed">{currentInsect.anatomyDetail.head}</p>
              </div>
              <div className="p-2.5 rounded-2xl bg-orange-50 border border-orange-200">
                <span className="font-black text-orange-800 block mb-0.5">【胸部 Thorax】</span>
                <p className="text-xs leading-relaxed">{currentInsect.anatomyDetail.thorax}</p>
              </div>
              <div className="p-2.5 rounded-2xl bg-yellow-50 border border-yellow-200">
                <span className="font-black text-yellow-800 block mb-0.5">【腹部 Abdomen】</span>
                <p className="text-xs leading-relaxed">{currentInsect.anatomyDetail.abdomen}</p>
              </div>
            </div>

            {/* 🔬 变态发育生物学机制解析 */}
            <div className="p-3.5 rounded-2xl bg-amber-900/10 border border-amber-400/40 text-amber-950 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-black">
                <span className="flex items-center gap-1 text-amber-900">
                  <span>🧬</span>
                  <span>{currentInsect.metamorphosisType} 生物学奥秘</span>
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  HORMONAL DEVELOPMENT
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {currentInsect.metamorphosisType.includes('完全变态')
                  ? '【成虫盘重塑机制】：在神奇的蛹期，幼虫的大部分组织在酶的作用下溶解分解，由隐藏的「成虫盘（Imaginal Discs）」干细胞群分化出全新的复眼、翅膀、口器与生殖系统，完成 100% 全身细胞级别的涅槃蜕变！'
                  : '【外骨骼定期蜕皮】：幼虫（若虫）形态与成虫非常相似，几丁质外骨骼坚硬不能无限拉伸，因此随着身体长大必须分泌蜕皮激素定期脱去旧壳，翅芽在一次次蜕皮中逐渐长大！'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 模式 3：显微镜微观解构观察台 ── */}
      {mode === 'microscope' && (
        <div className="bg-slate-950 rounded-3xl border-3 border-cyan-500/40 p-5 shadow-[0_0_30px_rgba(6,182,212,0.2)] text-white space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  setMicroscopeTarget('leaf');
                  void speak('切换至叶片微观切片：观察气孔与叶绿体光合作用！', { lang: 'zh-CN' });
                }}
                className={`py-2 px-3 rounded-2xl font-black text-xs transition-all flex items-center gap-1 border ${
                  microscopeTarget === 'leaf'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-105'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}
              >
                <span>🍃</span>
                <span>叶片气孔与光合作用</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  setMicroscopeTarget('root');
                  void speak('切换至根系 X-Ray 透视：观察导管与根毛吸水！', { lang: 'zh-CN' });
                }}
                className={`py-2 px-3 rounded-2xl font-black text-xs transition-all flex items-center gap-1 border ${
                  microscopeTarget === 'root'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-105'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}
              >
                <span>🪵</span>
                <span>根系导管输水 X-Ray</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  setMicroscopeTarget('insectAnatomy');
                  void speak('切换至昆虫三段解构：头、胸、腹显微观察！', { lang: 'zh-CN' });
                }}
                className={`py-2 px-3 rounded-2xl font-black text-xs transition-all flex items-center gap-1 border ${
                  microscopeTarget === 'insectAnatomy'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] scale-105'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}
              >
                <span>🔬</span>
                <span>昆虫三段式解剖</span>
              </button>
            </div>

            <span className="text-xs font-mono font-bold text-cyan-400">MAGNIFICATION: 400X</span>
          </div>

          {/* 显微镜目镜圆形视口 */}
          <div className="flex flex-col md:flex-row gap-5 items-center">
            <div className="relative w-72 h-72 rounded-full border-4 border-cyan-400/80 bg-slate-950 shadow-[0_0_35px_rgba(6,182,212,0.4)] overflow-hidden flex flex-col items-center justify-center p-2 select-none shrink-0">
              {/* 十字标尺网格 */}
              <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_20%,rgba(6,182,212,0.08)_21%)] bg-[size:16px_16px] pointer-events-none" />
              <div className="absolute w-full h-[1px] bg-cyan-500/30" />
              <div className="absolute h-full w-[1px] bg-cyan-500/30" />
              <div className="absolute w-56 h-56 rounded-full border border-cyan-500/20" />

              {/* 切片 1: 叶片气孔与叶绿体高精 SVG */}
              {microscopeTarget === 'leaf' && (
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                  <svg viewBox="0 0 200 160" className="w-48 h-36">
                    {/* 表皮细胞背景 */}
                    <rect x="10" y="10" width="80" height="40" rx="8" fill="#14532d" opacity="0.6" stroke="#16a34a" strokeWidth="1" />
                    <rect x="110" y="10" width="80" height="40" rx="8" fill="#14532d" opacity="0.6" stroke="#16a34a" strokeWidth="1" />
                    <rect x="10" y="110" width="80" height="40" rx="8" fill="#14532d" opacity="0.6" stroke="#16a34a" strokeWidth="1" />
                    <rect x="110" y="110" width="80" height="40" rx="8" fill="#14532d" opacity="0.6" stroke="#16a34a" strokeWidth="1" />

                    {/* 左保卫细胞 */}
                    <path
                      d={stomaTurgid ? 'M90,20 C50,30 40,130 90,140 C75,105 75,55 90,20 Z' : 'M98,20 C65,30 60,130 98,140 C92,105 92,55 98,20 Z'}
                      fill="#22c55e"
                      stroke="#15803d"
                      strokeWidth="2"
                    />
                    {/* 右保卫细胞 */}
                    <path
                      d={stomaTurgid ? 'M110,20 C150,30 160,130 110,140 C125,105 125,55 110,20 Z' : 'M102,20 C135,30 140,130 102,140 C108,105 108,55 102,20 Z'}
                      fill="#22c55e"
                      stroke="#15803d"
                      strokeWidth="2"
                    />

                    {/* 叶绿体颗粒 (绿色微囊) */}
                    {[
                      [68, 50], [62, 80], [70, 110],
                      [132, 50], [138, 80], [130, 110],
                    ].map(([cx, cy], i) => (
                      <circle key={i} cx={cx} cy={cy} r="4" fill="#4ade80" stroke="#166534" strokeWidth="1" />
                    ))}

                    {/* 气孔孔隙光芒 */}
                    {stomaTurgid ? (
                      <g>
                        <ellipse cx="100" cy="80" rx="10" ry="32" fill="#0284c7" opacity="0.75" />
                        <text x="100" y="76" textAnchor="middle" fill="#f0fdf4" fontSize="8" fontWeight="900">CO₂ ➔</text>
                        <text x="100" y="90" textAnchor="middle" fill="#fef08a" fontSize="8" fontWeight="900">➔ O₂</text>
                      </g>
                    ) : (
                      <ellipse cx="100" cy="80" rx="2" ry="30" fill="#0f172a" opacity="0.9" />
                    )}
                  </svg>

                  <button
                    type="button"
                    onClick={() => {
                      sfxTap();
                      setStomaTurgid(!stomaTurgid);
                      if (!stomaTurgid) {
                        void speak('保卫细胞吸水膨胀！气孔张开，吸收二氧化碳释放氧气！', { lang: 'zh-CN' });
                      } else {
                        void speak('保卫细胞失水闭合！气孔关闭，牢牢锁住水分防止干旱萎蔫！', { lang: 'zh-CN' });
                      }
                    }}
                    className="mt-1 px-3 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-xs font-bold hover:bg-cyan-500/40 active:scale-95 transition-all"
                  >
                    🔄 模拟：{stomaTurgid ? '💧 饱水张开 (光合中)' : '🏜️ 缺水闭合 (保水态)'}
                  </button>
                </div>
              )}

              {/* 切片 2: 根尖 4 分区解剖纵切 SVG */}
              {microscopeTarget === 'root' && (
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                  <svg viewBox="0 0 200 160" className="w-48 h-40">
                    {/* ④ 根毛区 (y: 10 ~ 55) */}
                    <g opacity={rootZone === 'hair' ? 1 : 0.45}>
                      <rect x="70" y="10" width="60" height="45" fill="#334155" stroke="#64748b" strokeWidth="1" />
                      {/* 导管管壁 */}
                      <line x1="90" y1="10" x2="90" y2="55" stroke="#38bdf8" strokeWidth="3" strokeDasharray="4,2" />
                      <line x1="110" y1="10" x2="110" y2="55" stroke="#38bdf8" strokeWidth="3" strokeDasharray="4,2" />
                      {/* 伸出泥土中的根毛 */}
                      {[-25, -15, 5, 20].map((dy) => (
                        <g key={dy}>
                          <path d={`M70,${30 + dy} Q40,${30 + dy} 20,${26 + dy}`} stroke="#fef08a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                          <path d={`M130,${30 + dy} Q160,${30 + dy} 180,${34 + dy}`} stroke="#fef08a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                          <circle cx="16" cy={26 + dy} r="2" fill="#38bdf8" />
                          <circle cx="184" cy={34 + dy} r="2" fill="#38bdf8" />
                        </g>
                      ))}
                      <text x="100" y="36" textAnchor="middle" fill="#fde047" fontSize="8" fontWeight="bold">④ 根毛区</text>
                    </g>

                    {/* ③ 伸长区 (y: 56 ~ 95) */}
                    <g opacity={rootZone === 'elongation' ? 1 : 0.45}>
                      <rect x="75" y="56" width="50" height="40" fill="#475569" stroke="#64748b" strokeWidth="1" />
                      {/* 纵向拉长细胞 */}
                      {[82, 92, 102, 112].map((x) => (
                        <line key={x} x1={x} y1="56" x2={x} y2="96" stroke="#94a3b8" strokeWidth="0.8" />
                      ))}
                      <text x="100" y="78" textAnchor="middle" fill="#67e8f9" fontSize="8" fontWeight="bold">③ 伸长区</text>
                    </g>

                    {/* ② 分生区 (y: 96 ~ 125) */}
                    <g opacity={rootZone === 'meristem' ? 1 : 0.45}>
                      <rect x="80" y="96" width="40" height="30" fill="#0891b2" stroke="#06b6d4" strokeWidth="1.5" />
                      <text x="100" y="114" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">② 分生区</text>
                    </g>

                    {/* ① 根冠 (y: 126 ~ 150) */}
                    <g opacity={rootZone === 'cap' ? 1 : 0.45}>
                      <path d="M78,126 Q100,155 122,126 Z" fill="#b45309" stroke="#d97706" strokeWidth="1.5" />
                      <text x="100" y="140" textAnchor="middle" fill="#fef3c7" fontSize="8" fontWeight="bold">① 根冠</text>
                    </g>
                  </svg>
                  <span className="text-xs font-mono text-cyan-300 font-bold">
                    当前聚焦: {rootZone === 'cap' ? '🛡️ 根冠钻土' : rootZone === 'meristem' ? '⚡ 分生区分裂' : rootZone === 'elongation' ? '📏 伸长区顶推' : '🪵 根毛区吸水'}
                  </span>
                </div>
              )}

              {/* 切片 3: 昆虫头胸腹三段解构 SVG */}
              {microscopeTarget === 'insectAnatomy' && (
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                  <svg viewBox="0 0 200 160" className="w-48 h-40">
                    {/* 头部 (Head) */}
                    <g>
                      <circle cx="100" cy="30" r="16" fill="#ca8a04" stroke="#a16207" strokeWidth="1.5" />
                      {/* 复眼 */}
                      <ellipse cx="90" cy="26" rx="5" ry="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
                      <ellipse cx="110" cy="26" rx="5" ry="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
                      {/* 触角 */}
                      <path d="M92,16 Q75,4 65,10" stroke="#facc15" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      <path d="M108,16 Q125,4 135,10" stroke="#facc15" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      <text x="100" y="42" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">【头部 HEAD】</text>
                    </g>

                    {/* 胸部 (Thorax) */}
                    <g>
                      <ellipse cx="100" cy="65" rx="20" ry="16" fill="#b45309" stroke="#92400e" strokeWidth="1.5" />
                      {/* 3 对胸足 */}
                      <path d="M85,55 Q55,45 40,60" stroke="#fde047" strokeWidth="2" fill="none" />
                      <path d="M115,55 Q145,45 160,60" stroke="#fde047" strokeWidth="2" fill="none" />
                      <path d="M82,65 Q50,65 35,78" stroke="#fde047" strokeWidth="2" fill="none" />
                      <path d="M118,65 Q150,65 165,78" stroke="#fde047" strokeWidth="2" fill="none" />
                      <path d="M85,75 Q55,90 40,105" stroke="#fde047" strokeWidth="2" fill="none" />
                      <path d="M115,75 Q145,90 160,105" stroke="#fde047" strokeWidth="2" fill="none" />
                      <text x="100" y="68" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">【胸部 6足】</text>
                    </g>

                    {/* 腹部 (Abdomen) 与气门 */}
                    <g>
                      <ellipse cx="100" cy="115" rx="17" ry="26" fill="#15803d" stroke="#166534" strokeWidth="1.5" />
                      {/* 节间横纹与气门呼吸小孔 */}
                      {[-14, -4, 6, 16].map((dy) => (
                        <g key={dy}>
                          <line x1="85" y1={115 + dy} x2="115" y2={115 + dy} stroke="#14532d" strokeWidth="1" />
                          <circle cx="85" cy={115 + dy} r="1.5" fill="#38bdf8" />
                          <circle cx="115" cy={115 + dy} r="1.5" fill="#38bdf8" />
                        </g>
                      ))}
                      <text x="100" y="118" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">【腹部 气门】</text>
                    </g>
                  </svg>
                  <span className="text-xs font-mono text-cyan-300 font-bold">头(感官) · 胸(运动) · 腹(呼吸内脏)</span>
                </div>
              )}
            </div>

            {/* 详细解说面板 */}
            <div className="space-y-3 text-xs leading-relaxed flex-1">
              {microscopeTarget === 'leaf' && (
                <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-cyan-300">🌿 叶绿体工厂与保卫细胞渗透机理</h4>
                    <span className="text-xs font-mono text-cyan-400 font-bold">OSMOSIS PRINCIPLE</span>
                  </div>
                  <p className="text-slate-300">
                    在 400 倍显微镜下，叶片表皮分布着由一对**保卫细胞**构成的**气孔（Stomata）**。
                    保卫细胞通过控制钾离子渗透压吸水膨胀，使微孔张开，吸收二氧化碳并释放氧气；缺水时则失水并拢关闭，防止植物脱水萎蔫！
                  </p>
                </div>
              )}

              {microscopeTarget === 'root' && (
                <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-cyan-300">🪵 根尖四区纵切解剖学结构</h4>
                    <span className="text-xs font-mono text-cyan-400 font-bold">ROOT ANATOMY</span>
                  </div>

                  {/* 4区选择器按钮 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                    {[
                      { id: 'cap', name: '① 根冠', emoji: '🛡️', desc: '最顶端保护分生区，分泌粘滑多糖润滑泥土便于下钻' },
                      { id: 'meristem', name: '② 分生区', emoji: '⚡', desc: '细胞紧密排列，永不停息进行活跃有丝分裂产生新细胞' },
                      { id: 'elongation', name: '③ 伸长区', emoji: '📏', desc: '细胞迅速纵向拉长，把根尖以巨大力量推向更深土层' },
                      { id: 'hair', name: '④ 根毛成熟区', emoji: '🪵', desc: '密布数百万根毛增大接触面积，木质部导管形成逆重力输水' },
                    ].map((rz) => (
                      <button
                        key={rz.id}
                        type="button"
                        onClick={() => {
                          sfxTap();
                          setRootZone(rz.id as any);
                          void speak(`${rz.name}。${rz.desc}`, { lang: 'zh-CN' });
                        }}
                        className={`p-2 rounded-xl text-xs font-black border transition-all text-center ${
                          rootZone === rz.id
                            ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md scale-105'
                            : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-cyan-400'
                        }`}
                      >
                        <div>{rz.emoji} {rz.name}</div>
                      </button>
                    ))}
                  </div>

                  <p className="text-slate-300 text-xs pt-1">
                    {rootZone === 'cap' && '【根冠】像安全帽一样套在根尖最外侧，细胞壁坚韧，分泌植物粘液减小土壤阻力。'}
                    {rootZone === 'meristem' && '【分生区】由未分化的干细胞组成，细胞壁薄，是根系生长的细胞制造源泉。'}
                    {rootZone === 'elongation' && '【伸长区】细胞停止分裂但体积迅速拉长，是根系向前推进伸展的最主要动力区域。'}
                    {rootZone === 'hair' && '【根毛成熟区】表面长出密集根毛，内部形成中空木质部导管，蒸腾拉力泵送水分。'}
                  </p>
                </div>
              )}

              {microscopeTarget === 'insectAnatomy' && (
                <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-cyan-300">🦗 昆虫外骨骼与气门扩散呼吸机制</h4>
                    <span className="text-xs font-mono text-cyan-400 font-bold">TRACHEAL SYSTEM</span>
                  </div>
                  <p className="text-slate-300">
                    昆虫没有肺，而是通过腹部两侧排列的微小**气门（Spiracles）**呼吸。
                    气门连接庞大的**微气管扩散网络（Tracheal System）**，直接将空气中的氧气扩散输送到肌肉与细胞深处；坚硬的**几丁质外骨骼**则提供了防失水外壳与胸部 6 足强大的运动杠杆！
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 模式 4：植物-昆虫共生互动模拟园 ── */}
      {mode === 'symbiosis' && (
        <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-emerald-50 rounded-3xl border-3 border-purple-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-purple-200 pb-3">
            <h3 className="text-base font-black text-purple-900 flex items-center gap-1.5">
              <span>🐝 🌻</span>
              <span>大自然奇妙共生互动园（点击体验生态互助）</span>
            </h3>
            <span className="px-3 py-1 rounded-full bg-purple-200 text-purple-900 text-xs font-black">
              自然生态链
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 共生卡片 1：蜜蜂 ➔ 向日葵 */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                sfxTap();
                playBeeBuzzSfx();
                sfxWin();
                celebrateSmall();
                setSymbiosisAction('bee');
                addStars(1);
                practice('science:symbiosis-bee', true, 1, 1);
                void speak('蜜蜂飞向向日葵花盘！采集花蜜的同时完成了授粉，向日葵结满丰收葵花籽！', { lang: 'zh-CN' });
              }}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                symbiosisAction === 'bee'
                  ? 'bg-amber-50 border-amber-400 ring-4 ring-amber-200 shadow-md'
                  : 'bg-white border-purple-100 hover:border-amber-300'
              }`}
            >
              <div className="text-5xl text-center mb-3">🐝 ➔ 🌻 ✨</div>
              <h4 className="text-sm font-black text-amber-900 text-center">蜜蜂传粉 ✕ 向日葵</h4>
              <p className="text-xs font-semibold text-slate-600 mt-2 leading-relaxed">
                蜜蜂采集花粉花蜜酿造蜂蜜，同时帮向日葵授粉受精，双方互利共生！
              </p>
            </motion.div>

            {/* 共生卡片 2：七星瓢虫 ➔ 番茄苗 */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                sfxTap();
                playInsectFlutterSfx();
                sfxWin();
                celebrateSmall();
                setSymbiosisAction('ladybug');
                addStars(1);
                practice('science:symbiosis-ladybug', true, 1, 1);
                void speak('七星瓢虫降落番茄叶面！大口吃光了害虫蚜虫，番茄苗健康抽枝挂满红果！', { lang: 'zh-CN' });
              }}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                symbiosisAction === 'ladybug'
                  ? 'bg-rose-50 border-rose-400 ring-4 ring-rose-200 shadow-md'
                  : 'bg-white border-purple-100 hover:border-rose-300'
              }`}
            >
              <div className="text-5xl text-center mb-3">🐞 ➔ 🍅 🛡️</div>
              <h4 className="text-sm font-black text-rose-900 text-center">七星瓢虫 ✕ 番茄卫士</h4>
              <p className="text-xs font-semibold text-slate-600 mt-2 leading-relaxed">
                瓢虫消灭危害嫩叶的蚜虫，守护番茄健康生长，是不折不扣的天然农药卫士！
              </p>
            </motion.div>

            {/* 共生卡片 3：蚯蚓 ➔ 泥土根系 */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                sfxTap();
                playSoilSfx();
                sfxWin();
                celebrateSmall();
                setSymbiosisAction('earthworm');
                addStars(1);
                practice('science:symbiosis-earthworm', true, 1, 1);
                void speak('小蚯蚓在泥土深处钻出透气通道！分解枯叶变成肥沃腐殖质，橡树根系茁壮成长！', { lang: 'zh-CN' });
              }}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                symbiosisAction === 'earthworm'
                  ? 'bg-emerald-50 border-emerald-400 ring-4 ring-emerald-200 shadow-md'
                  : 'bg-white border-purple-100 hover:border-emerald-300'
              }`}
            >
              <div className="text-5xl text-center mb-3">🪱 ➔ 🌲 沃土</div>
              <h4 className="text-sm font-black text-emerald-900 text-center">蚯蚓松土 ✕ 巨木之根</h4>
              <p className="text-xs font-semibold text-slate-600 mt-2 leading-relaxed">
                蚯蚓在地下钻洞翻土使空气和水分更容易渗透，排出的蚯蚓粪是最好的有机肥！
              </p>
            </motion.div>

            {/* 共生卡片 4：蚂蚁 ➔ 刺槐树 (花外蜜腺与守卫兵团) */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                sfxTap();
                playInsectFlutterSfx();
                sfxWin();
                celebrateSmall();
                setSymbiosisAction('ant-acacia');
                addStars(1);
                practice('science:symbiosis-ant', true, 1, 1);
                void speak('刺槐树叶柄分泌甜美蜜露！蚂蚁享用美食的同时组建巡逻队，击退一切吃树叶的害虫！', { lang: 'zh-CN' });
              }}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                symbiosisAction === 'ant-acacia'
                  ? 'bg-amber-50 border-amber-400 ring-4 ring-amber-200 shadow-md'
                  : 'bg-white border-purple-100 hover:border-amber-300'
              }`}
            >
              <div className="text-5xl text-center mb-3">🐜 ➔ 🌳 🍯</div>
              <h4 className="text-sm font-black text-amber-900 text-center">蚂蚁兵团 ✕ 刺槐树</h4>
              <p className="text-xs font-semibold text-slate-600 mt-2 leading-relaxed">
                刺槐树用花外蜜腺提供蜜露与空心刺庇护所，蚂蚁担任全天候护卫保镖！
              </p>
            </motion.div>

            {/* 共生卡片 5：地下菌根真菌 ➔ 森林网络 (Wood Wide Web) */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                sfxTap();
                playWaterSfx();
                sfxWin();
                celebrateSmall();
                setSymbiosisAction('mycorrhiza');
                addStars(1);
                practice('science:symbiosis-mycorrhiza', true, 1, 1);
                void speak('地下菌根真菌网络帮植物吸收矿质水磷，植物回馈光合糖分，还在大树之间传递悄悄话！', { lang: 'zh-CN' });
              }}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                symbiosisAction === 'mycorrhiza'
                  ? 'bg-cyan-50 border-cyan-400 ring-4 ring-cyan-200 shadow-md'
                  : 'bg-white border-purple-100 hover:border-cyan-300'
              }`}
            >
              <div className="text-5xl text-center mb-3">🍄 ➔ 🌲 🌐</div>
              <h4 className="text-sm font-black text-cyan-900 text-center">菌根真菌 ✕ 森林地下网</h4>
              <p className="text-xs font-semibold text-slate-600 mt-2 leading-relaxed">
                真菌菌丝扩展根系上万倍吸水面积，植物回报光合糖分，形成大自然地下互联网！
              </p>
            </motion.div>

            {/* 共生卡片 6：兰花蜂 ➔ 幽香兰花 */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                sfxTap();
                playBeeBuzzSfx();
                sfxWin();
                celebrateSmall();
                setSymbiosisAction('orchid-bee');
                addStars(1);
                practice('science:symbiosis-orchid', true, 1, 1);
                void speak('雄性兰花蜂采集兰花独特的香水吸引雌蜂，同时精准为热带兰花完成了异花授粉！', { lang: 'zh-CN' });
              }}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
                symbiosisAction === 'orchid-bee'
                  ? 'bg-pink-50 border-pink-400 ring-4 ring-pink-200 shadow-md'
                  : 'bg-white border-purple-100 hover:border-pink-300'
              }`}
            >
              <div className="text-5xl text-center mb-3">🐝 ➔ 🪷 💐</div>
              <h4 className="text-sm font-black text-pink-900 text-center">兰花蜂 ✕ 幽香兰花</h4>
              <p className="text-xs font-semibold text-slate-600 mt-2 leading-relaxed">
                雄兰花蜂收集兰花特殊香水求偶，作为回报为兰花背负花粉块完成奇妙授粉！
              </p>
            </motion.div>
          </div>
        </div>
      )}

      {/* ── 模式 5：自然小博士 6 关生态闯关 ── */}
      {mode === 'quiz' && (
        <div className="bg-slate-950 rounded-3xl border-3 border-orange-500/40 p-5 shadow-[0_0_30px_rgba(249,115,22,0.2)] text-center text-white space-y-4">
          <div className="flex items-center justify-between bg-slate-900 rounded-2xl p-3 border border-orange-500/20">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{currentQuiz.emoji}</span>
              <div className="text-left">
                <h3 className="text-sm font-black text-orange-400">{currentQuiz.category}小考官</h3>
                <span className="text-xs font-bold text-slate-400">
                  第 {quizIdx + 1} / {ECO_QUIZ_LIST.length} 关
                </span>
              </div>
            </div>
            <span className="text-xs font-black text-orange-400">连胜目标：3连对 ⭐</span>
          </div>

          <div className="bg-slate-900/80 rounded-2xl p-5 border border-orange-500/20 shadow-inner space-y-4">
            <p className="text-base font-black text-slate-100 leading-relaxed max-w-xl mx-auto">
              ❓ {currentQuiz.question}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {currentQuiz.options.map((opt) => {
                const isSelected = selectedAnswer === opt;
                const isCorrect = opt === currentQuiz.answer;
                return (
                  <motion.button
                    key={opt}
                    type="button"
                    whileHover={{ scale: selectedAnswer === null ? 1.02 : 1 }}
                    whileTap={{ scale: selectedAnswer === null ? 0.98 : 1 }}
                    disabled={selectedAnswer !== null}
                    onClick={() => handleAnswerQuiz(opt)}
                    className={`py-3 px-4 rounded-2xl font-black text-sm border-2 transition-all shadow-sm ${
                      isSelected
                        ? isCorrect
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 ring-4 ring-emerald-500/30'
                          : 'bg-rose-500 text-candy-pink-on border-rose-400 ring-4 ring-rose-500/30'
                        : selectedAnswer !== null && isCorrect
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                          : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-orange-400/60'
                    }`}
                  >
                    {opt}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {selectedAnswer !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-slate-900 rounded-2xl p-4 border border-orange-500/30 shadow space-y-3 text-center"
              >
                <p className="text-xs font-bold text-slate-300 max-w-md mx-auto">
                  💡 {currentQuiz.explanation}
                </p>
                <button
                  type="button"
                  onClick={handleNextQuiz}
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 text-sm font-black shadow-[0_0_15px_rgba(249,115,22,0.5)] hover:brightness-110 active:scale-95"
                >
                  挑战下一题 ➔
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* AI 科学探险故事面板 */}
      <ScienceAiPanel
        topic={{
          id: `sci-botany-${currentPlant.id}`,
          emoji: currentPlant.emoji,
          label: `${currentPlant.name}生长物语`,
          stars: 2,
          tags: ['科学', '认知', '综合'],
          prompt: `请给5岁小朋友生动讲述关于${currentPlant.name}或${currentInsect.name}的奇妙自然故事，包含光合作用、生命发育或自然共生小秘密。`,
          fallback: `小朋友，大自然是一个充满魔法的世界！${currentPlant.name}在阳光下静悄悄地喝水生长，${currentInsect.name}在花丛中快活地采蜜传粉，它们互相帮助，一起装点着美丽的地球家园！`,
        }}
        triggerLabel={`🌱 听小茜讲 ${currentPlant.name} 与 ${currentInsect.name} 的大自然童话`}
      />
    </div>
  );
}
