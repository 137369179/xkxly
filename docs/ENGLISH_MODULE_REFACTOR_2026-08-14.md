# 宝贝学习乐园 — 英语模块重构方案（2026-08-14）

> ✅ **执行状态：已完成（2026-08-14）** — 4 个阶段全部落地，4 次独立提交：
> `ab4f6ba` Phase 0 数据归位 · `342c550` Phase 1 词库 303 词 · `a1c0627` Phase 2 学习闭环 · `f191dd5` Phase 3 课程体系
> 验收：420 测试全绿 / ESLint 0 error / 生产构建通过。
> 实际交付与方案的差异见文末「执行备注」。

> 目标：把当前「74 词 + 15 个平铺 Tab」的玩具式英语模块，升级为**数据分层、分级课程、学习闭环**的专业幼儿英语学习体系。
> 本方案分 4 个阶段，由低风险到高风险，每阶段独立可提交、可回滚，阶段间可随时暂停交付。

---

## 一、现状诊断（全部经源码交叉验证）

### 1.1 模块分布（英语能力散落在 8 处）

| 位置 | 内容 | 证据 |
|---|---|---|
| `src/modules/words/` | 单词学习 8 文件：WordsPage / WordLearn / PhonicsPage / SpellingTest / DialoguePage / SentencePage / WordMatch / WordReview | 1844 行 |
| `src/modules/letters/` | 字母乐园 7 文件：LetterWall / MatchGame / LetterStudy / LetterTrace / LetterOrder / FluffyLetterVisual / LettersPage | ~970 行 |
| `src/components/` 越界 | **PhonicsListen / FollowRead / BodyParts / CvcWordBuilder / SpeechEvalButton** —— words 域私有组件散落共享层 | 与 `STRUCTURE_REORG_2026-08-14.md` 同款分层失守 |
| `src/data/` | words.ts(74词) / letters.ts / phonics.ts / phonicsBlends.ts / sentences.ts / wordIndex.ts | 见 1.2 |
| `src/lib/questions/` | word.ts / letter.ts 出题器 | 见 1.3 |
| `src/lib/srs/SUBJECTS.ts` | word / letter 学科定义 | ✅ 已接线 |
| `src/lib/dailyPlan.ts` / `learningPath.ts` | 每日推荐含英语 | ✅ 已接线 |
| `src/store/` | mastery key：`word:cat` / `letter:A` / `sentence:s1` / `dialogue:shop` | ✅ 已接线 |

### 1.2 数据层问题

| 问题 | 详情 |
|---|---|
| **词库体量过小** | 74 词 / 6 主题。对比：汉字 300+、古诗 385、成语 60。一个「英语模块」只有 74 词撑不起专业感 |
| **Phonics 数据重复** | `phonics.ts` 的 COMBO_SOUNDS（sh/ch/th/ee/oo/ea/ai/ou/ow/ar/er/ir/or/ur…18 组）与 `phonicsBlends.ts` 的 PHONICS_BLENDS（sh/ch/th/ph/ee/oo/ea/ai…8 组）**语义重叠但结构不同**，后续改一处漏一处 |
| **对话数据锁死在组件里** | `DialoguePage.tsx:21-126` 的 DIALOGUES 数组硬编码在组件内，无法被出题器/每日计划/复习复用 |
| **无词族体系** | 没有 -at/-an/-in/-og 等 word family，Phonics 学了单音但不会「迁移拼读」 |
| **无分级标准** | `level 1/2/3` 只是音节数（phonics.ts 注释「1=单音节 2=双音节 3=多音节」），未对接学龄/课标 |
| **无高频词库** | WordsPage 有 "Sight Words 宝盒" 宣传卡片但只有 8 个硬编码词（THE/IS/AND…），无完整 Dolch 词表 |
| **多音节词无重音标注** | phonetic 有重音符号（如 /ˈtaɪɡər/）但 phonics 拆音没有重音/弱读提示 |
| **无单词配图资产** | public/words/ 只有 25 张字母例词图（bear/cat/dog…），74 词多数只有 emoji |

### 1.3 学习闭环问题（专业度最大短板）

| 问题 | 详情 |
|---|---|
| **出题器不接 SRS** | `questions/word.ts` 用 `sample(all)` 随机抽词，**不看掌握度**；SRS 学科表建好了但出题侧没消费 |
| **题型只有 3 种** | 看图选词 / 词选义 / 义选词；缺听音题（WordLearn 有 word-listen 但出题器没有）、缺句子题、缺拼写题、缺词族题 |
| **对话跟读无语音评测** | DialoguePage repeat 模式点「我读好了」直接过；而 `SpeechEvalButton`（字级对齐 + 0-100 评分 + AI 建议，见 SpeechEvalButton.tsx:1-16）**已存在且只在 WordLearn 用了** |
| **句子学习无评测** | SentencePage 逐词高亮朗读后只有手动「✅ 学会了」 |
| **i18n 不干净** | WordsPage 硬编码 "Search words…" / "No words found～" / "Level 1" 未走翻译；wordReview 里 AdaptiveDifficultyHint 的 labels 也是硬编码 |
| **无学后复习调度** | WordReview 的 weak 过滤是「lv<2 取前 20」，不是 SRS 间隔复习 |

### 1.4 课程体系问题

- 无「字母 → 自然拼读 → 高频词 → 句子 → 对话」的渐进路径，15 个 Tab 平铺（animals/colors/numbers/family/food/nature/phonics/sentences/spell/dialogue/match/review/listen/builder/body）
- letters 与 words 两个模块割裂：字母乐园学字母发音，words 里又有 PhonicsPage，无统一课程串联
- dailyPlan 的 nextWord 是「遍历主题找第一个未掌握词」（dailyPlan.ts:94-99），没有阶段概念

---

## 二、目标（达成后的形态）

1. **数据分层**：词库 / 词族 / 高频词 / 句子 / 对话全部独立数据文件，组件零硬编码数据
2. **专业词库**：300+ 词，6 大主题 × 3 学段（启蒙/一年级/二年级），带学段标签、词族归类、重音标注
3. **学习闭环**：出题器吃 SRS 掌握度（优先抽弱词）、题型扩到 6 种、跟读/句子统一接 SpeechEvalButton 发音评分
4. **课程体系**：阶段化学习路径（字母 → 拼读 → 高频词 → 句子 → 对话），WordsPage 15 Tab 重组为「课程 / 词库 / 练习 / 复习」四大板块

---

## 三、分阶段方案

### Phase 0 — 数据层统一与清理（零行为影响，先做）

> 目标：不新增功能，先把数据归位、重复消除，为后续打地基。全部纯重构，行为不变，可独立提交。

| # | 改动 | 文件 | 风险 |
|---|---|---|---|
| 0.1 | **合并 phonics 两套为一份**：以 `phonics.ts` 的 PhonicsRule 结构为基准，把 phonicsBlends.ts 的 ph 组合及「发音提示 + 例词中文」并入（补 ph/dge/tch 等缺失组合），删 `phonicsBlends.ts`，改引用方（CvcWordBuilder / PhonicsListen 若引用） | `src/data/phonics.ts` / `src/data/phonicsBlends.ts` | 低，先 grep 引用 |
| 0.2 | **对话数据出组件**：DIALOGUES 迁移到 `src/data/dialogues.ts`，DialoguePage 改 import | `src/modules/words/DialoguePage.tsx` → `src/data/dialogues.ts` | 低 |
| 0.3 | **words 域组件归位**：PhonicsListen / FollowRead / BodyParts / CvcWordBuilder 从 `src/components/` 迁入 `src/modules/words/`（若仅 words 域引用），改 import | `src/components/{PhonicsListen,FollowRead,BodyParts,CvcWordBuilder}.tsx` | 低，先 grep |
| 0.4 | **i18n 清零**：补 words 域全部硬编码文案进 zh-CN.json / en-US.json（Search words… / No words found～ / Level 1 / 对话场景文案等） | `src/i18n/locales/*.json` | 低 |
| 0.5 | **数据契约收敛**：WordEntry 增加可选 `grade`（1|2|3）、`family`（词族 id）、`stressed`（重音音节）字段，默认值兼容旧数据 | `src/data/words.ts` | 低 |

**验收**：`npm run build` + `npm run lint` 通过；页面行为与重构前完全一致。

### Phase 1 — 词库升级：74 → 300+ 词（数据为主）

> 目标：词库达到「专业感」体量，且带分级与词族。分三批提交，每批约 +80 词。

| # | 改动 | 文件 |
|---|---|---|
| 1.1 | **词库扩充脚本化**：写 `scripts/gen-english-words.mjs`，从内置词源表（按主题 × 学段 × 词族组织）批量生成 words.ts 的条目模板，人工校对后落库（参考 poems 的脚本化流程） | `scripts/gen-english-words.mjs` |
| 1.2 | **词族数据**：新建 `src/data/wordFamilies.ts`（-at/-an/-in/-og/-ug/-ig/-et/-en + 长元音族 -ake/-ee/-ay…），每条含 词族 id / 拼读规则 / 成员词（关联 WordEntry）/ 迁移练习提示 | `src/data/wordFamilies.ts` |
| 1.3 | **高频词表**：新建 `src/data/sightWords.ts`（Dolch Pre-Primer ~ Grade2 分学段，每段 40-50 词），替换 WordsPage 里 8 个硬编码词的宝盒卡片为「按学段取词」 | `src/data/sightWords.ts` |
| 1.4 | **新主题 + 学段**：新增 身体部位/动作/水果蔬菜/学校/天气/交通工具 等主题；每词标注 grade 1|2|3（学前 74 词全部标 1，新增词按难度标 2/3） | `src/data/words.ts` |
| 1.5 | **多音节重音标注**：为 level 2/3 词补 `stressed` 字段（如 tiger → tig），Phonics 拆音展示时高亮重音音节 | `src/data/words.ts` + `WordLearn.tsx` |
| 1.6 | **主题索引同步**：wordIndex.ts 增加 getWordsByGrade / getWordsByFamily / getSightWords 三个查询 | `src/data/wordIndex.ts` |

**验收**：getAllWords() 返回 300+；每主题至少 3 学段词；词库条目字段完整率 100%（缺字段 CI 检查）。

### Phase 2 — 学习闭环与专业功能（核心价值）

> 目标：让「练」真正专业——出题器吃掌握度、题型扩展、发音评测统一。

| # | 改动 | 文件 | 说明 |
|---|---|---|---|
| 2.1 | **出题器接 SRS**：`makeWordQuestion` 增加按掌握度抽词（优先抽 lv<2 的弱词，全掌握后随机），支持传入 mastery map | `src/lib/questions/word.ts` | 消费 `progress.mastery` |
| 2.2 | **题型扩展 3 → 6**：新增 听音选词（word-listen）、拼写题（word-spell，与 SpellingTest 共用判定）、词族迁移题（看 cat 选 bat——考 -at 族读音迁移） | `src/lib/questions/word.ts` + `src/lib/questions/family.ts`（新） | 复用 opt/nextId |
| 2.3 | **句子题出题器**：新建 `src/lib/questions/sentence.ts`（听音选句 / 看译选句 / 缺词填空），skill key `sentence:s1` | `src/lib/questions/sentence.ts`（新） | 接入 QuizCard |
| 2.4 | **跟读统一接发音评测**：DialoguePage repeat 模式、SentencePage 跟读、FollowRead 全部改用 `SpeechEvalButton`（字级对齐 + 评分 + AI 建议），去掉「点一下就算读好」 | `DialoguePage.tsx` / `SentencePage.tsx` / `FollowRead.tsx` | 复用现成组件 |
| 2.5 | **词族拼读练习**：新建 `src/modules/words/WordFamilyGame.tsx`（给 cat，问「哪个是 -at 家族」；拼读 bat/mat/rat 得星） | `src/modules/words/WordFamilyGame.tsx`（新） | 吃 wordFamilies.ts |
| 2.6 | **复习接 SRS 间隔**：WordReview 的 weak 模式改为 SRS 到期复习（结合 mastery 的 lv + 上次复习时间），不再「lv<2 取前 20」 | `src/modules/words/WordReview.tsx` | 需确认 mastery 是否有时间戳，无则加 |

**验收**：同一轮 Quiz 10 题中弱词命中率显著高于随机（写个 100 轮抽样断言）；跟读模式必须过 SpeechEvalButton 评分才记掌握。

### Phase 3 — 课程体系与路径（收口，中等风险）

> 目标：把「15 个平铺 Tab」重组为专业课程结构，并与每日计划打通。

| # | 改动 | 文件 | 说明 |
|---|---|---|---|
| 3.1 | **课程阶段模型**：新建 `src/lib/englishCurriculum.ts`（Stage 1 字母 → Stage 2 自然拼读 → Stage 3 高频词 → Stage 4 句子 → Stage 5 对话；每阶段含 目标词/练习题型/解锁条件=上一阶段掌握度≥1） | `src/lib/englishCurriculum.ts`（新） | 纯数据 + 判定函数 |
| 3.2 | **WordsPage 重组**：15 Tab 收敛为「📚 课程（按阶段引导）/ 📖 词库（主题×学段筛选）/ 🎯 练习（拼写·连线·词族·听音）/ 🔁 复习」四大板块，旧功能全部保留在新板块内 | `src/modules/words/WordsPage.tsx` | 大改 UI，保留路由与数据 |
| 3.3 | **每日计划接阶段**：dailyPlan.nextWord 改为按当前阶段未掌握词推荐（优先本阶段词），完成阶段词后自动升 Stage | `src/lib/dailyPlan.ts` | 复用 Phase 1 的 grade 字段 |
| 3.4 | **字母与单词模块串联**：LetterStudy 完成后（掌握度达标）在 LettersPage 提示「去学单词拼读」，两模块共享同一个 curriculum stage 状态 | `src/modules/letters/LettersPage.tsx` | 轻提示 |
| 3.5 | **SRS 学科表对齐**：SUBJECTS.word 的 nodes 从「基础词40/句子20/对话14」改为按学段（启蒙/一年级/二年级）或按课程阶段 | `src/lib/srs/SUBJECTS.ts` | 与 3.1 保持一致 |

**验收**：新用户按课程路径能无引导走完 5 阶段；每日计划不再推荐已完成阶段的词；全部页面经 i18n 检查无硬编码英文。

---

## 四、风险与回滚

| 风险 | 缓解 |
|---|---|
| 词库扩充引入错词（音标/例句不准） | 每批脚本生成后人工校对 + 提交前跑 `npm run test`（questions-smoke.test.ts 会跑出题器） |
| 15 Tab 重组影响老用户习惯 | Phase 3 保留全部旧功能入口，只是重新分组；Tab 记忆（若有用 localStorage）保持兼容 |
| phonics 合并漏改引用 | Phase 0.1 先 grep 全部引用再删旧文件；ESLint 门禁 + build 兜底 |
| mastery 无时间戳导致 SRS 间隔无法实现 | 2.6 前先确认 store 结构；若缺则在 mastery 记录追加 `at` 字段（store 升级带默认值，向后兼容） |
| 语音评测在无网/不支持浏览器降级 | SpeechEvalButton 自带降级（大声朗读即通过），沿用即可 |

## 五、执行顺序建议

`Phase 0 → Phase 1(批1) → Phase 2 → Phase 1(批2/3) → Phase 3`

- **Phase 0 + Phase 1 批 1**：1 个工作日，交付「数据层归位 + 词库翻倍」
- **Phase 2**：1-1.5 个工作日，交付「闭环专业功能」（核心价值，建议优先评审）
- **Phase 3**：1 个工作日，收口课程体系

每阶段结束提交一次、可回滚、可暂停。

---

## 执行备注（2026-08-14 落地结果）

### 与方案的差异（均已按实情调整）

| 项 | 方案 | 实际 |
|---|---|---|
| 0.1 phonics 合并 | 8 组 blends 并入 phonics.ts | **phonicsBlends.ts 实为零引用死代码**，直接删除；仅补缺失的 ph 组合 |
| 0.3 组件归位 | 4 个组件迁移 | **FollowRead 为跨模块共享**（儿歌/家长页引用），保留在 components/；仅迁移 PhonicsListen/BodyParts/CvcWordBuilder |
| 1.4 词库 | 300+ 词 | 303 词 / 18 主题（新增 12 主题：身体/动作/学校/天气/交通/衣物/果蔬/玩具/海洋动物/场所/日常用品/形容词） |
| 2.2 题型扩展 | 3→6 在主入口 | 保留原 3 档难度契约（测试锁定），新 3 题型独立导出：makeWordListenQuestion/makeWordSpellQuestion/makeWordFamilyQuestion |
| 3.2 Tab 重组 | 四大板块 | 已落地：📚课程(默认)/📖词库/🎯练习/🔁复习；课程页含 5 阶段卡片+当前阶段引导，词库页主题×学段筛选 |

### 新增文件清单（7 个）
- `src/lib/englishCurriculum.ts` — 5 阶段课程模型（完成判定/解锁/进度）
- `src/data/wordFamilies.ts` — 38 个词族（短元音/长元音/进阶）
- `src/data/sightWords.ts` — Dolch 高频词 179 词分 3 学段
- `src/data/dialogues.ts` — 6 个情景对话（自 DialoguePage 迁出）
- `src/lib/questions/sentence.ts` — 句子题出题器（3 题型）
- `src/modules/words/WordFamilyGame.tsx` — 词族拼读游戏
- `docs/ENGLISH_MODULE_REFACTOR_2026-08-14.md` — 本方案

### 遗留建议（后续可选）
- 词库配图：public/words/ 仅 25 张字母例词图，303 词多用 emoji，可逐步补实拍/插画
- 音频资源：当前发音依赖 Web Speech API，可评估接入 TTS 音频缓存（见 docs/语音合成升级方案.md）
- 词族题回退：词库尚未覆盖全部词族成员词（如 -at 族仅 cat 在库），词族迁移题对单成员族自动回退看中文选英文题
