# CRUD Editor Improvements — Техническое Задание

## 1. Контекст

Текущий CRUD-редактор (`hub/src/pages/crud-editor`) имеет упрощённую модель данных и базовое редактирование записей. Необходимо привести его в соответствие с бэкенд-моделями `ModelConfig` (SalGenericCRUDHandler) и `PropertyConfig` (SAL3), добавить полноценную типизацию полей, валидацию и корректную работу с ключом.

## 2. Источник правды — бэкенд модели

### 2.1 ModelConfig (SalGenericCRUDHandler)
```csharp
public class ModelConfig
{
    public string           Name        { get; set; }
    public string           Table       { get; set; }
    public string           ServiceType { get; set; }
    public string           KeyName     { get; set; } = "Id";
    public string           KeyType     { get; set; } = "long";
    public string           Type        { get; set; }       // Simple | History | DapperSimple | DapperHistory
    public bool             Identity    { get; set; } = true;
    public PropertyConfig[] Properties  { get; set; }
    public string[]         Handlers    { get; set; }
}
```

**Важно:** `KeyName` + `KeyType` НЕ входят в `Properties`. `Identity=true` означает автоинкремент (ключ нельзя задавать вручную). `Identity=false` — ключ задаётся пользователем.

### 2.2 PropertyConfig (SAL3)
```csharp
public class PropertyConfig : PropertyValidation
{
    public string           Name       { get; set; }
    public string           Type       { get; set; }
    public bool             IsRequired { get; set; }
    public PropertyConfig[] Properties { get; set; }       // для вложенных JObject/JArray
}

public class PropertyValidation
{
    public string   Pattern               { get; set; }
    public string   PatternErrorMessage   { get; set; }
    public int?     Min                   { get; set; }
    public string   MinErrorMessage       { get; set; }
    public int?     Max                   { get; set; }
    public string   MaxErrorMessage       { get; set; }
    public int?     MaxLength             { get; set; }
    public string   MaxLengthErrorMessage { get; set; }
    public int?     MinLength             { get; set; }
    public string   MinLengthErrorMessage { get; set; }
    public object[] Enums                 { get; set; } = Array.Empty<object>();
    public string   EnumsErrorMessage     { get; set; }
}
```

### 2.3 Поддерживаемые типы PropertyConfig.Type
- Целые: `int`, `int?`, `long`, `long?`
- Дробные: `decimal`, `decimal?`, `double`, `double?`, `float`, `float?`
- Строковые: `string`
- Булевы: `bool`, `bool?`
- Дата/время: `DateTime`, `DateTime?`
- JSON: `JObject`, `JArray`
- (возможны nullable-варианты с `?`)

---

## 3. Задачи

### 3.1 Расширение TypeScript типов (`types.ts`)

Обновить `CrudModel` и `CrudProperty`:

```typescript
export interface CrudModel {
  Name: string;
  ServiceType: string;
  KeyName: string;
  KeyType: string;           // NEW
  Type: string;
  Identity: boolean;         // NEW
  Table?: string | null;     // NEW
  Handlers: string[];
  Properties: CrudProperty[];
  ConfigTable?: string | null;
  [extra: string]: unknown;
}

export interface CrudProperty {
  Name: string;
  Type: string;
  IsRequired: boolean;
  // --- NEW validation fields ---
  Pattern?: string | null;
  PatternErrorMessage?: string | null;
  Min?: number | null;
  MinErrorMessage?: string | null;
  Max?: number | null;
  MaxErrorMessage?: string | null;
  MaxLength?: number | null;
  MaxLengthErrorMessage?: string | null;
  MinLength?: number | null;
  MinLengthErrorMessage?: string | null;
  Enums?: unknown[] | null;
  EnumsErrorMessage?: string | null;
  // nested properties for complex types
  Properties?: CrudProperty[] | null;
  [extra: string]: unknown;
}
```

### 3.2 Отображение ключа в таблице записей (`CrudDataTable`)

**Проблема:** сейчас ключ не отображается в таблице, потому что `KeyName` не входит в `Properties`.

**Решение:**
- Добавить колонку ключа **перед** всеми `Properties` (первая колонка)
- Заголовок: `model.KeyName` + маркер `*` (как сейчас для ключевых колонок)
- Тип колонки: `model.KeyType`
- Значение: `record[model.KeyName]`
- Для `JObject`/`JArray` значений ключа — кнопка "View JSON" (как для обычных JObject-полей)
- Сортировка и фильтрация по ключу должны работать

### 3.3 Редактирование записи (`RecordDialog`) — единый state

**Архитектура:** оставить единый `data: Record<string, unknown>` + `jsonText` для JSON-режима (как сейчас после рефакторинга).

#### 3.3.1 Ключ — отдельная логика

Ключ отображается **отдельно от `Properties`**, всегда первым полем в форме.

| Режим | Identity=true | Identity=false |
|-------|---------------|----------------|
| **Add** | Read-only, дефолтное значение (`0` / `""` в зависимости от `KeyType`) | Editable, обязательное поле |
| **Update** | Read-only, значение из записи | Read-only, значение из записи (PK нельзя менять при Update) |

**При переключении JSON → Field Editor:**
- Ключ восстанавливается из оригинального `record` (или текущего `data`), чтобы случайные изменения в JSON не перетёрли PK.

**При Submit:**
- Ключ подставляется из `data` независимо от режима (даже если в JSON его меняли).

#### 3.3.2 Рендеринг полей по типам

Каждое свойство из `model.Properties` рендерится в зависимости от `Type`:

| Type | UI-элемент | Атрибуты | Валидация |
|------|-----------|----------|-----------|
| `int`, `int?`, `long`, `long?` | `<input type="number">` | `step="1"` | `Min`, `Max` |
| `decimal`, `decimal?`, `double`, `double?`, `float`, `float?` | `<input type="number">` | `step="0.01"` (или `any`) | `Min`, `Max` |
| `string` | `<input type="text">` | — | `Pattern`, `MaxLength`, `MinLength` |
| `bool`, `bool?` | Checkbox (`<input type="checkbox">`) | — | — |
| `DateTime`, `DateTime?` | `<input type="datetime-local">` | — | — |
| `JObject`, `JArray` | `JsonEditor` (inline, высота ~180px) | — | — |
| `Enums` (если `Enums.length > 0`) | `<select>` dropdown | — | `Enums` |

**Nullable-типы (`?`):**
- Для чисел: `input[type="number"]` + допускается пустое значение (при submit → `null` или `undefined`)
- Для `bool?`: вместо checkbox — `<select>` с опциями: `[empty]`, `true`, `false`
- Для `DateTime?`: `datetime-local` + возможность очистки

**Валидация на клиенте (real-time или на submit):**
- `IsRequired` — красная `*` + ошибка если пусто
- `Pattern` — regex из пропа, сообщение `PatternErrorMessage`
- `Min` / `Max` — для чисел, сообщения `MinErrorMessage` / `MaxErrorMessage`
- `MaxLength` / `MinLength` — для строк, сообщения `MaxLengthErrorMessage` / `MinLengthErrorMessage`
- `Enums` — dropdown, ошибка `EnumsErrorMessage` (на всякий случай)

#### 3.3.3 Вложенные Properties (JObject / JArray)

**JObject с `Properties`:**
- Если у `PropertyConfig` тип `JObject` и есть `Properties` (вложенные поля), то вместо свободного JSON-редактора показывать вложенную форму с полями по типам (рекурсивно).
- Если `Properties` нет — обычный `JsonEditor`.

**JArray с `Properties`:**
- Если у `PropertyConfig` тип `JArray` и есть `Properties` — показывать список форм (массив объектов) с кнопками "Add item" / "Remove item".
- Если `Properties` нет — обычный `JsonEditor`.

### 3.4 Таблица записей — улучшения (`CrudDataTable`)

- **Ключ** — первая колонка, sticky при горизонтальном скролле (опционально)
- **Nullable-типы** — в таблице отображать пустую строку для `null` (сейчас может показывать `""` или `0`)
- **JObject/JArray** — кнопка `View JSON` (уже есть)
- **bool** — отображать как `true` / `false` / пусто (уже есть, но проверить для nullable)

### 3.5 JSON ↔ Field Editor синхронизация (уже сделано)

Оставить текущую логику:
- Field → JSON: `JSON.stringify(data, null, 2)`
- JSON → Field: `JSON.parse(jsonText)` + восстановление ключа из `data`
- Невалидный JSON при переключении → `alert("Invalid JSON")`, режим не меняется

---

## 4. Структура реализации (предлагаемая)

```
src/pages/crud-editor/
├── types.ts                          # расширенные CrudModel / CrudProperty
├── components/
│   ├── RecordDialog.tsx              # оркестратор (modal, toggle, submit, ключ)
│   ├── FieldEditor.tsx               # форма со всеми полями (NEW)
│   ├── PropertyField.tsx             # одно поле по типу (NEW)
│   ├── NestedObjectEditor.tsx        # вложенный JObject (NEW)
│   ├── ArrayEditor.tsx               # вложенный JArray (NEW)
│   ├── CrudDataTable.tsx             # + колонка ключа
│   └── ModelListPanel.tsx            # без изменений
```

**Минимальный вариант** (если без разбиения на компоненты):
- Всё оставить в `RecordDialog.tsx`, добавив helper-функции `renderPropertyField()` и `validateProperty()`.

---

## 5. Критерии приёмки

1. **Ключ в таблице:** при открытии любой CRUD-модели первая колонка — ключ, значения корректно отображаются.
2. **Ключ в диалоге:**
   - `Identity=true` + `Add` — ключ виден, read-only, дефолтное значение.
   - `Identity=false` + `Add` — ключ виден, editable, обязателен.
   - `Update` — ключ всегда read-only.
3. **Поля по типам:** `int` — только целые числа, `decimal` — с точкой, `DateTime` — datepicker, `bool` — checkbox, `bool?` — select с тремя вариантами.
4. **Валидация:** `IsRequired`, `Pattern`, `Min`/`Max`, `MaxLength`/`MinLength` работают и показывают кастомные сообщения из конфига.
5. **Enums:** если `Enums` задан — поле рендерится как `<select>` с допустимыми значениями.
6. **JSON ↔ Field:** изменения синхронизируются в обе стороны, ключ не перетирается.
7. **tsc + vite build** — без ошибок.

---

## 6. Что НЕ входит в это ТЗ (бэклог)

- Inline-редактирование прямо в таблице (double-click → edit)
- Drag-and-drop сортировка колонок
- Bulk operations (массовое удаление/обновление)
- Автокомплит для строковых полей с `Enums`
- Кэширование конфигураций моделей между открытиями
