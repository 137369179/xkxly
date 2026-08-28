/**
 * 共享 AudioContext 单例
 * 浏览器对 AudioContext 实例数量有限制（Chrome ~6 个），
 * 全局复用一个避免多次创建组件时耗尽配额
 */

let _ctx: AudioContext | null = null;
let _isUnlocked = false;

export function getAudioContext(): AudioContext {
  if (!_ctx && typeof window !== 'undefined') {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      _ctx = new Ctor();
    }
  }
  // 浏览器自动暂停的 context 需要手动 resume
  if (_ctx && _ctx.state === 'suspended') {
    void _ctx.resume().catch(() => {});
  }
  return _ctx!;
}

/**
 * 移动端/桌面端首次手势交互时全局激活 AudioContext
 */
export function unlockAudioContext(): void {
  if (_isUnlocked || typeof window === 'undefined') return;
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
  _isUnlocked = true;
}

if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    unlockAudioContext();
    window.removeEventListener('pointerdown', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);
    window.removeEventListener('keydown', handleFirstInteraction);
  };
  window.addEventListener('pointerdown', handleFirstInteraction, { once: true, passive: true });
  window.addEventListener('touchstart', handleFirstInteraction, { once: true, passive: true });
  window.addEventListener('keydown', handleFirstInteraction, { once: true, passive: true });
}
