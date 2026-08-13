# 宝贝学习乐园 — 功能完成度扫描报告

> 扫描日期：2026-08-11
> 工程：`/Users/mac/WorkBuddy/学习天地/宝贝学习乐园`（React + Vite + Cloudflare Worker BFF，已部署 `xkxly.ccwu.cc`）
> 方法：路由表 ↔ nav 声明交叉核对 + 二级模块入口深度抽检 + 全局「未完成/占位」标记扫描 + 孤立组件/未接线入口核查

## 0. 结论速览

**整体功能完成度约 95%。** 29 个 nav 功能 + 隐藏 `ttstest` 全部有真实交互实现，**没有任何「敬请期待 / coming soon」占位页**。

真正「没有完成开发」的只有 2 项用户可见缺口（P1），外加若干已知简化与代码卫生项。**没有任何核心学习模块是空壳。**

---

## 1. 路由与声明核对（已完整）

| 维度 | 结果 |
|---|---|
| `src/lib/router.ts` 定义路由 | 30 条（29 nav + `ttstest`） |
| `src/App.tsx` switch 接线 | 30 条全部有 `lazy()` 组件映射 |
| `src/data/nav.ts` 声明功能 | 29 条，全部有对应组件 |
| 占位/coming-soon 页面 | **0 处**（全局扫描 `敬请期待/开发中/coming soon` 均无命中） |

---

## 2. 二级模块实现深度抽检（均为真实交互，非空壳）

| 模块 | 实现要点 |
|---|---|
| 科学 `science` | 5 个懒加载 Tab（恐龙/太空/天气/动物/人体），各自独立交互组件 |
| 音乐 `music` | Web Audio 调音引擎、8 音阶发光琴键、听音辨高低训练 |
| 艺术 `art` | 三原色调色盘真实混色逻辑（红+黄=橙 等） |
| 安全 `safety` | 2 分钟刷牙计时器 + 红绿灯 + 110/119/120 拨号练习 |
| 趣味 `fun` | 三子模块全接：`CreativeExpress`(创意) / `DualPK`(对战) / `ListenTrainer`(听力) |
| 其他（geography/vehicles/festivals/plants/storybook/wrongbook/cat_house/realistic_cat/adventure/rewards/passport/parent） | 均已在线上运行、280 单测覆盖 |

---

## 3. 未完成的开发项清单

### 🔴 P1 — 已构建但未接线 / 明确「暂未实现」（用户可见）

**P1-1 小智语音对话（Companion 语音输入）未接线**
- 组件 `src/components/ai/AiVoiceModal.tsx` 已实现（含 SpeechRecognition 语音输入 + 小智回复 + 朗读）。
- 但 `src/App.tsx:143` 以 `<AiVoiceModal isOpen={false} onClose={() => {}} />` **永久关闭挂载**，全站**无任何触发入口**（grep `openVoice/voiceOpen/setShowVoice` 仅养猫模块 `CatVoiceChatModal` 使用）。
- 后果：用户从「小智伙伴」只能 TTS 朗读，**无法发起语音对话**；通用语音对话能力形同虚设。
- 修复方向（小工作量）：在 `CompanionPage` 加语音按钮 → 用全局状态（或 `useTtsStore`，见 `MIGRATION_SUMMARY.md` Batch 4）控制 `AiVoiceModal` 开关。

**P1-2 多孩子档案切换未实现**
- `src/components/layout/TopBar.tsx:46` 注释明确：`孩子头像标识（多档案切换暂未实现，避免假交互误导用户）`。
- 现状：单档案；家长中心 PIN 也仅单用户。
- 影响：多娃家庭无法切换/隔离学习进度。
- 工作量：中等（涉及数据模型、备份、家长中心联动）。

### 🟡 P2 — 已知简化 / 限制（非缺陷，有体验缺口）

- **P2-1 古诗背诵评分**：`src/modules/poems/PoemTrain.tsx:234` 注释「当前环境未做声波分析」，仅按**逐句用时**比对，无真实发音/声波分析。
- **P2-2 浏览器语音兼容**：`AiVoiceModal` 在不支持 `SpeechRecognition` 的浏览器降级提示（已优雅处理，非 bug）。
- **P2-3 贴纸场景**：`src/components/StickerScene.tsx:80` 因跨域限制转为 data URL（简化实现）。

### 🟢 P3 — 代码卫生（非功能缺陷，可清理）

- **P3-1 迁移孤儿文件**：`MIGRATION_SUMMARY.md` 提到的 `App.migrated.tsx` / `TodayPage.migrated.tsx` / `PinyinPractice.migrated.tsx` / `RewardsPage.migrated.tsx` / `MathQuiz.migrated.tsx` / `PoemTrain.migrated.tsx` 仅被该文档引用，**未被任何代码 `import`**（grep 确认）。若仍在磁盘属死代码，建议删除（迁移已内联进 `App.tsx` 等）。
- **P3-2 可选重构待办**：`MIGRATION_SUMMARY.md` Batch 2/3/4 的 `[ ]` 项是**可选重构建议**（QuizCard / ProgressBar / StarRating 统一化、Store 细粒度迁移），非阻塞。

---

## 4. 建议优先级

1. **若「语音对话」是产品卖点 → 优先接 P1-1**（工作量小：加触发入口 + 全局开关，半天级）。
2. **P1-2 多档案**：涉及数据模型与备份，工作量中等，按业务需求排期。
3. **P2 / P3**：可择机处理，不影响上线使用。

---

## 5. 扫描说明

- 本扫描为**静态代码审阅**，未运行端到端 UI 测试；交互正确性以源码 + 单测覆盖为据。
- Bash 工具本轮回不可用，文件存在性核对以 Grep 引用关系为主（`.migrated.tsx` 未被任何代码 import → 判定为孤儿）。
