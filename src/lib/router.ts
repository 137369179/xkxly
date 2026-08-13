import { useCallback, useEffect, useState } from 'react';

/**
 * 极简 hash 路由（无依赖）
 * 采用 hash 而非 history，保证部署到任意静态托管的子路径都能直接工作，
 * 刷新页面也不会 404。
 */

export const ROUTES = [
  'home',
  'today',
  'companion',
  'letters',
  'poems',
  'numbers',
  'logic',
  'adventure',
  'rewards',
  'passport',
  'parent',
  'ttstest',
  'hanzi',
  'hanzi-listen',
  'pinyin',
  'words',
  'fun',
  'idioms',
  'songs',
  'science',
  'music',
  'art',
  'safety',
  'geography',
  'vehicles',
  'festivals',
  'plants',
  'cat_house',
  'realistic_cat',
  'storybook',
  'wrongbook',
  'gamecenter',
  'story',
  'growth',
  'content',
  'research',
  'discoveries',
] as const;

export type RouteId = (typeof ROUTES)[number];

export interface Location {
  route: RouteId;
  /** hash 中的附加参数，例如 #/poems/12 -> param = '12' */
  param?: string;
}

function parseHash(): Location {
  // hash 优先（站内导航）；无 hash 时回退到 pathname —— 支持预渲染的独立 URL
  // 直链（如 /gamecenter/ 或 /story/），P2-1 SEO 架构升级的依赖前提。
  const hashRaw = window.location.hash.replace(/^#\/?/, '');
  let raw = hashRaw;
  if (!raw) {
    // 防御式取值：测试环境可能不提供 pathname
    const path = (window.location.pathname || '').replace(/^\/|\/$/g, '');
    raw = path && !path.startsWith('index.html') ? path : '';
  }
  const [first, second] = raw.split('/');
  const route = (ROUTES as readonly string[]).includes(first!) ? (first as RouteId) : 'home';
  return { route, param: second || undefined };
}

const listeners = new Set<(loc: Location) => void>();

/** 通知所有订阅者路由变化 */
function emit(loc: Location): void {
  listeners.forEach((l) => l(loc));
}

// 浏览器前进/后退、手动改地址栏时，hashchange 兜底同步
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    emit(parseHash());
  });
}

/** 订阅路由变化，返回取消订阅函数 */
export function subscribe(listener: (loc: Location) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function navigate(route: RouteId, param?: string): void {
  const next = `#/${route}${param ? `/${param}` : ''}`;
  if (window.location.hash !== next) {
    // 仅设置 hash。所有通知统一由 hashchange 单一通道触发（见下方监听器），
    // 不再在此同步 emit，避免「导航一次、副作用触发两次」的脆弱性。
    // hashchange 会因完整 hash 字符串变化而可靠触发；若 next 与当前 hash
    // 完全相同（导航到当前页同参数）则本就是 no-op，无需通知。
    window.location.hash = next;
  }
}

export function useRoute(): Location & { navigate: typeof navigate } {
  // lazy initializer：首次渲染时实时读取 hash，避免模块加载时的 stale 值
  const [loc, setLoc] = useState<Location>(() => parseHash());

  useEffect(() => {
    const l = (next: Location) => setLoc(next);
    listeners.add(l);
    // 挂载时同步一次（避免 SSR / 首帧不一致）
    setLoc(parseHash());
    return () => {
      listeners.delete(l);
    };
  }, []);

  const go = useCallback((route: RouteId, param?: string) => navigate(route, param), []);

  return { ...loc, navigate: go };
}
