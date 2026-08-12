# Agnes AI 接入方案 · 宝贝学习乐园

> 阶段一（调研）已完成，本文含调研结论 + 代码结构分析 + 实施方案。
> 编码前需你确认第三节的 3 个决策点。
> 调研日期：2026-08-04

---

## 一、阶段一：调研结论

官方文档只有一页 overview（子路由是 SPA，抓不到内容），因此**全部结论以真机实测为准**，已用真实 Key 打通全部关键路径。

### 1.1 协议与网关

| 项 | 结论 |
|---|---|
| Base URL | `https://api.agnes-ai.cn/v1` |
| 协议 | OpenAI 兼容（Chat Completions） |
| 鉴权 | `Authorization: Bearer <API_KEY>`（无其他方式） |
| 网关栈 | Cloudflare → oneapi 分发层 → **LiteLLM 1.93.0** → sglang 推理集群 |
| 网关自带 | `x-litellm-attempted-retries`、`x-litellm-attempted-fallbacks`（服务端已有一层重试/降级） |

**CORS 实测（关键）**：

```
OPTIONS /v1/chat/completions  →  HTTP 204
access-control-allow-origin: *
access-control-allow-headers: *
access-control-allow-methods: GET,POST,PUT,DELETE,OPTIONS
access-control-max-age: 43200
```

→ **浏览器可以直连，无跨域障碍**。但这同时意味着 Key 必须出现在前端，与官方安全建议冲突（见第三节）。

### 1.2 可用模型（`GET /v1/models` 实测）

| 模型 ID | 类型 | 实测 | 特征 |
|---|---|---|---|
| `agnes-2.0-flash` | 文本 | ✅ 通 | 最快，中文思考链，输出最简洁 |
| `agnes-2.5-flash` | 文本 | ✅ 通 | 主力，均衡，中文思考链 |
| `agnes-2.5-pro` | 文本 | ✅ 通 | 强，英文思考链 |
| `agnes-2.5-pro-alpha` | 文本 | ✅ 通 | 最强，英文思考链 |
| `agnes-image-2.1-flash` | 文生图 | 未测 | 本期不用 |
| `agnes-video-v2.0` | 文生视频 | 未测 | 本期不用 |

### 1.3 ⚠️ 最重要的发现：**全部是推理模型（Reasoning Model）**

这条决定了整个接入层怎么写。

响应体和流式 delta 都带一个 **`reasoning_content`** 字段，与 `content` 分离：

```json
"message": {
  "role": "assistant",
  "content": "减法是从一个数中去掉另一个数，求剩余数量的运算。",
  "reasoning_content": "用户要求用一句话解释减法。这是一个简单的数学概念解释请求…"
},
"usage": {
  "completion_tokens": 118,
  "completion_tokens_details": { "reasoning_tokens": 99, "text_tokens": 19 }
}
```

**踩坑实测**：`max_tokens: 50` + "你好" → reasoning 吃满 50 token，`content` 返回**空字符串**，`finish_reason: "length"`。

工程含义（必须处理）：
1. **`max_tokens` 必须给足**，建议 ≥ 800。思考链常占 70–85% 的 completion token。
2. 流式时**先流几十个 `reasoning_content` chunk，之后才流 `content`**。UI 必须区分「思考中」和「正在回答」两个态，否则孩子盯着空白屏幕十几秒。
3. `reasoning_content` 不能直接展示给孩子（含英文、内部推理），需过滤或折叠。

### 1.4 延迟实测（决定了必须做流式 + 缓存）

| 场景 | 端到端耗时 |
|---|---|
| "你好"（50 token） | ~8.2s（`x-litellm-response-duration-ms: 8155`）|
| 一句话解释题（900 token 上限） | 8–15s |
| 首次冷连接 | 曾出现 15s 后断连（HTTP 000） |

对一个 5 岁孩子用的产品，**15 秒白屏 = 功能不可用**。方案里必须包含：流式打字机 + 本地缓存 + 预生成内容兜底。

### 1.5 参数与能力（逐项实测）

| 能力 | 支持 | 实测备注 |
|---|---|---|
| `temperature` | ✅ | 0–1 正常 |
| `max_tokens` | ✅ | 含 reasoning，必须给足 |
| `stream: true` | ✅ | 标准 SSE，`data: {...}`，末尾 `data: [DONE]` |
| 流式 usage | ✅ | 倒数第二个 chunk 携带完整 `usage` |
| 多轮对话 | ✅ | system / user / assistant 交替，正常延续 |
| `response_format: {type:"json_object"}` | ✅ | **实测输出纯 JSON，无 markdown 包裹** — 出题/批改可直接依赖 |
| Prompt Cache | ✅ | `prompt_tokens_details.cached_tokens: 256` |
| 上下文长度 | 未公开 | sglang 部署，建议保守按 **8K 输入**设计 |

**Prompt Cache 细节**：只发 "你好" 时 `prompt_tokens` 就有 285，说明服务端注入了固定 system（Agnes 身份设定），前 256 token 稳定命中缓存。
→ 我们自己的 system prompt 应设计成**前缀稳定、变量后置**，才能吃到缓存、降低延迟。

### 1.6 错误码（实测，与 OpenAI 有差异）

| 场景 | HTTP | 响应体 |
|---|---|---|
| 无效 Key | **401** | `{"error":{"code":"","message":"无效的令牌 (request id: …)","type":"AgnesAI_error"}}` |
| 模型不存在 | **503** | `{"error":{"code":"model_not_found","message":"No available channel for model …"}}` |
| 缺 `messages` | **500** ⚠️ | `{"error":{"code":"invalid_request","message":"field messages is required"}}` |
| 超时 / 断连 | curl 000 | 无响应体 |

**⚠️ 重点**：参数错误返回的是 **500 而非 400**。所以**重试策略不能"5xx 一律重试"**，必须先看 `error.code`：
- `invalid_request` → 不重试（重试 100 次也是错）
- `model_not_found` → 不重试，走模型降级
- 网络超时 / 真 5xx → 指数退避重试

### 1.7 限流

文档未公开配额与 QPS，实测未触发 429。响应头暴露 `x-litellm-key-spend`（当前 0.0）。
保守策略：**客户端自行限流**，全局并发 ≤ 2，请求队列化，避免孩子连点触发风控。

---

## 二、现有代码结构分析

### 2.1 技术栈与形态

```
React 19 + Vite 7 + TypeScript(strict) + Tailwind v4 + Zustand 5(persist) + motion
纯静态 SPA · base:'./' · 无后端 · 无 .env · 无 .gitignore
部署：CloudStudio 静态托管（https://5dff99b481cd499881ca01fde3105a60.bj6.agentos-app.net）
```

### 2.2 目录结构（8626 行 TS/TSX）

```
src/
├── App.tsx              路由 shell + 9 个 lazy 页面
├── types.ts             全局类型（Poem/Question/Progress/MasteryItem…）
├── store/useStore.ts    单一 Zustand store，persist → localStorage
├── lib/                 18 个纯函数引擎（无副作用、可测）
│   ├── questions.ts     ★ 规则式题目生成器（math/count/letter/logic/poem）
│   ├── srs.ts           间隔重复算法
│   ├── dailyPlan.ts     今日课程编排
│   ├── prosody.ts       格律分析（20KB）
│   ├── chant.ts / recite.ts / poemQuiz.ts / poemPlan.ts
│   └── speech.ts        Web Speech API 朗读
├── data/                静态内容（poems.json 438KB、poets 62KB、pingShuiYun…）
├── components/ui/       Button / Card / Modal / Tabs / ProgressBar / Stars / Feedback
└── modules/             9 个页面模块
    home · today · letters · poems · numbers · logic · adventure · rewards · parent
```

### 2.3 现状判断

**优点（对接入非常有利）**：
- `lib/` 已经是清晰的「引擎层」，纯函数、零 UI 耦合 → **AI 服务层放这里天然合身**
- `components/ui/` 已有成套设计语言 → AI 组件可以直接复用，视觉一致性零成本
- 单一 Zustand store + persist → AI 缓存和会话历史挂进去很自然
- `Question` 类型已标准化 → **AI 生成的题目只要产出同样的 `Question`，所有现成 UI 立刻能渲染**，这是最大的接入红利

**空白**：
- 全站零 AI，所有内容来自硬编码数据 + `questions.ts` 的随机数规则生成
- 无 `.env`、无 `.gitignore`（Key 管理要从零建）
- 无网络请求层（全站目前不发任何 HTTP 请求）

**约束**：
- tsconfig 开了 `noUnusedLocals` / `noUnusedParameters` / `erasableSyntaxOnly` / `verbatimModuleSyntax` → 代码必须干净，类型导入要用 `import type`
- 目标用户是 **5 岁儿童**，AI 输出的安全性、用词等级、长度控制是硬要求

---

## 三、⚠️ 需要你拍板的 3 个决策点

### 决策 1：API Key 放哪（最关键）

官方文档明确写「**请勿在前端客户端代码中暴露 API Key**」，但本项目是纯静态 SPA，没有服务端。三个选项：

| | 方案 A：纯前端 | 方案 B：加轻量 BFF 代理 | 方案 C：BFF + 自填 Key 双通道 |
|---|---|---|---|
| Key 位置 | `.env` → 打包进 JS bundle | 只在服务端环境变量 | 服务端为主，用户可自填覆盖 |
| 安全性 | ❌ 任何人可从 bundle 提取 | ✅ 不泄露 | ✅ 不泄露 |
| 部署形态 | 保持纯静态，零变更 | 静态 → **Node 服务**（CloudStudio 支持） | Node 服务 |
| 工作量 | 最小 | +1 个 Express 代理（约 150 行） | +代理 +设置 UI |
| 适用 | 仅自己/家人用，链接不外传 | 要分享给别人 | 长期可运营 |

**我的建议：方案 B**。你这个站是公网可访问的（链接谁拿到都能开），Key 打进 bundle 等于公开，用光是小事，被人拿去跑别的才麻烦。BFF 代理还能顺带做：统一限流、调用日志、失败降级、Key 轮换。代价是部署从静态变 Node 服务。

### 决策 2：默认模型选哪个

| 选项 | 延迟 | 质量 | 适合 |
|---|---|---|---|
| `agnes-2.0-flash` | 最快 | 够用 | 儿童短问答、鼓励语 |
| **`agnes-2.5-flash`** | 中 | 好 | **推荐做全站默认** |
| `agnes-2.5-pro` / `pro-alpha` | 慢 | 最强 | 家长中心的学情分析、深度讲解 |

**我的建议：`agnes-2.5-flash` 为全站默认**，并做**按场景分级**：孩子端轻交互降级到 `2.0-flash` 抢速度，家长端周报升到 `2.5-pro` 抢质量。服务层做成一行配置可切。

### 决策 3：AI 功能铺多广

阶段三我梳理了 9 个模块共 20+ 个 AI 功能点（见第五节）。一次全上风险高。

| 选项 | 范围 |
|---|---|
| **精选 8 个高价值点**（推荐） | 覆盖全部 9 个模块，每模块 1 个核心功能，一次做透 |
| 全量 20+ 点 | 周期长，且部分功能对 5 岁孩子是伪需求 |
| 先做 3 个试点 | 古诗讲解 + 数学讲错 + 家长周报，验证后再铺 |

---

## 四、阶段二：模型服务层设计

### 4.1 新增文件

```
├── .env.example                    ← 模板（提交）
├── .env.local                      ← 真实 Key（gitignore）
├── .gitignore                      ← 新建
├── server/                         ← 【方案 B/C 才有】BFF 代理
│   ├── index.mjs                   Express：/api/ai/chat 透传 SSE
│   └── README.md
└── src/lib/ai/
    ├── config.ts                   模型注册表、场景→模型映射、参数预设
    ├── client.ts                   ★ 核心：fetch 封装、SSE 解析、重试、超时、日志
    ├── types.ts                    AiMessage / AiChunk / AiError / ChatOptions
    ├── prompts.ts                  全站 system prompt 库（前缀稳定，吃 prompt cache）
    ├── cache.ts                    localStorage 结果缓存（含 TTL + LRU 淘汰）
    ├── guard.ts                    儿童安全：输入过滤 + 输出校验 + 长度裁剪
    └── tasks/                      场景化任务（每个返回结构化数据）
        ├── explain.ts              讲解/答疑
        ├── generate.ts             出题（产出标准 Question 类型）
        ├── grade.ts                批改与讲评
        └── report.ts               学情分析 / 计划推荐
```

### 4.2 `client.ts` 关键实现要点

```ts
// 核心签名
export async function* chatStream(opts: ChatOptions): AsyncGenerator<AiChunk>
export async function chat(opts: ChatOptions): Promise<AiResult>
```

必须处理的 7 件事：

1. **SSE 解析**：`ReadableStream` + `TextDecoder`，按 `\n\n` 切帧，跳过 `[DONE]`，容忍半包
2. **reasoning 分流**：`delta.reasoning_content` → `{type:'thinking'}`；`delta.content` → `{type:'text'}`
3. **超时**：`AbortController`，首字节 20s / 总时长 90s 双超时
4. **重试**：仅对网络错误和真 5xx 退避重试（1s→2s→4s，最多 2 次）；`invalid_request`/401 立即失败
5. **模型降级**：`model_not_found` 或连续失败 → 自动 fallback 到备选模型
6. **兜底**：全部失败时返回 `{ ok:false, fallback: <本地规则内容> }`，UI 无感降级到现有 `questions.ts` 生成的内容
7. **调用日志**：`{ traceId, scene, model, ms, promptTokens, reasoningTokens, textTokens, ok, errCode }` → 环形缓冲存 store，家长中心可查

### 4.3 参数默认值（基于实测定）

```ts
{
  model: 'agnes-2.5-flash',
  temperature: 0.7,        // 出题 0.8 / 批改 0.3 / 讲解 0.6
  max_tokens: 1200,        // ★ 给足，因为 reasoning 占大头
  stream: true,
  // 结构化任务额外带：
  response_format: { type: 'json_object' }
}
```

### 4.4 儿童安全 `guard.ts`

- **输入**：敏感词表拦截 + 长度上限 200 字 + 只允许中英文数字标点
- **system 硬约束**：「面向 5 岁儿童 / 每次不超过 3 句话 / 只用生活化比喻 / 不谈暴力恐怖成人话题 / 遇到不适合的问题温和转移到学习」
- **输出**：长度裁剪 + 敏感词二次过滤 + 失败则回退到预置安全话术
- **家长开关**：家长中心可一键关闭全站 AI（`settings.aiEnabled`）

---

## 五、阶段三：AI 功能设计

### 5.1 主流智能学习产品的 AI 形态调研

| 产品 | 代表性 AI 能力 | 可借鉴点 |
|---|---|---|
| Khanmigo（可汗学院） | 苏格拉底式引导，**不直接给答案**；独立家长/教师视图 | 引导式而非灌输式；家长视图分离 |
| Duolingo Max | **Explain My Answer**（答错后讲为什么）+ Roleplay 角色扮演 | 「讲错」是转化率最高的 AI 功能 |
| Quizlet Q-Chat | 从任意材料**自动生成卡片与测验** | 内容→题目的自动化管线 |
| 小猿/作业帮 | 拍照搜题 → **分步骤讲解**；错题自动归因 | 分步拆解 + 归因标签 |
| 斑马 AI / 火花思维 | AI 陪练、语音互动、即时纠错、拟人化角色 | 低龄产品必须有「人格」，不能是冷冰冰工具 |
| ELSA / Speak | 发音打分 + 逐音素反馈 | 与本站已有的诵读评分引擎天然契合 |

**提炼出 6 种通用形态**（本站将全部覆盖）：
讲解型 · 答疑型 · 生成型 · 批改型 · 规划型 · 陪练型

### 5.2 映射到本站 9 个模块

★ = 建议本期做的 8 个高价值点（决策 3 选「精选」时的范围）

| 模块 | AI 功能 | 形态 | 复用现有资产 |
|---|---|---|---|
| 🏡 首页 | **AI 学情速评** — 一句话点评昨日表现 + 今日建议 | 规划 | `progress.dailyLog` |
| 📅 今日课程 | ★ **AI 动态排课** — 按弱项生成今日 5 节课 | 规划 | `dailyPlan.ts` + `mastery` |
| 🔤 字母乐园 | ★ **字母小故事** — 为每个字母生成押韵短句/联想 | 生成 | `letters.ts` |
| 🌸 古诗花园 | ★ **AI 诗词导师** — 逐句白话讲解 + 追问答疑 | 讲解+答疑 | `poemLineNotes` + `poets` |
| 🌸 古诗花园 | ★ **背诵讲评** — 对默写结果逐字讲评错因 | 批改 | `recite.ts` 已有评分 |
| 🔢 数字王国 | ★ **答错讲解** — 答错后讲「为什么」，配生活化比喻 | 讲解 | `Question.why` 字段已存在 |
| 🔢 数字王国 | **AI 应用题** — 用孩子喜欢的主题生成情境题 | 生成 | 产出标准 `Question` |
| 🧩 逻辑挑战 | ★ **规律揭秘** — 讲清这道题的规律是什么 | 讲解 | `makePatternQuestion` |
| 🚀 闯关冒险 | **关卡剧情** — 为每关生成一段冒险叙事 | 生成 | `levels.ts` |
| 🎁 奖励中心 | ★ **AI 夸夸** — 结合具体成就生成个性化鼓励 | 陪练 | `badges` + `stickers` |
| 👨‍👩‍👧 家长中心 | ★ **AI 学情周报** — 弱项诊断 + 家长可执行建议 | 规划 | `dailyLog` + `mastery` + `wrongBook` |

### 5.3 统一交互规范（保证各模块一致）

这是「保持各模块交互一致」的落地方式 —— 全站只有一套 AI 组件：

```
src/components/ai/
├── AiButton.tsx      统一入口：✨ 图标 + 统一配色，各模块只传 scene 和 payload
├── AiPanel.tsx       统一容器：底部抽屉（移动）/ 侧滑（PC）
├── AiStream.tsx      统一输出：思考态动效 → 打字机正文 → 完成态
├── AiBubble.tsx      统一气泡：AI 头像「小智」+ 圆角气泡
└── AiFallback.tsx    统一降级：失败时展示本地规则内容，不报错吓到孩子
```

四条一致性铁律：
1. **入口一致** — 全站 AI 入口都是 ✨ 图标 + 「问问小智」文案
2. **等待一致** — 8–15s 延迟统一用「小智正在思考…」动画 + 思考气泡，不用 loading 转圈
3. **降级一致** — 任何模块 AI 失败都无声降级到本地内容，孩子看不到报错
4. **人格一致** — 全站同一个 AI 角色「小智」，同一套语气（活泼、短句、多比喻）

---

## 六、执行顺序

```
① .gitignore + .env.example + 环境变量骨架          （5 min）
② src/lib/ai/ 服务层全套（client/config/prompts/cache/guard） ★核心
③ [方案 B] server/index.mjs BFF 代理 + SSE 透传
④ src/components/ai/ 统一 UI 组件 5 件套
⑤ 8 个模块功能点接入（按 5.2 的 ★ 清单）
⑥ 家长中心：AI 开关 + 调用日志面板
⑦ tsc 校验 + build + 部署 + 真机验证
```

---

## 七、待确认

请回复三个决策：

1. **Key 方案** → A 纯前端 / **B 加 BFF 代理（推荐）** / C 双通道
2. **默认模型** → **`agnes-2.5-flash` + 场景分级（推荐）** / 其他
3. **功能范围** → **精选 8 点覆盖全模块（推荐）** / 全量 / 先做 3 个试点

确认后我立刻进入编码。
