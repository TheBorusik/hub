# Hub UI redesign — контекст на завтра

Снимок состояния после Block C. Всё закоммичено в `main`.

## Что сделано сегодня (Block C, коммиты последние 4)

- `c623991` `ui: migrate tree/list rows to .ui-tree-row + CSS hover/selected`
  - Единый CSS-класс `.ui-tree-row` + `data-selected` для строк деревьев/списков.
  - Убраны inline `onMouseEnter/onMouseLeave` из: `ProcessTree`, `AdapterTree` (command-tester), `SystemTreeNav`, `PermissionsPanel`, `RolesPanel`, `SectionsPanel`, `ProcessListPanel`, `ModelListPanel`, `TestCasesPanel`, `StageList`, самого `<TreeView>`.
  - В `ProcessTree` Edit-кнопка обёрнута в `.ui-row-actions` (видна только на hover, как в VS Code).
  - `SystemTreeNav` полностью переписан поверх примитива `<TreeView>`.

- `3edcea8` `feat(ui): add ContextMenu primitive + wire into ProcessTree rows`
  - Новый примитив `src/components/ui/ContextMenu/ContextMenu.tsx`:
    - портал в `document.body`, auto-flip у краёв экрана;
    - закрывается на click-outside / `Esc` / `scroll` / `resize` / `blur`;
    - поддержка `item` / `separator`, `icon`, `shortcut`, `danger`, `disabled`.
  - Интегрирован в `ProcessRow` (ProcessTree): Open / Copy name / Copy TypeName / Remove draft.

- `889f841` `fix(ui): make TreeView containers bold so hierarchy is visible`
  - `<TreeView>`: автоматически `fontWeight: 600` для узлов-контейнеров.

- `969f830` `fix(ui): make tree hierarchy visible via CSS color+weight for containers vs leaves`
  - `<TreeView>` проставляет на строке `data-container="true"` и `data-depth`.
  - В `globals.css`:
    - `.ui-tree-row[data-container="true"]` — `color: var(--color-text)` + `font-weight: 600`.
    - `.ui-tree-row:not([data-container="true"])[data-depth]` — `color: var(--color-text-muted)`.
    - При `data-selected="true"` лист получает полный цвет.
  - В `SystemTreeNav` увеличил `indent` 16 → 20, `rowHeight` 22 → 24.

## ✅ Закрыто: визуальный баг SYSTEM sidebar

Коммит `2484e53` `fix(ui): TreeView hierarchy — move color/weight/cursor from inline to CSS`.

**Причина** (гипотеза из предыдущей версии HANDOFF подтвердилась): в `TreeView.tsx` у каждой строки был inline `style={{ color: primary, fontWeight: isContainer ? 600 : 400, cursor }}`. Inline color побеждал CSS-правило `.ui-tree-row:not([data-container]) { color: muted }` по специфичности — поэтому все строки были одного цвета, иерархия не читалась. Дополнительный бонусный баг: CSS использовал несуществующую переменную `var(--color-text)`.

**Что сделано:**
- В `TreeView.tsx` оставлены inline только структурные параметры (padding, height, gap, userSelect). `color`, `font-weight`, `cursor`, `opacity` теперь полностью через CSS по `data-container` / `data-depth` / `data-disabled`.
- В `globals.css`:
  - `.ui-tree-row[data-depth]` — базовый `cursor: pointer` + `color: var(--color-text-primary)`.
  - `.ui-tree-row[data-container="true"]` — `font-weight: 700` (было 600).
  - `.ui-tree-row:not([data-container="true"])[data-depth]` — `color: var(--color-text-muted)`.
  - `.ui-tree-row[data-disabled="true"]` — `cursor: default`, `opacity: 0.6`.
  - Заменили `var(--color-text)` → `var(--color-text-primary)`.
- В `SystemTreeNav`: `indent` 20 → 24, `rowHeight` 24 → 26.

## Состояние Block C (общий итог)

- C.1 `<CodeEditor>` + `MonacoProvider` — **done**.
- C.2 `<DataTable>` (dense/striped/selection/sort, hover через CSS, `.ui-row-actions`; мигрированы `TablesPanel`, `ErrorsTable`, `HealthTable`) — **done**.
- C.3 `<TreeView>` + tree-строки — **функционально done**, визуальный баг в SYSTEM открыт (см. выше).
- C.4 `<ContextMenu>` — **done** (интегрирован в ProcessTree, дальше — в таблицы/другие деревья).

tsc + vite build — зелёные.

## Следующие блоки (из ТЗ)

Приоритет — по желанию. Разумный порядок:

### Block D (UX-поведение)
- `Ctrl+P` — **Quick Open process by name**. Переиспользовать `CommandPalette` или отдельный `QuickOpen`-компонент. Источник списка: catalog процессов.
- `<Breadcrumbs>` над редактором процесса (`Catalog > SubCatalog > ProcessName > StageName`).
- **Outline of stages** в Configurator (панель-список стейджей со скроллом / индикатором текущего).
- **Dirty-индикатор** в `TabBar` и на вкладках стейджей (точка как в VS Code).
- **Process diagnostics → `ProblemsProvider` → глобальная `<ProblemsPanel>`**. Нужно связать диагностику C# из Monaco с общим `ProblemsProvider` (уже подключен в App из Block B).

### Block E (производительность)
- `<VirtualList>` для больших панелей:
  - `ProcessListPanel` (viewer) — может быть 500+ процессов.
  - `GlobalModelsPanel` (configurator).
  - `PermissionsPanel` (если много пермишенов).
- Сплит god-компонентов:
  - `GlobalModelsPanel`.
  - `ConfigurationPanel`.
  - `ProcessEditor`.
  - `StageEditor`.

### Block F (гигиена кода)
- ESLint-правила проекта:
  - `no-raw-hex` — запретить hex-цвета вне токенов.
  - `no-magic-spacing` — запретить магические px-отступы, только токены.
  - `no-duplicate-confirm-dialog` — запретить импорт старых Confirm-диалогов.
  - `no-monaco-theme-define` — запретить прямой `monaco.editor.defineTheme`, только через `ensureHubDarkTheme`.
- Консолидировать 5 копий `STAGE_TYPE_COLORS` → единый импорт из `lib/stage-colors.ts`.
- Мелочи:
  - Переименовать `hub/src/pages/crud-editor/components/DataTable.tsx` → `CrudDataTable.tsx` (или подобное), чтобы не коллидировало с `@/components/ui/DataTable`.
  - `DiffView.tsx` — оставлен на прямом `DiffEditor` (не на `<CodeEditor>`); если встретится, это **не бага, а решение** (см. Primary Request).

## Полезные места в коде

- Примитивы UI-kit: `hub/src/components/ui/{CodeEditor,DataTable,TreeView,Modal,ConfirmDialog,ContextMenu,Toast,PanelHeader,PanelToolbar,Button,EmptyState,LoadMoreRow}`.
- Глобальный CSS: `hub/src/styles/globals.css` (секции: `ui-icon-btn`, `ui-tab`, `ui-data-table`, `.ui-tree-row`, `.ui-row-actions`, `.ui-context-menu`, `.adapter-tree-row`).
- Дизайн-токены: `hub/src/lib/design-tokens.ts`.
- Monaco-тема: `hub/src/components/ui/CodeEditor/CodeEditor.tsx` (`ensureHubDarkTheme`) + WFM C# setup `hub/src/pages/configurator/monaco/setupWfmCSharp.ts` (если там).
- App root с провайдерами: `hub/src/App.tsx` — `ToastProvider → NotificationsProvider → ProblemsProvider → ConfirmProvider → MonacoProvider → ContourProvider → Shell`.

## Правила репозитория

Правила WFM в `.cursor/rules/` из корня workspace **всегда applied**: перед любыми правками процессов (`WFM.Sources/**/PROCESS/**/*.cs`) обязательна сверка с **всеми** `.mdc`-правилами. Для UI в hub/ правил нет — работаем по ТЗ и здравому смыслу, но UI-изменения, затрагивающие взаимодействие с процессами (например, тест-процессы), всё равно сверяем с `wfm-processes-*.mdc`.
