# 🔄 宝贝学习乐园 - 组件迁移指南

> **版本**: v2.0（升级后）  
> **适用范围**: 全部 24 个功能模块  
> **目标**: 将现有组件逐步迁移到新架构  

---

## 📋 迁移总览

### 新增基础设施

| 模块 | 文件路径 | 用途 |
|------|----------|------|
| **自定义 Hooks** | `src/hooks/` | 页面生命周期、音效同步等通用逻辑 |
| **UI 组件库** | `src/components/ui/` | 无障碍按钮、进度条、星级评分等 |
| **Store 拆分** | `src/store/` | TTS 状态、应用设置独立 Store |
| **国际化** | `src/i18n/` | 中英双语支持 |
| **PWA 增强** | `src/lib/pwa/` | 离线管理器 |
| **AI 智能** | `src/lib/ai/smart-practice.ts` | 错题分析、自适应难度 |
| **学科定义** | `src/lib/srs/SUBJECTS.ts` | 学科元数据单一真相源 |

---

## 🚀 迁移步骤（按优先级）

### Phase 1: 核心组件迁移（高优先级）

#### 1.1 App.tsx 迁移 ✅ 已完成示例

**文件**: `src/App.tsx` → `src/App.migrated.tsx`

**变更内容**:
```diff
- import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
+ import { Suspense, lazy, useMemo, useState } from 'react';
+ import { usePageLifecycle, useSoundSync } from '@/hooks';
+ import { AccessibleButton } from '@/components/ui/AccessibleButton';

  export function App() {
    const { route, param } = useRoute();
    const checkIn = useStore((s) => s.checkIn);
-   const sound = useStore((s) => s.settings.sound);
    const [isVoiceOpen, setIsVoiceOpen] = useState(false);

-   // 每日签到
-   useEffect(() => { checkIn(); }, [checkIn]);
-
-   // 音效开关同步
-   useEffect(() => { setMuted(!sound); }, [sound]);
-
-   // 切换页面时停止朗读
-   useEffect(() => {
-     stopSpeaking();
-     window.scrollTo({ top: 0, behavior: 'instant' });
-     const nav = NAV_MAP.get(route);
-     if (nav) announcePage(nav.label, nav.desc);
-   }, [route, param]);

+   // 🆕 使用新 Hook：统一页面生命周期管理
+   usePageLifecycle({
+     stopSpeechOnUnmount: true,
+     scrollToTop: true,
+     announceNewPage: true,
+   });
+
+   // 🆕 使用新 Hook：音效自动同步
+   useSoundSync();

    checkIn(); // 业务逻辑保留

    // ... 其余代码不变 ...

-   // 原生 button
-   <motion.button ...>
+   // 🆕 无障碍按钮
+   <AccessibleButton
+     ariaLabel="语音问小兔"
+     variant="primary"
+     onClick={() => { sfxTap(); setIsVoiceOpen(true); }}
+   >
```

**效果**: 减少 ~20% 代码量，消除重复模式

---

#### 1.2 答题组件统一化（PoemTrain/MathQuiz 等）

**当前问题**: 10+ 处重复实现 QuizOption 渲染逻辑

**解决方案**: 使用新的 `QuizCard` 组件

**迁移前** (`src/modules/poems/PoemTrain.tsx`):
```tsx
// ❌ 旧代码：每个模块各自实现
<div className="space-y-3">
  {options.map((opt, i) => (
    <button
      key={opt.id}
      onClick={() => handleSelect(opt.id)}
      className={`p-4 rounded-xl ${selected === opt.id ? 'bg-blue-100' : ''}`}
    >
      {String.fromCharCode(65 + i)}. {opt.text}
    </button>
  ))}
</div>
```

**迁移后**:
```tsx
// ✅ 新代码：使用通用组件
import { QuizCard } from '@/components/ui/QuizCard';

<QuizCard
  question={{
    id: currentQuestion.id,
    question: currentQuestion.title,
    options: currentQuestion.options.map(opt => ({
      id: opt.id,
      label: opt.text,
      emoji: opt.emoji,
      isCorrect: opt.correct,
    })),
    difficulty: currentQuestion.difficulty,
    explanation: currentQuestion.explanation,
  }}
  currentIndex={currentIndex}
  totalQuestions={questions.length}
  onSelectAnswer={handleSelectAnswer}
  isAnswered={isAnswered}
  selectedAnswerId={selectedId}
/>
```

**受益模块**:
- `src/modules/poems/PoemTrain.tsx`
- `src/modules/numbers/MathQuiz.tsx`
- `src/modules/numbers/SpeedMath.tsx`
- `src/modules/hanzi/HanziLearn.tsx`
- `src/modules/pinyin/PinyinPractice.tsx`
- `src/modules/words/SpellingTest.tsx`
- `src/modules/logic/KidSudoku.tsx`
- 其他所有包含选择题的模块

---

#### 1.3 进度展示统一化

**当前问题**: 15+ 处硬编码进度条/星级

**解决方案**: 使用 `ProgressBar` 和 `StarRating`

**迁移前**:
```tsx
// ❌ 旧代码
<div className="w-full bg-gray-200 h-2 rounded">
  <div className="bg-blue-500 h-2 rounded" style={{ width: `${progress}%` }} />
</div>
```

**迁移后**:
```tsx
// ✅ 新代码
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StarRating } from '@/components/ui/StarRating';

<ProgressBar value={progress} max={100} showValue color="blue" />
<StarRating rating={stars} interactive onChange={setStars} />
```

---

### Phase 2: Store 迁移（中优先级）

#### 2.1 从主 Store 迁移到细粒度 Store

**步骤 1**: 在组件中导入新 Store
```typescript
// ❌ 旧代码
import { useStore } from '@/store/useStore';
const sound = useStore((s) => s.settings.sound);
const setSound = useStore((s) => s.setSound);

// ✅ 新代码
import { useSettingsStore } from '@/store/useSettingsStore';
const sound = useSettingsStore((s) => s.settings.sound);
const setSound = useSettingsStore((s) => s.setSound);
```

**步骤 2**: 逐模块迁移（建议按以下顺序）
1. `src/modules/parent/VoiceSettings.tsx` → `useSettingsStore`
2. `src/modules/parent/ParentPage.tsx` → `useSettingsStore`
3. `src/components/AiVoiceModal.tsx` → `useTtsStore`
4. 其他依赖 settings/tts 的组件

**注意**: 主 Store 在过渡期内保持兼容，可渐进式迁移

---

### Phase 3: 国际化迁移（低优先级）

#### 3.1 添加多语言支持

**步骤 1**: 在页面组件中使用 `useTranslation`
```tsx
import { useTranslation } from '@/i18n/useTranslation';

function MyComponent() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <div>
      <h1>{t('common.appName')}</h1>
      <button onClick={() => setLocale('en-US')}>
        Switch to English
      </button>
      <p>{t('learning.start')}</p>
    </div>
  );
}
```

**步骤 2**: 替换硬编码字符串
```diff
- <h1>宝贝学习乐园</h1>
+ <h1>{t('common.appName')}</h1>

- <button>开始学习</button>
+ <button>{t('learning.start')}</button>

- <p>答对了！</p>
+ <p>{t('learning.correct')}</p>

- <p>获得 {count} 颗星</p>
+ <p>{t('learning.starsEarned', { count })}</p>
```

**建议优先级**:
1. 导航栏和菜单文本
2. 按钮标签和提示文字
3. 错误消息和成功提示
4. 家长中心界面
5. 学习内容（古诗标题等）- 可后续处理

---

### Phase 4: PWA 离线增强集成

#### 4.1 Service Worker 与离线状态（已落地，无需额外初始化）

> ⚠️ 原文档提到的 `OfflineManager`（`@/lib/pwa/offline-manager`）已于 2026-08-09 **删除**：
> 它与既有的 `src/lib/sw.ts` + `public/sw.js` + `useOffline()` 功能重复，且会对 `/sw.js` 发起重复注册。
> 离线能力现在由以下既有实现统一负责，请勿再引用已删除的模块。

- **SW 注册**：`src/main.tsx` 已调用 `registerSW()`（`@/lib/sw`），负责注册 `/sw.js` 并通过 `sw-updated` 事件通知更新（`SwUpdateToast` 消费）。
- **离线状态感知**：使用 `useOffline()`（`src/components/OfflineIndicator.tsx`）获取 `offline: boolean`；`<OfflineBadge/>` 与 `<OfflineToast/>` 已在 `App.tsx` 挂载。
- **缓存策略**：由 `public/sw.js` 实现（App Shell 预缓存 + 资源分桶 cache-first / network-first），构建时由 `scripts/gen-sw-precache.mjs` 自动生成 `precache-manifest.json`。

如需在组件里感知离线状态：

```tsx
import { useOffline } from '@/components/OfflineIndicator';

function MyButton() {
  const offline = useOffline();
  return <button disabled={offline}>需要联网的功能</button>;
}
```

---

## 📊 迁移检查清单

### 每个 Module 迁移完成后确认：

- [ ] 所有 `useEffect` 是否可以替换为 `usePageLifecycle`？
- [ ] 音效同步是否使用 `useSoundSync`？
- [ ] 按钮是否使用 `AccessibleButton`？
- [ ] 进度条是否使用 `ProgressBar`？
- [ ] 星级评分是否使用 `StarRating`？
- [ ] 选择题是否使用 `QuizCard`？
- [ ] 硬编码字符串是否提取到 i18n？
- [ ] Store 访问是否使用新拆分的 Store？

---

## 🔧 自动化脚本（可选）

创建迁移辅助脚本检测未迁移的代码：

```bash
# 检测未使用新 Hook 的 useEffect
grep -r "useEffect" src/modules --include="*.tsx" | grep -v "usePageLifecycle"

# 检测原生 button（应替换为 AccessibleButton）
grep -rn "<button" src/modules --include="*.tsx"

# 检测硬编码中文（应提取到 i18n）
grep -rn "[\u4e00-\u9fa5]" src/modules --include="*.tsx" | head -20
```

---

## ⚠️ 注意事项

1. **渐进式迁移**: 不需要一次性全部迁移，可以逐个模块进行
2. **向后兼容**: 新旧代码可以在过渡期共存
3. **测试验证**: 每个模块迁移后运行 `npm run test` 确保无回归
4. **性能监控**: 使用 Lighthouse 对比迁移前后的性能指标

---

## 📞 获取帮助

如果在迁移过程中遇到问题：
1. 查看新增文件的 JSDoc 注释
2. 参考 `App.migrated.tsx` 的完整示例
3. 查看 `QuizCard.tsx` 的使用示例
4. 检查 `UPGRADE_EXECUTION_REPORT.md` 了解升级详情

---

*指南版本: 2026-08-09*  
*适用项目: 宝贝学习乐园 v1.0.0 → v2.0*
