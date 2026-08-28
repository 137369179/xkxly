/**
 * 游戏化模块错误边界（生产稳定性 · 防白屏）
 * ------------------------------------------------------------
 * 任何子玩法组件抛错都不会让整页白屏，而是降级为儿童友好的安抚卡片，
 * 并可在 componentDidCatch 中接监控上报（此处静默，不打断学习流程）。
 * 这是「稳定性」质量维度的兜底 —— 单点故障不影响整体体验。
 */
import { Component, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  /** 自定义降级 UI；不传则使用内置安抚卡片 */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GameErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(): void {
    // 生产可在此接错误监控；此处静默降级，避免打断孩子
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            role="alert"
            className="rounded-2xl bg-[#fff3e0] p-4 text-center text-[#a85b00] font-bold"
          >
            🛟 小游戏遇到一点小问题，我们马上回来～
          </div>
        )
      );
    }
    return this.props.children ?? null;
  }
}
