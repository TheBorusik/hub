import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { Plus, X, Save, ChevronDown, ChevronRight, Database, Braces } from "lucide-react";
import type { ViewerDataFilter, ViewerFilterType } from "@/lib/ws-api-models";
import type { ViewerTab } from "../types";

/** Ключ в localStorage, хранящий, какие секции фильтров свернуты. */
const COLLAPSE_KEY = "wfm.viewer.filters.collapse";

type CollapseState = { standard: boolean; custom: boolean };

function loadCollapse(): CollapseState {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    if (!raw) return { standard: false, custom: false };
    return { standard: false, custom: false, ...JSON.parse(raw) };
  } catch {
    return { standard: false, custom: false };
  }
}

function saveCollapse(state: CollapseState) {
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(state));
  } catch {
    // localStorage недоступен — игнорируем, UI отработает и с дефолтами.
  }
}

/**
 * Фильтры, применяемые к списку процессов в Viewer. Комбинация из двух частей:
 *  - Встроенный фильтр по дате (timestamp колонки; для Completed — EndTimestamp,
 *    для Manual/Idle — UpdateTimestamp) реализован отдельно (`dateRange`).
 *  - Набор кастомных полей — фильтры по JSONB-колонке `search` (см. серверную
 *    миграцию `002_add_search_jsonb.sql`). `FilterName` для них идёт с префиксом
 *    `search.` + ключ в JSONB (например, `search.OrderId`).
 */
export interface ViewerFiltersState {
  dateFrom: string | null;
  dateTo:   string | null;
  /** Фильтры по стандартным колонкам таблицы (processid, name, authid, …). */
  standard: StandardFilters;
  /** Произвольные фильтры по ключам JSONB-колонки `search`. */
  custom:   CustomFilterRow[];
}

/**
 * Значения стандартных фильтров. Пустая строка = фильтр не применяется.
 * Поля `*Op` — выбранный оператор сравнения для соответствующего поля.
 */
export interface StandardFilters {
  /** `processid` — можно указывать один id или список через запятую (In). */
  processId:     string;
  /** `name`. */
  name:          string;
  nameOp:        "Equal" | "Contains" | "StartsWith";
  /** `operationid`. */
  operationId:   string;
  operationIdOp: "Equal" | "Contains";
  /** `authid` — long. */
  authId:        string;
  /** `resultcode` — есть только в `completed_processes` (Completed tab). */
  resultCode:    string;
}

export interface CustomFilterRow {
  id:       string;
  key:      string;
  operator: "Equal" | "Contains" | "StartsWith" | "GreaterThan" | "LessThan" | "In";
  value:    string;
  fieldType: ViewerFilterType;
}

export const EMPTY_STANDARD_FILTERS: StandardFilters = {
  processId:     "",
  name:          "",
  nameOp:        "Contains",
  operationId:   "",
  operationIdOp: "Equal",
  authId:        "",
  resultCode:    "",
};

export const EMPTY_FILTERS: ViewerFiltersState = {
  dateFrom: null,
  dateTo:   null,
  standard: EMPTY_STANDARD_FILTERS,
  custom:   [],
};

interface FilterPreset {
  name: string;
  state: ViewerFiltersState;
}

const PRESETS_KEY = (tab: ViewerTab) => `wfm.viewer.filter-presets.${tab}`;

function loadPresets(tab: ViewerTab): FilterPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY(tab));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FilterPreset[];
    // Миграция старых пресетов: до появления `standard` поле отсутствовало;
    // подставляем пустые дефолты, чтобы UI не падал.
    return parsed.map((p) => ({
      ...p,
      state: {
        ...EMPTY_FILTERS,
        ...p.state,
        standard: { ...EMPTY_STANDARD_FILTERS, ...(p.state?.standard ?? {}) },
        custom: p.state?.custom ?? [],
      },
    }));
  } catch {
    return [];
  }
}

function savePresets(tab: ViewerTab, presets: FilterPreset[]) {
  try {
    localStorage.setItem(PRESETS_KEY(tab), JSON.stringify(presets));
  } catch {
    // localStorage may be unavailable (SSR, private mode) — silently ignore.
  }
}

/**
 * Преобразует UI-состояние фильтров в серверный формат `DataFilter[]`
 * (см. `GetCompletedProcessesHandler.DataFilter`). Временная колонка
 * зависит от таба.
 */
export function buildServerFilters(
  state: ViewerFiltersState,
  tab: ViewerTab,
): ViewerDataFilter[] {
  const result: ViewerDataFilter[] = [];
  const dateField = tab === "completed" ? "endtimestamp" : "updatetimestamp";

  if (state.dateFrom && state.dateTo) {
    result.push({
      FilterName: dateField,
      FieldType: "DateTime",
      ComparisonOperator: "Between",
      Values: [state.dateFrom, state.dateTo],
    });
  } else if (state.dateFrom) {
    result.push({
      FilterName: dateField,
      FieldType: "DateTime",
      ComparisonOperator: "GreaterThanOrEqual",
      Values: [state.dateFrom],
    });
  } else if (state.dateTo) {
    result.push({
      FilterName: dateField,
      FieldType: "DateTime",
      ComparisonOperator: "LessThanOrEqual",
      Values: [state.dateTo],
    });
  }

  // --- Стандартные колонки (работают на стороне БД через ConditionValue) ---
  const std = state.standard;

  const processIdRaw = std.processId.trim();
  if (processIdRaw) {
    const ids = processIdRaw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x));
    if (ids.length === 1) {
      result.push({
        FilterName: "processid",
        FieldType: "Long",
        ComparisonOperator: "Equal",
        Values: [ids[0]],
      });
    } else if (ids.length > 1) {
      result.push({
        FilterName: "processid",
        FieldType: "Long",
        ComparisonOperator: "In",
        Values: ids,
      });
    }
  }

  if (std.name.trim()) {
    result.push({
      FilterName: "name",
      FieldType: "String",
      ComparisonOperator: std.nameOp,
      Values: [std.name.trim()],
    });
  }

  if (std.operationId.trim()) {
    result.push({
      FilterName: "operationid",
      FieldType: "String",
      ComparisonOperator: std.operationIdOp,
      Values: [std.operationId.trim()],
    });
  }

  if (std.authId.trim()) {
    const n = Number(std.authId.trim());
    if (Number.isFinite(n)) {
      result.push({
        FilterName: "authid",
        FieldType: "Long",
        ComparisonOperator: "Equal",
        Values: [n],
      });
    }
  }

  // ResultCode — живёт только в completed_processes. На Manual/Idle
  // такого столбца нет, сервер бросит ошибку → не шлём.
  if (tab === "completed" && std.resultCode.trim()) {
    result.push({
      FilterName: "resultcode",
      FieldType: "String",
      ComparisonOperator: "Equal",
      Values: [std.resultCode.trim()],
    });
  }

  // --- Произвольные ключи JSONB-колонки `search` ---
  for (const row of state.custom) {
    const key = row.key.trim();
    const value = row.value.trim();
    if (!key || !value) continue;

    const values = row.operator === "In"
      ? value.split(",").map((x) => x.trim()).filter(Boolean)
      : [value];

    result.push({
      FilterName: `search.${key}`,
      FieldType: row.fieldType,
      ComparisonOperator: row.operator,
      Values: values,
    });
  }

  return result;
}

interface ProcessFiltersPanelProps {
  tab: ViewerTab;
  value: ViewerFiltersState;
  onChange: (next: ViewerFiltersState) => void;
  onApply: () => void;
}

export function ProcessFiltersPanel({ tab, value, onChange, onApply }: ProcessFiltersPanelProps) {
  const [presets, setPresets] = useState<FilterPreset[]>(() => loadPresets(tab));
  const [presetName, setPresetName] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);

  const [collapse, setCollapse] = useState<CollapseState>(() => loadCollapse());
  const toggleSection = (key: keyof CollapseState) => {
    const next = { ...collapse, [key]: !collapse[key] };
    setCollapse(next);
    saveCollapse(next);
  };

  // Сколько активных фильтров в каждой секции — показываем в заголовке,
  // чтобы после сворачивания было видно, что фильтры не забыты.
  const std = value.standard;
  const standardCount =
    (value.dateFrom ? 1 : 0) +
    (value.dateTo ? 1 : 0) +
    (std.processId.trim() ? 1 : 0) +
    (std.name.trim() ? 1 : 0) +
    (std.operationId.trim() ? 1 : 0) +
    (std.authId.trim() ? 1 : 0) +
    (tab === "completed" && std.resultCode.trim() ? 1 : 0);
  const customCount = value.custom.filter((r) => r.key.trim() && r.value.trim()).length;

  useEffect(() => {
    setPresets(loadPresets(tab));
  }, [tab]);

  // Закрытие выпадашки `Presets` по клику вне неё / по Escape.
  // Listener вешаем только пока меню открыто — чтобы не шуметь.
  useEffect(() => {
    if (!showPresets) return;

    const onMouseDown = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPresets(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showPresets]);

  const addCustom = useCallback(() => {
    onChange({
      ...value,
      custom: [
        ...value.custom,
        {
          id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          key: "",
          operator: "Equal",
          value: "",
          fieldType: "String",
        },
      ],
    });
  }, [value, onChange]);

  const updateCustom = (id: string, patch: Partial<CustomFilterRow>) => {
    onChange({
      ...value,
      custom: value.custom.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const removeCustom = (id: string) => {
    onChange({ ...value, custom: value.custom.filter((r) => r.id !== id) });
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const next = [...presets.filter((p) => p.name !== name), { name, state: value }];
    setPresets(next);
    savePresets(tab, next);
    setPresetName("");
  };

  const applyPreset = (preset: FilterPreset) => {
    onChange(preset.state);
    setShowPresets(false);
  };

  const deletePreset = (name: string) => {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    savePresets(tab, next);
  };

  const setStd = (patch: Partial<StandardFilters>) =>
    onChange({ ...value, standard: { ...value.standard, ...patch } });

  const reset = () => onChange(EMPTY_FILTERS);

  return (
    <div
      className="flex flex-col shrink-0"
      style={{ padding: 8, gap: 8, borderBottom: "1px solid var(--color-border)", background: "rgba(255,255,255,0.02)" }}
    >
      {/* ============================================================
           Секция Standard — фильтры по физическим колонкам таблицы
           processes / completed_processes. Идут в WHERE как обычные
           индексы, а не через JSONB.
           ============================================================ */}
      <SectionHeader
        icon={<Database size={12} />}
        label="Standard"
        hint="columns of processes / completed_processes"
        count={standardCount}
        collapsed={collapse.standard}
        onToggle={() => toggleSection("standard")}
      />

      {!collapse.standard && (
        <div className="flex flex-col" style={{ gap: 6, paddingLeft: 14 }}>
          <div className="flex items-center" style={{ gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", width: 44 }}>Date</span>
            <input
              type="datetime-local"
              value={value.dateFrom ?? ""}
              onChange={(e) => onChange({ ...value, dateFrom: e.target.value || null })}
              style={{ flex: 1, fontSize: 11, minWidth: 0 }}
            />
            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>—</span>
            <input
              type="datetime-local"
              value={value.dateTo ?? ""}
              onChange={(e) => onChange({ ...value, dateTo: e.target.value || null })}
              style={{ flex: 1, fontSize: 11, minWidth: 0 }}
            />
          </div>

          <div className="flex items-center" style={{ gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", width: 44 }}>ID</span>
            <input
              type="text"
              placeholder="ProcessId (или через запятую)"
              value={value.standard.processId}
              onChange={(e) => setStd({ processId: e.target.value })}
              style={{ flex: 1, fontSize: 11, minWidth: 0 }}
            />
            <input
              type="text"
              placeholder="AuthId"
              value={value.standard.authId}
              onChange={(e) => setStd({ authId: e.target.value })}
              style={{ width: 96, fontSize: 11 }}
            />
          </div>

          <div className="flex items-center" style={{ gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", width: 44 }}>Name</span>
            <select
              value={value.standard.nameOp}
              onChange={(e) => setStd({ nameOp: e.target.value as StandardFilters["nameOp"] })}
              style={{ fontSize: 11 }}
            >
              <option value="Contains">contains</option>
              <option value="Equal">=</option>
              <option value="StartsWith">starts</option>
            </select>
            <input
              type="text"
              placeholder="Process name"
              value={value.standard.name}
              onChange={(e) => setStd({ name: e.target.value })}
              style={{ flex: 1, fontSize: 11, minWidth: 0 }}
            />
          </div>

          <div className="flex items-center" style={{ gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", width: 44 }}>OpId</span>
            <select
              value={value.standard.operationIdOp}
              onChange={(e) => setStd({ operationIdOp: e.target.value as StandardFilters["operationIdOp"] })}
              style={{ fontSize: 11 }}
            >
              <option value="Equal">=</option>
              <option value="Contains">contains</option>
            </select>
            <input
              type="text"
              placeholder="OperationId"
              value={value.standard.operationId}
              onChange={(e) => setStd({ operationId: e.target.value })}
              style={{ flex: 1, fontSize: 11, minWidth: 0 }}
            />
            {tab === "completed" && (
              <input
                type="text"
                placeholder="ResultCode"
                value={value.standard.resultCode}
                onChange={(e) => setStd({ resultCode: e.target.value })}
                style={{ width: 140, fontSize: 11 }}
              />
            )}
          </div>
        </div>
      )}

      {/* ============================================================
           Секция JSONB — произвольные поля из колонки `search`.
           Работают через GIN-индекс, ключ строится как search.<Key>.
           ============================================================ */}
      <SectionHeader
        icon={<Braces size={12} />}
        label="Custom"
        hint="custom fields stored in `search` jsonb column"
        count={customCount}
        collapsed={collapse.custom}
        onToggle={() => toggleSection("custom")}
      />

      {!collapse.custom && (
        <div className="flex flex-col" style={{ gap: 6, paddingLeft: 14 }}>
          {value.custom.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", padding: "2px 0" }}>
              No custom filters. Use <b>+ Filter</b> to add a filter on <code>search.Key</code>.
            </div>
          )}
          {value.custom.map((row) => (
            <div key={row.id} className="flex items-center" style={{ gap: 4 }}>
              <input
                type="text"
                placeholder="search.Key"
                value={row.key}
                onChange={(e) => updateCustom(row.id, { key: e.target.value })}
                style={{ flex: 1, fontSize: 11, minWidth: 0 }}
              />
              <select
                value={row.operator}
                onChange={(e) => updateCustom(row.id, { operator: e.target.value as CustomFilterRow["operator"] })}
                style={{ fontSize: 11 }}
              >
                <option value="Equal">=</option>
                <option value="Contains">contains</option>
                <option value="StartsWith">starts</option>
                <option value="GreaterThan">&gt;</option>
                <option value="LessThan">&lt;</option>
                <option value="In">in</option>
              </select>
              <select
                value={row.fieldType}
                onChange={(e) => updateCustom(row.id, { fieldType: e.target.value as ViewerFilterType })}
                style={{ fontSize: 11 }}
              >
                <option value="String">str</option>
                <option value="Long">num</option>
                <option value="DateTime">date</option>
              </select>
              <input
                type="text"
                placeholder="value"
                value={row.value}
                onChange={(e) => updateCustom(row.id, { value: e.target.value })}
                style={{ flex: 1, fontSize: 11, minWidth: 0 }}
              />
              <button
                onClick={() => removeCustom(row.id)}
                className="toolbar-btn"
                title="Remove filter"
                style={{ padding: 2 }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <div>
            <button
              onClick={addCustom}
              className="toolbar-btn"
              title="Add custom filter on JSONB search.* field"
              style={{ fontSize: 11, padding: "2px 6px", display: "flex", alignItems: "center", gap: 4 }}
            >
              <Plus size={12} /> Filter
            </button>
          </div>
        </div>
      )}

      {/* Toolbar --------------------------------------------------- */}
      <div className="flex items-center" style={{ gap: 6 }}>
        <div ref={presetsRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowPresets((v) => !v)}
            className="toolbar-btn"
            style={{ fontSize: 11, padding: "2px 6px", display: "flex", alignItems: "center", gap: 4 }}
          >
            Presets <ChevronDown size={12} />
          </button>
          {showPresets && (
            <div
              style={{
                position: "absolute", top: "100%", left: 0, zIndex: 10,
                background: "var(--color-sidebar)", border: "1px solid var(--color-border)",
                minWidth: 200, padding: 6,
              }}
            >
              {presets.length === 0 && (
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", padding: "2px 4px" }}>
                  No saved presets
                </div>
              )}
              {presets.map((p) => (
                <div key={p.name} className="flex items-center" style={{ gap: 4, padding: "2px 0" }}>
                  <button
                    onClick={() => applyPreset(p)}
                    className="flex-1"
                    style={{ fontSize: 11, textAlign: "left", background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: "2px 4px" }}
                  >
                    {p.name}
                  </button>
                  <button
                    onClick={() => deletePreset(p.name)}
                    className="toolbar-btn"
                    style={{ padding: 2 }}
                    title="Delete preset"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <div className="flex items-center" style={{ gap: 4, marginTop: 6, borderTop: "1px solid var(--color-border)", paddingTop: 6 }}>
                <input
                  type="text"
                  placeholder="Name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  style={{ flex: 1, fontSize: 11 }}
                />
                <button
                  onClick={savePreset}
                  className="toolbar-btn"
                  title="Save current filters as preset"
                  style={{ padding: 2 }}
                >
                  <Save size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={reset}
          className="toolbar-btn"
          style={{ fontSize: 11, padding: "2px 6px" }}
        >
          Reset
        </button>
        <button
          onClick={onApply}
          style={{
            marginLeft: "auto",
            fontSize: 11,
            padding: "2px 10px",
            background: "var(--color-accent)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

interface SectionHeaderProps {
  icon: ReactNode;
  label: string;
  hint?: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * Заголовок сворачиваемой секции фильтров. Имеет чёткий "каретный" индикатор,
 * иконку-приставку, подпись и бейдж с количеством активных фильтров внутри
 * (чтобы после сворачивания секции было понятно, что фильтры не забыты).
 */
function SectionHeader({ icon, label, hint, count, collapsed, onToggle }: SectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      title={hint}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 2px",
        fontSize: 11,
        background: "transparent",
        border: "none",
        color: "var(--color-text)",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
      }}
    >
      {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
      {icon}
      <span style={{ fontWeight: 600 }}>{label}</span>
      {count > 0 && (
        <span
          style={{
            marginLeft: 4,
            background: "var(--color-accent)",
            color: "#fff",
            borderRadius: 8,
            padding: "0 5px",
            fontSize: 10,
            minWidth: 16,
            height: 14,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {count}
        </span>
      )}
      {hint && (
        <span style={{ marginLeft: 6, color: "var(--color-text-muted)", fontSize: 10, fontWeight: 400 }}>
          {hint}
        </span>
      )}
    </button>
  );
}
