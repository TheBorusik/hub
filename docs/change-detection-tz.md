# ТЗ: Change Detection для SAL.CRUD и SAL.ProcessHandler

## 1. Цель
Минимизировать накладные расходы при обновлении конфигурации CRUD-моделей и Process Handler-ов:
- **Configurator**: избежать повторной компиляции Roslyn и записи в БД, если `source_cs` не изменился.
- **Runtime**: избежать пересоздания `AssemblyLoadContext`, повторной загрузки сборок и перерегистрации хендлеров, если набор сборок и их содержимое не изменились.

## 2. Текущая проблема

### 2.1 SAL.CRUD Configurator
`CRUDAssemblyManager.CompileAndPersistAsync()` всегда:
1. Генерирует `source_cs` через `SyntaxBuilder`
2. Компилирует через `CRUDAssemblyCompiler.Compile()` (~100-500 мс на модель)
3. Выполняет `UpsertAsync()` — PostgreSQL `ON CONFLICT DO UPDATE` перезаписывает `pe_bytes`, `pdb_bytes`, `content_sha256`, `modify_timestamp`

При массовом обновлении (10-50 моделей) это приводит к лишней нагрузке на CPU и БД.

### 2.2 SAL.ProcessHandler Configurator
`ProcessAssemblyManager.CompileAndPersistAsync()` ведёт себя аналогично — всегда компилирует и upsert-ит Front/Back процессы.

### 2.3 SAL.CRUD Runtime
`DatabaseCRUDProvider.ReloadFromDb()` при каждом `CrudArtifactsUpdatedEvent`:
1. Создаёт новый collectible `AssemblyLoadContext`
2. Загружает **все** сборки из БД в память
3. Создаёт репозитории и инициализирует их (`InitializeRuntimeAsync()`)
4. Регистрирует все executors и handlers заново

Даже если event пришёл по одной модели, перезагружается всё.

### 2.4 SAL.ProcessHandler Runtime
`BackProcessRuntimeProvider.ReloadFromDb()` и `FrontProcessRuntimeProvider.ReloadFromDb()` аналогично пересоздают ALC и перезагружают все сборки.

## 3. Общее решение

### 3.1 Change Detection на уровне Source Code
Использовать **SHA-256 от `source_cs`** (а не от `pe_bytes`) как fingerprint сборки:
- Компиляция Roslyn **не детерминирована по умолчанию** — `pe_bytes` может отличаться при одинаковом `source_cs` из-за таймстампов в метаданных сборки.
- `source_cs` — это единственный источник истины; его хеш гарантированно изменится при любом изменении конфигурации.

### 3.2 Semantics поля `content_sha256`
Поле `content_sha256` в обеих таблицах уже существует, но сейчас хранит хеш `pe_bytes`. **Переиспользуем его** для хранения хеша `source_cs`:
- Не требуется миграция БД
- Не требуется изменение схемы таблиц
- Обновляем комментарий в миграции ProcessHandler

> **Важно**: При первом деплое после этого изменения все существующие записи получат «устаревший» `content_sha256` (бывший хеш `pe_bytes`). Это приведёт к **однократной** перекомпиляции всех моделей при следующем upsert. Это приемлемо.

## 4. Детальные изменения

### 4.1 SAL.CRUD — Configurator

**Файл**: `SAL.CRUD.Configurator/Managers/CRUDAssemblyManager.cs`

**Алгоритм `CompileAndPersistAsync(ModelConfig config, string branch)`**:
```csharp
public async Task CompileAndPersistAsync(ModelConfig config, string branch = "master")
{
    var sourceCs = SyntaxBuilder.GetSyntaxTree(config);
    var sourceHash = ComputeSha256(sourceCs); // SHA-256 от строки sourceCs

    var existing = await _repository.GetByNameAsync(config.Name, branch, "draft");
    if (existing != null && existing.ContentSha256 == sourceHash)
    {
        // Модель не изменилась — пропускаем компиляцию и запись
        return;
    }

    var (peBytes, pdbBytes, _) = CRUDAssemblyCompiler.Compile(sourceCs, config.AssemblyName());

    var entity = new CRUDAssemblyEntity
    {
        ModelName = config.Name,
        Branch = branch,
        Origin = "draft",
        Type = config.Type,
        SourceCs = sourceCs,
        PeBytes = peBytes,
        PdbBytes = pdbBytes,
        ContentSha256 = sourceHash,  // ← хеш sourceCs
        ModifyTimestamp = DateTime.UtcNow
    };

    await _repository.UpsertAsync(entity);
}
```

**Алгоритм `CompileAndPersistAsync(ModelConfig[] configs, string branch)`**:
```csharp
public async Task CompileAndPersistAsync(ModelConfig[] configs, string branch = "master")
{
    var existing = await _repository.GetCompiledByBranchAsync(branch);
    var incomingNames = configs.Select(c => c.Name).ToHashSet();

    // Удаляем отсутствующие (без изменений)
    foreach (var entity in existing.Where(e => !incomingNames.Contains(e.ModelName)))
    {
        await _repository.DeleteAsync(entity.ModelName, branch, entity.Origin);
    }

    var changedModelNames = new List<string>();
    foreach (var config in configs)
    {
        var changed = await CompileAndPersistAsync(config, branch); // true если скомпилировано
        if (changed) changedModelNames.Add(config.Name);
    }

    // Публикуем event только если есть изменения
    if (changedModelNames.Count > 0)
    {
        await PublishArtifactsUpdatedAsync(branch, changedModelNames.ToArray());
    }
}
```

> **Примечание**: `CompileAndPersistAsync(ModelConfig, string)` возвращает `bool` — `true` если была выполнена компиляция и запись.

**Файл**: `SAL.CRUD.Configurator/Compiler/CRUDAssemblyCompiler.cs`
- Метод `ComputeSha256(byte[])` больше не нужен на уровне менеджера, но остаётся в компиляторе для внутреннего использования.
- Добавить хелпер `ComputeSha256(string)` в `CRUDAssemblyManager` (или shared utility).

### 4.2 SAL.ProcessHandler — Configurator

**Файл**: `SAL.ProcessHandler.Configurator/Managers/ProcessAssemblyManager.cs`

**Алгоритм `CompileAndPersistAsync(IProcessConfig config, string type, string branch)`**:
```csharp
public async Task<bool> CompileAndPersistAsync(IProcessConfig config, string type, string branch = "master")
{
    var sourceCs = SyntaxBuilder.GetSyntaxTree(config);
    var sourceHash = ComputeSha256(sourceCs);

    var existing = await _repository.GetByNameAsync(config.ProcessName, branch, "draft");
    if (existing != null && existing.ContentSha256 == sourceHash)
    {
        return false;
    }

    var (peBytes, pdbBytes, _) = ProcessHandlerCompiler.Compile(sourceCs, config.AssemblyName());

    var entity = new ProcessHandlerAssemblyEntity
    {
        ProcessName = config.ProcessName,
        Branch = branch,
        Origin = "draft",
        Type = type,
        SourceCs = sourceCs,
        PeBytes = peBytes,
        PdbBytes = pdbBytes,
        ContentSha256 = sourceHash,
        ModifyTimestamp = DateTime.UtcNow
    };

    await _repository.UpsertAsync(entity);
    return true;
}
```

**Алгоритм `CompileAndPersistAsync(IProcessConfig[] configs, string type, string branch)`**:
```csharp
public async Task CompileAndPersistAsync(IProcessConfig[] configs, string type, string branch = "master")
{
    var existing = await _repository.GetCompiledByBranchAndTypeAsync(branch, type);
    var incomingNames = configs.Select(c => c.ProcessName).ToHashSet();

    foreach (var entity in existing.Where(e => !incomingNames.Contains(e.ProcessName)))
    {
        await _repository.DeleteAsync(entity.ProcessName, branch, entity.Origin);
    }

    var changedNames = new List<string>();
    foreach (var config in configs)
    {
        if (await CompileAndPersistAsync(config, type, branch))
            changedNames.Add(config.ProcessName);
    }

    if (changedNames.Count > 0)
    {
        await PublishArtifactsUpdatedAsync(branch, type, changedNames.ToArray());
    }
}
```

### 4.3 SAL.CRUD — Runtime

**Файл**: `SAL.CRUD.Runtime/Providers/DatabaseCRUDProvider.cs`

**Алгоритм `ReloadFromDb()`**:
```csharp
public async Task ReloadFromDb()
{
    var entities = await _repository.GetCompiledByBranchAsync("master");
    var currentModelNames = new HashSet<string>();
    var changedModelNames = new HashSet<string>();

    // Определяем, какие модели изменились или появились
    foreach (var entity in entities)
    {
        currentModelNames.Add(entity.ModelName);
        if (_models.TryGetValue(entity.ModelName, out var state) 
            && state.Entity.ContentSha256 == entity.ContentSha256)
        {
            // Модель не изменилась — оставляем как есть
            continue;
        }
        changedModelNames.Add(entity.ModelName);
    }

    // Определяем удалённые модели
    var deletedModelNames = _models.Keys.Where(m => !currentModelNames.Contains(m)).ToList();

    // Если нет изменений — ничего не делаем
    if (changedModelNames.Count == 0 && deletedModelNames.Count == 0)
    {
        _logger.LogInformation("CRUD reload skipped: no changes detected");
        return;
    }

    // Далее — существующая логика reload, но только для changed + deleted
    var oldContext = _loadContext;
    var previouslyRegistered = new List<string>(_registeredCommands);
    var previouslyLoaded = new List<string>(_models.Keys);

    // Переносим неизменённые модели во временный словарь
    var preservedModels = new Dictionary<string, CRUDModelState>();
    foreach (var name in _models.Keys)
    {
        if (!changedModelNames.Contains(name) && !deletedModelNames.Contains(name))
        {
            preservedModels[name] = _models[name];
        }
    }

    _models.Clear();
    _registeredCommands.Clear();
    _loadContext = new AssemblyLoadContext("SAL.CRUD", isCollectible: true);

    // Перезагружаем только изменённые и неизменённые (необходимо из-за нового ALC)
    // Неизменённые перезагружаем из старого state (или заново из БД — проще заново)
    foreach (var entity in entities)
    {
        try
        {
            var (modelName, commandNames) = LoadAndRegister(entity);
            if (!string.IsNullOrEmpty(modelName))
                currentModelNames.Add(modelName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load CRUD model '{ModelName}', skipping", entity.ModelName);
        }
    }

    // Orphaned cleanup (как сейчас)
    // ... (существующий код unregister для commands и models)

    oldContext?.Unload();
}
```

**Оптимизация ALC**: Поскольку `AssemblyLoadContext` нельзя частично выгрузить, при любом изменении хотя бы одной модели всё равно придётся пересоздать ALC и перезагрузить все сборки. **Но**:
- Если изменений нет — `ReloadFromDb()` возвращается мгновенно, без создания ALC.
- Если изменилась 1 модель из 50 — всё равно перезагружаем все 50 (ограничение ALC). Это приемлемо.

**Альтернатива (ALC per-assembly)** — вынести в отдельную задачу, если потребуется гранулярная выгрузка.

### 4.4 SAL.ProcessHandler — Runtime

**Файл**: `SAL.ProcessHandler.Runtime/Providers/BackProcessRuntimeProvider.cs`
**Файл**: `SAL.ProcessHandler.Runtime/Providers/FrontProcessRuntimeProvider.cs`

Аналогичная логика:

```csharp
public async Task ReloadFromDb()
{
    var entities = await _repository.GetCompiledByBranchAndTypeAsync(_currentBranch, ConfigTypes.Back);
    
    // Проверяем, изменилось ли что-то
    var currentNames = entities.Select(e => e.ProcessName).ToHashSet();
    var currentHashes = entities.ToDictionary(e => e.ProcessName, e => e.ContentSha256);
    
    bool anyChanges = false;
    foreach (var entity in entities)
    {
        if (!_assemblies.ContainsKey(entity.ProcessName) || 
            _entityHashes.GetValueOrDefault(entity.ProcessName) != entity.ContentSha256)
        {
            anyChanges = true;
            break;
        }
    }
    // Проверяем удаления
    if (!anyChanges)
    {
        foreach (var name in _assemblies.Keys)
        {
            if (!currentNames.Contains(name))
            {
                anyChanges = true;
                break;
            }
        }
    }

    if (!anyChanges)
    {
        _logger.LogInformation("BackProcessHandler reload skipped: no changes detected");
        return;
    }

    // Существующая логика reload...
}
```

Для реализации потребуется расширить хранение состояния:

**В `BackProcessRuntimeProvider`**:
```csharp
private readonly ConcurrentDictionary<string, (Assembly Assembly, string ContentSha256)> _assemblies = new();
```

Или добавить отдельный `Dictionary<string, string> _entityHashes`.

Аналогично для `FrontProcessRuntimeProvider`.

## 5. Изменения в структурах данных

### 5.1 SAL.CRUD.Data
Никаких изменений сущностей и репозиториев **не требуется**. Поле `ContentSha256` уже есть.

### 5.2 SAL.ProcessHandler.Data
Никаких изменений сущностей и репозиториев **не требуется**.

### 5.3 Миграции
Не требуются. Обновить комментарий в `001_create_process_handler_assemblies.sql` (опционально):
```sql
-- Было:
-- comment on column public.process_handler_assemblies.content_sha256 is 'SHA-256 хеш pe_bytes для определения изменений.';
-- Стало:
comment on column public.process_handler_assemblies.content_sha256 is 'SHA-256 хеш source_cs для определения изменений.';
```

## 6. Утилита ComputeSha256(string)

Добавить в shared location (например, `SAL.CRUD.Core/Infrastructure` или `SAL.ProcessHandler.Core/Infrastructure`):

```csharp
public static class HashUtility
{
    public static string ComputeSha256(string input)
    {
        using var sha = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = sha.ComputeHash(bytes);
        return Convert.ToHexString(hash);
    }
}
```

Или скопировать в оба проекта (Configurator).

## 7. Логирование

Добавить `LogInformation` при skip:
- `"CRUD model '{ModelName}' skipped: source unchanged (SHA256 match)"`
- `"Process '{ProcessName}' skipped: source unchanged (SHA256 match)"`
- `"CRUD reload skipped: no changes detected"`
- `"BackProcessHandler reload skipped: no changes detected"`

## 8. Риски и ограничения

| Риск | Митигация |
|------|-----------|
| Первый upsert после деплоя перекомпилирует всё, т.к. `content_sha256` содержит старый хеш `pe_bytes` | Приемлемо — однократная перекомпиляция |
| Deterministic compilation не включена — если в будущем понадобится `pe_bytes` hash, его можно вычислить ad-hoc | Не критично |
| Runtime всё ещё перезагружает **все** сборки при изменении одной (ограничение ALC) | Приемлемо для текущей задачи. ALC-per-assembly — отдельная задача |
| `GetByNameAsync` добавляет 1 запрос в БД на модель при bulk upsert | Можно оптимизировать: `GetCompiledByBranchAsync` + in-memory dictionary |

## 9. Оптимизация bulk lookup (опционально)

Чтобы избежать N+1 запросов в `CompileAndPersistAsync(ModelConfig[] configs)`:

```csharp
var existing = await _repository.GetCompiledByBranchAsync(branch);
var existingByName = existing.ToDictionary(e => e.ModelName);

foreach (var config in configs)
{
    if (existingByName.TryGetValue(config.Name, out var entity) 
        && entity.ContentSha256 == ComputeSha256(SyntaxBuilder.GetSyntaxTree(config)))
    {
        continue; // skip
    }
    // ... compile and upsert
}
```

Это рекомендуется сделать сразу.

## 10. Порядок реализации

1. **SAL.CRUD Configurator**:
   - `CRUDAssemblyManager` — source hash comparison, bulk lookup optimization
   - `ComputeSha256(string)` utility
   - Тест: upsert одной модели дважды → второй раз skip

2. **SAL.ProcessHandler Configurator**:
   - `ProcessAssemblyManager` — аналогичные изменения
   - Тест: upsert одного процесса дважды → второй раз skip

3. **SAL.CRUD Runtime**:
   - `DatabaseCRUDProvider.ReloadFromDb()` — early exit если нет изменений
   - Тест: вызвать ReloadFromDb дважды без изменений в БД → второй раз skip

4. **SAL.ProcessHandler Runtime**:
   - `BackProcessRuntimeProvider.ReloadFromDb()` — early exit
   - `FrontProcessRuntimeProvider.ReloadFromDb()` — early exit
   - Тест: аналогично

5. **Обновить комментарий в миграции ProcessHandler** (опционально)

6. **Регрессионное тестирование**:
   - Изменение модели → компиляция + reload
   - Удаление модели → cleanup
   - Добавление модели → компиляция + reload
   - Неизменённый bulk upsert → все skip
