# Hub — контекст на завтра (2026-04-28)

## Сегодня: CRUD Editor багфиксы + WS crash fix

### 1. Исправлен краш Hub при очистке localStorage

**Проблема:** после очистки `localStorage` (в т.ч. `hub_system_url`) system contour получал пустой `wsUrl`. `ContourWebSocketProvider` возвращал `<>{children}</>` без `WebSocketProvider`. Любой вложенный `useWebSocket()` (в т.ч. через `useContourApi()` → `QuickOpen`) падал с ошибкой `useWebSocket must be used within WebSocketProvider`.

**Фикс:**
- `src/providers/ContourWebSocketProvider.tsx` — теперь **всегда** рендерит `WebSocketProvider`, даже с пустым URL: `url={contour.wsUrl || ""}`. WebSocket пытается подключиться к текущему origin и получает ошибку, но приложение не падает.
- `src/components/layout/Shell.tsx` — убраны временные условия `contour.wsUrl &&` для `CommandPalette` и `QuickOpen` (они больше не нужны, т.к. провайдер всегда на месте). Убран связанный комментарий.

Build (`tsc -b && vite build`) и линтер — зелёные.

### 2. Исправлен баг: таб в CRUD Editor "менял модель" после Update

**Проблема:** в `CrudEditorPage.tsx` после успешного Update записи в `RecordDialog` выполнялся блок:
```tsx
if (model.Name === "CRUDModel" && overlay.type !== "delete") {
  updateTab(activeTab.id, { model: { ...model, ...data } as CrudModel });
}
```
`data` — это поля записи (например, `{ Name: "MyModel", Properties: [...] }`). Spread `data` поверх `model` перезаписывал `tab.model.Name` с `"CRUDModel"` на `"MyModel"`. В результате:
- Лейбл таба менялся на имя модели из записи.
- Следующий Refresh запрашивал данные уже для неправильной модели.

**Причина:** этот блок был добавлен с комментарием "чтобы Enums/Properties применились к другим открытым моделям", но по факту каждый таб хранит независимую копию `model`, так что обновление одного таба никогда не применялось к другим. Блок был бесполезен и только ломал текущий таб.

**Фикс:** удалён этот блок целиком (строки 157–161). Теперь после Update просто закрывается диалог и вызывается `loadModelData(activeTab)` для перезагрузки списка записей.

Build — зелёный.

---

## Предыдущее состояние (сохранено из 2026-04-27)

### Серверная пагинация `GenericCRUD.Models.QueryPage`

**Сделано:**
- **SalGenericCRUDHandler 3.0.7**:
  - `QueryExtensions.cs` — `QuerySimpleAsync`, `QueryHistoryAsync`, `QuerySimple<T>` (LINQ) получили параметр `int offset`. SQL: `LIMIT x OFFSET y`. LINQ: `.Skip(offset).Take(limit)`.
  - `ICRUDRepository` — обе перегрузки `QueryFilterAsync` получили `int offset`.
  - Все 4 репозитория (`Simple`, `History`, `DapperSimple`, `DapperHistory`) и все 4 `QueryFilter.cs` хендлера обновлены для проброса `offset`.
  - `BaseJSchemas.cs` — в JSchema `QueryFilter` добавлено `"Offset"` (было только `Filter`/`Limit`/`OrderBy`). **Без этого поля `GenericCRUD.Action` отбрасывал `Offset` при валидации.**
- **WFM** — новый процесс `GenericCRUDModelsQueryPage.cs` (`WFM.Sources/PROCESS/`):
  - Принимает `Model`, `Limit`, `Offset`, `Search`, `SortCol`, `SortDir`.
  - Загружает `ModelConfig` → валидирует `SortCol` → строит `ConditionGroup` для `Search` → вызывает `GenericCRUD.Action` `QueryFilter` → возвращает `{ Models, TotalCount }`.
- **Hub**:
  - `types.ts` — `ModelTab` получил `totalCount`.
  - `ws-api-models.ts` — добавлен `WfmCommand.GenericCrudQueryPage`, `WfmGenericCrudQueryPageRequest`, `CrudQueryPageResponse`.
  - `ws-api.ts` — метод `genericCrudQueryPage()`.
  - `CrudEditorPage.tsx` — `loadModelData` теперь использует `genericCrudQueryPage` вместо `GetAll`. Добавлен `useEffect` с зависимостью `activeTab?.id`.
  - `CrudDataTable.tsx` — убрана клиентская фильтрация/сортировка. Добавлен prop `totalCount`, пагинация считает `totalPages` от `totalCount`.

### Viewer — кнопка «Command» для CRUD / Command / SubStart стейджей

**Сделано:** `viewer/types.ts` — `getStageContextButtons` теперь добавляет `{ label: "Command", subject: "Command", stageIndex: si }` для `case "CRUD": case "SubStart":` (для `Command` типа уже было).

### NuGet-публикация

- **Текущие версии на сервере:** SAL3 `3.0.17`, SalGenericProcessHandler `3.0.10`, SalGenericCRUDHandler `3.0.7`.
- **Важно:** для публикации всегда использовать `C:\Users\borus\Documents\ProjectsNewSal\publish-sal.ps1` (авто-bump, pack, push, обновление `.csproj`).

---

## Что нужно сделать завтра

1. **Перезапустить / пересобрать WFM** на сервере, чтобы `SalGenericCRUDHandler 3.0.7` загрузилась и handler'ы перекомпилировались (иначе `Offset` всё ещё будет игнорироваться из-за кэша старых handler'ов).
2. **Проверить пагинацию** в CRUD Editor — открыть модель с большим количеством записей, переключать страницы, проверить что `QueryPage` возвращает разные `Models` при разном `Offset`.
3. **Проверить Viewer** — открыть процесс с CRUD/SubStart стейджами, убедиться что кнопка `Command` появилась рядом с `Result`.
4. **Задеплоить hub** (если ещё не задеплоен) — `npm run build` проходит зелёным.

---

# Hub UI redesign — контекст на завтра

Снимок состояния после Block D + последующие доработки. В **конце файла** — раздел **«Состояние репозитория (аудит кода)»**: что в `hub/src` **уже есть**, а что раньше в этом HANDOFF было описано неверно или «отложено».

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

- **`ConfigurationPanel` split** — **сделано позже** (см. раздел «Состояние репозитория (аудит кода)» в конце файла). Раньше здесь было «отложено» — актуальный код уже разбит.

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

- `DiffView.tsx` — на прямом Monaco `DiffEditor` (не на `<CodeEditor>`); контент **не плейсхолдер**: слева `getProcessSource(name, branch, "git")` (закоммиченный исходник), справа `getProcessCode(process)` (текущий WebProcess → C#). См. `DiffView.tsx`.

## Полезные места в коде

- Примитивы UI-kit: `hub/src/components/ui/{CodeEditor,DataTable,TreeView,Modal,ConfirmDialog,ContextMenu,Toast,PanelHeader,PanelToolbar,Button,EmptyState,LoadMoreRow,EditorPanel,VirtualList,Breadcrumbs}`.
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

**`npx tsc -b` сейчас даёт 0 ошибок. `vite build` — зелёный (даёт только warning о размере bundle, не ошибка).**

Мои файлы Block D (`QuickOpen`, `Breadcrumbs`, `StagesOutline`, `ProblemsPanel` wiring, `ProcessEditor` publishCompileProblems) — чисты. `HealthTable` поправлен (типобезопасная сортировка, исключая `__actions`).

## Состояние репозитория (аудит кода)

Актуализировано по содержимому `hub/src` (без привязки к конкретному коммиту). Цель — закрыть расхождения между этим HANDOFF и реальным кодом.

### Сделано в коде, но раньше не было отражено / было помечено иначе

| Тема | Факт по коду |
|------|----------------|
| **System → Configuration** | `ConfigurationPanel.tsx` (~240 строк) — оркестратор: `useReducer` + `configurationWorkspaceReducer.ts` (вкладки, dirty, `sectionSelection` отдельно от `openTabs`), `ConfigurationTabsBar.tsx` (chrome-стиль как общий Tabs, без отдельной полоски у крестика), хуки `lib/useAdapterConfigData.ts`, `lib/useAdapterConfigActions.ts`. `ConfigTabContent` — `memo` + стабильные колбэки с `configId`; Monaco у неактивных вкладок не держится. `ConfigTabsStrip.tsx` удалён. |
| **`<EditorPanel>`** | Примитив `src/components/ui/EditorPanel/` (`EditorPanel.tsx`, `types.ts`). Используется: `JsonEditor`, `CSharpEditor`, `GlobalModelEditor`, `ModelClassDialog`, `EditApiDialog` (и связка с BuildRules через JsonEditor). ТЗ `docs/editor-panel-unification-tz.md` — частично реализовано на практике, не всё из ТЗ обязано быть закрыто. |
| **Diff** | `DiffView.tsx`: параллельно `api.getProcessSource(…, "git")` и `api.getProcessCode(process)`; не «два одинаковых текста». |
| **Validate Process** | `ws-api.validateProcess`; `handleValidateProcess` в `pages/configurator/lib/useProcessSave.ts` (+ QuickPick / action rail в `ProcessEditor` / `processQuickPickPalette`). |
| **Размеры god-компонентов (ориентир по строкам)** | `ProcessEditor.tsx` ~327, `ConfiguratorPage.tsx` ~650, `GlobalModelsPanel.tsx` ~256 (после сплита оркестратор). Цифры по `rg`/файлу — для планирования следующих выносов. |

### По-прежнему как в этом HANDOFF (проверено наличием в дереве)

- **NavigationProvider**, **QuickOpen**, **UnsavedChangesDialog**, **Shell** с `visitedSections`, **ProblemsPanel** / `publishCompileProblems`, **StagesOutline**, **ProcessBreadcrumbs** + UI-kit **Breadcrumbs**.
- **VirtualList** — `ProcessListPanel`, `PermissionsPanel`, `GlobalModelsSidebar`.
- **Block G** — `Group orientation`, `useAutoSaveLayout`, `Panel defaultSize` / `minSize` в перечисленных местах.
- **ESLint plugin `hub-ui`**, **stage-colors** консолидация, **CrudDataTable** переименование.

### Открыто / бэклог (в коде нет или только частично)

| Тема | Заметка |
|------|---------|
| **EditorPanel на 100% экранов** | StageEditor/часть конфигуратора всё ещё могут обходиться без единого паттерна — смотреть по файлам при миграции. |
| **Parse Models / Usings / Other Models** | Кнопки в концепте ProcessEditor — без полной реализации (как в `RESUME-CONTEXT` wfm). |
| **Code Preview — кэш между открытиями** | По желанию; сейчас при открытии снова дергается GetCode. |
| **`hub-ui` ESLint warn → error** | Пока warn, легаси предупреждения не вычищены. |
| **`@theborusik/ws` улучшения** | Идеи в `docs/theborusik-ws-improvements.md` — бэклог, не статус «готово». |

### Команда проверки сборки

```bash
cd hub && npx tsc -b && npm run build
```

(На момент аудита ожидается зелёный `tsc`; `vite build` может предупреждать о размере bundle.)

### Сверка с git (коммиты)

Ориентиры по `git log` по файлам/строкам; даты — `committer date` в репозитории.

| Веха | Коммит | Дата | Комментарий |
|------|--------|------|-------------|
| Текущий **HEAD** | `2e84e43` | 2026-04-22 | Merge **PR #3** `feature/editor-panel-unification` (EditorPanel-цепочка + фиксы). |
| **EditorPanel** (фазы + полировка) | `399e2a3` … `c39cb90`, merge `2e84e43` | 2026-04-21–22 | `399e2a3` — Phase 1 компонент; `969a070` — JsonEditor на EditorPanel; `3447a50` / `7064fce` / `40b481c` / `c39cb90` — унификация и багфиксы; см. также `93884fb` (ТЗ в `docs/`). |
| **PR #1** UI redesign (модалки, сплиты, т.д.) | `3fe2691` | 2026-04-21 | В stat — крупное изменение `ConfigurationPanel.tsx` (−много строк) в рамках общего редизайна. |
| **System → Configuration** (keep-alive, табы) | `e46b9a6`, `d3a7e3e` | 2026-04-20 | `perf(system): keep-alive tabs…`, правки табов/иконок. |
| **`configurationWorkspaceReducer` / новые файлы** | `29b43f3` | 2026-04-20 | `git log --diff-filter=A` — первое появление `configurationWorkspaceReducer.ts` (коммит «Commit last changes»). |
| **Phase 7** (Configurator + Viewer + **ws-api**: `getProcessCode`, **`getProcessSource`**, **`validateProcess`**, навигация) | `59f6345` | 2026-04-17 | `-S getProcessSource` / `-S validateProcess` по `ws-api.ts` → единственный вводящий коммит `59f6345`. **DiffView** в истории файла тоже уходит в этот коммит (реальный diff на базе этих API). |
| **WS overlay reconnect** | `6c22415` | 2026-04-21 | Не путать с Configuration — отдельная фича `@theborusik/ws`. |

**Локальное дерево (важно):** на момент доп. сверки у ветки `main` были **незакоммиченные** изменения (`git status`): в т.ч. `HANDOFF.md`, ряд файлов в `configurator/components`, `ConfigTabContent.tsx`. Часть правок может быть **ещё не на `origin/main`** — после `git push` допишите сюда строку с новым верхним коммитом.

## Правила репозитория

Правила WFM в `.cursor/rules/` из корня workspace **всегда applied**: перед любыми правками процессов (`WFM.Sources/**/PROCESS/**/*.cs`) обязательна сверка с **всеми** `.mdc`-правилами. Для UI в hub/ правил нет — работаем по ТЗ и здравому смыслу, но UI-изменения, затрагивающие взаимодействие с процессами (например, тест-процессы), всё равно сверяем с `wfm-processes-*.mdc`.
