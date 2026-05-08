# ТЗ: Dependencies Phase (Поиск зависимостей процессов)

> Статус: **Завершено** ✅  
> Дата: 2026-04-27  
> Следующая фаза: Releases + CRUD Migrations (см. `docs/releases-phase-tz.md` — будет создан после завершения Dependencies)

---

## Цель

В Hub можно было:
1. **В любом процессе** видеть все его зависимости (CRUD модели, команды, события, subprocess)
2. **По любой CRUD модели / команде / событию** найти все процессы, где они используются

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────────┐
│                             HUB (React)                              │
├─────────────────────────────────────────────────────────────────────┤
│  Left Sidebar Tabs                                                   │
│  ├── Processes (ProcessTree)                                         │
│  └── Global Search  ← НОВОЕ (поиск по CRUD/Command/Event/Sub)       │
│                                                                      │
│  ProcessEditor                                                       │
│  ├── Diagram tab                                                     │
│  ├── Stages tabs                                                     │
│  ├── Code tab                                                        │
│  └── Dependencies tab  ← НОВОЕ (special view)                        │
│                                                                      │
│  Command Palette (Ctrl+Shift+P)                                      │
│  └── "Find Usages of…" (mod+shift+u)  ← НОВОЕ                       │
│                                                                      │
│  Context Menu (StageNode)                                            │
│  └── "Find Usages"  ← НОВОЕ (для CRUD/Command/Event/Sub стадий)     │
└─────────────────────────────────────────────────────────────────────┘
                                    │ WS
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  AuthServer → RabbitMQ → WFM.Configurator.Core                       │
├─────────────────────────────────────────────────────────────────────┤
│  Handlers:                                                           │
│  ├── ProcessAssemblyGetDependenciesHandler  ← парсит source_cs       │
│  └── ProcessAssemblySearchByDependencyHandler  ← ищет по JSONB       │
│                                                                      │
│  PostgreSQL:                                                         │
│  └── logical_dependencies JSONB + GIN index  ← НОВОЕ                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Backend (реализовано)

### 1. SQL миграция

```sql
-- docs/migrations/001_add_logical_dependencies.sql
ALTER TABLE process_assemblies ADD COLUMN IF NOT EXISTS logical_dependencies JSONB;
CREATE INDEX IF NOT EXISTS idx_process_assemblies_logical_deps_gin
    ON process_assemblies USING GIN (logical_dependencies);
```

### 2. Новые/изменённые файлы

| Файл | Изменение |
|------|-----------|
| `WFM.Data/Repository/Model/ProcessAssemblyV2Model.cs` | `+ LogicalDependencies?: string` |
| `WFM.Data/Repository/Entity/ProcessAssemblyV2Entity.cs` | `+ LogicalDependencies?: string` |
| `WFM.Data/Repository/ProcessAssemblyRepository.cs` | `+ GetByLogicalDependency()`, обновлены все SELECT/Upsert для `logical_dependencies` |
| `WFM.Configurator.Core/DependencyExtractor.cs` | **НОВЫЙ** — статический хелпер, парсит `source_cs` → `WebProcess` → JSON с зависимостями |
| `WFM.Configurator.Core/Managers/ProcessAssemblyManager.cs` | `PersistSourceOnlyAsync` и `PersistCompiledAssemblyAsync` теперь заполняют `LogicalDependencies` |
| `WFM.Configurator.Core/Handlers/ProcessAssemblyGetDependenciesHandler.cs` | **НОВЫЙ** — forward deps (парсит стадии процесса) |
| `WFM.Configurator.Core/Handlers/ProcessAssemblySearchByDependencyHandler.cs` | **НОВЫЙ** — reverse search через `logical_dependencies @> ...::jsonb` |
| `WFM.Configurator.Core/ConfiguratorModule.cs` | Зарегистрированы оба хендлера |

### 3. DTO (backend)

```csharp
// ProcessAssemblyGetDependenciesHandler
ProcessAssemblyGetDependenciesCommand    { Name, Branch? }
ProcessAssemblyDependencyItem            { Name, Action?, StageName }
ProcessAssemblyGetDependenciesResult     { CRUD[], Commands[], Events[], SubProcesses[] }

// ProcessAssemblySearchByDependencyHandler
ProcessAssemblySearchByDependencyCommand { DepType, DepName, Branch? }
ProcessAssemblySearchByDependencyResult  { Processes[] }
```

**Важно:** `dependencies TEXT[]` остаётся **только для компиляции** (разрешение типов при сборке). Весь поиск идёт через новую колонку `logical_dependencies JSONB`.

---

## Frontend (реализовано)

### 1. Типы (`src/lib/ws-api-models.ts`)

```typescript
DependencyItem
WfmProcessAssemblyGetDependenciesRequest / Result
WfmProcessAssemblySearchByDependencyRequest  { DepType, DepName, Branch? }
WfmProcessAssemblySearchByDependencyResult   { Processes[] }
```

### 2. API (`src/lib/ws-api.ts`)

```typescript
async getProcessDependencies(request)
async searchProcessesByDependency(request)
```

### 3. Компоненты

| Компонент | Файл | Описание |
|-----------|------|----------|
| `ProcessDependenciesPanel` | `components/ProcessDependenciesPanel.tsx` | Special view в ProcessEditor. Таблицы CRUD/Commands/Events/Subs с кнопкой **Find Usages** на каждой строке. Sidebar с результатами. |
| `GlobalDependencySearchPanel` | `components/GlobalDependencySearchPanel.tsx` | Вкладка **Global Search** в левой панели. Выбор типа (CRUD/Command/Event/Sub) + поиск по имени + список процессов. |
| `ConfiguratorPage` | `ConfiguratorPage.tsx` | Добавлены Tabs (Processes / Global Search) в левую панель. Command Palette integration. |
| `StageNode` | `components/StageNode.tsx` | Context Menu: пункт **"Find Usages"** для стадий CRUD/Command/Event/SubStart. |
| `ProcessDiagram` | `components/ProcessDiagram.tsx` | Передаёт `dependencyName`/`dependencyType` в ноду + callback `onFindUsages`. |

### 4. Command Palette

- **ID:** `configurator.findUsages`
- **Title:** "Find Usages of…"
- **Hotkey:** `Ctrl/Cmd+Shift+U`
- **Действие:** Переключает левую панель на вкладку **Global Search**

---

## Проверка (Definition of Done)

- [x] Backend: `GetDependencies` хендлер работает и возвращает CRUD/Command/Event/Sub
- [x] Backend: `SearchByDependency` хендлер работает и ищет через `logical_dependencies JSONB`
- [x] Backend: SQL миграция создана (`docs/migrations/001_add_logical_dependencies.sql`)
- [x] Backend: `ProcessAssemblyManager` заполняет `LogicalDependencies` при сохранении
- [x] Frontend: Global Search Panel отображается в левой панели (вкладка рядом с Processes)
- [x] Frontend: Dependencies Panel отображается в ProcessEditor (special view)
- [x] Frontend: Command Palette имеет "Find Usages of…" (`mod+shift+u`)
- [x] Frontend: Context Menu на стадии имеет "Find Usages"
- [x] Frontend: Find Usages Sidebar открывает список процессов
- [x] Frontend: Клик по процессу в результатах открывает его в Configurator
- [x] Сборка: WFM solution собирается без ошибок
- [x] Сборка: Hub `npm run build` проходит без ошибок

---

## Что нужно сделать при деплое

1. **Накатить SQL миграцию** на PostgreSQL:
   ```bash
   psql -d wfmconfig -f docs/migrations/001_add_logical_dependencies.sql
   ```
2. **Пересохранить все процессы** (или перезагрузить ветку), чтобы `logical_dependencies` заполнились для существующих записей.

---

## Следующая фаза (Releases + CRUD Migrations)

После завершения Dependencies:
1. **Releases Page в Hub** — список релизов, создание, preview
2. **Pending Changes** — автоматическое отслеживание изменений CRUD/Process/Config
3. **CRUD Migration Analyzer** — safe preview + rollback scripts
4. **Integration** — связь pending changes → release → deploy
