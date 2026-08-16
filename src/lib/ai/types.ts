/**
 * AI 服务层 · 类型定义
 * 与 OpenAI Chat Completions 兼容，并扩展 Agnes 的推理模型特性。
 */

export type AiRole = 'system' | 'user' | 'assistant';

export interface AiMessage {
  role: AiRole;
  content: string;
}

/** 业务场景标识：用于选模型、埋日志、做缓存分区 */
export type AiScene =
  | 'poem.tutor' // 古诗导师（讲解 + 追问）
  | 'poem.grade' // 背诵讲评
  | 'math.explain' // 数学答错讲解
  | 'math.generate' // 数学应用题生成
  | 'logic.explain' // 逻辑规律揭秘
  | 'letter.story' // 字母小故事
  | 'plan.today' // 今日课程动态排课
  | 'praise' // AI 夸夸
  | 'parent.report' // 家长学情周报
  | 'parent.deepReport' // AI 深度学情报告（结构化）
  // —— v6 新增 12 个场景 ——
  | 'number.story' // 数字儿歌
  | 'count.generate' // AI 情景数数题
  | 'letter.match' // AI 字母配对出题
  | 'poem.imagine' // 古诗画面想象
  | 'poem.compare' // 古诗对比讲解
  | 'poem.prosody' // 格律 AI 解读
  | 'poet.story' // 诗人故事会
  | 'quiz.extend' // 答对知识扩展
  | 'adventure.encourage' // 闯关失败鼓励
  | 'daily.summary' // 每日学习总结
  | 'wrong.analyze' // AI 错题分析
  | 'recommend.practice' // AI 个性化复习推荐
  // —— 汉字识字 & 英语单词 ——
  | 'hanzi.story' // 汉字小故事
  | 'hanzi.sentence' // 汉字造句
  | 'pinyin.tutor' // 拼音辅导
  | 'word.story' // 英语单词故事
  | 'word.phonics' // 自然拼读讲解
  | 'storybook.generate' // AI 动态绘本生成
  | 'speech.advise' // AI 朗读发音建议（P3-14）
  // —— AI 个性化学习路径 ——
  | 'path.narrate' // 今日焦点个性化叙事
  | 'path.weekly' // 本周目标规划文案
  | 'path.coach' // 家长教练点评
  // —— AI 陪伴学习伙伴 ——
  | 'companion.chat' // 小智自由对话（陪伴学习伙伴）
  | 'companion.explain' // 小智拟人化讲解
  // —— S2 Companion 2.0 新增 ——
  | 'companion.buddyQuiz'    // 学习搭子出题（结构化）
  | 'companion.dailyQuest'   // 每日任务生成（结构化）
  | 'companion.comfort'      // 情绪安抚（流式）
  | 'companion.celebrate'    // 成就庆祝（流式）
  | 'companion.followUp'    // 知识追问（流式）
  // —— 成语 AI 化 ——
  | 'idiom.story'    // 成语故事讲解（流式）
  | 'idiom.sentence' // 成语造句（结构化）
  | 'idiom.hint'     // 成语接龙提示（结构化）
  // —— A3 儿歌学唱升级 ——
  | 'song.recommend'   // AI 歌曲推荐（结构化 JSON）
  | 'song.explain'    // AI 歌词解读（流式文本）
  // —— B1 音乐创作升级 ——
  | 'music.create'    // AI 音乐创作小助手（流式）
  | 'music.rhythm'    // AI 节奏模仿评判（流式）
  // —— B3/B4 节气与安全 ——
  | 'festival.talk'   // 节气传统节日 AI 讲解（流式）
  | 'safety.scene';   // 安全教育情景对话（流式）

/** 流式分片：思考链与正文分离 */
export type AiChunk =
  | { type: 'thinking'; text: string }
  | { type: 'text'; text: string }
  | { type: 'done'; usage?: AiUsage }
  | { type: 'error'; error: AiError };

export interface AiUsage {
  promptTokens: number;
  /** 思考链消耗（Agnes 全部模型均为推理模型，此项通常占大头） */
  reasoningTokens: number;
  /** 真正输出给用户的正文 token */
  textTokens: number;
  totalTokens: number;
}

export interface AiError {
  /** 归一化错误码 */
  code:
    | 'unauthorized'
    | 'invalid_request'
    | 'model_not_found'
    | 'rate_limited'
    | 'timeout'
    | 'network_error'
    | 'empty_content'
    | 'bad_output'
    | 'disabled'
    /** 调用方主动取消（切页/卸载/新请求覆盖），不是故障，UI 不应报错 */
    | 'aborted'
    | 'unknown';
  message: string;
  /** 是否值得重试 */
  retryable: boolean;
  status?: number;
}

export interface ChatOptions {
  scene: AiScene;
  messages: AiMessage[];
  /** 不传则由 config 按 scene 决定 */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** 要求模型返回纯 JSON */
  json?: boolean;
  signal?: AbortSignal;
  /** 缓存键；给定后命中缓存将直接返回，不发请求 */
  cacheKey?: string;
  /** 缓存有效期（毫秒），默认 7 天 */
  cacheTtl?: number;
}

export interface AiResult {
  ok: boolean;
  /** 正文（已剔除思考链） */
  text: string;
  /** 思考链，仅调试/家长视图使用，不展示给孩子 */
  thinking?: string;
  usage?: AiUsage;
  error?: AiError;
  /** 结果来自缓存 */
  cached?: boolean;
  /** 实际使用的模型（可能因降级与请求不同） */
  model?: string;
  /** 耗时毫秒 */
  ms?: number;
}

/** 调用日志条目（存 store，家长中心可查） */
export interface AiLogEntry {
  at: number;
  scene: AiScene;
  model: string;
  ms: number;
  ok: boolean;
  cached?: boolean;
  textTokens?: number;
  reasoningTokens?: number;
  errCode?: string;
}

/* ======================================================================
 * 媒体生成（图片 / 视频）——Agnes Media（P4-1 接入）
 * ==================================================================== */

/** 图片生成请求（文生图 / 图生图） */
export interface ImageGenOptions {
  prompt: string;
  /** 输出档位：1K / 2K / 3K / 4K（或兼容 1024x768 精确写法），默认 1K */
  size?: string;
  /** 宽高比：1:1 / 3:4 / 4:3 / 16:9 / 9:16 / 2:3 / 3:2 / 21:9，默认 1:1 */
  ratio?: string;
  /** 图生图/多图合成：输入图片 URL 或 Data URI（最多 4 张） */
  image?: string[];
  signal?: AbortSignal;
}

/** 图片生成结果 */
export interface ImageGenResult {
  ok: boolean;
  /** 图片 URL（https 或 data:image base64） */
  url?: string;
  model?: string;
  error?: AiError;
  /** 耗时毫秒 */
  ms?: number;
}

/** 视频生成请求（文生视频 / 图生视频 / 关键帧动画） */
export interface VideoGenOptions {
  prompt: string;
  /** 图生视频：单张输入图片 URL */
  image?: string;
  /** 关键帧动画：2-8 张输入图片 URL 数组 */
  keyframes?: string[];
  /** 帧数：自动对齐 8n+1 且 ≤441，默认 121（约 5s@24fps） */
  numFrames?: number;
  /** 帧率 1-60，默认 24 */
  frameRate?: number;
  /** 反向提示词（可选） */
  negativePrompt?: string;
  /** 固定随机种子（可选，可复现） */
  seed?: number;
  signal?: AbortSignal;
}

/** 视频任务（创建后轮询句柄） */
export interface VideoTask {
  ok: boolean;
  videoId?: string;
  status?: string;
  progress?: number;
  seconds?: string;
  size?: string;
  model?: string;
  error?: AiError;
  /** 耗时毫秒 */
  ms?: number;
}

/** 视频状态（轮询结果） */
export interface VideoStatus {
  ok: boolean;
  status?: string;
  progress?: number;
  /** 完成后的视频 URL（顶层 url 字段，实测） */
  url?: string;
  seconds?: string;
  size?: string;
  error?: AiError;
  /** 耗时毫秒 */
  ms?: number;
}
