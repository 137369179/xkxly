# 宝贝学习乐园 · Code Wiki

> 面向 6 岁儿童的幼儿学习 Web 应用。彩虹糖果配色，PC 左侧栏 + 移动底部 Tab，按钮 ≥44px，进度用 localStorage 持久化。已演进到 v6 版本，集成 AI 导师、神经 TTS、专业古诗研读系统、间隔重复引擎、家长中心等能力。

---

## 目录

1. [项目概览](#1-项目概览)
2. [技术栈与依赖](#2-技术栈与依赖)
3. [整体架构](#3-整体架构)
4. [目录结构](#4-目录结构)
5. [核心模块职责](#5-核心模块职责)
6. [关键类与函数说明](#6-关键类与函数说明)
7. [数据流与状态管理](#7-数据流与状态管理)
8. [AI 子系统](#8-ai-子系统)
9. [TTS 语音子系统](#9-tts-语音子系统)
10. [古诗研读引擎](#10-古诗研读引擎)
11. [BFF 代理与部署](#11-bff-代理与部署)
12. [构建与运行](#12-构建与运行)
13. [版本演进与设计原则](#13-版本演进与设计原则)

---

## 1. 项目概览

### 产品定位
面向学龄前与小学低年级儿童的**全场景启蒙学习平台**，覆盖字母、数字、古诗、汉字、拼音、英语单词、逻辑、闯关、奖励等九大学习模块，并配以家长中心做学情追踪与护眼控制。

### 核心特性
- **彩虹糖果设计系统**：6 色主题（粉/蓝/黄/绿/紫/橙）+ 圆润字体 + 软阴影 + 动画反馈，符合幼儿审美
- **每日课程包引擎**：自动生成「热身复习→新字母→新数字→新古诗→综合练习」5 节约 12 分钟课程
- **间隔重复（SRS）**：6 级掌握度 + 艾宾浩斯遗忘曲线，错题本约 35% 注入复习
- **五步学习闭环**：玩→认→练→写→说，配 `TraceCanvas` 笔顺描红
- **专业古诗研读**：385 首语料，平仄/押韵/对仗引擎，平水韵查表，54 篇深度作庭
- **AI 导师**：基于 Agnes 推理模型，22+ 场景化任务，BFF 架构隔离密钥
- **神经 TTS**：Kokoro 本地推理引擎 + 系统语音降级 + 多音字纠音
- **儿童安全**：三道 AI 护栏（入口过滤 / Prompt 边界 / 出口校验）

### 上线信息
- 在线地址：`https://5dff99b481cd499881ca01fde3105a60.bj6.agentos-app.net`
- 二维码：`扫码访问.png`

---

## 2. 技术栈与依赖

### 运行时依赖（`package.json` dependencies）

| 依赖 | 版本 | 用途 |
|------|------|------|
| `react` / `react-dom` | ^19.1.1 | UI 框架（React 19 并发特性） |
| `zustand` | ^5.0.8 | 全局状态管理（persist 中间件落 localStorage） |
| `motion` | ^12.23.12 | 动画库（`motion/react` 入口，页面过渡 + 微交互） |
| `canvas-confetti` | ^1.9.4 | 庆祝彩纸效果（按需动态 import，不进首屏 chunk） |
| `pinyin-pro` | ^3.28.2 | 拼音处理（汉字转拼音、声调分析） |

### 开发依赖（devDependencies）

| 依赖 | 用途 |
|------|------|
| `vite` ^7.1.5 | 构建工具 |
| `@vitejs/plugin-react` ^5.0.2 | React Fast Refresh |
| `tailwindcss` ^4.1.13 + `@tailwindcss/vite` | 原子化 CSS（v4，`@theme`/`@utility` 语法） |
| `typescript` ^5.9.2 | 类型系统（strict 模式） |
| `qrcode` ^1.5.4 | 部署二维码生成 |
| `@types/*` | 类型定义 |

### Web API 依赖
- **Web Speech API**：`SpeechSynthesis` 系统语音
- **Web Audio API**：合成音效 + 录音解码
- **WebGPU**：Kokoro 神经 TTS 推理（可选）
- **Cache API**：Cloudflare Worker 限流计数
- **ReadableStream / TransformStream**：SSE 流式透传

### 零依赖设计
- `server/index.mjs`（BFF 代理）仅用 Node 内置模块（`http`/`fs`/`path`），无 `npm install`
- `worker/index.mjs`（Cloudflare Worker）纯 Web API，无需 `nodejs_compat`
- 路由 `src/lib/router.ts` 自实现 hash 路由，无 react-router 依赖

---

## 3. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    浏览器（前端 SPA）                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  React 19 + Vite + Tailwind v4 + Zustand           │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │    │
│  │  │  Pages    │→ │  Store    │→ │  localStorage │   │    │
│  │  │ (14 路由) │  │ (persist) │  │  (持久化)     │   │    │
│  │  └─────┬─────┘  └───────────┘  └───────────────┘   │    │
│  │        │                                            │    │
│  │  ┌─────▼──────────────────────────────────────┐    │    │
│  │  │  Lib 层（引擎）                             │    │    │
│  │  │  questions / srs / speech / prosody / ai   │    │    │
│  │  └─────┬──────────────────────────────┬───────┘    │    │
│  │        │ /api/ai/chat (SSE)            │ Web Speech │    │
│  └────────┼──────────────────────────────┼────────────┘    │
└───────────┼──────────────────────────────┼─────────────────┘
            │                              │
            ▼                              ▼
┌───────────────────────┐        ┌─────────────────────┐
│  BFF 代理（密钥隔离）  │        │  系统 TTS / Kokoro  │
│  server/index.mjs     │        │  神经 TTS（WebGPU） │
│  或 worker/index.mjs  │        └─────────────────────┘
│  - 并发限流            │
│  - 每 IP 限流          │
│  - SSE 透传            │
│  - 静态托管            │
└───────────┬───────────┘
            │ Bearer AGNES_API_KEY
            ▼
┌───────────────────────┐
│  Agnes AI 上游        │
│  api.agnes-ai.cn/v1   │
│  推理模型（思考链）    │
└───────────────────────┘
```

### 三层架构
1. **表现层（`src/modules` + `src/components`）**：14 个页面模块 + 可复用 UI 组件
2. **引擎层（`src/lib`）**：题目生成、SRS、语音、格律、AI 客户端等纯逻辑
3. **数据层（`src/data` + `src/store`）**：静态语料 + Zustand 持久化状态

---

## 4. 目录结构

```
宝贝学习乐园/
├── src/
│   ├── App.tsx                 # 应用根组件（路由分发 + 全局壳）
│   ├── main.tsx                # React 入口
│   ├── types.ts                # 全局 TypeScript 类型定义
│   ├── vite-env.d.ts           # Vite 环境类型补充
│   │
│   ├── components/             # 跨模块复用组件
│   │   ├── ai/                 # AI 交互组件（AiChat/AiPanel/AiVoiceModal）
│   │   ├── layout/             # 布局壳（Sidebar/BottomTabs/TopBar）
│   │   ├── ui/                 # 基础 UI（Button/Card/Modal/Stars/ProgressBar/Tabs）
│   │   ├── BadgeUnlock.tsx     # 徽章解锁弹窗
│   │   ├── Companion.tsx       # 陪伴吉祥物
│   │   ├── CreativeExpress.tsx # 创意表达
│   │   ├── DualPK.tsx          # 双人对战
│   │   ├── ErrorBoundary.tsx   # 错误边界（单页出错不拖垮整站）
│   │   ├── GrowthTree.tsx      # 成长树
│   │   ├── LearnFlow.tsx       # 五步学习闭环外壳
│   │   ├── LetterLearn.tsx     # 字母学习
│   │   ├── ListenTrainer.tsx   # 听力训练
│   │   ├── NumberLearn.tsx     # 数字学习
│   │   ├── QuizCard.tsx        # 题目卡片（含 AI 讲解）
│   │   ├── RoundRunner.tsx     # 通用回合组件（抽题→作答→结算评星）
│   │   ├── StoryBook.tsx       # AI 故事绘本
│   │   ├── StoryCanvas.tsx     # 故事画布
│   │   ├── StudyGuard.tsx      # 学习时长护栏
│   │   └── TraceCanvas.tsx     # 描红书写板
│   │
│   ├── data/                   # 静态语料与配置
│   │   ├── letters.ts          # 26 字母数据
│   │   ├── hanzi.ts / hanzi500.ts / hanziIndex.ts  # 汉字数据
│   │   ├── pinyin.ts / pinyinIndex.ts / phonics.ts # 拼音与 Phonics
│   │   ├── words.ts / wordIndex.ts                  # 英语单词
│   │   ├── poems.ts / poems.json / poems-deep.json  # 古诗语料
│   │   ├── poemDossiers.ts     # 54 篇深度作庭
│   │   ├── poemLineNotes.ts    # 逐句串讲
│   │   ├── allusionSources.ts  # 典故出处库
│   │   ├── poets.ts            # 36 位诗人小传
│   │   ├── pingShuiYun.ts      # 平水韵 30 韵部表
│   │   ├── levels.ts           # 12 个闯关关卡
│   │   ├── badges.ts           # 徽章定义
│   │   ├── stickers.ts         # 贴纸定义
│   │   └── nav.ts              # 导航项配置
│   │
│   ├── lib/                    # 引擎层（纯逻辑）
│   │   ├── ai/                 # AI 子系统（见 §8）
│   │   ├── tts/                # TTS 子系统（见 §9）
│   │   ├── router.ts           # hash 路由
│   │   ├── questions.ts        # 通用题目引擎
│   │   ├── srs.ts              # 间隔重复引擎
│   │   ├── dailyPlan.ts        # 每日课程包引擎
│   │   ├── drill.ts            # 练习调度
│   │   ├── speech.ts           # Web Speech 封装
│   │   ├── prosody.ts          # 格律分析引擎
│   │   ├── chant.ts            # 诵读节奏引擎
│   │   ├── recite.ts           # 背诵训练
│   │   ├── poemQuiz.ts         # 古诗自测题库
│   │   ├── poemPlan.ts         # 复习计划
│   │   ├── audioCompare.ts     # 录音声波分析
│   │   ├── chineseNumber.ts    # 阿拉伯↔中文数字
│   │   ├── celebrate.ts        # 庆祝彩纸
│   │   ├── sfx.ts              # Web Audio 音效
│   │   ├── studyClock.ts       # 学习计时
│   │   ├── tones.ts            # 6 色主题
│   │   ├── posterGenerator.ts  # 海报生成
│   │   └── utils.ts            # 通用工具
│   │
│   ├── modules/                # 14 个页面模块
│   │   ├── home/HomePage.tsx              # 首页仪表盘
│   │   ├── today/TodayPage.tsx            # 今日课程
│   │   ├── letters/                       # 字母乐园
│   │   ├── numbers/                       # 数字王国
│   │   ├── poems/                         # 古诗花园（最复杂）
│   │   ├── hanzi/                         # 汉字识字
│   │   ├── pinyin/                        # 拼音学习
│   │   ├── words/                         # 英语单词
│   │   ├── logic/LogicPage.tsx            # 逻辑挑战
│   │   ├── fun/FunPage.tsx                # 趣味乐园
│   │   ├── adventure/AdventurePage.tsx    # 闯关冒险
│   │   ├── rewards/RewardsPage.tsx        # 奖励中心
│   │   ├── parent/                        # 家长中心
│   │   └── tts-test/TtsTestPage.tsx       # TTS 诊断
│   │
│   ├── store/useStore.ts      # Zustand 全局状态
│   └── styles/index.css       # 全局样式 + 设计系统
│
├── server/                     # BFF 代理（Node 版）
│   ├── index.mjs               # 主服务
│   ├── package.json
│   └── .env.production.example
│
├── worker/                     # BFF 代理（Cloudflare Worker 版）
│   ├── index.mjs
│   ├── wrangler.toml
│   └── package.json
│
├── scripts/                    # 离线数据生成脚本
│   ├── gen-poems.mjs           # 生成拼音
│   ├── enrich-poems.mjs        # 富集元数据
│   ├── add-canon.mjs           # 补入必读经典
│   ├── merge-poems.mjs         # 合并语料
│   └── genPolyphone.mjs        # 生成多音字表
│
├── data/                       # 原始语料
│   └── poems-*.json
│
├── public/                     # 静态资源
│   ├── fonts/baloo-2.woff2     # 自托管字体
│   └── _headers                # Cloudflare 缓存头
│
├── docs/语音合成升级方案.md
├── AI接入方案.md
├── BFF托管方案.md
├── 研究升级方案.md
├── overview.md                 # 项目交付概览
└── 扫码访问.png
```

---

## 5. 核心模块职责

### 5.1 页面模块（`src/modules`）

| 模块 | 路由 | 职责 |
|------|------|------|
| `home` | `#/home` | 仪表盘：星星、连续天数、各模块进度、下一徽章、今日课程入口 |
| `today` | `#/today` | 每日课程包：5 节课程按时段排课，支持中断恢复 |
| `letters` | `#/letters` | 字母墙 + 大小写配对游戏 + 五步学习闭环 |
| `numbers` | `#/numbers` | 0-100 数字墙 + 加减法 + 数物对应 + 描红 |
| `poems` | `#/poems` | 古诗学院：诗库/训练/计划三视图 + 5 标签详情 |
| `hanzi` | `#/hanzi` | 300 字识字：玩认练写说 + AI 造句 |
| `pinyin` | `#/pinyin` | 声母韵母 + 拼读练习 |
| `words` | `#/words` | 74 词 + Phonics 拆音 |
| `logic` | `#/logic` | 找规律/图形配对/排排序，3 档难度 |
| `fun` | `#/fun` | 双人对战 + 听力训练 + 创意表达 |
| `adventure` | `#/adventure` | 12 关地图，按关卡题型抽题，过关解锁 |
| `rewards` | `#/rewards` | 星星换贴纸收集册 + 徽章墙 + 错题本 |
| `parent` | `#/parent` | PIN 门禁 + 时长上限 + 护眼提醒 + 学情报告 |
| `ttstest` | `#/ttstest` | TTS 引擎诊断页 |

### 5.2 引擎模块（`src/lib`）

#### `questions.ts` — 通用题目引擎
覆盖 math/count/number/letter/logic(3 类)/poem + 乘除法/图形/时间/钱币题型。被逻辑页、冒险页、今日课程、综合练习复用。核心导出：
- `makeMathQuestion(difficulty, forceOp?)` — 加减法
- `makeCountQuestion(difficulty)` — 数物对应
- `makeLetterQuestion(difficulty, forceLetter?)` — 字母大小写/首字母
- `makePatternQuestion` / `makeMatchQuestion` / `makeOrderQuestion` — 逻辑三型
- `makePoemQuestion(poems, difficulty, forceId?)` — 古诗接句/选题目
- `questionForSkill(skill, difficulty)` — 知识点→题目派发器（SRS 复习复用）
- `Difficulty = 1 | 2 | 3`

#### `srs.ts` — 间隔重复引擎
6 级掌握度（0-5），间隔 `[0, 1, 2, 4, 7, 15]` 天。儿童版简化：答错只降 1 级不清零。导出：
- `review(prev, correct, now)` — 记录练习，返回新掌握度
- `isDue(m, now)` / `dueSkills(p, now, limit)` — 到期判定与排序
- `weakSkills(p, n)` — 薄弱知识点 TOP N
- `masteryRate(p)` — 整体掌握率 0-1
- `skillLabel(skill, poemTitle?)` — 知识点人类可读名

#### `dailyPlan.ts` — 每日课程包引擎
生成「热身复习→新字母→新数字→新古诗→综合练习」5 节课程。关键设计：判定"已学"只看今天零点之前记录，保证当天课程包不重排。导出：
- `buildDailyPlan(p, now)` — 生成课程包
- `adaptiveDifficulty(p, category)` — 自适应难度（按历史正确率）
- `splitBySlot(plan)` — 按上午/下午/晚上拆分
- `NUMBER_GROUPS` — 数字教学分组（低段逐个，高段整十）

#### `speech.ts` — Web Speech 封装
- `speak(text, options)` — 朗读单段（自动选神经音色、多音字纠音）
- `speakSequence(lines, options)` — 逐句朗读 + 高亮回调
- `speakChant(lines, options)` — 古诗有感情朗读（平长仄短）
- `speakLetter` / `speakNumber` — 快捷方法
- `randomPraise` / `randomEncourage` — 鼓励语

#### `prosody.ts` — 格律分析引擎
古诗专业研读核心。导出 `analyzeProsody(poem): Prosody`，输出：
- `grid` — 逐句逐字平仄网格（含入声标记）
- `rhymeFeet` / `rhymeGroup` / `yunBu` — 韵脚与韵部（平水韵精确判定）
- `standardGrid` — 16 式标准谱（五绝/七绝/五律/七律 × 仄起/平起 × 入韵/不入韵）
- `faults` — 出律检测（孤平/三平调/三仄尾/失韵/失对/失粘）
- `pattern` — 起式判定，如「仄起首句入韵·七言绝句」

#### 其他引擎
- `chant.ts` — 诵读节奏引擎（范读/吟诵 + 录音对照评分）
- `recite.ts` — 背诵训练（1-4 关遮挡 + 逐字评分）
- `poemQuiz.ts` — 古诗自测（作者/接句/填空/主题 4 型）
- `poemPlan.ts` — 复习计划（听→跟读→难点→自测→遮挡背诵→复盘）
- `audioCompare.ts` — 录音声波分析（静音间隙切分 + 皮尔逊相关性）
- `celebrate.ts` — 庆祝彩纸（小庆祝/大庆祝/星星雨）
- `sfx.ts` — Web Audio 合成音效（点击/正确/错误/胜利）
- `chineseNumber.ts` — 阿拉伯数字↔中文数字
- `tones.ts` — 6 色主题系统
- `router.ts` — hash 路由（14 路由）

### 5.3 数据模块（`src/data`）

#### 古诗语料体系
- `poems.json` — 374 首基础语料（含拼音，由 `scripts/gen-poems.mjs` 生成，含 109 条破读纠正）
- `poems-deep.json` — 富集版（体裁/主题/意象/作者背景/难度，由 `scripts/enrich-poems.mjs` 生成）
- `poemsIndex.ts` — 轻量索引（83KB，首屏用）
- `poems.ts` — 默认导出索引版，深层数据按需动态加载
- `poemDossiers.ts` — 54 篇必读名篇手工作庭（译文/注释/背景/用典/修辞/格律）
- `poemLineNotes.ts` — 54 首逐句串讲
- `allusionSources.ts` — ≈44 条典故出处库（跨诗复用）
- `poets.ts` — ≈36 位诗人小传（维基/ctext/搜韵外链）
- `pingShuiYun.ts` — 平水韵平声三十韵部表（172 字精确归部）

#### 其他语料
- `letters.ts` — 26 字母（含 emoji/单词/中文释义）
- `hanzi.ts` / `hanzi500.ts` / `hanziIndex.ts` — 汉字数据
- `pinyin.ts` / `pinyinIndex.ts` / `phonics.ts` — 拼音与 Phonics
- `words.ts` / `wordIndex.ts` — 74 个英语单词
- `levels.ts` — 12 个闯关关卡定义
- `badges.ts` — 徽章定义（含 `check` 判定函数与 `meter` 进度条）
- `stickers.ts` — 贴纸定义
- `nav.ts` — 13 个导航项（6 个出现在移动底部 Tab）

---

## 6. 关键类与函数说明

### 6.1 状态管理

#### `useStore` ([src/store/useStore.ts](file:///Users/mac/WorkBuddy/学习天地/宝贝学习乐园/src/store/useStore.ts))

Zustand store，persist 到 localStorage（key: `baby-learning-park-v1`，version: 2）。

**核心 State**：
- `progress: Progress` — 学习进度（星星/徽章/各模块记录/掌握度/错题本/日志）
- `settings: Settings` — 设置（音效/拼音/PIN/时长上限/护眼/AI 开关）
- `pendingBadges: string[]` — 待展示徽章队列（不持久化）

**关键 Actions**：
- `addStars(n)` / `heardLetter(l)` / `readPoem(id)` / `heardNumber(n)` — 各模块进度记录
- `practice(skill, correct, star?)` — SRS 练习结算（掌握度 + 错题本 + 日志 + 星星）
- `learnSkill(skill)` — 首次接触知识点（教学环节）
- `completeLevel(levelId, stars)` — 闯关结算（差额补星，防刷分）
- `checkIn()` — 每日签到（连续学习天数）
- `buySticker(id, cost)` — 星星兑换贴纸
- `recordRecite(id, score, stage)` — 背诵训练回写 SRS
- `togglePoemCharMark` / `togglePoemLineMark` — 难点标记
- `resetAll()` — 清空进度

**设计要点**：
- `applyProgress` 统一入口：变更进度后自动 `findNewBadges` 计算新解锁徽章
- `partialize` 排除 `pendingBadges`（瞬时 UI 队列）
- `merge` 深合并：v1 老数据升级到 v2 时新字段不为 undefined
- `onRehydrateStorage`：恢复后把 AI 开关同步给 `ai/client` 模块单例

### 6.2 路由

#### `useRoute()` ([src/lib/router.ts](file:///Users/mac/WorkBuddy/学习天地/宝贝学习乐园/src/lib/router.ts))

无依赖 hash 路由。`#/poems/12` → `{ route: 'poems', param: '12' }`。`navigate(route, param?)` 支持同 hash 手动派发。

### 6.3 通用组件

#### `RoundRunner` ([src/components/RoundRunner.tsx](file:///Users/mac/WorkBuddy/学习天地/宝贝学习乐园/src/components/RoundRunner.tsx))

通用回合组件，被逻辑页、冒险页、综合练习复用。
- 接收 `makeQuestion(difficulty)` 出题函数
- 管理 题序/错题数/结算/评星（0 错=3 星，≤⌈n/3⌉ 错=2 星，否则 1 星）
- 3 星触发 `celebrateBig()`，否则 `celebrateStars(s)`
- `renderSummary` 可注入自定义结算（闯关页用）

#### `LearnFlow` ([src/components/LearnFlow.tsx](file:///Users/mac/WorkBuddy/学习天地/宝贝学习乐园/src/components/LearnFlow.tsx))

五步学习闭环外壳（玩→认→练→写→说）。
- 每步 `gate?: boolean` 控制是否需完成动作才能继续
- `FlowStepApi.ready()` 标记本步通过，`next()` 进入下一步
- 步骤指示条可回点已通过步骤

#### `TraceCanvas` ([src/components/TraceCanvas.tsx](file:///Users/mac/WorkBuddy/学习天地/宝贝学习乐园/src/components/TraceCanvas.tsx))

描红书写板（字母/数字/汉字通用，无需为每字维护笔画数据）。
1. 离屏渲染目标字形 → 下采样成 50×50 覆盖网格
2. 容错膨胀 1 格（照顾儿童手部误差）
3. 覆盖率 ≥ 72% 且出格率 ≤ 40% 判定通过
4. 九宫格分区校验防只写半边

#### `QuizCard` ([src/components/QuizCard.tsx](file:///Users/mac/WorkBuddy/学习天地/宝贝学习乐园/src/components/QuizCard.tsx))

题目卡片，支持选项点击/语音朗读/AI 错题讲解（`aiExplain` 透传）。

### 6.4 题目引擎核心函数（[src/lib/questions.ts](file:///Users/mac/WorkBuddy/学习天地/宝贝学习乐园/src/lib/questions.ts)）

所有题目生成函数返回统一的 `Question` 类型（见 [types.ts](file:///Users/mac/WorkBuddy/学习天地/宝贝学习乐园/src/types.ts)），含 `prompt`/`display`/`options`/`answerId`/`hint`/`why`/`skill` 字段。`why` 字段是儿童化错因解释，答错时弹出。

`questionForSkill(skill, difficulty)` 是知识点→题目的派发器，SRS 复习时用它根据 `skill` id（如 `letter:A`、`math:add`、`poem:p001`）生成对应题目。

### 6.5 TTS 管理器

#### `TtsManager` ([src/lib/tts/manager.ts](file:///Users/mac/WorkBuddy/学习天地/宝贝学习乐园/src/lib/tts/manager.ts))

单例 `tts`，全站共享。引擎选择对调用方透明：
- `play(text, opts, onLine)` — 优先当前引擎，失败自动降级系统语音
- `ensureEngine(id)` — 加载指定引擎（Kokoro 首次触发模型下载）
- `getStatus()` — 诊断信息（WebGPU/音色数/各引擎状态）
- `updateSettings(patch)` — 改 Kokoro 配置后丢弃重建实例

---

## 7. 数据流与状态管理

### 7.1 学习闭环数据流

```
用户作答
   │
   ▼
QuizCard.onAnswer(correct)
   │
   ▼
RoundRunner.handleAnswer
   ├─→ onAnswered?(q, correct)      // 业务回调
   │     └─→ useStore.practice(skill, correct, star)
   │           ├─→ srs.review(prev, correct)      // 计算新掌握度
   │           ├─→ 更新 mastery[skill]
   │           ├─→ 错题本增删（lv≥3 移出）
   │           ├─→ 累加星星 + 写 dailyLog
   │           └─→ findNewBadges → pendingBadges
   │
   └─→ 答对: onSolved?() / 答错: setMistakes+1
       │
       ▼
   handleNext → 完成时 celebrateBig/celebrateStars + sfxWin
                └─→ onComplete?(stars)
```

### 7.2 持久化策略

| 数据 | 存储 | 说明 |
|------|------|------|
| `progress` | localStorage | Zustand persist 自动同步 |
| `settings` | localStorage | 同上 |
| `pendingBadges` | 内存 | 瞬时队列，不持久化 |
| TTS 设置 | localStorage | `tts/settings.ts` 独立管理 |
| AI 调用日志 | 内存环形缓冲 | 服务端 200 条 / 客户端 60 条 |
| AI 响应缓存 | 内存 Map | 7 天 TTL，同题不重发 |

### 7.3 数据量控制
- `dailyLog` 最多保留 90 天（`LOG_KEEP_DAYS`），自动回收过期
- `wrongBook` 容量 40（`WRONG_CAP`），新错题前置
- AI 日志服务端 200 条 / 客户端 60 条环形缓冲

---

## 8. AI 子系统

### 8.1 架构分层

```
UI 组件 (AiChat / AiPanel / useAiStream)
        │
        ▼
任务层 (src/lib/ai/tasks/*)        — 业务→模型调用翻译 + fallback
        │
        ▼
客户端 (src/lib/ai/client.ts)      — SSE 解析/重试/降级/缓存/日志
        │
        ▼ POST /api/ai/chat
BFF 代理 (server/ 或 worker/)      — 密钥隔离/限流/透传
        │
        ▼ Bearer AGNES_API_KEY
Agnes 上游 (api.agnes-ai.cn)
```

### 8.2 任务层（`src/lib/ai/tasks/`）

每个 AI 点必须有 `fallback`，AI 挂了产品照样能用。两类任务：
- **`StreamTask`** — 流式长文本（讲解/故事/周报），交给 `<AiPanel>` / `useAiStream`
- **`TaskResult<T>`** — 结构化一次性数据（出题/批改/排课）

按文件组织：
- `explain.ts` — 11 个讲解任务（逻辑/数学/古诗/诗人/汉字/拼音/单词）
- `generate.ts` — 生成任务（数学题/今日计划/字母故事/数数题/配对/汉字造句/单词故事）
- `grade.ts` — 背诵批改
- `report.ts` — 家长报告/表扬/每日总结/闯关鼓励/错题分析/推荐练习
- `storybook.ts` — AI 故事绘本生成

### 8.3 客户端（`src/lib/ai/client.ts`）

全站唯一 AI 出口，处理 7 件事：
1. SSE 流式解析（容忍半包、跳过 `[DONE]`）
2. 思考链分流（`reasoning_content` 与 `content` 分开）
3. 双超时（首字节 25s / 全程 90s）
4. 智能重试（Agnes 参数错误返 500 而非 400，靠 `code` 判断而非 `status`）
5. 模型降级链
6. 本地兜底（全败时 `ok:false`，调用方降级规则内容）
7. 调用日志（环形缓冲 60 条，家长中心可查）

核心导出：
- `chatStream(opts)` — `AsyncGenerator<AiChunk>`，自动重试与降级
- `chat(opts)` — 非流式，内部走流式复用逻辑
- `aiHealth(timeoutMs)` — 探活
- `setAiEnabled(v)` / `isAiEnabled()` — 全局开关
- `aiLogs()` / `onAiLog(fn)` — 日志订阅

### 8.4 配置（`src/lib/ai/config.ts`）

- `MODELS` — 4 个模型（闪电/均衡/深思/深思+）
- `SCENE_CONFIG` — 22+ 场景分级（孩子端速度优先 / 家长端质量优先 / 结构化低温度+JSON）
- 每场景配 `model` + `fallback[]` + `temperature` + `maxTokens` + `json?`
- ⚠️ Agnes 全系推理模型，思考链吃 70-85% token，`max_tokens` 必须给足

### 8.5 儿童安全护栏（`src/lib/ai/guard.ts`）

三道防线：
1. **入口**：`guardInput` 过滤长度/字符集/敏感词
2. **Prompt**：system 写死行为边界（`prompts.ts`）
3. **出口**：`guardOutput` 校验模型输出，不合格回退安全话术

分级黑名单：
- `HARD_BLOCK` — 硬红线（色情/毒品/赌博/自杀/恐怖），任何场景都拦
- `SOFT_BLOCK` — 情境词（暴力/血腥/武器/政治），古诗场景不查

### 8.6 React 接入层（`src/lib/ai/useAi.ts`）

两个 hook，全站 AI 交互统一入口：
- `useAiStream(autoTask?)` — 流式生成（逐字出现/可中断/失败自动兜底）
- `useAiTask()` — 结构化一次性调用

状态机：`idle → thinking → streaming → done/error`。失败不报错给孩子，静默切 fallback。

---

## 9. TTS 语音子系统

### 9.1 引擎架构（`src/lib/tts/`）

```
speech.ts (上层封装: speak / speakSequence / speakChant)
    │
    ▼
manager.ts (TtsManager 单例: 引擎选择/设置持久化/自动降级)
    │
    ├─→ webSpeechEngine.ts  (系统语音, SpeechSynthesis)
    └─→ kokoroEngine.ts     (神经 TTS, WebGPU 推理)
```

### 9.2 关键能力

#### 多音字纠音（`polyphone.ts` + `polyphoneData.ts`）
- 自由文本（故事/讲解/跟读）走 `correctText` 整词替换同音词
- 古诗走 `correctChars`（单字+拼音），避免双重替换
- 109 条破读纠正（如「还」huán、「见」xiàn、「亡」wú）

#### 神经语速曲线（`neuralCurve.ts`）
- `buildNeuralSegments(text, module, moodKey)` 把整段切句
- 按模块/情绪算每句速度与停顿
- 古诗/故事抑扬顿挫、句末拖腔

#### 设置持久化（`settings.ts`）
- 引擎选择 / 音色 / 语速 / 音高 / 音量 / 情绪
- 分模块微调（letter/number/poem/...）
- 写 localStorage，跨会话保留

### 9.3 降级策略
- Kokoro 未配置/加载失败 → 降级系统语音
- 推理异常 → 降级系统语音
- 任何情况保证「永远能出声」

---

## 10. 古诗研读引擎

### 10.1 格律分析（`src/lib/prosody.ts`）

#### 输入输出
`analyzeProsody(poem: DeepPoem): Prosody`

#### 核心能力
- **平仄判定**：现代声调 + 平水韵常用入声字表纠偏（约 500 字）
- **押韵判定**：近体诗按「偶句必押、首句可入韵」结构定位；优先用平水韵精确韵部，否则降级现代十三辙
- **对仗标注**：律诗自动标注颔联/颈联
- **出律检测**：孤平/三平调/三仄尾/失韵/失对/失粘
- **标准谱**：16 式（五绝/七绝/五律/七律 × 仄起/平起 × 入韵/不入韵）

#### 学术严谨性
- 古绝不判失对/失粘（唐人古绝句自由成趣）
- 孤平须加「相邻韵脚」例外（标准尾式 `仄仄仄平平` 非孤平）
- 近体韵部以偶句为准，仄收首句尾字不计入主韵
- 全库 319 首近体诗校验：156 合律 / 130 古绝 / 33 含真出律

### 10.2 平水韵查表（`src/data/pingShuiYun.ts`）
- 172 字考订到平水韵平声三十韵
- 入声字按归部标 `tone:'入'`
- `yunBuOf(c)` / `yunBuShort(c)` 查询函数

### 10.3 诵读节奏（`src/lib/chant.ts`）
- `analyzeChant` — 范读/吟诵两式（平长仄短、入声促、韵脚拖腔）
- `scoreRecording` — 录音对照契合度

### 10.4 录音声波分析（`src/lib/audioCompare.ts`）
- `analyzeEnvelope` — 静音间隙切分还原逐字真实时长
- 皮尔逊相关性算 `fit`（节奏契合度）+ `timeFit`（时长契合度）
- `decodeToAnalysis` — `AudioContext` 解码录音
- 连续无停顿朗读诚实降级为中性分

### 10.5 背诵与自测
- `recite.ts` — `maskPoem`(1-4 关遮挡) + `scoreRecite`(逐字比对)
- `poemQuiz.ts` — 4 型自测（作者/接句/填空/主题），回写 SRS
- `poemPlan.ts` — 六步复习路线（听→跟读→难点→自测→遮挡背诵→复盘）

---

## 11. BFF 代理与部署

### 11.1 双形态部署

#### Node 版（`server/index.mjs`）
零依赖，仅用 Node 内置模块。`node server/index.mjs` 启动。
- 默认端口 8787
- 生产模式同时托管 `dist` 静态资源（`AI_SERVE_STATIC=1`）
- 手写 `.env` 解析（不引入 dotenv），`.env.local` 优先级高于宿主环境变量

#### Cloudflare Worker 版（`worker/index.mjs`）
与 Node 版同构，纯 Web API，无需 `nodejs_compat`。
- 通过 `[assets]` 绑定同域托管 `dist`
- 限流用 Cache API（跨 POP 不严格，防连点够用）
- 免费版限制：单请求 wall-clock 约 30s

### 11.2 安全设计

| 能力 | 实现 |
|------|------|
| 密钥隔离 | `AGNES_API_KEY` 仅服务端持有，前端 bundle 永不接触 |
| 并发限流 | 全局闸门（默认 2），超过排队 |
| 每 IP 限流 | 滑动窗口 30 次/分钟，定时清理防泄漏 |
| CORS 白名单 | `AI_ALLOW_ORIGIN` 配置，白名单外浏览器请求不返回 allow-origin |
| 字段白名单 | 只允许 `model/messages/temperature/max_tokens/stream/response_format` 落到上游 |
| 目录穿越防护 | 剥离前导斜杠 + 强制 `DIST` 前缀校验 |
| 进程兜底 | `uncaughtException`/`unhandledRejection` + 优雅关闭（10s 强制退出） |
| SSE 背压 | 客户端慢/断连时 `drain` 等待，不撑爆内存 |
| 客户端断连 | `req.on('close')` 同步 `AbortController` 中止上游，不浪费额度 |

### 11.3 路由
- `POST /api/ai/chat` — Chat Completions 透传（SSE 流式 / 非流式）
- `GET /api/ai/health` — 健康检查
- `GET /api/ai/logs` — 最近 50 条调用日志
- 其他 → SPA fallback 到 `index.html`

### 11.4 环境变量（`.env.example`）

```bash
# 服务端（不进前端 bundle）
AGNES_API_KEY=sk-xxxx
AGNES_BASE_URL=https://api.agnes-ai.cn/v1
AI_PROXY_PORT=8787
AI_MAX_CONCURRENCY=2
AI_TIMEOUT_MS=90000
AI_RATE_LIMIT_PER_MIN=30
AI_ALLOW_ORIGIN=*
AI_SERVE_STATIC=1

# 前端（VITE_ 前缀进 bundle，禁止放密钥）
VITE_AI_PROXY_URL=           # 留空走相对路径 /api/ai
VITE_AI_DEFAULT_MODEL=agnes-2.5-flash
```

---

## 12. 构建与运行

### 12.1 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 AGNES_API_KEY

# 启动 BFF 代理（终端 1）
npm run server          # node server/index.mjs，监听 8787

# 启动前端开发服（终端 2）
npm run dev             # vite dev，自动代理 /api/ai → localhost:8787
```

### 12.2 生产构建

```bash
# 类型检查 + 构建
npm run build           # tsc -b && vite build，产物到 dist/

# 启动生产服务（Node BFF + 静态托管）
npm start               # node server/index.mjs，托管 dist/
```

### 12.3 Cloudflare Worker 部署

```bash
cd worker
# 配置密钥（不入库）
wrangler secret put AGNES_API_KEY
wrangler secret put AGNES_BASE_URL    # 可选

# 部署（同时更新静态站与 API）
wrangler deploy
```

### 12.4 Vite 构建优化（`vite.config.ts`）

- `base: './'` — 部署到任意子路径都能工作
- `manualChunks` — 拆分 vendor：`confetti`（仅首次庆祝）/ `vendor-motion` / `vendor-react` / `vendor`
- `cssCodeSplit: true` — CSS 按需加载
- `chunkSizeWarningLimit: 900`
- `target: 'es2020'`

### 12.5 TypeScript 配置（`tsconfig.app.json`）

- `strict: true` + `noUnusedLocals` + `noUnusedParameters` + `noFallthroughCasesInSwitch`
- `verbatimModuleSyntax: true` — 强制 `import type`
- `erasableSyntaxOnly: true`
- 路径别名 `@/*` → `./src/*`

### 12.6 数据生成脚本（`scripts/`）

离线运行，产物提交入库：
- `gen-poems.mjs` — 为 `poems.json` 生成拼音（含破读纠正）
- `enrich-poems.mjs` — 富集为 `poems-deep.json`（体裁/主题/意象/作者/难度）
- `add-canon.mjs` — 补入 11 首必读经典
- `merge-poems.mjs` — 合并多份语料
- `genPolyphone.mjs` — 生成多音字表

---

## 13. 版本演进与设计原则

### 13.1 版本演进

| 版本 | 重点 |
|------|------|
| v1 | 五大模块（字母/古诗/数字/逻辑/闯关）+ 仪表盘 |
| v2 | 今日课程中枢 + SRS 间隔重复 + 五步闭环 + 家长中心 + 奖励中心 + 错因解释 |
| v3 | 古诗学院（结构化研读 5 标签 + 格律引擎 + 多维检索 + 智能推荐） |
| v4 | 专业研读闭环（逐句注释 + 标准谱 + 诗人史料 + 背诵训练 + 自测题库 + 录音对照） |
| v5 | 内置平水韵查表（韵部精确判定 + 落韵检测） |
| v6 | AI 导师全场景接入 + 神经 TTS + 汉字识字 + 拼音 + 英语单词 + 趣味乐园 |

### 13.2 核心设计原则

1. **儿童优先**：按钮 ≥44px、慢语速、慢动画、鼓励语、容错膨胀、答错只降 1 级
2. **永远能出声**：TTS 多级降级（Kokoro → 系统语音），任何异常保证出声
3. **AI 必有兜底**：每个 AI 点都有 `fallback`，AI 挂了产品照样能用
4. **密钥永不进 bundle**：BFF 代理唯一持有 `AGNES_API_KEY`
5. **单页出错不拖垮整站**：`ErrorBoundary` + `resetKey` 换路由自动复位
6. **学术严谨**：格律引擎不误判名家（古绝不判失对失粘、孤平加相邻韵脚例外）
7. **零依赖优先**：BFF 代理仅用 Node 内置模块，路由自实现
8. **按需加载**：路由级 `lazy` + 古诗深层数据动态加载 + confetti 动态 import
9. **数据不丢**：Zustand `merge` 深合并，版本升级老数据兼容
10. **诚实降级**：录音对照连续朗读无法切分时诚实给中性分并提示，不假性 100%

### 13.3 关键工程经验

- **依赖「期望」反推的评分类指标会假性 100%**，必须用真实观测推导（录音对照教训）
- **Agnes 把参数错误返 500 而非 400**，重试判断靠 `code` 而非 `status`
- **推理模型思考链吃 70-85% token**，`max_tokens` 必须给足，否则正文为空
- **已经吐出部分内容时既不重试也不换模型**，避免「半句 + 完整一句」重复
- **Zustand 日志必须整体替换引用**，`unshift` 原地改会被 `Object.is` 判定没变而跳过渲染
- **Chrome 长时间闲置后 `speak` 无声**，需先 `synth.resume()`
- **`onboundary` 中文不可靠**，逐句高亮改为「按句排队播放」实现

---

> 本文档基于代码库当前状态生成，反映 v6 版本架构。如需了解具体实现细节，请点击文中代码链接跳转源码。
