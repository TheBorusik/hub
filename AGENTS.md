# Hub — Руководство для агента

## Описание проекта

**Hub** — единая консоль управления WFM (Workflow Management). Объединяет несколько административных инструментов в одном SPA:

- **Configurator** — редактор процессной сборки (визуальный flow + код) и управление ветками
- **Viewer** — мониторинг и управление запущенными процессами (вкладки idle / manual / completed)
- **Command Tester** — отправка raw WFM-команд и управление тест-кейсами
- **CRUD Editor** — универсальный редактор данных через `GenericCRUD.Action`
- **DB Explorer** — просмотр и редактирование таблиц базы данных
- **System** — администрирование платформы: здоровье адаптеров, ошибки, права, роли, конфигурация адаптеров, конфиг-таблицы
- **Projects** — управление проектами

Приложение подключается к **нескольким WFM-деплойментам одновременно** через вкладки (multi-contour архитектура). Каждый контур — независимое WebSocket-соединение.

## Ключевая особенность: VS Code-подобный интерфейс

**Hub спроектирован как «VS Code-подобная» оболочка над WFM.** Вся дизайн-система и layout-каркас копируют паттерны VS Code (dark+ тема). Это не случайное сходство — это осознанная архитектурная决策а, зафиксированная в `docs/ui-redesign-tz.md`.

### Chrome приложения (layout)

| Элемент | Аналог в VS Code | Описание |
|---------|------------------|----------|
| `TabBar` | Вкладки редакторов | Вкладки верхнего уровня — подключённые контуры (деплойменты) |
| `ActivityBar` | Левая боковая панель | Переключение секций: Configurator, Viewer, Command Tester, CRUD, System, Projects, DB Explorer |
| `StatusBar` | Статусная строка | Синяя (#007acc) полоса внизу: статус WS, контур, ветка, состояние сохранения, счётчик проблем |
| `CommandPalette` | Ctrl+Shift+P | Глобальная палитра команд (`workbench.action.*`) |
| `QuickOpen` | Ctrl+P | Быстрый переход к процессу по имени |
| `ProblemsPanel` | Ctrl+Shift+M | Нижняя панель диагностик; pub-sub через `ProblemsProvider` |
| `Panel` / `PanelHeader` / `PanelToolbar` | Sidebar panels | Каркас панелей с заголовком «плашкой» (uppercase 11px) и тулбаром |
| `Tabs` / `TabStrip` | Вкладки редактора | Chrome-вкладки процессов, inline-вкладки стейджей |
| `TreeView` | Sidebar tree | Деревья процессов, адаптеров, прав, секций |
| `Breadcrumbs` | Хлебные крошки | Над редактором: Contour › Catalog › Process › Stage |

### Дизайн-токены (VS Code dark+)

Палитра выровнена с `VS Code dark+`. Ключевые переменные:

- `--color-bg-editor: #1e1e1e` — фон редактора (как в VS Code)
- `--color-bg-sidebar: #252526` — фон sidebar / activity bar
- `--color-bg-activitybar: #252526` — (раньше было #333333, выровнено с sidebar по стандарту VS Code 2024+)
- `--color-statusbar: #007acc` — акцентный синий VS Code
- `--color-accent: #007acc`
- `--color-focus-ring: #007acc`
- `--font-mono: Consolas, "Courier New", monospace` — шрифт VS Code
- `--font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- Базовый размер шрифта: `13px`

Файлы токенов:
- `src/styles/tokens.css` — три уровня: Primitive (raw palette), Semantic (role-based), Component (widget sizes)
- `src/styles/globals.css` — базовые селекторы + VS Code scrollbars + hover-стили
- `src/lib/design-tokens.ts` — type-safe обёртка `t.color.bg.editor`, `t.space[4]`, `t.z.modal` и т.д.

**Правило:** никаких hex-цветов в `.tsx`. Только токены. Нет `onMouseEnter/Leave` для hover-bg — только CSS `:hover` и `data-*` атрибуты.

## Технологический стек

| Слой | Выбор |
|------|-------|
| Сборка | Vite 8 |
| Фреймворк | React 19 + TypeScript 6 |
| Стили | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Роутер | `react-router-dom` v7 |
| Иконки | `lucide-react` |
| WebSocket | `@theborusik/ws` + `@theborusik/ws-react` (типизированный request/response) |
| Диаграммы | `@xyflow/react` (React Flow) |
| Редактор кода | `@monaco-editor/react` (тема `wfm-dark`, регистрируется один раз в `MonacoProvider`) |
| Layout | `react-resizable-panels` + кастомные `resize-handle-h` / `resize-handle-v` (VS Code-style) |

## Структура проекта

```
src/
  components/
    layout/          # «Chrome» приложения: Shell, TabBar, ActivityBar, StatusBar,
                     # ProblemsPanel, CommandPalette, QuickOpen, AuthGate
    ui/              # UI-kit (только презентация, без бизнес-логики):
                     # Panel, PanelHeader, PanelToolbar, Modal, Tabs, TreeView,
                     # DataTable, CodeEditor, IconButton, Button, ContextMenu,
                     # Breadcrumbs, EmptyState, VirtualList, Tooltip, Kbd и др.
  pages/
    command-tester/
    configurator/
    crud-editor/
    db-explorer/
    projects/
    system/
    viewer/
  hooks/             # Общие хуки (useAsync, useHotkey, useClickOutside,
                     # useDebouncedValue, useFocusTrap, useReturnFocus,
                     # useLocalStorageState)
  lib/
    ws-api.ts        # HubWsApi — типизированная обёртка над WebSocket
    ws-api-models.ts # Общие DTO-типы
    design-tokens.ts # Type-safe обёртка над CSS custom properties
    stage-colors.ts  # Единый источник цветов стейджей WFM
    commands/        # Реестр команд для Command Palette
  providers/         # React-провайдеры (ContourProvider, ToastProvider,
                     # NotificationsProvider, ProblemsProvider, NavigationProvider,
                     # ContourWebSocketProvider)
  styles/
    globals.css      # Базовые селекторы + VS Code scrollbar + hover-стили UI-kit
    tokens.css       # Design tokens (primitive / semantic / component)
```

## Ключевые абстракции

### WebSocket API (`src/lib/ws-api.ts`)

- **`HubWsApi`** — центральный типизированный клиент. Все взаимодействия с сервером проходят через этот класс.
- **`useContourApi()`** — хук, возвращающий `HubWsApi | null` для **активного** контура.
  - Возвращает закешированный API при временных разрывах соединения, чтобы компоненты не размонтировались.
  - Потребители сами обрабатывают ошибку "WebSocket not connected"; оверлеи блокируют UI при обрывах.
- **`useContourAuth()`** — аналогично, но для неавторизованных вызовов (только login/logout).

### Multi-Contour

- `ContourProvider` оборачивает всё приложение.
- Каждая вкладка `TabBar` поддерживает свой инстанс `AuthWebSocket` через `ContourWebSocketProvider`.
- `Shell` рендерит вкладки и роуты. Секции, которые пользователь посещал, остаются смонтированными в DOM и прячутся через `display: none` — чтобы сохранить React-state (открытые вкладки, скролл, содержимое редакторов).

### Стек провайдеров (`src/App.tsx`)

Порядок важен (снаружи → внутрь):

```
ToastProvider
  NotificationsProvider
    ProblemsProvider
      ConfirmProvider
        MonacoProvider
          ContourProvider
            Shell
```

## Соглашения по коду

### TypeScript

- **Псевдоним путей**: `@/` ведёт в `src/`. Всегда используй `@/components/ui/Button`, никогда относительные `../../`.
- `verbatimModuleSyntax: true` — используй `import type { X }` для type-only импортов.
- `noUnusedLocals: true`, `noUnusedParameters: true` — не оставляй неиспользуемые переменные.
- Target: ES2023, JSX: `react-jsx`.

### React

- Только функциональные компоненты.
- Хуки именуются по паттерну `use[Name]`.
- Провайдеры живут в `src/providers/`.

### Стили и дизайн-система

- **Tailwind CSS 4** utility classes.
- **Никаких hex-цветов в `.tsx`** — только токены через `t.color.*` или CSS-переменные.
- **Никаких `style={{}}` с повторяющимися magic-числами** (padding, margin, gap, font). Допустимо `style={{ gridTemplateColumns: ... }}` — только для уникальных layout-параметров.
- **Никаких `onMouseEnter / onMouseLeave`** для hover-фона — используй CSS `:hover` и data-атрибуты (`[data-active]`, `[aria-selected]`, `[data-dirty]`).
- UI-kit не знает про WFM-доменные модели — только базовые props.
- Один overlay-менеджер (`Modal`, `ContextMenu`, `CommandPalette`) — общий z-index стек.

### Слой API

- Все WFM-команды строго типизированы через `ws-api-models.ts`.
- Предпочитай методы `HubWsApi` прямым вызовам `ws.sendRequest`.
- TTL по умолчанию: `00:00:45`; переопределяй явно для долгих операций (например, `00:02:00` для загрузки ветки).

### Monaco Editor

- **Один бутстрап Monaco** на всё приложение — в `MonacoProvider`.
- **Одна тема** `wfm-dark` (удалена `hub-dark`).
- Регистрация темы и `setupWfmCSharp` — один раз при старте.
- `automaticLayout: true` по умолчанию.
- `fontFamily: var(--font-mono)`.

## Глобальные хоткеи (VS Code-style)

| Комбинация | Действие |
|------------|----------|
| `Ctrl/Cmd+Shift+P` | Command Palette — список команд |
| `Ctrl/Cmd+P` | Quick Open — быстрый переход к процессу |
| `Ctrl/Cmd+Shift+M` | Toggle Problems Panel |
| `Ctrl/Cmd+S` | Сохранить процесс (в Configurator) |
| `Ctrl/Cmd+W` | Закрыть вкладку контура |
| `Esc` | Закрыть модалку / снять выделение |

## Сборка и разработка

```bash
npm install
npm run dev      # Vite dev-сервер
npm run build    # tsc + vite build
npm run lint     # ESLint
```

## Важные замечания

- **Не мутируй** состояние WebSocket вне хуков `@theborusik/ws-react`.
- **Не используй** глубокие относительные пути `../..`; используй алиасы `@/`.
- При добавлении новых WFM-команд добавляй типы в `ws-api-models.ts` и методы в `HubWsApi`.
- Monaco-редактор требует `MonacoProvider` в корне; не создавай редакторы вне него.
- Приложение использует `react-router-dom` v7; при добавлении роутов проверяй API v7.
- При работе с UI-kit следуй VS Code-паттернам: компактные размеры (`--panel-header-height: 28px`, `--button-height: 26px`), минимальные скругления (`--radius-sm: 2px`), hover через CSS, focus-ring на интерактивных элементах.
