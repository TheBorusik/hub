# ТЗ: UI/UX-редизайн Hub в духе VS Code и перевод на компонентную библиотеку

> Версия: 1.0. Источник — полный аудит `hub/src` (85 `.tsx`-файлов).
> Документ описывает цели, инвентарь переиспользуемых компонентов, дизайн-токены,
> этапы работ и критерии приёмки. Все пункты привязаны к конкретным файлам
> текущей кодовой базы.

---

## 0. Контекст и термины

**Hub** — клиентский SPA (React + TS + Vite + Tailwind v4 + Monaco), работает как
«VS Code-подобная» оболочка над WFM: Configurator, Viewer, Command-Tester,
CRUD-Editor, System, Projects, DB-Explorer.

Термины:

- **Секция** — верхний раздел Activity Bar (`configurator`, `viewer`,
  `command-tester`, `crud-editor`, `system`, `projects`, `db-explorer`).
- **Контур** — вкладка верхнего уровня (`TabBar`): подключение к конкретному
  бэкенду.
- **Панель** — логический блок внутри секции (левая/правая/нижняя).
- **Токен** — CSS-переменная дизайн-системы.

---

## 1. Цель

Привести UI Hub в соответствие с эстетикой и паттернами VS Code, устранить дубли
вёрстки и логики, вывести общие компоненты в единый UI-kit
(`src/components/ui/*`), навести порядок с дизайн-токенами и стайлингом.

**Результат проекта:**

- Единая дизайн-система (tokens + UI kit).
- ≥ 80% inline-стилей заменены на `className` / компоненты.
- 0 дублирующихся компонентов (`ConfirmDialog`, `STAGE_TYPE_COLORS` и т.п.).
- Глобальный Command Palette / Quick Open / Problems panel.
- Уменьшение размера «God-components» ≥ 2×.

---

## 2. Вне рамок (non-goals)

- Переход на другой фреймворк/билдер.
- Смена Monaco на альтернативу.
- Поддержка светлой темы и тем пользователя (оставить задел в токенах, но не
  реализовывать).
- i18n-внедрение на все строки (только подготовка инфраструктуры).
- Изменение серверных контрактов WFM / Hub API.

---

## 3. Текущее состояние (краткое резюме аудита)

Проблемы, которые закрывает ТЗ:

| №   | Проблема                                                                                                      | Где                                                                                                   | Критичность |
| --- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------- |
| P1  | Два `ConfirmDialog` с разным API                                                                              | `components/layout/ConfirmDialog.tsx` и `pages/configurator/components/ConfirmDialog.tsx`             | Высокая     |
| P2  | `STAGE_TYPE_COLORS` продублирован в 5 файлах; `lib/stage-colors.ts` не используется                           | `StageEditor`, `ProcessEditor`, `ProcessDetailPanel`, `AddStageDialog`, `StageList`                   | Высокая     |
| P3  | Две Monaco-темы (`wfm-dark`, `hub-dark`)                                                                      | `CodePreview`, `JsonEditor`, `StageEditor`, `ModelClassDialog`                                        | Средняя     |
| P4  | ~25 дублей «заголовка панели» (padding 4px 12px + borderBottom + sidebar bg + uppercase)                      | см. аудит                                                                                             | Высокая     |
| P5  | 14+ модалок с собственным backdrop / zIndex (1000, 10000, 11000)                                              | все `*Dialog.tsx`                                                                                     | Высокая     |
| P6  | 4 независимых реализации Tabs                                                                                 | `TabBar`, `ProcessEditor`, `ProcessListPanel`, `AddStageDialog`                                       | Средняя     |
| P7  | 4 независимых реализации TreeView                                                                             | `ProcessTree`, `AdapterTree`, `PermissionsPanel`, `SystemTreeNav`, `SectionsPanel`                    | Средняя     |
| P8  | Hover-фон через `onMouseEnter/onMouseLeave` вместо CSS `:hover`                                               | 15+ файлов                                                                                            | Низкая      |
| P9  | Magic-numbers padding/gap/fontSize inline                                                                     | весь `src/`                                                                                           | Средняя     |
| P10 | Захардкоженные hex-цвета вне токенов (#4ec9b0, #f14c4c, #c62828, #F6511D и др.)                               | весь `src/`                                                                                           | Средняя     |
| P11 | God-components: `GlobalModelsPanel` 1078, `ConfigurationPanel` 1058, `ProcessEditor` 1002                     | —                                                                                                     | Высокая     |
| P12 | Нет глобального `Problems`, Outline, Breadcrumbs, Command Palette, Context Menu                               | —                                                                                                     | Средняя     |
| P13 | Нет виртуализации списков (ProcessListPanel, GlobalModelsPanel, Permissions)                                  | —                                                                                                     | Средняя     |
| P14 | Нет focus-trap / `role=dialog` / возврата фокуса в модалках                                                   | все `*Dialog.tsx`                                                                                     | Средняя     |
| P15 | Нет индикатора «dirty» на вкладках TabBar / ProcessEditor                                                     | —                                                                                                     | Низкая      |
| P16 | Дубли `useEffect` для click-outside, escape, debounce, async-load                                             | 40+ компонентов                                                                                       | Средняя     |

---

## 4. Архитектурные решения

### 4.1. Папочная структура

```
src/
  components/
    ui/                   # новый UI kit (только презентация, без бизнес-логики)
      Panel/
      PanelHeader/
      PanelToolbar/
      Modal/
      Tabs/
      TreeView/
      DataTable/
      CodeEditor/
      IconButton/
      Button/
      FormRow/
      TagInput/
      Toggle/
      SectionGroup/
      StatusDot/
      CountBadge/
      Breadcrumbs/
      ContextMenu/
      EmptyState/
      VirtualList/
      Tooltip/
      Kbd/
    layout/               # «chrome» приложения
      Shell/
      TabBar/
      ActivityBar/
      StatusBar/
      ProblemsPanel/      # новый — глобальный
      CommandPalette/     # новый — глобальный
  hooks/                  # новый слой хуков
    useClickOutside.ts
    useHotkey.ts
    useDebouncedValue.ts
    useConfirm.ts
    useAsync.ts
    useLocalStorageState.ts
    useFocusTrap.ts
    useReturnFocus.ts
  lib/
    stage-colors.ts       # единственный источник цветов стейджей
    design-tokens.ts      # type-safe обёртка над CSS-переменными
    commands/             # реестр команд (палитра)
      registry.ts
      types.ts
  pages/                  # прежнее расположение страниц / доменных компонентов
  providers/              # прежние провайдеры
  styles/
    globals.css           # токены + базовые селекторы
    tokens.css            # отдельно — токены (primitive / semantic / component)
```

### 4.2. Правила

- **Никаких hex-цветов в `.tsx`** (ESLint rule `no-restricted-syntax` на
  `Literal[value=/^#[0-9a-fA-F]{3,8}$/]`). Только токены.
- **Никаких `style={{}}` с повторяющимися магик-числами** (padding, margin,
  font, gap) в новых/тронутых файлах. Допустимо `style={{ gridTemplateColumns: ... }}`
  — только для уникальных layout-параметров.
- **Не более одного Monaco-бутстрапа на всё приложение** (в `main.tsx` или
  `providers/MonacoProvider.tsx`).
- **UI-kit не знает про WFM-доменные модели**. Только базовые props.
- **Один overlay-менеджер** (`Modal`, `ContextMenu`, `CommandPalette` — общий
  z-index-стек).

---

## 5. Дизайн-токены

### 5.1. Файл `styles/tokens.css`

Три уровня:

**5.1.1. Primitive** (не использовать напрямую в компонентах)

```
--gray-0 … --gray-1000
--blue-50 … --blue-700
--red-*, --green-*, --yellow-*, --magenta-*, --cyan-*
```

**5.1.2. Semantic**

```
--color-bg-app
--color-bg-activitybar
--color-bg-sidebar
--color-bg-panel
--color-bg-editor
--color-bg-titlebar
--color-bg-statusbar
--color-bg-toolbar
--color-bg-hover
--color-bg-selected
--color-bg-tab-active
--color-bg-tab-inactive
--color-bg-backdrop               # rgba(0,0,0,0.45)
--color-bg-accent-soft            # rgba(0,122,204,0.1)

--color-text-primary
--color-text-active
--color-text-muted
--color-text-inverse
--color-text-link

--color-border
--color-border-strong
--color-focus-ring

--color-accent
--color-danger
--color-warning
--color-success
--color-info

--color-stage-start
--color-stage-crud
--color-stage-command
--color-stage-transform
--color-stage-event
--color-stage-substart
--color-stage-final
--color-stage-unknown

--color-syntax-*    # для Monaco-темы, если потребуется расширение
```

**5.1.3. Component**

```
--panel-header-height: 28px
--panel-header-padding: 4px 12px
--panel-header-font-size: 11px
--panel-header-letter-spacing: 0.04em
--toolbar-height: 30px
--toolbar-padding: 4px 8px
--activitybar-width: 48px
--statusbar-height: 22px
--tab-height: 35px
--subtab-height: 28px
--input-height: 24px
--button-height: 26px
--z-tabs: 10
--z-panel-toolbar: 20
--z-dropdown: 1000
--z-modal-backdrop: 5000
--z-modal: 5001
--z-context-menu: 6000
--z-command-palette: 7000
--z-tooltip: 8000
--z-toast: 9000
--radius-sm: 2px
--radius-md: 3px
--radius-lg: 6px
--space-0: 0
--space-1: 2px
--space-2: 4px
--space-3: 6px
--space-4: 8px
--space-5: 10px
--space-6: 12px
--space-8: 16px
--space-10: 20px
--space-12: 24px
--font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
--font-mono: "Consolas", "Courier New", monospace
--duration-fast: 120ms
--duration-base: 150ms
--shadow-elev-1: 0 4px 16px rgba(0,0,0,0.35)
--shadow-elev-2: 0 8px 32px rgba(0,0,0,0.55)
```

### 5.2. Тайп-сейф обёртка `lib/design-tokens.ts`

Экспортирует объект `t` с теми же ключами (для консумеров, которые не хотят
CSS-vars строкой):

```
t.color.text.primary      === "var(--color-text-primary)"
t.space[4]                === "var(--space-4)"
t.z.modal                 === "var(--z-modal)"
```

---

## 6. UI-kit: спецификация компонентов

Для каждого компонента — назначение, публичный API (props), что он заменяет в
текущем коде, критерии приёмки.

### 6.1. `<Panel>`

**Назначение:** каркас панели (левая/правая/вложенная). `flex-col h-full overflow-hidden`
+ опциональные `header`, `toolbar`, `footer`.

**Props:**

```ts
interface PanelProps {
  header?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  scroll?: "auto" | "y" | "none";        // default "auto"
  bg?: "sidebar" | "editor" | "panel";   // default "panel"
  className?: string;
  "data-testid"?: string;
}
```

**Заменяет:** ~25 мест ручной верстки `<div className="flex flex-col h-full overflow-hidden">`.

**DoD:** прошли миграцию `ProcessListPanel`, `ProcessDetailPanel`, `AdapterPanel`,
`SectionsPanel`, `TablesPanel`.

---

### 6.2. `<PanelHeader>`

**Назначение:** «плашка» заголовка (uppercase muted 11px) + иконка + бейдж +
actions.

**Props:**

```ts
interface PanelHeaderProps {
  title: string;                  // или ReactNode
  icon?: ReactNode;
  badge?: ReactNode;              // чаще всего <CountBadge>
  actions?: ReactNode;            // иконки справа
  hint?: string;                  // мелкий подзаголовок
  size?: "sm" | "md";             // default sm (11px)
  variant?: "plain" | "subtle";   // default subtle (с bg-sidebar + border-bottom)
}
```

**Заменяет:** 25 дублей (список в аудите).

**DoD:** в `CodePreview`, `RunProcessPanel` (2×), `ProcessListPanel`,
`GlobalModelsPanel`, `JsonEditor`, `ViewerPage`, `ProcessDetailPanel` header →
`<PanelHeader>`.

---

### 6.3. `<PanelToolbar>`

**Назначение:** панель-тулбар (высота `--toolbar-height`, горизонтальный flex,
gap, выравнивание).

**Props:**

```ts
interface PanelToolbarProps {
  left?: ReactNode;
  right?: ReactNode;      // группа IconButton справа
  children?: ReactNode;   // для кастомного layout
  dense?: boolean;        // ужимает padding
}
```

**Заменяет:** toolbar-и в `ProcessTree`, `PermissionsPanel`, `RolesPanel`,
`AdapterPanel`, `GlobalModelsPanel`, `TablesPanel`, `ErrorsTable`,
`SectionsPanel`, `ConfigurationPanel`.

---

### 6.4. `<Modal>` (с subcomponents)

**Назначение:** единственный способ показать модалку.

**Props:**

```ts
interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  dismissible?: boolean;     // backdrop click + Esc (default true)
  initialFocus?: RefObject<HTMLElement>;
  returnFocus?: boolean;     // default true
  "aria-label"?: string;
  children: ReactNode;
}

<Modal.Header icon title onClose />
<Modal.Body />
<Modal.Footer />             // flex-end gap — Cancel / Confirm
```

**Требования:**

- focus-trap (внутри модалки).
- `role="dialog"`, `aria-modal="true"`.
- Возврат фокуса на элемент-инициатор после закрытия.
- Единый z-index-стек (`--z-modal`).
- Единый backdrop-цвет (`--color-bg-backdrop`).

**Заменяет:** все `createPortal`-обёртки в 14 диалогах:
`ConfirmDialog` ×2, `UnsavedChangesDialog`, `CreateProcessDialog`,
`AddStageDialog`, `QuickPickDialog`, `UsingsDialog`, `ModelClassDialog`,
`CommitDialog`, `RestartDialog`, `RecordDialog`, `LineSettingsDialog`,
`PermissionDialog`, `RoleDialog`, `AssignPermissionDialog`,
`ErrorActionDialog`, `JsonViewerDialog`.

---

### 6.5. `<ConfirmDialog>` (единый)

**Действие:** удалить `pages/configurator/components/ConfirmDialog.tsx`,
оставить `components/ui/ConfirmDialog/` (мигрированный из
`components/layout/ConfirmDialog.tsx`).

**Props:** как сейчас в `layout/ConfirmDialog.tsx` + поверх `<Modal>`.

**DoD:** импорт одного `ConfirmDialog` из `@/components/ui/ConfirmDialog` по
всему проекту; grep `components/ConfirmDialog` — 0.

---

### 6.6. `<Tabs>` / `<TabStrip>`

**Назначение:** одна реализация вкладок под 4 существующих сценария.

**Props:**

```ts
interface TabsProps<T extends string> {
  items: Array<{
    id: T;
    label: ReactNode;
    icon?: ReactNode;
    badge?: ReactNode;
    dirty?: boolean;                // показывает • у лейбла
    closable?: boolean;
    onClose?: (id: T) => void;
    disabled?: boolean;
  }>;
  activeId: T;
  onChange: (id: T) => void;
  variant?: "chrome" | "inline" | "segmented";   // chrome = TabBar, inline = ProcessList's sub-tabs, segmented = new/clone
  align?: "start" | "stretch";                   // stretch для sub-tabs
  addon?: ReactNode;                             // например "+ New" или селектор
}
```

**Заменяет:** `TabBar`, subtabs в `ProcessListPanel`, subtabs в `AddStageDialog`,
tabs-список стейджей в `ProcessEditor`.

---

### 6.7. `<TreeView>`

**Назначение:** универсальное дерево.

**Props:**

```ts
interface TreeViewProps<T> {
  nodes: T[];
  getId: (node: T) => string;
  getLabel: (node: T) => ReactNode;
  getChildren: (node: T) => T[] | undefined;
  getIcon?: (node: T, expanded: boolean) => ReactNode;
  getBadge?: (node: T) => ReactNode;
  getContextMenu?: (node: T) => ContextMenuItem[];
  isSelectable?: (node: T) => boolean;

  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId?: string | null;
  onSelect?: (node: T) => void;

  onExpandAll?: () => void;
  onCollapseAll?: () => void;

  dnd?: {
    canDrag: (node: T) => boolean;
    canDrop: (source: T, target: T) => boolean;
    onDrop: (source: T, target: T) => void;
  };

  virtualized?: boolean;    // для больших деревьев
  keyboard?: boolean;       // стрелки / enter / Home / End (default true)
}
```

**Заменяет:** `ProcessTree`, `AdapterTree`, `PermissionsPanel` (tree-часть),
`SectionsPanel`, `SystemTreeNav`.

---

### 6.8. `<DataTable>`

**Назначение:** табличное отображение с сортировкой, селекцией, сжатием колонок,
пустым состоянием.

**Props:**

```ts
interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  width?: number | string;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  rows: T[];
  getRowId: (row: T) => string | number;
  columns: DataTableColumn<T>[];
  selection?: {
    selected: Set<string | number>;
    onToggle: (id: string | number) => void;
    onToggleAll: () => void;
  };
  sort?: { columnId: string; dir: "asc" | "desc" };
  onSortChange?: (s: { columnId: string; dir: "asc" | "desc" }) => void;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  loading?: boolean;
  virtualized?: boolean;
}
```

**Заменяет:** `crud-editor/components/DataTable.tsx`, `ErrorsTable`,
`HealthTable`, `TablesPanel`, списочные части `ProcessListPanel`.

---

### 6.9. `<CodeEditor>` (Monaco обёртка)

**Назначение:** единственный способ вставить Monaco; тема, шрифт, опции и
markers — централизованы.

**Props:**

```ts
interface CodeEditorProps {
  value: string;
  language: "csharp" | "json" | "plaintext" | "markdown";
  readOnly?: boolean;
  path?: string;                          // inmemory путь
  onChange?: (value: string) => void;
  onMount?: (api: CodeEditorApi) => void;
  markers?: DiagnosticModel[];            // применяются автоматически
  minimap?: boolean;
  height?: string | number;
  options?: Partial<MonacoOptions>;       // для редких кейсов
  wfm?: {                                 // WFM-специфичные расширения
    enableWfmCSharp?: boolean;
    stageNames?: string[];
    currentStageName?: string;
    processResultName?: string;
    actions?: StageEditorActionCallbacks;
  };
}

interface CodeEditorApi {
  focus(): void;
  revealPosition(line: number, column: number): void;
  getSelection(): { start: Pos; end: Pos } | null;
  insertTextAtCursor(text: string): void;
}
```

**Требования:**

- Тема `wfm-dark` регистрируется **один раз** в `MonacoProvider` (в `main.tsx`).
- Удалить `hub-dark`.
- `automaticLayout: true` — по умолчанию.
- `fontFamily: var(--font-mono)` — как опция-строка.

**Заменяет:** `JsonEditor` (оставить тонкую обёртку), эдиторы внутри
`CodePreview`, `StageEditor`, `ModelClassDialog`, `GlobalModelsPanel`.

---

### 6.10. `<ProblemsPanel>` (глобальная)

**Назначение:** нижний раздел Shell с проблемами активной секции (VS Code-style).

**Источник:** pub-sub через `ProblemsProvider` — каждый компонент публикует свои
диагностики с owner-ключом; `ProblemsPanel` показывает сводку.

**Props:**

```ts
interface ProblemsPanelProps {
  open: boolean;
  onToggle: () => void;
  height?: number;        // с resizing через <ResizeHandle>
}
```

**Содержит:** список `DiagnosticModel` с группировкой по owner, кликом —
навигация (если owner умеет — реализует `ProblemsNavigator`).

**Заменяет:** встроенный нижний блок в `CodePreview` (строки 277-335),
аналогичные куски в `GlobalModelsPanel` и `StageEditor`.

---

### 6.11. `<CommandPalette>` (глобальная)

**Назначение:** `Ctrl+Shift+P` — список команд; `Ctrl+P` — quick open процесса.

**Источник команд:** `lib/commands/registry.ts`:

```ts
interface Command {
  id: string;
  title: string;
  category?: string;
  shortcut?: string;
  when?: () => boolean;      // условие видимости
  run: () => void | Promise<void>;
}
```

**Начальный набор команд:**

- `workbench.action.openProcess` (Ctrl+P)
- `workbench.action.showCommands` (Ctrl+Shift+P)
- `workbench.action.toggleProblems`
- `workbench.action.switchSection.configurator|viewer|…`
- `workbench.action.switchContour`
- `configurator.saveProcess` (Ctrl+S)
- `configurator.validateProcess`
- `configurator.formatCode`
- `configurator.openCodeView` / `openDiagramView` / `openDiffView` / `openRunView`
- `viewer.refresh`
- `viewer.deleteSelected`
- `viewer.moveSelected`

Компонент собственно рендера — поверх `<Modal>` + `QuickPickDialog`-логика.

**Заменяет:** локальный вызов `QuickPickDialog` в `ProcessEditor` (расширяет его
глобально).

---

### 6.12. `<ContextMenu>`

**Props:**

```ts
interface ContextMenuItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
  onClick?: () => void;
}

function useContextMenu(): {
  open: (e: MouseEvent, items: ContextMenuItem[]) => void;
  close: () => void;
};
```

**Применить в:** `ProcessTree` (open / rename / delete), `ProcessListPanel`
(open / delete / move / copy id), `AdapterTree` (open / copy),
`GlobalModelsPanel` (new HELPER / MODEL / CRUD, delete).

---

### 6.13. Кнопки и формы (мини-компоненты)

```
<Button variant="primary|secondary|ghost|danger" size="sm|md" icon={...} busy />
<IconButton icon tooltip variant size disabled busy />
<CloseButton onClick />          // <X size=16> в IconButton ghost
<FormRow label hint error>{input}</FormRow>
<Toggle checked onChange size="sm|md" />
<TagInput value={string[]} onChange placeholder />
<Breadcrumbs items={BreadcrumbItem[]} />
<StatusDot tone="ok|warn|err|info|muted" size={8|10} label />
<CountBadge value color="accent|danger|muted" />
<SectionGroup icon label hint count collapsed onToggle>{children}</SectionGroup>
<EmptyState icon title hint action />
<Kbd>Ctrl+S</Kbd>
<Tooltip content>{children}</Tooltip>
<LoadMoreRow onClick loading loaded total />
<MassActionBar selectedCount onClear actions={ReactNode} />
<VirtualList items height getItem />
<ResizeHandle direction="horizontal|vertical" />   // уже есть
```

**Acceptance:** импорты из одного места: `@/components/ui`.

---

## 7. Хуки

```
useClickOutside(ref, handler, enabled)
useHotkey(combo, handler, { scope, preventDefault })
useDebouncedValue(value, delay)
useConfirm(): (opts) => Promise<boolean>
useAsync<T>(fn, deps): { loading, data, error, reload }
useLocalStorageState<T>(key, initial, { version, migrate })
useFocusTrap(ref, enabled)
useReturnFocus(enabled)
```

**Заменяют:** рукописные `useEffect` для click-outside (`ProcessFiltersPanel`,
`ConfigurationPanel`, `GlobalModelsPanel`), escape-handler (~15 мест), debounce в
9 search-поисках, ручной `useState<ConfirmState>` в `ProcessListPanel`.

---

## 8. Темы и Monaco

### 8.1. Одна тема `wfm-dark`

Регистрация — в `providers/MonacoProvider.tsx`:

- `editor.background` = `--color-bg-editor`.
- Цвета синтаксиса вычитываются из токенов (`--color-syntax-*`).
- Дополнительно — правила для WFM C# (то, что уже в `setupWfmCSharp`).

### 8.2. Удалить дубли

- Удалить `hub-dark` из `JsonEditor`, `ModelClassDialog`.
- `setupWfmCSharp` вызывать один раз при старте.
- `loader.init()` — один раз.

---

## 9. Рефакторинг «God-components»

### 9.1. `GlobalModelsPanel.tsx` (1078 → цель ≤ 300)

Разбить на:

- `GlobalModels/ModelsTree.tsx`
- `GlobalModels/ModelEditor.tsx` (использует `<CodeEditor>`)
- `GlobalModels/ModelsToolbar.tsx`
- `GlobalModels/ModelsProblems.tsx`
- `GlobalModels/useGlobalModelsStore.ts` (zustand или reducer)
- `GlobalModels/CommitDialog.tsx` (переиспользует общий CommitDialog)

### 9.2. `ConfigurationPanel.tsx` (1058 → цель ≤ 350)

- `AdapterTypesTree.tsx`
- `ConfigTabs.tsx` (через `<Tabs>`)
- `ConfigSectionEditor.tsx`
- `AdapterOverlays.tsx` (через `<Modal>`)
- `useAdapterConfigStore.ts`

### 9.3. `ProcessEditor.tsx` (1002 → цель ≤ 350)

- `ProcessToolbar.tsx`
- `ProcessStageTabs.tsx` (через `<Tabs>`)
- `ProcessSpecialView.tsx` (code / diff / run / diagram / global-models switch)
- `ProcessDialogs.tsx`
- `useProcessEditorStore.ts`

### 9.4. `StageEditor.tsx` (766 → цель ≤ 300)

- `StageHeader.tsx`
- `StageProperties.tsx`
- `StageCodePanels.tsx` (Panel / ResizeHandle вокруг `<CodeEditor>`)

---

## 10. Chrome и навигация

### 10.1. `TabBar`

- Индикатор `dirty` (`•` перед именем, серый / акцентный).
- Drag & drop порядка вкладок (опционально, с фичефлагом).
- Middle-click — закрыть вкладку.
- Context menu: Close, Close Others, Close All, Copy Name.

### 10.2. Breadcrumbs (новое)

Показываются над активной зоной редактора:

- Configurator: `Contour › Catalog › Subcatalog › ProcessName › Stage`.
- Viewer: `Contour › Tab(Completed|Manual|Idle) › #ProcessId ProcessName`.
- CRUD: `Contour › Model › Record`.

Клик по сегменту — навигация; у последнего — dropdown со списком сиблингов.

### 10.3. Outline (новое, опционально по фазам)

Правая колонка Configurator — список стейджей с цветными бейджами и индикатором
ошибок. По клику — фокус на стейдж.

### 10.4. ActivityBar

- Иконки `focus-ring` (`--color-focus-ring`) для клавиатурной навигации.
- Tooltip `<Tooltip>` с комбинацией клавиш.
- «Badge с числом» унифицирован через `<CountBadge>` (сейчас в
  `NotificationsButton` inline).

### 10.5. StatusBar

- Унифицированные сегменты: `<StatusBar.Segment icon label tone onClick>`.
- Секции: WS-status, Contour, Branch, Process save-state, Problems count.

---

## 11. Поведенческие стандарты

### 11.1. Фокус и клавиатура

- Во всех модалках — focus-trap и возврат фокуса.
- В `<TreeView>`: стрелки, Home, End, Enter, F2 (rename), Delete.
- Глобальные хоткеи: `Ctrl+P`, `Ctrl+Shift+P`, `Ctrl+S`, `Ctrl+W` (close tab),
  `Ctrl+Shift+M` (Problems), `Esc` (close modal / clear selection).

### 11.2. Hover и состояния

- Заменить `onMouseEnter / Leave`-стилизацию на CSS `:hover` + `[data-active]` /
  `[aria-selected=true]` / `[data-dirty=true]`.

### 11.3. Пустые состояния

- Единый `<EmptyState>` с иконкой, заголовком и подсказкой. Никаких inline «Нет
  processes» в div'ах.

### 11.4. Тосты и нотификации

- `ToastProvider` остаётся, но push-API дополняется методом `progress(id, …)` и
  используется одинаково во всех длинных действиях (delete, move, commit).
- В `NotificationsProvider` вынесена единая история с типами событий.

---

## 12. Доступность (a11y) — минимум

- `role="dialog"` + `aria-modal` + `aria-labelledby` на всех модалках.
- `role="tablist" / "tab" / "tabpanel"` в `<Tabs>`.
- `role="tree" / "treeitem"` + `aria-expanded` в `<TreeView>`.
- `aria-live="polite"` в `<Toast>`.
- Минимальная клавиатурная полноценность в `<TreeView>`, `<Tabs>`, `<DataTable>`.
- Фокус-ринг на всех интерактивных элементах (не `outline:none` без замены).

---

## 13. Производительность

- `<VirtualList>` в `ProcessListPanel`, `GlobalModelsPanel`, `PermissionsPanel`
  при N > 500.
- Debounce search (≥ 200 мс) через `useDebouncedValue`.
- `memo` / `useCallback` в `<TreeView>`-узлах.
- Один `<CodeEditor>` shared worker на всё приложение (конфиг
  `@monaco-editor/loader`).

---

## 14. ESLint / конвенции

Добавить правила:

- **no-raw-hex**: запрет hex-цветов в `style` и в `className` (JSX-литералы).
  Регексп: `#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})`.
- **no-magic-spacing**: запрет числовых литералов в
  `padding|margin|gap|top|bottom|left|right|width|height` внутри `style={{}}`
  (белый список: 0, 100%, auto, `calc(...)`; остальное — токены).
- **no-duplicate-confirm-dialog**: запрет импорта
  `pages/configurator/components/ConfirmDialog`.
- **no-monaco-theme-define**: запрет `monaco.editor.defineTheme` вне
  `MonacoProvider`.

---

## 15. Поэтапный план работ

Разделить проект на **6 спринтов**, каждый — самостоятельная ценность и не
ломает существующего UX.

### Sprint 1. Tokens & Chrome (основание)

1. `styles/tokens.css`, `lib/design-tokens.ts`, миграция `globals.css` на новые
   токены.
2. `components/ui/Panel`, `PanelHeader`, `PanelToolbar`, `EmptyState`,
   `StatusDot`, `CountBadge`, `Tooltip`.
3. Хуки: `useClickOutside`, `useHotkey`, `useDebouncedValue`,
   `useLocalStorageState`.
4. Миграция 5 самых простых панелей на `PanelHeader` (CodePreview,
   RunProcessPanel ×2, JsonEditor, ProcessListPanel).
5. Импорт `stageColors` из `lib/stage-colors.ts` во всех 5 дублях.

**Критерии приёмки:**

- Grep `"#5CADD5"|"#F6511D"|"seagreen"|"#0FD334"` в `src/` — только в
  `lib/stage-colors.ts` и `styles/tokens.css`.
- ≥ 5 панелей используют `<PanelHeader>`.
- `hub-dark` удалена; `wfm-dark` регистрируется один раз.
- Внешний UX не изменился (скриншот-тесты / ручное прохождение).

### Sprint 2. Modal unification

1. `<Modal>`, `<Modal.Header>`, `<Modal.Body>`, `<Modal.Footer>`.
2. `useConfirm()`, `useFocusTrap`, `useReturnFocus`.
3. Миграция модалок (по одной, PR на каждую): `UsingsDialog` →
   `CreateProcessDialog` → `AddStageDialog` → `ModelClassDialog` →
   `CommitDialog` → `RestartDialog` → `RecordDialog` → `LineSettingsDialog` →
   `PermissionDialog` → `RoleDialog` → `AssignPermissionDialog` →
   `ErrorActionDialog` → `JsonViewerDialog` → `UnsavedChangesDialog` →
   `QuickPickDialog`.
4. Удаление `pages/configurator/components/ConfirmDialog.tsx`, замена импортов.

**Критерии приёмки:**

- Grep `createPortal` — только в `@/components/ui/Modal` и
  `@/components/layout/*` (Toast / Notifications / ContextMenu).
- Все модалки имеют focus-trap и `role="dialog"`.
- Один z-index-стек через `--z-*`.

### Sprint 3. Tabs, Tree, Buttons

1. `<Tabs>`, `<Button>`, `<IconButton>`, `<FormRow>`, `<Toggle>`, `<TagInput>`,
   `<SectionGroup>`.
2. Миграция `TabBar`, subtabs `ProcessListPanel`, subtabs `AddStageDialog`, tabs
   в `ProcessEditor`.
3. `<TreeView>` + миграция `ProcessTree` и `AdapterTree` (самые простые).
4. Замена `onMouseEnter / Leave`-hover-стилей в тронутых файлах.

**Критерии приёмки:**

- 4 реализации табов → 1.
- 2 дерева используют `<TreeView>` (остальные — в Sprint 5).

### Sprint 4. CodeEditor, Problems panel, Command Palette

1. `<CodeEditor>` с единым бутстрапом Monaco.
2. `<ProblemsPanel>` + `ProblemsProvider`.
3. Реестр команд `lib/commands/registry.ts`, `<CommandPalette>`
   (`Ctrl+Shift+P`, `Ctrl+P`).
4. Интеграция CodeEditor → CodePreview, StageEditor, ModelClassDialog,
   JsonEditor (последний — тонкая обёртка).
5. Диагностики процесса публикуются в `ProblemsProvider`; глобальный Problems
   panel показывает их.

**Критерии приёмки:**

- `Ctrl+Shift+P` работает везде; список команд содержит ≥ 10 команд.
- `Ctrl+P` открывает Quick Open процесса по имени.
- Одна Monaco-тема, `loader.init()` один раз.

### Sprint 5. TreeView / DataTable / Permissions / Configuration

1. Миграция `PermissionsPanel`, `SystemTreeNav`, `SectionsPanel` на `<TreeView>`.
2. `<DataTable>` + миграция `ErrorsTable`, `HealthTable`, `TablesPanel`,
   `crud-editor/DataTable`.
3. `<ContextMenu>` + применение в `ProcessTree`, `ProcessListPanel`,
   `AdapterTree`, `GlobalModelsPanel`.
4. Разбиение `GlobalModelsPanel` и `ConfigurationPanel` по 9.1–9.2.

**Критерии приёмки:**

- 0 «ручных» tree-реализаций.
- `GlobalModelsPanel` ≤ 300 строк, `ConfigurationPanel` ≤ 350.

### Sprint 6. Breadcrumbs, Outline, Dirty indicator, VirtualList

1. `<Breadcrumbs>` в Configurator, Viewer, CRUD.
2. Outline для Configurator.
3. Dirty-индикатор в `TabBar` и в `<Tabs>`-стейджей.
4. `<VirtualList>` в `ProcessListPanel`, `GlobalModelsPanel`, `PermissionsPanel`.
5. Разбиение `ProcessEditor` и `StageEditor` (9.3–9.4).

**Критерии приёмки:**

- Прокрутка 10 000 процессов во Viewer без заметных лагов.
- Dirty-индикатор виден на всех уровнях вкладок.

---

## 16. Definition of Done (общий для каждой PR)

1. Не добавлено новых inline hex-цветов.
2. Не добавлено новых magic-padding / gap в `style={{}}`.
3. Новый / тронутый JSX не содержит `onMouseEnter / Leave` для hover-bg.
4. Линт проходит без новых warning-ов.
5. Build (`vite build`) проходит.
6. TS проходит без `any` в новых файлах.
7. Затронутые панели / диалоги ручно проверены в каждом разделе (Configurator,
   Viewer, Command-Tester, CRUD-Editor, System, Projects, DB-Explorer).
8. Скриншот «до / после» (опционально, но желательно в каждом PR).

---

## 17. Метрики успеха

| Метрика                                          | До                     | Цель                                                                  |
| ------------------------------------------------ | ---------------------- | --------------------------------------------------------------------- |
| Кол-во строк в `GlobalModelsPanel.tsx`           | 1078                   | ≤ 300                                                                 |
| Кол-во строк в `ConfigurationPanel.tsx`          | 1058                   | ≤ 350                                                                 |
| Кол-во строк в `ProcessEditor.tsx`               | 1002                   | ≤ 350                                                                 |
| Кол-во `ConfirmDialog`                           | 2                      | 1                                                                     |
| Кол-во дублей `STAGE_TYPE_COLORS`                | ≥ 5                    | 1                                                                     |
| Кол-во Monaco-тем                                | 2                      | 1                                                                     |
| Кол-во `createPortal`                            | 11 файлов              | 3 (Modal / ContextMenu / Toast)                                       |
| Кол-во Tabs-реализаций                           | 4                      | 1                                                                     |
| Кол-во Tree-реализаций                           | 4                      | 1                                                                     |
| Grep `onMouseEnter=.*background`                 | 20+                    | 0                                                                     |
| Grep `#[0-9a-fA-F]{3,6}` в `.tsx`                | ~150                   | ≤ 5 (только `stage-colors.ts` при необходимости)                      |
| Global `Ctrl+Shift+P` / `Ctrl+P`                 | нет                    | есть                                                                  |
| `Problems` панель                                | встроена в CodePreview | глобальная                                                            |
| Focus-trap в модалках                            | нет                    | есть                                                                  |

---

## 18. Риски и смягчение

| Риск                                                          | Смягчение                                                                          |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Регрессии UX на больших панелях                               | Миграция по одной панели в PR; ручной чек-лист по каждому разделу; скриншоты до/после. |
| Падение производительности Monaco при глобализации темы       | Тест на 5 открытых `<CodeEditor>` одновременно; `shared worker` у `@monaco-editor/loader`. |
| Конфликт z-index при переходе на `--z-*`                      | Сводная таблица z-index (секция 5.1.3) — единственный источник истины.             |
| Большие PR                                                    | Ограничить PR: 1 компонент UI-kit + 1-2 миграции домена.                           |
| Изменение клавиатурных комбинаций                             | Реестр команд публикует shortcut; конфликты ловятся централизованно.               |
| «Мёртвый» `src/lib/stage-colors.ts` сейчас                    | На старте Sprint 1 миграция 5 дублей подряд, плюс ESLint.                          |

---

## 19. Опционально (не в scope первой итерации, но задел)

- Темизация (light + custom) через смену набора токенов.
- Storybook / Ladle для UI-kit.
- Встроенные снапшот-тесты компонентов.
- Drag-and-drop вкладок `TabBar`.
- Настройки пользователя (keybindings editor, colors editor).
- Extensions API для плагинов секций.
