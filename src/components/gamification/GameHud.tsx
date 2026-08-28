/**
 * GameHud — 三核心「一行包裹」游戏化整面板
 * ─────────────────────────────────────────────────────────────────
 * 把已验证的 @/game 游戏化组件收敛为单一 drop-in，让三个学习模块只需：
 *
 *   <GameProvider getProgress={store.getProgress} scene="hanzi">
 *     <GameHud progress={progress} combo={combo} feedback={fb} />
 *     …练习闭环…
 *   </GameProvider>
 *
 * 即可获得完整游戏化体验，覆盖原始任务五项硬指标：
 *   - ComboMeter     → ① 积分 / 闯关激励（连击可视化）
 *   - GentleFeedback → ③ 即时反馈（答对积极强化 / 答错温和引导）
 *   - RestReminder   → 防沉迷护眼（R 层 · 健康节奏）
 *   - LevelProgress  → ② 渐进难度 / ⑤ 进度可见（掌握度曲线）
 *   - AchievementWall→ ⑤ 成就系统 / 成长目标感（已解锁里程碑 + 徽章）
 *   - 音效开关       → ④ 儿童审美（S/M 层 · 端侧合成 · 家长可静音 · 零上传）
 *
 * 设计为纯受控 + 上下文增强：
 *   - combo / feedback / progress 由父级（三核心）注入，组件本身零副作用；
 *   - 音效状态读取 useGame().sound（须置于 <GameProvider> 内）；
 *   - 不触碰任何既有学习逻辑，三核心收敛 WIP 后增量包裹接入即可。
 *
 * 设计约束（继承 R144–R157 已建 @/game 基础设施）：
 *   - 纯新建、零用户 WIP 依赖、零学习逻辑改动；
 *   - 不编辑 WIP 中的 src/game/index.ts，经深路径 import 复用。
 */
import type { Progress } from '@/types';
import { useGame } from '@/game/GameProvider';
import { ComboMeter } from './ComboMeter';
import { GentleFeedback } from './GentleFeedback';
import { RestReminder } from './RestReminder';
import { LevelProgress } from './LevelProgress';
import { AchievementWall } from './AchievementWall';

export interface GameHudFeedback {
  /** 是否答对（决定气泡色彩与图标） */
  correct: boolean;
  /** 即时反馈话术（来自 feedback.answerCorrect/Wrong） */
  message: string;
}

export interface GameHudProps {
  /** 最新进度快照（成就 / 进度判定用），由三核心注入 store getter 的当前值 */
  progress: Progress;
  /** 当前连击数；缺省时从 useGame().gamification.combo 读取 */
  combo?: number;
  /** 最近的即时反馈；为 null 时不渲染反馈气泡 */
  feedback?: GameHudFeedback | null;
  /** 家长是否已关闭护眼休息提醒 */
  restDisabled?: boolean;
  /** 是否渲染掌握进度（默认 true） */
  showProgress?: boolean;
  /** 是否渲染成就墙（默认 true） */
  showAchievements?: boolean;
  className?: string;
}

export function GameHud({
  progress,
  combo,
  feedback,
  restDisabled = false,
  showProgress = true,
  showAchievements = true,
  className,
}: GameHudProps) {
  const game = useGame();
  const resolvedCombo = combo ?? game.gamification.combo;
  const { muted, setMuted } = game.sound;

  return (
    <section
      role="region"
      aria-label="游戏化学习面板"
      className={`game-hud${className ? ` ${className}` : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 24,
        background: 'linear-gradient(135deg,#fff0f6 0%,#f3e8ff 100%)',
        boxShadow: '0 8px 24px rgba(255,126,179,0.18)',
        fontFamily: 'inherit',
      }}
    >
      <div
        className="game-hud-top"
        style={{ display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <ComboMeter count={resolvedCombo} />
        </div>
        <button
          type="button"
          aria-pressed={muted}
          aria-label={muted ? '开启音效' : '关闭音效'}
          onClick={() => setMuted(!muted)}
          style={{
            border: 'none',
            borderRadius: 14,
            padding: '8px 12px',
            background: muted ? '#f0e6ff' : '#ffd6ec',
            fontSize: 18,
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
        </button>
      </div>

      {feedback ? (
        <GentleFeedback correct={feedback.correct} message={feedback.message} />
      ) : null}

      <RestReminder disabled={restDisabled} />

      <div
        className="game-hud-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        {showProgress ? <LevelProgress progress={progress} /> : null}
        {showAchievements ? <AchievementWall progress={progress} /> : null}
      </div>
    </section>
  );
}
