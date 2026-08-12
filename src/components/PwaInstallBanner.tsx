import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxWin } from '@/lib/sfx';

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    sfxTap();
    if (!deferredPrompt) return;
    try {
      // prompt() 在某些浏览器/已安装场景下会抛错，必须包 try/catch
      // 否则变成 unhandledrejection，且 banner 永远关不掉
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        sfxWin();
      }
    } catch {
      // 用户取消、浏览器拒绝、或已安装过：静默关闭 banner
    } finally {
      setDeferredPrompt(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-4 flex items-center justify-between rounded-3xl border-2 border-candy-purple/30 bg-gradient-to-r from-purple-100 via-pink-100 to-yellow-100 p-3.5 shadow-md"
      >
        <div className="flex items-center space-x-3">
          <img src="/icons/icon-192.png" alt="App Icon" decoding="async" className="h-10 w-10 rounded-2xl shadow-sm" />
          <div>
            <h4 className="text-sm font-black text-ink">安装《宝贝学习乐园》桌面版</h4>
            <p className="text-xs font-bold text-ink/60">一键安装到 iPad/桌面，支持离线秒开随时玩 🚀</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <CandyButton tone="purple" size="sm" onClick={handleInstall}>
            立即安装
          </CandyButton>
          <button
            onClick={() => setDismissed(true)}
            aria-label="关闭安装提示"
            className="text-xs font-bold text-ink/40 hover:text-ink px-1"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
