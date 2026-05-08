import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { CrudProperty } from "../types";

const PROPERTY_TYPES = [
  "string",
  "int",
  "int?",
  "long",
  "long?",
  "decimal",
  "decimal?",
  "double",
  "double?",
  "float",
  "float?",
  "bool",
  "bool?",
  "DateTime",
  "DateTime?",
  "TimeSpan",
  "TimeSpan?",
  "Guid",
  "JObject",
  "JArray",
] as const;

interface PropertyArrayEditorProps {
  value: CrudProperty[];
  onChange: (value: CrudProperty[]) => void;
}

export function PropertyArrayEditor({ value, onChange }: PropertyArrayEditorProps) {
  const [items, setItems] = useState<CrudProperty[]>(value.length ? value : []);

  const updateItem = (index: number, patch: Partial<CrudProperty>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    setItems(next);
    onChange(next);
  };

  const addItem = () => {
    const next: CrudProperty[] = [...items, { Name: "", Type: "string", IsRequired: false }];
    setItems(next);
    onChange(next);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    onChange(next);
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= items.length) return;
    const next = [...items];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setItems(next);
    onChange(next);
  };

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {items.map((item, idx) => (
        <PropertyItemEditor
          key={idx}
          item={item}
          index={idx}
          onChange={(patch) => updateItem(idx, patch)}
          onRemove={() => removeItem(idx)}
          canMoveUp={idx > 0}
          canMoveDown={idx < items.length - 1}
          onMoveUp={() => moveItem(idx, -1)}
          onMoveDown={() => moveItem(idx, 1)}
        />
      ))}
      <button
        onClick={addItem}
        className="toolbar-btn"
        style={{ alignSelf: "flex-start", gap: 4, fontSize: 12 }}
      >
        <Plus size={14} /> Add Property
      </button>
    </div>
  );
}

interface PropertyItemEditorProps {
  item: CrudProperty;
  index: number;
  onChange: (patch: Partial<CrudProperty>) => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function PropertyItemEditor({
  item,
  index,
  onChange,
  onRemove,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: PropertyItemEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showNested, setShowNested] = useState(false);

  const t = item.Type;
  const showPattern = isStringType(t) || isNumericType(t) || t === "DateTime" || t === "DateTime?";
  const showMinMax = isNumericType(t);
  const showLength = isStringType(t);
  const showEnums = isStringType(t) || isNumericType(t);
  const showNestedBtn = t === "JObject" || t === "JArray";

  // Очищаем нерелевантные валидации при смене типа
  const handleTypeChange = (newType: string) => {
    const patch: Partial<CrudProperty> = { Type: newType };
    if (!isStringType(newType) && !isNumericType(newType) && newType !== "DateTime" && newType !== "DateTime?") {
      patch.Pattern = null;
      patch.PatternErrorMessage = null;
    }
    if (!isNumericType(newType)) {
      patch.Min = null;
      patch.MinErrorMessage = null;
      patch.Max = null;
      patch.MaxErrorMessage = null;
    }
    if (!isStringType(newType)) {
      patch.MinLength = null;
      patch.MaxLength = null;
    }
    if (!isStringType(newType) && !isNumericType(newType)) {
      patch.Enums = null;
      patch.EnumsErrorMessage = null;
    }
    if (newType !== "JObject" && newType !== "JArray") {
      patch.Properties = null;
    }
    onChange(patch);
  };

  return (
    <div
      className="border border-border flex flex-col"
      style={{ padding: 10, gap: 8, background: "rgba(255,255,255,0.02)" }}
    >
      <div className="flex items-center" style={{ gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--color-text-muted)", width: 20 }}>{index + 1}</span>
        <input
          placeholder="Property name"
          value={item.Name}
          onChange={(e) => onChange({ Name: e.target.value })}
          style={{ flex: 1, fontSize: 13, minWidth: 80 }}
        />
        <select
          value={item.Type}
          onChange={(e) => handleTypeChange(e.target.value)}
          style={{ width: 110, fontSize: 13 }}
        >
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="flex items-center cursor-pointer" style={{ gap: 4, fontSize: 12, whiteSpace: "nowrap" }}>
          <input
            type="checkbox"
            checked={item.IsRequired}
            onChange={(e) => onChange({ IsRequired: e.target.checked })}
            style={{ width: 14, height: 14, accentColor: "var(--color-accent)" }}
          />
          Required
        </label>
        {(showPattern || showMinMax || showLength || showEnums) && (
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="toolbar-btn"
            style={{ fontSize: 11, padding: "2px 6px" }}
            title="Toggle validation settings"
          >
            {showAdvanced ? "Less" : "Validation"}
          </button>
        )}
        {showNestedBtn && (
          <button
            onClick={() => setShowNested((v) => !v)}
            className="toolbar-btn"
            style={{ fontSize: 11, padding: "2px 6px" }}
            title="Toggle nested properties"
          >
            {showNested ? "Hide nested" : "Nested"}
          </button>
        )}
        <button onClick={onMoveUp} disabled={!canMoveUp} className="toolbar-btn" style={{ width: 22, height: 22, opacity: canMoveUp ? 1 : 0.3 }}>
          <ChevronUp size={12} />
        </button>
        <button onClick={onMoveDown} disabled={!canMoveDown} className="toolbar-btn" style={{ width: 22, height: 22, opacity: canMoveDown ? 1 : 0.3 }}>
          <ChevronDown size={12} />
        </button>
        <button
          onClick={onRemove}
          className="toolbar-btn"
          style={{ width: 22, height: 22, color: "var(--color-danger)" }}
          title="Remove"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {showAdvanced && (
        <div className="flex flex-col" style={{ gap: 6, paddingTop: 8, borderTop: "1px solid var(--color-border)" }}>
          {showPattern && (
            <div className="flex" style={{ gap: 8 }}>
              <input
                placeholder="Pattern (regex)"
                value={item.Pattern ?? ""}
                onChange={(e) => onChange({ Pattern: e.target.value || null })}
                style={{ flex: 1, fontSize: 12 }}
              />
              <input
                placeholder="Pattern error message"
                value={item.PatternErrorMessage ?? ""}
                onChange={(e) => onChange({ PatternErrorMessage: e.target.value || null })}
                style={{ flex: 1, fontSize: 12 }}
              />
            </div>
          )}

          {showMinMax && (
            <div className="flex" style={{ gap: 8 }}>
              <input
                type="number"
                placeholder="Min"
                value={item.Min ?? ""}
                onChange={(e) => onChange({ Min: e.target.value ? Number(e.target.value) : null })}
                style={{ width: 80, fontSize: 12 }}
              />
              <input
                placeholder="Min error message"
                value={item.MinErrorMessage ?? ""}
                onChange={(e) => onChange({ MinErrorMessage: e.target.value || null })}
                style={{ flex: 1, fontSize: 12 }}
              />
              <input
                type="number"
                placeholder="Max"
                value={item.Max ?? ""}
                onChange={(e) => onChange({ Max: e.target.value ? Number(e.target.value) : null })}
                style={{ width: 80, fontSize: 12 }}
              />
              <input
                placeholder="Max error message"
                value={item.MaxErrorMessage ?? ""}
                onChange={(e) => onChange({ MaxErrorMessage: e.target.value || null })}
                style={{ flex: 1, fontSize: 12 }}
              />
            </div>
          )}

          {showLength && (
            <div className="flex" style={{ gap: 8 }}>
              <input
                type="number"
                placeholder="MinLength"
                value={item.MinLength ?? ""}
                onChange={(e) => onChange({ MinLength: e.target.value ? Number(e.target.value) : null })}
                style={{ width: 90, fontSize: 12 }}
              />
              <input
                type="number"
                placeholder="MaxLength"
                value={item.MaxLength ?? ""}
                onChange={(e) => onChange({ MaxLength: e.target.value ? Number(e.target.value) : null })}
                style={{ width: 90, fontSize: 12 }}
              />
            </div>
          )}

          {showEnums && (
            <EnumEditor
              value={item.Enums ?? []}
              onChange={(enums) => onChange({ Enums: enums.length ? enums : null })}
            />
          )}
        </div>
      )}

      {showNested && showNestedBtn && (
        <div style={{ paddingLeft: 16, borderLeft: "2px solid var(--color-border)", marginTop: 4 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 6 }}>
            Nested Properties for "{item.Name || "(unnamed)"}"
          </div>
          <PropertyArrayEditor
            value={item.Properties ?? []}
            onChange={(props) => onChange({ Properties: props.length ? props : null })}
          />
        </div>
      )}
    </div>
  );
}

function EnumEditor({ value, onChange }: { value: unknown[]; onChange: (value: unknown[]) => void }) {
  const [newValue, setNewValue] = useState("");

  const add = () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setNewValue("");
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="flex items-center" style={{ gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Enums:</span>
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Value..."
          style={{ width: 140, fontSize: 12 }}
        />
        <button onClick={add} className="toolbar-btn" style={{ width: 22, height: 22 }}>
          <Plus size={12} />
        </button>
      </div>
      <div className="flex flex-wrap" style={{ gap: 4 }}>
        {value.map((v, i) => (
          <span
            key={i}
            className="flex items-center"
            style={{
              gap: 4,
              padding: "2px 8px",
              background: "var(--color-surface-300)",
              borderRadius: 4,
              fontSize: 11,
            }}
          >
            {String(v)}
            <button
              onClick={() => remove(i)}
              style={{ color: "var(--color-danger)", lineHeight: 1, fontSize: 14, padding: "0 2px" }}
            >
              ×
            </button>
          </span>
        ))}
        {value.length === 0 && (
          <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontStyle: "italic" }}>
            No enum values
          </span>
        )}
      </div>
    </div>
  );
}

function isStringType(t: string) {
  return t === "string";
}

function isNumericType(t: string) {
  return [
    "int", "int?",
    "long", "long?",
    "decimal", "decimal?",
    "double", "double?",
    "float", "float?",
  ].includes(t);
}
