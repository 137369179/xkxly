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
    // 开发态把 AI 请求转给 BFF，密钥始终留在服务端、不进 bundle
    proxy: {
      '/api/ai': {
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
    target: 'es2020',
    // 关闭自动清空 dist：本机安全工具（如 macOS 安全删除机制）会拦截 vite 对
    // dist/icons 等子目录的批量删除（>50 文件），导致 build 在 prepare-out-dir 阶段失败。
    // 改为覆盖写入，旧 hash chunk 不被 index.html 引用，无害。
    // TODO: 若安全工具配置更新或迁移到 CI 构建，可恢复 emptyOutDir: true 以确保 dist 干净。
    emptyOutDir: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 庆祝彩纸只在首次庆祝时才需要，独立成 chunk，不进首屏 vendor
            if (id.includes('canvas-confetti')) return 'confetti';
            if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion';
            // opencc-js 繁简转换字典约 1MB，仅繁体模式按需加载，独立 chunk 不进首屏
            if (id.includes('opencc-js')) return 'vendor-opencc';
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
        },
      },
    },
  },
}));
