import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 排除构建产物、测试、脚手架脚本
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.d.ts',
      'vite.config.*',
      'vitest.config.*',
      '.vite/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      'src/test/**',
      '_*.mjs',
      'scripts/**',
      'scripts-*.mjs',
    ],
  },

  // TS / TSX 通用规则
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // React hooks 核心规则
      'react-hooks/rules-of-hooks': 'error',
      // exhaustive-deps 降级为 warn：当前代码库有 280+ 个 intentional 跳过，全部 fix 需单独 PR
      'react-hooks/exhaustive-deps': 'warn',

      // TS 严格规则
      '@typescript-eslint/no-extra-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // console 警告：DEV 守卫已覆盖，此处只提示裸调用
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // BFF / Worker：.mjs 纯 JS 文件，无 TS parser。
  // server/（wrangler dev 本地 Node 运行时）用 Node globals；
  // worker/（Cloudflare Worker 运行时）用浏览器类 globals。
  // 此前未配置导致 135 个 no-undef 误报（setTimeout/fetch/URL 等）。
  {
    files: ['server/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2022 },
    },
  },
  {
    files: ['worker/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2022 },
    },
  },
  // worker/test.mjs 由 `node` 直接执行（用 process.exit），覆盖为 Node globals
  {
    files: ['worker/test.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Service Worker：独立全局环境（self / caches / fetch / Response），
  // 经典脚本（无 import/export）；catch 参数为有意忽略（SW 容错策略）。
  {
    files: ['public/sw.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: { ...globals.serviceworker },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
