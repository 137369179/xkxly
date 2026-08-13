# 第六轮扫描交付报告 · P9·② 神经引擎古诗/故事情感化语速曲线补全

**日期**：2026-08-10 ｜ **执行者**：SeniorDeveloper（自主推进，无需授权）
**目标**：补全「神经引擎朗读按 module/mood 分段变速、句末拖腔」在古诗/故事范读路径的生效缺口。

---

## 1. 结论速览

| 项 | 结果 |
|---|---|
| 真实缺口 | 仅 3 处**次要古诗范读点**缺 `module:'poem'`+`moodKey`（Kokoro 下匀速无拖腔） |
| 引擎现状 | `neuralCurve` + `kokoroEngine.generateCurve` + `speech.ts` Kokoro 分支 **早已完整实现** |
| 主路径现状 | 故事主路径 `StorybookReader`、古诗主范读 `speakChant`（PoemTrain）**已生效** |
| 本轮改动 | 4 文件（1 类型放宽 + 3 范读点补全） |
| `tsc -b --force` | ✅ 0 错误 |
| `vitest run` | ✅ **277 passed** |
| `npm run build` | ✅ exit 0，index.html(1749B) + 资产，入口 `index-BxqfCIcZ.js` |
| `wrangler deploy` | ✅ Version `07e04d0c-381b-4ff1-9456-e034757ded94`（上传 117 assets） |
| 线上复验 | ✅ `GET /` 返回 title、raw HTML 引用新入口 `assets/index-BxqfCIcZ.js` 与 dist 一致 → 新版本已生效 |

**一句话结论**：神经引擎古诗/故事情感化语速曲线从「主路径已生效」升级为「**全范读点已覆盖**」，无新增回归。

---

## 2. 缺口澄清（避免误判）

| 探查对象 | 现状 | 判定 |
|---|---|---|
| `src/lib/tts/neuralCurve.ts` | `buildNeuralSegments(text, module?, moodKey?)` 已实现（poem 首句 1.06/末句 0.9、story/ai 末句 0.95、praise 1.05；`MOOD_SPEED` 情绪系数；`pauseForEnding` 按标点补静音 460/300/160/120ms） | 已完整 |
| `src/lib/tts/kokoroEngine.ts` | `play()` 在 `opts.segments?.length>0` 时调 `generateCurve()` 逐段合成拼接（含拼音转换、段末静音样本） | 已完整 |
| `src/lib/tts/manager.ts` | `play()` 合并设置后透传 `segments` 到 Kokoro | 已完整 |
| `src/lib/speech.ts:294` | Kokoro 分支已调 `buildNeuralSegments(text, options.module, options.moodKey)` 并传 `segments` | 已完整 |
| `StorybookReader.tsx:50` | 已传 `module:'story'` | 故事主路径已生效 |
| `speakChant()`（chant.ts:452） | 已向 `speak()` 传 `module:'poem'`+`moodKey`（PoemTrain 主范读） | 古诗主范读已生效 |
| `LineNotes.tsx` 整诗范读 | 仅 `{rate:0.7}` | ❌ 缺口 |
| `ReciteRecorder.tsx` 听原音 | 仅 `{rate:0.7, lang}` | ❌ 缺口 |
| `PoemFill.tsx` 听一听 | 仅 `{rate:0.8}` | ❌ 缺口 |

> 类型障碍：`moodOfPoem` 原签名要求 `DeepPoem`，但范读点持有的是 `Poem`/`PoemIndex`（仅含 `themes`/`imagery`）。放宽为结构化参数即可复用，无需数据迁移。

---

## 3. 代码改动清单（4 文件）

### 3.1 `src/lib/chant.ts`（类型放宽 ★）
```ts
// 改前
export function moodOfPoem(poem: DeepPoem): PoemMood {
// 改后
export function moodOfPoem(poem: { themes?: string[]; imagery?: string[] }): PoemMood {
```
使 `POEMS`（PoemIndex，仅含 themes/imagery）也能直接算 `moodKey`，供范读点复用。

### 3.2 `src/modules/poems/LineNotes.tsx`（整诗范读）
```tsx
// 改前
onClick={() => speak(poem.lines.join('\n'), { rate: 0.7 })}
// 改后
onClick={() => speak(poem.lines.join('\n'), { rate: 0.7, module: 'poem', moodKey: moodOfPoem(poem).key })}
```

### 3.3 `src/modules/poems/PoemFill.tsx`（听一听）
```tsx
// 改前
<CandyButton ... onClick={() => speak(q.line, { rate: 0.8 })}>
// 改后
<CandyButton ... onClick={() => speak(q.line, { rate: 0.8, module: 'poem', moodKey: moodOfPoem(POEMS.find(p => p.id === q.poemId)!).key })}>
```

### 3.4 `src/modules/poems/ReciteRecorder.tsx`（听原音）
```ts
// 改前
const playOriginal = () => {
  sfxTap();
  speak(lines.join(' '), { rate: 0.7, lang: 'zh-CN' });
};
// 改后
const playOriginal = () => {
  sfxTap();
  const pm = POEMS.find(p => p.id === poem.id);
  const moodKey = pm ? moodOfPoem(pm).key : undefined;
  speak(lines.join(' '), { rate: 0.7, lang: 'zh-CN', module: 'poem', moodKey });
};
```

---

## 4. 验证与部署（门禁全绿）

1. **类型闸门**：`npx tsc -b --force` → `TSC_EXIT=0`（无幽灵/真实错，类型放宽未破坏签名）。
2. **测试**：`npx vitest run` → `277 passed (277)`（含 `FollowRead`/`prosody`/`srs` 等，无回归）。
3. **构建**：`NODE_OPTIONS=--max-old-space-size=3072 npm run build` → `BUILD_EXIT=0`、`dist/index.html`(1749B) + 资产，入口 `index-BxqfCIcZ.js`（dangerouslyDisableSandbox 防 SIGKILL）。
4. **部署**：`cd worker && env -u HTTP_PROXY -u HTTPS_PROXY -u NO_PROXY wrangler deploy` → Version `07e04d0c-381b-4ff1-9456-e034757ded94`，上传 117 assets（dangerouslyDisableSandbox）。
5. **线上复验**：
   - curl 经代理 `127.0.0.1:3068` 在 TLS 层偶发 `exit 35`（瞬时抖动，重试即通，非站点问题）。
   - WebFetch 确认 `GET /` 返回标题「宝贝学习乐园 · 快乐学习每一天」、无错误页。
   - raw HTML 引用新入口 `assets/index-BxqfCIcZ.js`，与 `dist/assets/index-BxqfCIcZ.js` 一致 → **新版本已生效**。
   - `poemLineNotes` 为 lazy chunk，不在初始 HTML（符合预期，非缺失）。

---

## 5. 诚实边界（免改项）

- `PoemDetail` / `VoiceScoreModal` / `VoiceRecite`：无直接 `speak`，走 `FollowRead`（已透传 `module`+`moodKey`），已正确。
- `FollowRead`：已正确透传 module/moodKey，无需改。
- `story` 主路径（`StorybookReader`）：此前已生效，无需改。
- **曲线仅 Kokoro（神经引擎）生效**：WebSpeech 系统语音忽略分段，符合设计；`module:'poem'`+`moodKey` 透传对 WebSpeech 无副作用。

---

## 6. 记忆落盘

- `2026-08-10.md`：新增「P9·② 神经引擎古诗/故事情感化语速曲线补全」段。
- `MEMORY.md`：语音/TTS 章节补充「神经曲线接线现状」（全范读点已覆盖 + `moodOfPoem` 类型放宽复用范式）。

---

## 7. 附录 · 神经曲线工作机理（供后续维护参考）

- `buildNeuralSegments`：按 `。！？；…` 等标点切句 → 按模块基线（poem/story/ai/praise）+ 情绪系数（MOOD_SPEED，由 `moodKey` 选）算每句 `speed` → 句末按标点类型补 `pauseMs` 静音（句号 460ms / 叹问 300ms / 分号 160ms / 逗号 120ms）→ 返回 `NeuralSegment[]`。
- `kokoroEngine.generateCurve()`：逐段以各自 `speed` 调 Kokoro 合成 → 段末插入 `pauseMs` 对应静音样本 → 拼接为单条 AudioBuffer → 抑扬顿挫 + 句末拖腔。
- 调用链：`speak(text, {module, moodKey})` → `speech.ts` Kokoro 分支 `buildNeuralSegments` → `manager.play({segments})` → `kokoroEngine.generateCurve`。
