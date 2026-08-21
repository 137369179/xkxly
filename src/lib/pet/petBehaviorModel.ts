/**
 * 🐱 游戏级宠物生物行为动力学模型与情境状态机 (Pet Behavior Model)
 * ─────────────────────────────────────────────────────────────
 * 包含：
 * 1. 12 大基础动作体系 (48 种动作变体)
 * 2. 20 种生物解剖学表情模型
 * 3. 7 大精确定位触控热区与反馈模板
 * 4. 连击/兴奋度/疲劳度智能情境识别状态机
 */

import * as PetAudio from './petSoundLibrary';

// ── 12 大基础动作定义 ─────────────────────────────────────────
export type PetActionCategory =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'sit'
  | 'lay'
  | 'stretch'
  | 'pounce'
  | 'groom'
  | 'dance'
  | 'purr'
  | 'highFive';

export interface ActionVariant {
  id: string;
  name: string;
  durationMs: number;
  physicsScale: { x: number[]; y: number[]; rotate?: number[] };
  soundFunc: () => void;
}

export const PET_ACTION_VARIANTS: Record<PetActionCategory, ActionVariant[]> = {
  idle: [
    {
      id: 'idle_shallow',
      name: '浅呼吸',
      durationMs: 2800,
      physicsScale: { x: [1, 1.03, 1], y: [0, -4, 0] },
      soundFunc: () => {},
    },
    {
      id: 'idle_deep',
      name: '舒缓深呼吸',
      durationMs: 3400,
      physicsScale: { x: [1, 1.06, 1], y: [0, -6, 0] },
      soundFunc: () => PetAudio.petPurrGentle(),
    },
    {
      id: 'idle_yawn',
      name: '困倦小哈欠',
      durationMs: 2600,
      physicsScale: { x: [1, 1.08, 0.96, 1], y: [0, -8, 0] },
      soundFunc: () => PetAudio.petMeowYawn(),
    },
    {
      id: 'idle_look_around',
      name: '轻微环顾',
      durationMs: 2400,
      physicsScale: { x: [1, 1, 1], y: [0, -3, 0], rotate: [0, -4, 4, 0] },
      soundFunc: () => PetAudio.petMeowChirp(),
    },
  ],
  walk: [
    {
      id: 'walk_stroll',
      name: '悠闲漫步',
      durationMs: 1600,
      physicsScale: { x: [1, 1.04, 1], y: [0, -6, 0, -6, 0], rotate: [-2, 2, -2, 2, 0] },
      soundFunc: () => PetAudio.petActionFootsteps(),
    },
    {
      id: 'walk_sneak',
      name: '悄悄潜行',
      durationMs: 1800,
      physicsScale: { x: [1.08, 1, 1.08], y: [0, -3, 0], rotate: [0, -2, 2, 0] },
      soundFunc: () => PetAudio.petPurrSnuggle(),
    },
    {
      id: 'walk_brisk',
      name: '欢快小碎步',
      durationMs: 1200,
      physicsScale: { x: [1, 1.05, 1], y: [0, -10, 0, -10, 0], rotate: [-4, 4, -4, 4, 0] },
      soundFunc: () => PetAudio.petActionFootsteps(),
    },
  ],
  run: [
    {
      id: 'run_sprint',
      name: '冲刺飞奔',
      durationMs: 900,
      physicsScale: { x: [1, 1.15, 0.9, 1], y: [0, -16, 0, -16, 0] },
      soundFunc: () => PetAudio.petActionBoingHigh(),
    },
    {
      id: 'run_drift',
      name: '急刹滑步',
      durationMs: 1100,
      physicsScale: { x: [1.12, 0.95, 1], y: [0, -8, 0], rotate: [0, -8, 0] },
      soundFunc: () => PetAudio.petActionBoingLight(),
    },
    {
      id: 'run_circle',
      name: '欢快转圈跑',
      durationMs: 1400,
      physicsScale: { x: [1, 1.08, 1], y: [0, -12, 0], rotate: [0, 180, 360] },
      soundFunc: () => PetAudio.petMeowExcited(),
    },
  ],
  jump: [
    {
      id: 'jump_high',
      name: '原地轻灵高跳',
      durationMs: 800,
      physicsScale: { x: [0.88, 1.14, 0.92, 1], y: [0, -28, 4, 0] },
      soundFunc: () => PetAudio.petActionBoingHigh(),
    },
    {
      id: 'jump_catch',
      name: '前扑抓蝴蝶',
      durationMs: 1000,
      physicsScale: { x: [0.92, 1.18, 0.95, 1], y: [0, -22, 0], rotate: [0, -8, 4, 0] },
      soundFunc: () => PetAudio.petActionPounce(),
    },
    {
      id: 'jump_startle',
      name: '惊喜欢快弹跳',
      durationMs: 750,
      physicsScale: { x: [0.85, 1.2, 0.9, 1], y: [0, -32, 2, 0] },
      soundFunc: () => PetAudio.petMeowSurprised(),
    },
  ],
  sit: [
    {
      id: 'sit_proper',
      name: '端正乖巧坐',
      durationMs: 2000,
      physicsScale: { x: [1, 0.96, 1], y: [0, 4, 0] },
      soundFunc: () => PetAudio.petMeowHello(),
    },
    {
      id: 'sit_paw_lick',
      name: '偏头舔爪坐',
      durationMs: 2200,
      physicsScale: { x: [1, 1.04, 1], y: [0, 2, 0], rotate: [0, -6, 0] },
      soundFunc: () => PetAudio.petPurrChin(),
    },
    {
      id: 'sit_tail_wrap',
      name: '尾巴盘腿坐',
      durationMs: 2400,
      physicsScale: { x: [1, 0.98, 1], y: [0, 3, 0] },
      soundFunc: () => PetAudio.petPurrGentle(),
    },
  ],
  lay: [
    {
      id: 'lay_loaf',
      name: '贵妃侧卧',
      durationMs: 2600,
      physicsScale: { x: [1, 1.1, 1], y: [0, 8, 0] },
      soundFunc: () => PetAudio.petPurrDeep(),
    },
    {
      id: 'lay_belly_up',
      name: '翻肚皮求摸摸',
      durationMs: 2800,
      physicsScale: { x: [1, 1.12, 1], y: [0, 6, 0], rotate: [0, 10, -10, 0] },
      soundFunc: () => PetAudio.petMeowCute(),
    },
    {
      id: 'lay_curled',
      name: '毛球蜷缩睡',
      durationMs: 3000,
      physicsScale: { x: [0.94, 0.96, 0.94], y: [0, 6, 0] },
      soundFunc: () => PetAudio.petPurrDreaming(),
    },
  ],
  stretch: [
    {
      id: 'stretch_down_dog',
      name: '猫式下犬拉伸',
      durationMs: 1400,
      physicsScale: { x: [1, 1.12, 0.96, 1], y: [0, 6, -6, 0] },
      soundFunc: () => PetAudio.petActionStretch(),
    },
    {
      id: 'stretch_back_kick',
      name: '后腿舒展蹬腿',
      durationMs: 1500,
      physicsScale: { x: [1, 1.15, 1], y: [0, -4, 0] },
      soundFunc: () => PetAudio.petActionStretch(),
    },
    {
      id: 'stretch_full_body',
      name: '全身懒腰舒展',
      durationMs: 1600,
      physicsScale: { x: [0.95, 1.18, 1], y: [0, -8, 2, 0] },
      soundFunc: () => PetAudio.petMeowYawn(),
    },
  ],
  pounce: [
    {
      id: 'pounce_yarn',
      name: '抓毛线球',
      durationMs: 900,
      physicsScale: { x: [0.9, 1.18, 0.94, 1], y: [0, -18, 0] },
      soundFunc: () => PetAudio.petActionYarnBounce(),
    },
    {
      id: 'pounce_moth',
      name: '扑击小彩蝶',
      durationMs: 1000,
      physicsScale: { x: [0.95, 1.14, 1], y: [0, -20, 0], rotate: [0, -6, 6, 0] },
      soundFunc: () => PetAudio.petActionPounce(),
    },
    {
      id: 'pounce_swipe',
      name: '左右交替挥爪',
      durationMs: 800,
      physicsScale: { x: [1, 1.08, 1], y: [0, -10, 0], rotate: [-8, 8, -4, 4, 0] },
      soundFunc: () => PetAudio.petActionPawTapTap(),
    },
  ],
  groom: [
    {
      id: 'groom_face_wash',
      name: '小爪洗面梳理',
      durationMs: 1600,
      physicsScale: { x: [1, 1.04, 1], y: [0, -2, 0], rotate: [0, -6, 0] },
      soundFunc: () => PetAudio.petPurrSnuggle(),
    },
    {
      id: 'groom_chest_fluff',
      name: '整理胸前白绒毛',
      durationMs: 1800,
      physicsScale: { x: [1, 1.06, 1], y: [0, 2, 0] },
      soundFunc: () => PetAudio.petPurrHeadRub(),
    },
    {
      id: 'groom_head_shake',
      name: '甩头抖动毛发',
      durationMs: 800,
      physicsScale: { x: [1, 1.08, 0.94, 1], y: [0, 0, 0], rotate: [-10, 10, -6, 6, 0] },
      soundFunc: () => PetAudio.petMeowChirp(),
    },
  ],
  dance: [
    {
      id: 'dance_rhythm_sway',
      name: '节奏摇摆舞',
      durationMs: 1200,
      physicsScale: { x: [1, 1.06, 1, 1.06, 1], y: [0, -12, 0, -12, 0], rotate: [-8, 8, -8, 8, 0] },
      soundFunc: () => PetAudio.petJoyWaltz(),
    },
    {
      id: 'dance_twirl',
      name: '旋转小芭蕾',
      durationMs: 1400,
      physicsScale: { x: [1, 0.9, 1.1, 1], y: [0, -16, 0], rotate: [0, 180, 360] },
      soundFunc: () => PetAudio.petMagicTransform(),
    },
    {
      id: 'dance_step',
      name: '欢快双爪踏步',
      durationMs: 1000,
      physicsScale: { x: [1, 1.05, 1], y: [0, -10, 0, -10, 0], rotate: [-5, 5, -5, 5, 0] },
      soundFunc: () => PetAudio.petJoyApplause(),
    },
  ],
  purr: [
    {
      id: 'purr_head_tilt',
      name: '侧头蹭屏撒娇',
      durationMs: 1600,
      physicsScale: { x: [1, 1.08, 1], y: [0, -4, 0], rotate: [0, 8, -4, 0] },
      soundFunc: () => PetAudio.petPurrHeadRub(),
    },
    {
      id: 'purr_arch_back',
      name: '拱背贴贴求抱',
      durationMs: 1800,
      physicsScale: { x: [0.95, 1.06, 1], y: [0, -8, 2, 0] },
      soundFunc: () => PetAudio.petPurrDeep(),
    },
    {
      id: 'purr_vibrate',
      name: '全身极度惬意微颤',
      durationMs: 1500,
      physicsScale: { x: [1, 1.03, 0.98, 1.02, 1], y: [0, -3, 0] },
      soundFunc: () => PetAudio.petPurrHarmonic(),
    },
  ],
  highFive: [
    {
      id: 'highfive_single',
      name: '右爪击掌 High Five',
      durationMs: 900,
      physicsScale: { x: [1, 1.15, 1], y: [0, -10, 0], rotate: [0, -8, 0] },
      soundFunc: () => PetAudio.petActionPawHighFive(),
    },
    {
      id: 'highfive_double',
      name: '双爪连击掌',
      durationMs: 1100,
      physicsScale: { x: [1, 1.2, 0.95, 1], y: [0, -14, 0] },
      soundFunc: () => PetAudio.petActionPawTapTap(),
    },
    {
      id: 'highfive_shy',
      name: '害羞轻碰爪',
      durationMs: 1000,
      physicsScale: { x: [1, 1.06, 1], y: [0, -5, 0], rotate: [0, 4, 0] },
      soundFunc: () => PetAudio.petMeowCute(),
    },
  ],
};

// ── 20 种生物解剖学表情定义 ───────────────────────────────────
export type PetExpressionCategory =
  | 'happy'       // 1. 甜笑弯月眼
  | 'excited'     // 2. 惊喜大笑星芒眼
  | 'giggle'      // 3. 哈哈大笑
  | 'proud'       // 4. 自豪得意
  | 'singing'     // 5. 唱歌张嘴
  | 'cheering'    // 6. 欢呼喝彩
  | 'love'        // 7. 爱心闪烁
  | 'cute'        // 8. 水灵无辜大眼
  | 'shy'         // 9. 害羞红晕
  | 'comforting'  // 10. 温柔治愈
  | 'wink'        // 11. 调皮单眼眨
  | 'curious'     // 12. 好奇探头
  | 'thinking'    // 13. 托腮沉思
  | 'focused'     // 14. 专注观察
  | 'surprised'   // 15. 呆萌惊讶
  | 'puzzled'     // 16. 歪头疑惑
  | 'sleepy'      // 17. 困倦打哈欠
  | 'tickled'     // 18. 怕痒笑出褶子
  | 'eating'      // 19. 嚼小鱼干鼓腮
  | 'blinking'    // 20. 生理自然眨眼
  | 'mischievous';// 21. 搞怪吐舌头

// ── 7 大身体触控热区 ──────────────────────────────────────────
export type PetTouchZone =
  | 'ears'
  | 'forehead'
  | 'cheeks'
  | 'nose'
  | 'belly'
  | 'paws'
  | 'tail';

export interface TouchReactionConfig {
  defaultAction: PetActionCategory;
  defaultExpression: PetExpressionCategory;
  speechOptions: string[];
  particleSymbols: string[];
  soundTrigger: () => void;
}

export const PET_TOUCH_REACTIONS: Record<PetTouchZone, TouchReactionConfig> = {
  ears: {
    defaultAction: 'groom',
    defaultExpression: 'cute',
    speechOptions: [
      '耳朵痒痒的～小茜正在竖起耳朵听宝贝说话呢！',
      '动动小耳朵，接收到了宇宙的超级智慧信号！',
      '喵呜～小耳朵最灵敏啦，任何难题都逃不过！',
    ],
    particleSymbols: ['🎵', '✨', '🐾', '💫'],
    soundTrigger: () => PetAudio.petMeowChirp(),
  },
  forehead: {
    defaultAction: 'purr',
    defaultExpression: 'love',
    speechOptions: [
      '摸摸头，宝贝今天真乖！小茜好喜欢你呀～',
      '贴贴～被宝贝摸摸头是最幸福的事啦！💖',
      '摸摸智慧的小脑门，我们一起变得越来越聪明！',
    ],
    particleSymbols: ['💖', '💕', '🌸', '✨'],
    soundTrigger: () => PetAudio.petPurrHeadRub(),
  },
  cheeks: {
    defaultAction: 'purr',
    defaultExpression: 'happy',
    speechOptions: [
      '捏捏软乎乎的小脸蛋～好舒服呀，喵呜～',
      '嘻嘻，脸颊粉扑扑的，像甜甜的草莓棉花糖！',
      '揉揉小脸蛋，今天也是元气满满的一天！',
    ],
    particleSymbols: ['🍓', '🌸', '✨', '💕'],
    soundTrigger: () => PetAudio.petFunBubbleBig(),
  },
  nose: {
    defaultAction: 'jump',
    defaultExpression: 'thinking',
    speechOptions: [
      '阿啾！碰碰小鼻尖，闻到了智慧的香味～',
      '嗅嗅～小茜闻到了新知识的气息！要不要探索一下？',
      '碰碰粉粉的小鼻子，魔法灵感马上来！⭐',
    ],
    particleSymbols: ['✨', '⭐', '💫', '🌟'],
    soundTrigger: () => PetAudio.petFunSneeze(),
  },
  belly: {
    defaultAction: 'stretch',
    defaultExpression: 'tickled',
    speechOptions: [
      '哈哈哈哈好痒好痒！小茜的肚皮最怕痒啦，好开心！',
      '翻个肚皮求抱抱～小茜最信任宝贝啦！',
      '咕噜咕噜～软萌小肚皮像大面包一样软糯！',
    ],
    particleSymbols: ['🫧', '🎈', '💖', '🎉'],
    soundTrigger: () => PetAudio.petFunGiggle(),
  },
  paws: {
    defaultAction: 'highFive',
    defaultExpression: 'excited',
    speechOptions: [
      '耶！跟小茜击个掌！High Five！我们是最棒的学习搭档！',
      '拍拍小肉垫，盖个章！今天的任务一定能超额完成！',
      '爪爪碰爪爪，友谊长存！我们一起冲鸭！🐾',
    ],
    particleSymbols: ['🐾', '🌟', '👏', '⭐'],
    soundTrigger: () => PetAudio.petActionPawHighFive(),
  },
  tail: {
    defaultAction: 'dance',
    defaultExpression: 'happy',
    speechOptions: [
      '摇一摇快乐尾巴～给宝贝加满活力能量！',
      '甩甩尾巴画个圈，烦恼全都不见啦！💫',
      '毛茸茸的尾巴就像魔法棒，变出天天好心情！',
    ],
    particleSymbols: ['💫', '🌈', '✨', '🎈'],
    soundTrigger: () => PetAudio.petActionTailSwoosh(),
  },
};

// ── 智能情境状态机 (Combo & Fatigue & Emotion Engine) ──────────
export class PetBehaviorStateMachine {
  private consecutiveTouchCount = 0;
  private lastTouchTime = 0;
  private currentExcitement = 0.5; // 0.0 (sleepy) ~ 1.0 (ecstatic)

  /** 处理一次用户触摸 */
  public registerTouch(zone: PetTouchZone): {
    action: PetActionCategory;
    expression: PetExpressionCategory;
    dialogue: string;
    actionVariant: ActionVariant;
    isCombo: boolean;
  } {
    const now = Date.now();
    if (now - this.lastTouchTime < 1800) {
      this.consecutiveTouchCount += 1;
      this.currentExcitement = Math.min(1.0, this.currentExcitement + 0.15);
    } else {
      this.consecutiveTouchCount = 1;
      this.currentExcitement = Math.max(0.4, this.currentExcitement - 0.1);
    }
    this.lastTouchTime = now;

    const reaction = PET_TOUCH_REACTIONS[zone];
    const isCombo = this.consecutiveTouchCount >= 3;

    // 连击升级机制：多次互动激发跳舞或击掌高潮
    let action = reaction.defaultAction;
    let expression = reaction.defaultExpression;

    if (isCombo && this.consecutiveTouchCount % 3 === 0) {
      action = 'dance';
      expression = 'excited';
    }

    // 随机选取一个变体
    const variants = PET_ACTION_VARIANTS[action] || PET_ACTION_VARIANTS.idle;
    const variantIndex = Math.floor(Math.random() * variants.length);
    const actionVariant = variants[variantIndex] ?? variants[0]!;

    // 随机选取一句台词
    const speechIdx = Math.floor(Math.random() * reaction.speechOptions.length);
    const dialogue = isCombo
      ? `【连击 ×${this.consecutiveTouchCount}】${reaction.speechOptions[speechIdx]}`
      : reaction.speechOptions[speechIdx] ?? '';

    return {
      action,
      expression,
      dialogue,
      actionVariant,
      isCombo,
    };
  }

  /** 获取待机建议动作（依据时间或空闲时长） */
  public getIdleSuggestion(idleSeconds: number): {
    action: PetActionCategory;
    expression: PetExpressionCategory;
  } {
    if (idleSeconds > 60) {
      return { action: 'lay', expression: 'sleepy' };
    }
    if (idleSeconds > 25) {
      return { action: 'stretch', expression: 'curious' };
    }
    return { action: 'idle', expression: 'happy' };
  }
}
