# hanzi-study 融合与笔画数据扩充说明

> 目标：深入研究 [luomor-web/hanzi-study](https://github.com/luomor-web/hanzi-study)，将其中适用功能融合进「宝贝学习乐园」，强化汉字学习体验。
> 融合前置：已克隆上游仓库至 `hanzi-study-reference/`（纯参考，不参与构建）。

---

## 一、上游 hanzi-study 核心逻辑与特性（研究结论）

hanzi-study 是**纯前端离线**（HTML + Vue3 global + 原生 JS）的儿童汉字学习应用，面向 3–6 岁。核心特性与数据资产如下：

| 特性 | 上游实现 | 关键数据资产 |
|---|---|---|
| 汉字拼音学习 | 卡片展示 `w/p/s/y`（字/组词/造句/拼音） | `js/lib/dataList.js`（**1305 字**组词造句拼音） |
| 笔画书写/描红 | `hanzi-writer.min.js` 驱动笔顺动画 + 跟写 | `dataWriter.js`(422字) + `dataWriter1.js`(826字) = **1248 字真实笔顺**（含 `radStrokes` 部首笔画序号） |
| 听音识字 | 听发音→四选一点选 | — |
| 汉字闯关 | 按序解锁（`lockInd`），测验插桩（每 6 字一测） | — |
| 点读模式 | 切换后点任意字仅朗读 | — |
| 单元测验 | 闯关内嵌测验 | — |
| 画一画特效 | 66 张 webp 转场特效 | `img/draw/draw1..66.webp` |
| 护眼模式 | 左上绿叶切换绿色主题 | — |
| 数学加减法 | 10/100 以内，减法开关 | `math/` 子应用 |
| 古诗词 1–6 年级 | 朗读/上下首/拼音注释译文 | `poem/` 子应用 |

**技术要点**：上游笔顺数据与本站同源——均出自 [Make Me a Hanzi / hanzi-writer-data](https://github.com/chanind/hanzi-writer-data)（1024×1024 书法坐标，y 轴向上），逐字比对一致，因此可**零风险直接合并**。

---

## 二、融合功能清单（上游特性 → 本站落地 → 状态）

| 上游特性 | 本站对应模块 | 状态 |
|---|---|---|
| 汉字拼音学习 | 拼音模块 + 字卡拼音标注（`pinyin-pro` 程序化注音 + `src/data/hanzi.ts` 精编 300 字带调拼音） | ✅ 已具备 |
| 笔画书写/描红 | `StrokeAnimation` / `StrokeTrace` / `HanziStrokeWriter` | ✅ 已具备，**本轮扩充数据** |
| 听音识字 | `HanziQuizGame`（游乐场·听音识字） | ✅ 已融合（前一轮 commit `21769f2`） |
| 组词造句 | `WordBuilder` + `hanziSentences.ts`（1249 字广度例句库） | ✅ 已融合（`21769f2`） |
| 汉字闯关 | 今日闯关（Daily Trail，逐字解锁 + 路线图） | ✅ 已具备 |
| 单元测验/听写 | `HanziDictation` + 随堂小测验（MiniQuiz） | ✅ 已具备 |
| 点读模式 | `HanziVideoCard` 每卡「🔊」按钮即时朗读 | ✅ 已具备（交互优于上游模式切换） |
| 部首/字源/字族 | `RadicalBrowser` / `HanziEvolve` / `PhoneticFamilies` | ✅ 已具备（上游无此能力，本站超集） |
| 数学加减法 | 数字模块（含 10/100 内、减法） | ✅ 已具备 |
| 古诗词 | 诗词模块（朗读/注释/译文） | ✅ 已具备 |

**结论**：hanzi-study 的功能面已被本站**全面覆盖**，且本站为 React 组件化 + 进度/SRS/徽章体系的**超集**。唯一实质缺口是「**笔顺数据覆盖**」——本站此前仅 318 字，上游 1248 字，本轮补齐。

---

## 三、本轮核心工作：笔顺数据扩充 318 → 1277 字

### 做了什么
1. 新增 `scripts/gen-hanzi-strokes-expanded.mjs`：解析上游 `dataWriter.js`/`dataWriter1.js`，字段映射 `strokes→s`、`medians→m`、`radStrokes→r`（可选），与现有 `public/data/hanzi-strokes.json` 做 **union 去重合并**（现有字 `s/m` 优先、上游字补入、`r` 以上游为准）。
2. 扩展 `src/lib/strokes.ts` 的 `StrokeData` 接口，新增可选 `r?: number[]`（部首笔画序号），并更新数据来源注释。
3. 运行脚本重生成 `public/data/hanzi-strokes.json`。

### 结果
| 指标 | 融合前 | 融合后 |
|---|---|---|
| 笔顺表覆盖字数 | 318 | **1277**（+959） |
| HANZI_DATA 精编 300 字覆盖 | 部分 | **100%（300/300）** |
| 含部首笔画 `r` 字段 | 0 | 1070 字 |
| 结构完整性（s/m 匹配、非空） | — | 0 异常 |

**数据正确性**：逐字比对「一」等样例，坐标/路径与现有 CDN 抓取值完全一致（同源）；抽样校验 `雨/个/爱/永/我` 笔画数、中线数均正确。

### 受益模块（零改动自动生效）
- `HanziLearn.tsx`（单字学习页，含 `StrokeAnimation` 笔顺动画 + `StrokeTrace` 逐笔跟写）
- `Hanzi500Page.tsx`（500 字浏览，`StrokeAnimation`）

上述组件均经 `ensureStrokeData(char)` 读取同一张表，数据扩充即全量生效。`r` 字段已就绪，可供后续「部首魔法」高亮部首笔画接线（本轮未动 `RadicalsMagic`，避免与未提交 WIP 冲突）。

---

## 四、当前网站技术栈与目录结构（便于后续集成）

**技术栈**（React SPA + Cloudflare Worker 一体）：
- **前端**：React 19.1 + Vite 7.1 + TypeScript 5.9（strict）+ Tailwind CSS 4 + `motion`（动画）+ Zustand 5（状态）
- **3D/视觉**：three 0.185 + @react-three/fiber + drei
- **语音/拼音**：Web Speech + Kokoro(ONNX) + `pinyin-pro` 3.28
- **数据/测试**：本地 TS 数据模块 + vitest 4 + jsdom
- **后端**：Cloudflare Worker（静态托管 + AI BFF 代理一体），`worker/` 目录；dev 用 `server/index.mjs`

**目录结构**：
```
宝贝学习乐园/
├─ src/
│  ├─ components/      通用组件（含 hanzi/ 子目录：HanziQuizGame/HanziStrokeWriter/HanziVideoCard…）
│  ├─ modules/hanzi/   汉字模块页（HanziPage/HanziLearn/Hanzi500Page/HanziDictation/WordBuilder…）
│  ├─ lib/             纯逻辑层（strokes.ts 笔顺 / hanziQuestions.ts / tones.ts / srs.ts / adaptChain.ts…）
│  ├─ data/            静态数据（hanzi.ts 精编300 / hanziSentences.ts 1249字例句 / pinyin.ts…）
│  ├─ store/           zustand store（useStore / useSettingsStore / useTtsStore…）
│  └─ i18n/            多语言（zh-CN/en-US，模块级独立文件经 deepMerge）
├─ public/data/        运行时懒加载数据（hanzi-strokes.json 笔顺表）
├─ worker/             Cloudflare Worker（线上）
├─ server/             dev 服务器
├─ shared/             同构纯逻辑（AI 代理）
└─ scripts/            构建/数据生成脚本（fetch-hanzi-strokes.mjs / gen-hanzi-strokes-expanded.mjs…）
```

---

## 五、数据来源与持久化方案

### 数据来源（均已标注出处）
| 数据 | 来源 | 说明 |
|---|---|---|
| 笔顺笔画（s/m/r） | [Make Me a Hanzi / hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) | 本站 CDN 抓取 + hanzi-study 上游合并，同源 |
| 精编 300 字（字源/部首/组词/例句） | 本项目人工精编 `src/data/hanzi.ts` | 含 etymology 等独有字段 |
| 1249 字广度例句（c/pinyin/word/sentence） | hanzi-study `dataList.js` | 由 `scripts/gen-hanzi-sentences.mjs` 派生 |
| 拼音 | `pinyin-pro`（程序化）+ 数据内带调拼音 | 双轨互补 |

### 持久化方案
- **静态数据**（笔顺/例句/字表）：编译期打包进 `public/data/*.json` 或 TS 模块，**运行时懒加载**；Service Worker 对 `/data/*.json` 采用 `stale-while-revalidate`，二次访问离线可用。
- **用户进度**：`src/lib/safeStorage.ts`（封装 localStorage + 内存兜底 + `storage-error` 事件），mastery/徽章/SRS 到期等均落本地；多终端同步可经「家长中心」自定义进度。
- **AI 生成内容**：Worker 端 KV（`CONTENT_KV`）+ 限速桶缓存。

---

## 六、响应式适配与性能优化

### 响应式
- 字库网格 `grid-cols-4 sm:grid-cols-6 lg:grid-cols-8`，移动端 4 列 → 桌面 8 列自适应。
- 笔画动画/描红采用 SVG `viewBox`（1024 坐标 + 翻转），任意尺寸等比缩放，触屏轨迹经屏幕→书法坐标换算（`x_r = x_svg`，`y_r = 900 - y_svg`）。

### 性能（针对本轮 4.7× 数据量）
- **懒加载**：笔顺表 2.9MB 原始 / ~1.2MB gzip，仅在进入写字环节时 `fetch` 一次，模块级 Promise 缓存防重复请求。
- **SW 缓存**：`/data/*.json` stale-while-revalidate，首次加载后离线秒开、永不重复下载。
- **gzip/br**：Cloudflare 边缘压缩，JSON 路径数据高冗余，压缩比约 2.4×。
- **可选后续优化**：若移动端首载可感知，可按「拼音首字母/笔画数」拆分子表（`hanzi-strokes-<prefix>.json`）做更细粒度懒加载——当前单表方案已满足 3–6 岁场景，未启用。

---

## 七、遗留事项与建议
1. **~~未提交 WIP 构建阻塞~~（已修复，08-13）**：`HanziQuizGame.tsx`、`HanziStrokeWriter.tsx` 的 20 处类型错误已修复（`s/m/r`→`strokes/radical/origin`、`recordMastery`→`practice`、`amber`→`orange`、移除 `Panel` 的 `tone` prop 及未用变量）。现 `tsc -b --force` 0 错 + vitest 406/406 + `npm run build` 通过。
2. **`r`（部首笔画序号）已就绪**：已入库 1070 字 + 接口已声明，可接线 `RadicalsMagic` 实现「部首笔画高亮」，属低风险增强。
3. **笔顺表可增量维护**：新增字时运行 `node scripts/gen-hanzi-strokes-expanded.mjs` 即可重新合并（上游目录可经参数指定）。

---

## 八、本轮变更文件清单
- `scripts/gen-hanzi-strokes-expanded.mjs`（新增，融合脚本）
- `public/data/hanzi-strokes.json`（重生成：318 → 1277 字）
- `src/lib/strokes.ts`（`StrokeData` 增加可选 `r`；更新来源/体积注释）
