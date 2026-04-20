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
      // hex / magic-spacing — пока warn: ~150 hex и ~350 magic-spacing
      // легаси-предупреждений в неперекрашенных областях. Постепенно
      // подчищаются и поднимутся до 'error'.
      'hub-ui/no-raw-hex': 'warn',
      'hub-ui/no-magic-spacing': 'warn',
      // 0 нарушений после Sprint 2 + Monaco theme cleanup — фиксируем
      // инвариант на error, чтобы новый код не возвращал дубли.
      'hub-ui/no-duplicate-confirm-dialog': 'error',
      'hub-ui/no-monaco-theme-define': 'error',
      // Провайдеры (ContourProvider, NavigationProvider, NotificationsProvider,
      // ProblemsProvider, ToastProvider, MonacoProvider, ConfirmDialog/useConfirm,
      // Modal/useModal) намеренно соэкспортируют Provider-компонент, хуки и
      // типы из одного файла — это стандартный React-Context паттерн. Splitting
      // каждого провайдера на два файла не даёт пользы — оставляем warn.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
