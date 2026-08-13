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
];
