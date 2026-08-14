/**
 * 英语情景对话数据（从 DialoguePage 组件迁出，供出题器/每日计划/复习复用）
 * ------------------------------------------------------------
 */
export interface DialogueLine {
  speaker: 'A' | 'B';
  en: string;
  zh: string;
}

export interface Dialogue {
  id: string;
  scene: string;
  emoji: string;
  desc: string;
  lines: DialogueLine[];
}

export const DIALOGUES: Dialogue[] = [
  {
    id: 'shop',
    scene: '商店购物',
    emoji: '🛒',
    desc: '在商店买东西',
    lines: [
      { speaker: 'A', en: 'Hello! Can I help you?', zh: '你好！需要帮忙吗？' },
      { speaker: 'B', en: 'Yes, I want an apple.', zh: '是的，我想要一个苹果。' },
      { speaker: 'A', en: 'Here you are. Two yuan, please.', zh: '给你。两元。' },
      { speaker: 'B', en: 'Thank you! Here is the money.', zh: '谢谢！给你钱。' },
      { speaker: 'A', en: 'You are welcome. Bye!', zh: '不客气。再见！' },
      { speaker: 'B', en: 'Goodbye!', zh: '再见！' },
    ],
  },
  {
    id: 'restaurant',
    scene: '餐厅点餐',
    emoji: '🍽️',
    desc: '在餐厅点食物',
    lines: [
      { speaker: 'A', en: 'Welcome! What would you like?', zh: '欢迎！你想吃什么？' },
      { speaker: 'B', en: 'I would like some rice and fish.', zh: '我想要一些米饭和鱼。' },
      { speaker: 'A', en: 'Anything to drink?', zh: '要喝什么吗？' },
      { speaker: 'B', en: 'A glass of milk, please.', zh: '请来一杯牛奶。' },
      { speaker: 'A', en: 'OK. Just a moment.', zh: '好的。稍等。' },
      { speaker: 'B', en: 'Thank you!', zh: '谢谢！' },
    ],
  },
  {
    id: 'school',
    scene: '学校交友',
    emoji: '🏫',
    desc: '在学校认识新朋友',
    lines: [
      { speaker: 'A', en: 'Hi! What is your name?', zh: '嗨！你叫什么名字？' },
      { speaker: 'B', en: 'My name is Tom. And you?', zh: '我叫汤姆。你呢？' },
      { speaker: 'A', en: 'I am Lily. Nice to meet you!', zh: '我是莉莉。很高兴认识你！' },
      { speaker: 'B', en: 'Nice to meet you too.', zh: '我也很高兴认识你。' },
      { speaker: 'A', en: 'Let us play together!', zh: '我们一起玩吧！' },
      { speaker: 'B', en: 'Great idea!', zh: '好主意！' },
    ],
  },
  {
    id: 'home',
    scene: '家庭日常',
    emoji: '🏠',
    desc: '在家和爸爸妈妈说话',
    lines: [
      { speaker: 'A', en: 'Good morning, Mom!', zh: '早上好，妈妈！' },
      { speaker: 'B', en: 'Good morning! Time for breakfast.', zh: '早上好！该吃早餐了。' },
      { speaker: 'A', en: 'What is for breakfast?', zh: '早餐吃什么？' },
      { speaker: 'B', en: 'Eggs and milk. Eat well!', zh: '鸡蛋和牛奶。好好吃！' },
      { speaker: 'A', en: 'Yummy! Thank you, Mom.', zh: '真好吃！谢谢妈妈。' },
      { speaker: 'B', en: 'You are a good child.', zh: '你真乖。' },
    ],
  },
  {
    id: 'park',
    scene: '公园游玩',
    emoji: '🌳',
    desc: '在公园和小朋友玩',
    lines: [
      { speaker: 'A', en: 'Look! A big tree!', zh: '看！一棵大树！' },
      { speaker: 'B', en: 'Yes, and a bird is on it.', zh: '是的，上面有一只鸟。' },
      { speaker: 'A', en: 'I like birds. Do you?', zh: '我喜欢鸟。你呢？' },
      { speaker: 'B', en: 'Me too! They can fly.', zh: '我也是！它们会飞。' },
      { speaker: 'A', en: 'Let us play on the slide.', zh: '我们去玩滑梯吧。' },
      { speaker: 'B', en: 'OK! Race you there!', zh: '好！看谁先到！' },
    ],
  },
  {
    id: 'weather',
    scene: '谈论天气',
    emoji: '☀️',
    desc: '和老师聊天气',
    lines: [
      { speaker: 'A', en: 'Good morning, teacher!', zh: '早上好，老师！' },
      { speaker: 'B', en: 'Good morning! How is the weather?', zh: '早上好！天气怎么样？' },
      { speaker: 'A', en: 'It is sunny today.', zh: '今天是晴天。' },
      { speaker: 'B', en: 'Yes, it is a nice day.', zh: '是的，是个好天气。' },
      { speaker: 'A', en: 'Can we play outside?', zh: '我们能在户外玩吗？' },
      { speaker: 'B', en: 'Of course! Have fun!', zh: '当然！玩得开心！' },
    ],
  },
];

/** 获取全部对话 */
export function getAllDialogues(): Dialogue[] {
  return DIALOGUES;
}

/** 按 id 查找对话 */
export function getDialogueById(id: string): Dialogue | undefined {
  return DIALOGUES.find((d) => d.id === id);
}
