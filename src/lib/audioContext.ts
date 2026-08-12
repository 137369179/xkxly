/**
 * 共享 AudioContext 单例
 * 浏览器对 AudioContext 实例数量有限制（Chrome ~6 个），
 * 全局复用一个避免多次创建组件时耗尽配额
 */

let _ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!_ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    _ctx = new Ctor();
  }
  // 浏览器自动暂停的 context 需要手动 resume
  if (_ctx.state === 'suspended') {
    void _ctx.resume();
  }
  return _ctx;
}
