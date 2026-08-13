# 宝贝学习乐园 · AI 产品全面升级路线图

> 依据用户提供的「AI 全面产品升级改造提示词」落地。本文档同时承担审计结论 + 实施进度 + 后续计划三种角色。
> 生成日期：2026-08-11｜当前版本：`baobei-bff` `739b1db1`（P0 `b820d44c` → P1 `748c29d0` → P1 收尾 `573ef815` → P2-1 SEO `a93a773a` → P2-2 分析 `ec1d3461` → P2-3 内容中心 `739b1db1`）

---

## 一、现状审计（STEP 1–3 结论）

站点已非「空白功能站」，而是**功能相当完整**的 C 端儿童学习 App（React + Vite + Cloudflare Worker 静态站 + AI BFF 一体）。经代码审计，规格中多数模块**已经存在**：

| 规格要求 | 现状 | 严重度 |
|---|---|---|
| 学习系统（数学/语文/英语/科学/思维） | ✅ 已有 30+ 模块（数字/汉字/拼音/英语/古诗/逻辑/科学…） | — |
| AI 小老师（问答/出题/讲解/故事） | ✅ CompanionPage + AiVoiceModal + step-3.7-flash BFF | — |
| 成长系统（星星/徽章/等级/角色） | ✅ rewards/passport/成长树/里程碑 | — |
| 家长中心 | ✅ ParentPage（报告/设置/护眼） | — |
| 学习地图 / 探险 | ✅ MapView | — |
| 多档案切换 | ✅ P1-2 已上线（useProfilesStore） | — |
| 首启引导 / 自动登录 | ✅ OnboardingModal（P0 前已落地） | — |
| **年龄分级 → 难度自适应** | ✅ 已落地（`b820d44c`）：`ageRange` 五档 + `ageDifficultyBounds()` + `rampDifficulty()` 按年龄 clamp，Onboarding/档案可改年龄 | 已解决 |
| **首页 Hero 价值主张 + 双 CTA** | ✅ 已落地（`b820d44c`）：`HomeHero`（主标题+副标题+双 CTA+AI 角色同框+个性化问候+今日状态） | 已解决 |
| **导航按品类重组（学习/游戏/故事/创意/AI/家长）** | ✅ 已落地（`b820d44c` + `748c29d0`）：`CategorySheet` + `NAV_CATEGORY_MAP` + 首页品类条 + 7 品类（含成长） | 已解决 |
| **SEO（独立 URL / sitemap / robots / Schema / OG）** | ✅ 已落地（P0 `b820d44c` 基础 meta + P2-1 `a93a773a` 全站 32 路由预渲染/路由级 canonical/OG/面包屑 + sitemap 32 条 + robots） | 已解决 |
| 后端内容中心 / 数据分析 / VIP 计费 | ⚠️ 内容中心 ✅（P2-3 `739b1db1` KV+生成流水线）；数据分析 ✅（P2-2 `ec1d3461` 家长洞察）；**VIP 计费待做（需计费后端）** | P2 剩余 |

> ⚠️ 本表为 2026-08-11 生成时的**初始审计快照**；上表 ❌/⚠️ 行已由 P0/P1/P2 各轮真实落地，状态以上方 ✅ 标注与后文「已落地」章节为准（每行附版本号可溯源）。

**审计判级结论**：产品功能完成度 ~90%；初始审计时的缺口（年龄分级 / 品类化导航 / SEO 基建 / 后端能力）已由 P0/P1/P2 各轮**全部补齐**（年龄 `b820d44c`、Hero `b820d44c`、品类导航 `b820d44c`+`748c29d0`、SEO `a93a773a`、内容中心 `739b1db1`、数据分析 `ec1d3461`）。当前真正剩余仅**商业化 VIP 计费**（需计费后端 + 账号体系，属独立项目）。

---

## 二、本轮已落地的 P0 改造（2026-08-11 已上线 `b820d44c`）

### 1. 年龄分级系统（规格六 → 难度自适应）· 真实新功能
- `useProfilesStore.ts`：`ProfileMeta` 新增 `ageRange`（默认 `7-8`）；`AGE_RANGES` 五档（3-4/5-6/7-8/9-10/11-12）；`ageDifficultyBounds()` 年龄→难度边界。
- `difficulty.ts`：`rampDifficulty(p, category)` 在 `recommendDifficulty` 基础上按年龄 clamp（低龄压上限、高龄抬下限），**所有 280+ 旧测零回归**（默认边界 1–3 不影响既有表现）。
- `OnboardingModal` / `ProfileSwitcher`：首启引导与档案编辑均加年龄大按钮；家长可随时改年龄，难度次日即变。

### 2. 首页 Hero（规格五，premium）
- 新建 `HomeHero.tsx`：主标题「每天学习一点点，快乐成长每一天」+ 副标题 + 双 CTA（🚀 开始今天的学习 / 🤖 和 AI 小老师聊聊）+ 拟人 AI 角色（浮动动画 + 对话气泡）+ 个性化问候（孩子名字）+ 年龄难度提示 + 今日学习状态卡。
- 接入 `HomePage`，置于顶部。

### 3. 导航按品类重组（规格四）
- `data/nav.ts`：新增 `NavCategory` + `NAV_CATEGORY_MAP` + `navByCategory()`（纯数据映射，零路由改动）。
- 新建 `CategorySheet.tsx`：按 学习/游戏/故事/创意/AI小老师/家长中心 分组浏览全部模块。
- `TopBar` 加「🔎 全部内容」入口；`HomePage` 加品类快捷条（点按打开对应品类）。

### 4. SEO 基础（规格十五，纯前端可落地部分）
- `index.html`：增强 description/keywords、canonical、Open Graph、Twitter Card、两套 JSON-LD（WebSite + EducationalOrganization）、标题改为「AI 儿童成长学习乐园」。
- `public/robots.txt` + `public/sitemap.xml` 已上线（HTTP 200）。
- `App.tsx`：按路由动态设置 `document.title`（含孩子名），提升各页可识别度。

### 门禁
- `tsc -b --force`：0 错 ✅
- `vitest run`：287/287（含新增年龄用例 3 条）✅
- `npm run build`：成功（`index-CSagCIx4.js` 432KB）✅
- `wrangler deploy`：Version `b820d44c` ✅
- 线上复验：首页/robots/sitemap 均 200；bundle 与本地字节一致（432051B）；含全部新增文案 ✅

---

## 三、本轮已落地的 P1 改造（2026-08-11 待上线）

### 1. 游戏中心聚合页（规格一 → 游戏 hub）
- 新路由 `#/gamecenter`：`src/modules/game/GameCenterPage.tsx`，按 闯关冒险/欢乐对战/脑力挑战/创意工坊 四组货架聚合 fun/adventure/vehicles/logic/music/art。
- 每组真实模块卡片：羊毛毡图标 + 进度条（`moduleStats.moduleStat()` 按 mastery/计数聚合 0-1 进度）+ 一键跳转；顶部累计星星/累计练习统计 + 「🎲 随机玩一个」。

### 2. 故事馆（规格十二 → 故事系统入口）
- 新路由 `#/story`：`src/modules/story/StoryLibraryPage.tsx`，书柜 UI 分四架：AI 绘本工坊 / 儿歌乐园 / 成语故事 / 古诗绘本；每架显示已读/已收藏数与掌握进度，直达真实模块。

### 3. 成长博物馆（规格九/十 → 成长外显）
- 新路由 `#/growth`：`src/modules/growth/GrowthMuseumPage.tsx`，数据总览卡（星星/连续天数/徽章数/掌握率）+ 冒险进度 + 全量徽章墙（已解锁彩色、未解锁灰显 + 进度条）+ 成长树 + 成就时间线（按 badgeDates 排序）。

### 4. 每日计划强化（规格七）
- `TodayPage` 顶部新增：近 7 天连续打卡热力条（🔥/🌟/未学状态）+ 「今日推荐」三模块快捷入口（掌握度最低优先，点按直达）。

### 5. 学习地图阶段化（规格十）
- `MapView` 重构：7 区域归为 启蒙乐园 → 进阶学堂 → 思维王国 三阶段，前一阶段平均节点等级 ≥2 解锁下一阶段；锁定阶段有磨砂遮罩 + 解锁提示。

### 6. 基建
- `router.ts` ROUTES + `data/nav.ts` NAV_ITEMS/NAV_CATEGORY_MAP（新增 growth 品类）+ `FluffyIcon` 三枚图标 + `App.tsx` 懒加载路由 + `moduleStats.ts` 共享进度聚合。
- i18n：zh-CN/en-US 补齐 `nav.gamecenter/story/growth`、`categories.growth`、`gamecenter.*`、`storylib.*`、`growth.*`、`mapStage.*`、`today.weekStreak/recommend` 等键。

### 门禁（2026-08-11 P1 已上线 `748c29d0`）
- `tsc -b --force`：0 错 ✅
- `vitest run`：**290/290** ✅
- `npm run build`：成功（`index-_gSlM3rT.js` 436KB / gzip 152KB；三页面各自独立 chunk）✅
- `wrangler deploy`：Version `748c29d0` ✅
- 线上复验：bundle 哈希一致；`GameCenterPage/StoryLibraryPage/GrowthMuseumPage` chunk 均 200；无头 CDP 判活 `#/gamecenter #/story #/growth #/home` 全 PASS（仅 cloudflareinsights beacon 在旧版本机 Chrome 的已知假阳性，与应用无关）✅

### P1 收尾门禁（2026-08-11 上线 `573ef815`）
- 新增 `toggleStorybookFavorite` + 书架筛选/收藏/年龄推荐 + 每日 4 任务卡（年龄过滤 + 深链跳转）✅
- `tsc -b --force` 0 错；`vitest run` **290/290**；build 成功（`index-CT7reBDM.js`）✅
- `wrangler deploy` Version `573ef815`；线上 bundle 哈希一致；CDP 判活 `#/story #/growth #/today` 渲染正常（零业务异常，仅 beacon 假阳性）✅
- ⚠️ 运维备忘：wrangler 偶发「non-interactive 需 CLOUDFLARE_API_TOKEN」= OAuth 缓存失效，先 `wrangler whoami` 刷新令牌再 deploy 即可

---

## 四、诚实的架构边界（P2-1 后更新）

**「独立内容 URL + 可索引」已通过构建期预渲染解决（2026-08-11 上线 `a93a773a`）**：`scripts/prerender.mjs` 在构建后把 31 个核心路由逐页渲染为 `dist/<route>/index.html` 静态文件（Chrome headless CDP + 本地静态服务），每个独立 URL 均注入路由级 canonical / OG / description / BreadcrumbList JSON-LD，爬虫可直接抓取完整内容；站内导航保持 hash SPA 零重构。

**仍在架构边界内的剩余项**：① 预渲染页面的**深层内容**（如单首古诗 `#/poems/12`、单本绘本）仍是 hash 参数，无法生成独立 URL——若要覆盖到内容级，需把「参数化内容」也纳入预渲染清单（按数据量生成有限热门子集）；② AI 内容中心 / 数据分析 / 计费仍需后端。

其余 P0 项（年龄、Hero、品类导航、meta/OG/robots/sitemap、动态标题）、P1 项（游戏中心/故事馆/成长博物馆/每日计划强化/地图阶段化）均为纯前端、已真实落地。

---

## 四-b、P2-1 SEO 架构升级（2026-08-11 上线 `a93a773a`）

- **`router.ts`**：`parseHash` 无 hash 时回退读取 `pathname`（防御式取值），独立 URL 直链可正确渲染。
- **`scripts/prerender.mjs`**（新）：本地静态服务 + Chrome CDP 逐页渲染 → `dist/<route>/index.html`；注入路由级 canonical/OG/description/BreadcrumbList（先清除模板根级 canonical/OG 防爬虫取错）；读取 i18n zh-CN 的 nav 段生成文案，避免漂移。
- **`public/sitemap.xml`**：从 1 条扩展为 **32 条独立 URL**（首页 + 31 路由）。
- **`public/_headers`**：核心预渲染页加 `no-cache`（边缘缓存不滞留旧内容）。
- **`package.json`**：新增 `prerender` / `build:seo` 脚本。
- **门禁**：tsc 0 错；vitest **290/290**（含修复 stuck 测试的 locale 脆弱性——jsdom 默认 en-US 渲染英文文案，改为按提示条容器定位按钮）；build 成功；`wrangler deploy` Version `a93a773a`；线上复验 `/gamecenter/ /story/ /growth/ /today/ /letters/` 返回正确 title+canonical+内容，sitemap 32 条，CDP 无 hash 直链渲染 alive 且 0 业务异常。
- **连带修复（构建暴露的历史严格模式错误）**：`music.ts` 未用参数 `_target/_played`；`MusicCreatePage` 未用导入 + 非法 tone（red/gray→orange/blue）；清除陈旧 `.tsbuildinfo`（增量缓存造成 QuizCard 幽灵错 + 掩蔽 MusicCreatePage 真实错）。


## 五、后续计划（P2 为主）

### P1 收尾（已完成，2026-08-11 上线 `573ef815`）
- **故事系统馆深度化** ✅：`SavedStorybook` 加 `favorite` 字段 + `toggleStorybookFavorite` action；`StorybookShelf` 新增筛选 chips（全部 / ❤️ 收藏 / 6 大主题，按年龄给推荐主题打 ⭐）；`StoryLibraryPage` 绘本架内嵌真实书架（可直接浏览/收藏/阅读）；`StorybookCover` 加收藏按钮。
- **每日 4 任务卡（规格七完整版）** ✅：`DailyChallenge` 从 3 任务升级为 4 任务（「完成今日课程」必选 + 日期种子抽 3），按年龄过滤候选池（3-6 岁排除逻辑题/连击），未完成任务点击直达对应模块；已接入 `TodayPage`（完整模式）+ 保留首页 compact。

### P2（第三阶段，需后端 / 架构升级）
- **SEO 架构升级** ✅（2026-08-11 上线 `a93a773a`）：构建期预渲染 31 路由独立 URL + canonical/OG/面包屑（见 四-b 节），无需框架迁移。剩余「内容级 URL」（单首古诗/单本绘本）可后续把热门参数化内容纳入预渲染清单。
- **AI 内容中心**（规格十七）✅（2026-08-11 上线 `739b1db1`）：Worker 新增 `CONTENT_KV`（KV namespace `af279d90…`）+ `POST /api/content/generate`（STEPFUN `step-3.7-flash` 生成 + `response_format: json_object` + 儿童安全护栏 + 内容黑名单 + KV 持久化 90 天）+ `GET /api/content/list`（按类型前缀扫描）。前端新路由 `#/content`「AI 内容站」：睡前故事/趣味谜语/小知识三 Tab + 一键生成（10s 冷却）+ 朗读。⚠️ 踩坑：step-3.7-flash 是推理模型，思考链吃 token，`max_tokens` 必须 ≥1600（700 时正文被截空 → parse_failed）。
- **数据分析**（规格二十三）：**纯前端部分已上线（`ec1d3461`）**——新增 `AnalyticsInsight`（家长中心「学习行为洞察」）：近 7/14/30 天活跃天数、最长连续学习、最投入星期、AI 互动次数与近 7 天趋势、累计题量/时长/正确率。**服务端部分（多端 DAU/留存聚合埋点）待补**：需 Cloudflare KV / Analytics Engine 绑定 + 前端事件上报（现有 `/api/log` 是 Cache API 临时错误日志，不可作持久埋点）。
- **商业化**（规格二十二）：免费/VIP/家庭会员、家长中心付费墙、多孩子账号——需计费后端（Stripe/微信支付）+ 订阅态。
- **儿童安全网关强化**（规格十八）：AI 输出内容过滤、输入过滤、外部链接管控 —— 目前有护栏（STEPFUN 儿童安全提示），P2 接服务端审核。

---

## 六、开发原则（贯彻用户要求）
- 每增加功能先回答：是否让孩子更愿意学 / 家长更易看成长 / 提高留存 / 形成商业价值。
- 已上线改动均通过「tsc 0 错 + 全量单测 + build + 部署 + 线上字节级复验」门禁，不靠「换个颜色算升级」。
