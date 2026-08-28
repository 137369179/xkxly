/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss()],
  esbuild: {
    // 生产构建移除 console.log/debug 和 debugger
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // 保证 react / react-dom / scheduler 全链路单实例，杜绝多副本导致的
    // "Cannot set property 'Activity' of undefined" 白屏（React 19 已知坑）
    dedupe: ['react', 'react-dom', 'scheduler', 'three'],
  },
  server: {
    port: 5181,
    strictPort: true,
    host: true,
    allowedHosts: true,
    // 开发态把 AI / 内容中心请求转给 BFF，密钥始终留在服务端、不进 bundle
    proxy: {
      '/api/ai': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      // P0-3：内容中心端点（/api/content/*）同样由 BFF 提供，dev/生产行为一致
      '/api/content': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  test: {
    // 纯函数测试用 node 环境即可，无需 jsdom
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // 仅在切换到 jsdom 的组件测试中生效（setup 内会判断 window）
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/ai/**', 'src/lib/tts/**', 'src/lib/**/*.test.ts'],
    },
  },
  build: {
    target: 'es2022',
    // 关闭自动清空 dist：本机安全工具（如 macOS 安全删除机制）会拦截 vite 对
    // dist/icons 等子目录的批量删除（>50 文件），导致 build 在 prepare-out-dir 阶段失败。
    // 改为覆盖写入，旧 hash chunk 不被 index.html 引用，无害。
    // TODO: 若安全工具配置更新或迁移到 CI 构建，可恢复 emptyOutDir: true 以确保 dist 干净。
    emptyOutDir: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    // 大型按需 chunk 不参与静态预取：three(972KB)/opencc(1180KB)/诗词语料(787KB)/
    // pinyin-pro(304KB)/数据分包 仅在对应功能被真正打开时由动态 import 触发下载。
    // 若留在 index.html 的 <link rel=modulepreload> 中，浏览器会在首屏预取约 2.4MB
    // 无效流量（多数用户从不进入写实猫页/繁体模式）。剔除只移除预取提示，
    // 不改变任何 chunk 内容与运行时按需加载语义，动态 import 依旧即时生效。
    modulePreload: {
      polyfill: true,
      // vitest/config 的 UserConfig 类型对 PreloadEntry 推断不全（deps 为 never），
      // 显式声明兼容签名：PreloadEntry = string | { relativeUrl: string }
      resolveDependencies: (
        _filename: string,
        deps: Array<string | { relativeUrl: string }>
      ) =>
        // 返回须为 string[]（Vite ModulePreloadOptions 契约）：对象型依赖收敛为其
        // relativeUrl 字符串，既满足类型约束，又保证运行时 modulepreload 链接正确。
        deps
          .filter((d) => {
            const id = typeof d === 'string' ? d : d.relativeUrl;
            return !/(vendor-three|vendor-opencc|data-poems|vendor-pinyin|data-hanzi|data-languages|data-encyclopedia|confetti)/.test(id);
          })
          .map((d) => (typeof d === 'string' ? d : d.relativeUrl)),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 庆祝彩纸只在首次庆祝时才需要，独立成 chunk，不进首屏 vendor
            if (id.includes('canvas-confetti')) return 'confetti';
            if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion';
            // opencc-js 繁简转换字典约 1MB，仅繁体模式按需加载，独立 chunk 不进首屏
            if (id.includes('opencc-js')) return 'vendor-opencc';
            if (id.includes('pinyin-pro')) return 'vendor-pinyin';
            // three 系 3D 引擎只在写实猫页使用（lazy 加载），独立 chunk 避免进首屏。
            // ⚠️ 必须整族并入同一 chunk：three 内部（core + examples/jsm）与
            // three-stdlib / @react-three / three-mesh-bvh / troika-* / camera-controls
            // 存在循环依赖。一旦被拆到不同 chunk（如漏网的 three-mesh-bvh、troika-*），
            // 跨 chunk 求值顺序失控会触发 "class X extends Y → Cannot access 'Y' before
            // initialization" 的 TDZ，首屏（eager vendor）直接白屏。整族同 chunk 后
            // Rollup 可在单 chunk 内正确排序，消除 TDZ。
            if (/(?:^|[\\/])node_modules[\\/](?:@react-three|@monogrid|three|three-stdlib|three-mesh-bvh|maath|troika-three-text|troika-three-utils|troika-worker-utils|camera-controls)(?:[\\/]|$)/.test(id)) return 'vendor-three';
            // ⚠️ react 全家桶(react / react-dom / scheduler / react-reconciler)必须同处一个 chunk：
            // 它们跨 chunk 共享内部对象（ReactSharedInternals 等），一旦被拆开，
            // scheduler 初始化时会跨 chunk 往一个尚未初始化的对象上设 Activity，
            // 报 "Cannot set property 'Activity' of undefined" 并导致整页白屏。
            // 用精确路径匹配，避免误吞 @use-gesture/react、suspend-react 等含 "react" 字样的包。
            if (/(?:^|[\\/])node_modules[\\/](?:react|react-dom|react-reconciler|scheduler)[\\/]/.test(id)) return 'vendor-react';
            return 'vendor';
          }
          // 静态大型语料库分包（按需加载，避免首屏主 chunk 过大）
          if (id.includes('/src/data/') || id.includes('\\src\\data\\')) {
            // P1-1：徽章/勋章语料独立 chunk —— BadgeUnlock 已 lazy，store 侧
            // findNewBadges/applyMedalReward 仍同步依赖，拆独立 chunk 便于缓存隔离
            if (id.includes('badges') || id.includes('medals')) {
              return 'data-badges';
            }
            if (id.includes('hanzi') || id.includes('hanziSentences') || id.includes('hanzi500') || id.includes('hanziEtymology')) {
              return 'data-hanzi';
            }
            if (id.includes('animals') || id.includes('dinosaurs') || id.includes('humanBody') || id.includes('space')) {
              return 'data-encyclopedia';
            }
            if (id.includes('poem') || id.includes('poets') || id.includes('allusionSources') || id.includes('pingShuiYun')) {
              return 'data-poems';
            }
            if (id.includes('idioms') || id.includes('words') || id.includes('pinyin') || id.includes('phonics')) {
              return 'data-languages';
            }
          }
        },
      },
    },
  },
}));
