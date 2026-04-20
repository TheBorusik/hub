import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import hubUi from './eslint-rules/index.js'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'hub-ui': hubUi,
    },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Все правила пока warn: есть легаси-нарушения (229 hex, 352 spacing,
      // 4 прямых ConfirmDialog, 1 defineTheme в wfm-csharp). Цель — сначала
      // не блокировать build, но surface долг. По мере миграции можно
      // ratchet to 'error' (сначала no-duplicate-confirm-dialog и
      // no-monaco-theme-define — там мало violation'ов).
      'hub-ui/no-raw-hex': 'warn',
      'hub-ui/no-magic-spacing': 'warn',
      'hub-ui/no-duplicate-confirm-dialog': 'warn',
      'hub-ui/no-monaco-theme-define': 'warn',
    },
  },
])
