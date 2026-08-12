/**
 * 页面生命周期 Hook
 * 统一管理页面切换时的副作用（停止语音、滚动到顶部等）
 */

import { useEffect, useRef } from 'react';
import { useRoute } from '@/lib/router';
import { stopSpeaking, announcePage } from '@/lib/speech';
import { NAV_MAP } from '@/data/nav';

interface UsePageLifecycleOptions {
  stopSpeechOnUnmount?: boolean;
  scrollToTop?: boolean;
  announceNewPage?: boolean;
}

export function usePageLifecycle(options: UsePageLifecycleOptions = {}) {
  const {
    stopSpeechOnUnmount = true,
    scrollToTop = true,
    announceNewPage: announce = true,
  } = options;

  const { route, param } = useRoute();
  const prevRouteRef = useRef(route);

  useEffect(() => {
    if (prevRouteRef.current !== route) {
      prevRouteRef.current = route;
      if (stopSpeechOnUnmount) stopSpeaking();
      if (scrollToTop) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      if (announce) {
        const nav = NAV_MAP.get(route);
        if (nav) announcePage(nav.label, nav.desc);
      }
    }
  }, [route, param, stopSpeechOnUnmount, scrollToTop, announce]);

  return { route, param };
}

export default usePageLifecycle;
