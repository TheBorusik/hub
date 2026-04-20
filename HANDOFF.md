# Hub UI redesign — контекст на завтра

Снимок состояния после Block D. Всё закоммичено в `main` (кроме текущего snapshot, если ещё не закоммичено).

## Что сделано в Block D (UX-поведение)

- **D.1 `Ctrl+P` Quick Open**: `src/components/layout/QuickOpen.tsx` — отдельный компонент (не переиспользует `CommandPalette`). Подписан глобально в `Shell` через `useHotkey(["mod+p"])`, `ignoreWhenTyping: false`, `preventDefault: true` (работает даже при фокусе в Monaco). Модуль-скоупный кэш списка процессов, retry-кнопка, empty/error states. На выбор — `navigateTo("configurator", { kind: "openProcessInConfigurator", processName })`.
- **D.2 `<Breadcrumbs>`**: новый UI-kit примитив `src/components/ui/Breadcrumbs/`. Интегрирован в `ProcessEditor` — строит путь из `process.Name` (по `.`) + активный таб/специальный view. Сегменты с `onClick` подсвечиваются через `.breadcrumb-item-interactive`.
- **D.3 Stages Outline**: правая collapsible-панель `src/pages/configurator/components/StagesOutline.tsx`. Показывает все стейджи процесса с типом-бейджем, dirty-точкой, флагом startup, открывает стейдж по клику. Тогглится `IconButton` в правой панели действий; состояние persist в `localStorage` (`wfm_outline`). Hotkey `Ctrl+Shift+O` открывает stages QuickPick (переназначен с `Ctrl+P`, чтобы не конфликтовать с глобальным Quick Open).
- **D.4 Dirty-индикатор**: в custom `renderTabBar` `ConfiguratorPage` — вместо текстового префикса `● ` теперь круглая точка перед именем процесса. Цвет зависит от активности (primary/muted).
- **D.5 Diagnostics → ProblemsPanel**:
  - `ProblemsProvider` расширен: `panelOpen`, `setPanelOpen`, `togglePanel`.
  - `Shell` рендерит `<ProblemsPanel>` как 4-й grid-ряд (240px) между main контентом и StatusBar; высоту регулирует `gridTemplateRows`. Глобальный хоткей `Ctrl+Shift+M` для toggle.
  - `StatusBar` получил `ProblemsStatusItem` — clickable-кнопка с счётчиками ошибок/варнингов.
  - `ProcessEditor.handleSave` / `handleValidateProcess` пушат `DiagnosticModel[]` + `string[]`-ошибки в `ProblemsProvider` через helper `publishCompileProblems` (source = `configurator.compile:${typeName}`, per-process). Каждая проблема имеет `onReveal`, открывающий процесс в configurator через `useNavigation`.
  - `CodePreview.onApplyToProcess` очищает проблемы процесса (`problems.clearSource(...)`).
  - `ConfiguratorPage.closeTab` также чистит `configurator.compile:${typeName}` в глобальном списке.
  - DiagnosticModel не имеет `Severity` — все компиляционные проблемы публикуются как `severity: "error"`, а строковые — тоже `error`.

## Снимок состояния после Block C (предыдущий)

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

Подтверждено пользователем. Итог серии коммитов:

- `2484e53` `fix(ui): TreeView hierarchy — move color/weight/cursor from inline to CSS`
  — убраны inline `color`/`font-weight`/`cursor`/`opacity` с рядов `TreeView`, переведены на CSS по `data-container` / `data-depth` / `data-disabled`. Исправлена несуществующая `var(--color-text)` → `var(--color-text-primary)`.

- **VS Code-style иерархия** (текущий коммит):
  - Корневые контейнеры (`data-depth="0"`) в `SystemTreeNav`: КАПСОМ, 11px, letter-spacing 0.5px, `#ffffff`. Это даёт явную визуальную границу, как секции в VS Code Explorer.
  - Вложенные контейнеры: bold, `#ffffff`.
  - Листья: `#9d9d9d` (заметно приглушённее), обычный вес.
  - Листья в состоянии selected возвращаются к `#cccccc`.

- **Добавлен корневой раздел `AUTH`** в `SystemTreeNav`, куда перенесены `Permissions` и `Roles`. Раньше они висели на корневом уровне рядом с `Errors`, и визуально склеивались с его детьми. Теперь три параллельные корневые группы: `ADAPTERS`, `ERRORS`, `AUTH`. `auth` раскрыт по умолчанию.

- **Исправлены отступы процессов в Configurator ProcessTree**: `ProcessRow` получал `depth={parent.depth}` вместо `depth + 1`, из-за чего бейдж `[Action]` процесса оказывался левее имени родительского каталога. Теперь процессы выравниваются под именем родителя (как файлы под папкой в VS Code Explorer).

## Состояние Block C (общий итог)

- C.1 `<CodeEditor>` + `MonacoProvider` — **done**.
- C.2 `<DataTable>` (dense/striped/selection/sort, hover через CSS, `.ui-row-actions`; мигрированы `TablesPanel`, `ErrorsTable`, `HealthTable`) — **done**.
- C.3 `<TreeView>` + tree-строки — **функционально done**, визуальный баг в SYSTEM открыт (см. выше).
- C.4 `<ContextMenu>` — **done** (интегрирован в ProcessTree, дальше — в таблицы/другие деревья).

tsc + vite build — зелёные.

## Следующие блоки (из ТЗ)

Приоритет — по желанию. Разумный порядок:

### Block D — **DONE** (см. выше).

### Block E (производительность) — **DONE**

- **E.1 `<VirtualList>`** — **done**. Примитив `src/components/ui/VirtualList`
  на windowing по `itemHeight`. Применён в `ProcessListPanel` (viewer),
  `PermissionsPanel`, `GlobalModelsPanel` (плоский `header + models` список
  по категориям).

- **E.2a `publishCompileProblems`** — **done**. Логика «diagnostics →
  ProblemsProvider» вынесена в `src/pages/configurator/lib/publish-compile-problems.ts`.
  `ProcessEditor.handleSave` / `handleValidateProcess` /
  `CodePreview.onApplyToProcess` используют общий helper +
  `compileProblemSourceFor(typeName)` для консистентных source-ключей.

- **E.2b `GlobalModelsPanel` split** — **done**. 1022 строки → **5 файлов**:
  - `components/GlobalModelsPanel.tsx` (266) — оркестратор (state, api,
    хоткеи, dirty-трекинг по `originalCode.current`).
  - `components/GlobalModelsSidebar.tsx` (270) — сайдбар с filter +
    виртуализированным accordion.
  - `components/GlobalModelEditor.tsx` (244) — toolbar + Monaco + Problems.
  - `components/AddGlobalModelDialog.tsx` (207) — диалог создания.
  - `components/CommitMessageDialog.tsx` (143) — диалог commit message.
  - `lib/global-models.ts` (46) — `modelKey`, `categoryBadgeColor`,
    `toDiagnostic`, `GLOBAL_MODEL_CATEGORIES`.

- **E.2c `ProcessEditor` + `StageEditor` split** — **done (partial)**:
  - **ProcessEditor**: 1115 → **856 строк**. Extractions:
    - `components/ProcessEditorActionRail.tsx` (312) — весь правый
      action-rail с `IconButton`-ами (Save / AutoSave / Run / Outline /
      Pack / Unpack / Code / Diff / Usings / GM / compile-errors !
      indicator / InitObject / Context / ProcessResult / Set Startup /
      Go to Diagram / Delete Stage).
    - `lib/stage-rename.ts` — `renameStageInProcess()`: чистая функция,
      патчит `Stages`, `GetNextStage` / `GetErrorNextStage` (regex по
      `\breturn\s+<oldName>\s*;`), `ReturnStages`, `Startup`,
      `WebData.Stages` и `Lines[...]`.
    - Остальное (Save / Validate / Pack / Unpack / Auto-Save / хоткеи /
      QuickPick items) оставлено в оркестраторе — связанo со state.
  - **StageEditor**: 756 → **515 строк**. Extractions:
    - `components/CSharpEditor.tsx` (120) — обёртка `CodeEditor` с
      `setupWfmCSharp` / `attachWfmContext` / `registerStageEditorActions`.
    - `components/NextStageWithError.tsx` (119) — collapsible Panel
      с двумя `CSharpEditor` (Get Next / Get Error Next) через
      `react-resizable-panels`.
    - `lib/stage-type-helpers.ts` — `normStageType`, `getDataLabel`,
      `stageHasGetData`, `stageHasGetNextStage`, `stageHasGetErrorNextStage`,
      `extractProcessResult`.

- **`ConfigurationPanel` split** — **отложено**. Не в E.2; если дойдут
  руки — отдельная задача. Сейчас приоритета нет.

### Block F (гигиена кода) — **DONE (rules level)**

- **F.1 ESLint-правила** — **done**. Локальный plugin `eslint-rules/index.js`,
  подключён из `eslint.config.js` как `hub-ui`. Все 4 правила работают, пока
  на уровне `warn` (есть легаси):
  - `hub-ui/no-raw-hex` — 229 предупреждений на момент внедрения.
  - `hub-ui/no-magic-spacing` — 352 предупреждения.
  - `hub-ui/no-duplicate-confirm-dialog` — 4 нарушения (ProcessDiagram,
    ProcessEditor, ConfiguratorPage, ProcessListPanel — прямой импорт
    `<ConfirmDialog>` вместо `useConfirm`). Разрешено в `src/App.tsx`
    (провайдер) и внутри `components/ui/ConfirmDialog/**`.
  - `hub-ui/no-monaco-theme-define` — 1 нарушение (`wfm-csharp.ts` регистрирует
    свою тему `"wfm-dark"`). Разрешено в `components/ui/CodeEditor/**`.
  - Когда мигрируем легаси — ratchet `warn` → `error` в `eslint.config.js`.
  - Правила учитывают allowlist'ы: `design-tokens`, `globals.css`,
    `stage-colors`, `eslint-rules` — разрешено держать hex/spacing.

- **F.2 Консолидация `STAGE_TYPE_COLORS`** — **done**.
  Единая карта в `src/pages/configurator/lib/stage-colors.ts`,
  помощники `stageColor()` и `stageTypeLabel()`. Все 7 файлов
  (`ProcessEditor`, `StagesOutline`, `StageEditor`, `StageList`,
  `ProcessDiagram`, `AddStageDialog`, `recomputeReturnStages`) импортируют
  оттуда.

- **F.3 Переименовать `crud-editor/components/DataTable.tsx`** — **done**.
  Файл → `CrudDataTable.tsx`, компонент → `CrudDataTable`, props →
  `CrudDataTableProps`. Импорт в `CrudEditorPage` обновлён. Больше не
  коллидирует с `@/components/ui/DataTable` (UI-kit).

- `DiffView.tsx` — оставлен на прямом `DiffEditor` (не на `<CodeEditor>`);
  если встретится, это **не бага, а решение** (см. Primary Request).

## Полезные места в коде

- Примитивы UI-kit: `hub/src/components/ui/{CodeEditor,DataTable,TreeView,Modal,ConfirmDialog,ContextMenu,Toast,PanelHeader,PanelToolbar,Button,EmptyState,LoadMoreRow}`.
- Глобальный CSS: `hub/src/styles/globals.css` (секции: `ui-icon-btn`, `ui-tab`, `ui-data-table`, `.ui-tree-row`, `.ui-row-actions`, `.ui-context-menu`, `.adapter-tree-row`).
- Дизайн-токены: `hub/src/lib/design-tokens.ts`.
- Monaco-тема: `hub/src/components/ui/CodeEditor/CodeEditor.tsx` (`ensureHubDarkTheme`) + WFM C# setup `hub/src/pages/configurator/monaco/setupWfmCSharp.ts` (если там).
- App root с провайдерами: `hub/src/App.tsx` — `ToastProvider → NotificationsProvider → ProblemsProvider → ConfirmProvider → MonacoProvider → ContourProvider → Shell`.

## Block G — `react-resizable-panels` v4 миграция — **DONE**

Ранее был долг: ~15 TS-ошибок из‑за устаревшего API (`direction`, `autoSaveId`, `defaultSizePercentage`, `minSizePercentage`). Сейчас:

- `Group direction="horizontal"` → `Group orientation="horizontal"` (в `SystemPage`, `SectionsPanel`, `ConfigurationPanel` ×2, `BuildRulesEditor`).
- `Group autoSaveId="key"` → `Group id="key" {...useAutoSaveLayout("key")}`. Хук **`src/hooks/useAutoSaveLayout.ts`** читает `defaultLayout` из `localStorage["rrp:layout:<id>"]` один раз (через `useMemo`) и возвращает стабильный `onLayoutChanged`-writer. Применён в `ConfiguratorPage` (`cfg-side-v4`), `StageEditor` (`stage-h-<stageName>`), `NextStageWithError` (`stage-v2-<stageName>`). Persistence layout не потерялся — ключ `localStorage` другой, но формат сопоставим: `{ [panelId]: percentage }`.
- `Panel defaultSizePercentage={50}` / `minSizePercentage={20}` → `Panel defaultSize={50}` / `minSize={20}` (в `StageEditor`). В v4 число без единиц = проценты.
- `Panel id="..."` проставлен явно там, где `Group` живёт с `useAutoSaveLayout` — чтобы ключи layout были стабильными между релизами.
- `Separator` (наш `ResizeHandle`) — API сохранён, `direction` осталась пропом обёртки (переключает CSS-класс), `react-resizable-panels` `Separator` сам получает orientation от родительского `Group`.

Также подчищен накопленный легаси TS6133:

- `BranchSelector.tsx` — удалены неиспользуемые `Upload`, `Trash2` из `lucide-react`.
- `ConfiguratorPage.tsx` — удалён неиспользуемый импорт `SidePanel`.
- `PermissionDialog.tsx` — `[strId, setStrId]` → `[strId]`, setter был мёртвый (нет input'а для StrId).
- `ProcessTree.tsx` — небезопасный cast `ProcessModel → Record<string, unknown>` обёрнут в `unknown`-шлюз с пояснением, почему он нужен.

**`npx tsc -b` сейчас даёт 0 ошибок. `vite build` — зелёный (дaёт только warning о размере bundle, не ошибка).**

Мои файлы Block D (`QuickOpen`, `Breadcrumbs`, `StagesOutline`, `ProblemsPanel` wiring, `ProcessEditor` publishCompileProblems) — чисты. `HealthTable` поправлен (типобезопасная сортировка, исключая `__actions`).

## Правила репозитория

Правила WFM в `.cursor/rules/` из корня workspace **всегда applied**: перед любыми правками процессов (`WFM.Sources/**/PROCESS/**/*.cs`) обязательна сверка с **всеми** `.mdc`-правилами. Для UI в hub/ правил нет — работаем по ТЗ и здравому смыслу, но UI-изменения, затрагивающие взаимодействие с процессами (например, тест-процессы), всё равно сверяем с `wfm-processes-*.mdc`.
