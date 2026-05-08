import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";
import { PropertyArrayEditor } from "./PropertyArrayEditor";
import type { CrudModel, CrudProperty, CrudRecord } from "../types";

type DialogMode = "add" | "update" | "delete";

interface RecordDialogProps {
  model: CrudModel;
  mode: DialogMode;
  record?: CrudRecord;
  onSubmit: (data: Record<string, unknown>) => Promise<void> | void;
  onClose: () => void;
}

export function RecordDialog({ model, mode, record, onSubmit, onClose }: RecordDialogProps) {
  const [fullJson, setFullJson] = useState(false);
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(record ?? buildEmptyRecord(model), null, 2),
  );
  const [data, setData] = useState<Record<string, unknown>>(() =>
    record ? { ...record } : buildEmptyRecord(model),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const title = mode === "add" ? "Add Record" : mode === "update" ? "Update Record" : "Delete Record";
  const actionLabel = mode === "add" ? "Add" : mode === "update" ? "Update" : "Delete";
  const isDelete = mode === "delete";
  const isUpdate = mode === "update";

  const validateProperty = useCallback((prop: CrudProperty, value: unknown): string | null => {
    const isEmpty = value == null || value === "";
    if (prop.IsRequired && isEmpty) {
      return "Required field";
    }
    if (isEmpty) return null;

    if (prop.Enums && prop.Enums.length > 0) {
      const str = String(value);
      if (!prop.Enums.some((e) => String(e) === str)) {
        return prop.EnumsErrorMessage ?? `Allowed values: ${prop.Enums.map(String).join(", ")}`;
      }
    }

    if (isStringType(prop.Type)) {
      const str = String(value);
      if (prop.MinLength != null && str.length < prop.MinLength) {
        return prop.MinLengthErrorMessage ?? `Min length is ${prop.MinLength}`;
      }
      if (prop.MaxLength != null && str.length > prop.MaxLength) {
        return prop.MaxLengthErrorMessage ?? `Max length is ${prop.MaxLength}`;
      }
      if (prop.Pattern) {
        try {
          if (!new RegExp(prop.Pattern).test(str)) {
            return prop.PatternErrorMessage ?? "Invalid format";
          }
        } catch {
          // invalid regex on backend — ignore
        }
      }
    }

    if (isNumericType(prop.Type)) {
      const num = Number(value);
      if (isNaN(num)) return "Must be a number";
      if (prop.Min != null && num < prop.Min) {
        return prop.MinErrorMessage ?? `Min value is ${prop.Min}`;
      }
      if (prop.Max != null && num > prop.Max) {
        return prop.MaxErrorMessage ?? `Max value is ${prop.Max}`;
      }
    }

    return null;
  }, []);

  const validateAll = useCallback((): boolean => {
    const nextErrors: Record<string, string> = {};
    for (const prop of model.Properties) {
      const err = validateProperty(prop, data[prop.Name]);
      if (err) nextErrors[prop.Name] = err;
    }
    // validate key on add if non-identity
    if (mode === "add" && !model.Identity) {
      const keyValue = data[model.KeyName];
      if (keyValue == null || keyValue === "") {
        nextErrors[model.KeyName] = "Key is required";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [data, model, mode, validateProperty]);

  const handleSubmit = async () => {
    if (!isDelete && !validateAll()) return;
    setSubmitting(true);
    try {
      let payload: Record<string, unknown>;
      if (fullJson) {
        payload = JSON.parse(jsonText);
      } else {
        payload = { ...data };
      }
      // protect key
      if (model.KeyName && data[model.KeyName] !== undefined) {
        payload[model.KeyName] = data[model.KeyName];
      }
      await onSubmit(payload);
    } catch {
      // parsing or network error
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleMode = () => {
    if (!fullJson) {
      setJsonText(JSON.stringify(data, null, 2));
    } else {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        alert("Invalid JSON");
        return;
      }
      if (model.KeyName && data[model.KeyName] !== undefined) {
        parsed[model.KeyName] = data[model.KeyName];
      }
      setData(parsed);
      // re-validate after toggle
      const nextErrors: Record<string, string> = {};
      for (const prop of model.Properties) {
        const err = validateProperty(prop, parsed[prop.Name]);
        if (err) nextErrors[prop.Name] = err;
      }
      setErrors(nextErrors);
    }
    setFullJson((v) => !v);
  };

  const setField = (name: string, value: unknown) => {
    setData((prev) => ({ ...prev, [name]: value }));
    const prop = model.Properties.find((p) => p.Name === name);
    if (prop) {
      const err = validateProperty(prop, value);
      setErrors((prev) => {
        const next = { ...prev };
        if (err) next[name] = err;
        else delete next[name];
        return next;
      });
    }
  };

  const getStringValue = (name: string, type: string): string => {
    const v = data[name];
    if (v == null) {
      if (isBoolType(type)) return "false";
      if (isNullableBoolType(type)) return "";
      if (isJObjectType(type)) return "{}";
      if (isJArrayType(type)) return "[]";
      return "";
    }
    if (typeof v === "object") return JSON.stringify(v, null, 2);
    if (isDateTimeType(type)) return toDateTimeLocal(v);
    return String(v);
  };

  const handleTextChange = (prop: CrudProperty, raw: string) => {
    let value: unknown = raw;
    if (isBoolType(prop.Type)) value = raw === "true";
    else if (isNullableBoolType(prop.Type)) value = raw === "" ? null : raw === "true";
    else if (isIntType(prop.Type)) value = raw === "" ? null : Math.floor(Number(raw));
    else if (isDecimalType(prop.Type)) value = raw === "" ? null : Number(raw);
    else if (isDateTimeType(prop.Type)) value = raw === "" ? null : raw;
    else if (isJObjectType(prop.Type) || isJArrayType(prop.Type)) {
      try { value = raw ? JSON.parse(raw) : (isJObjectType(prop.Type) ? {} : []); }
      catch { value = isJObjectType(prop.Type) ? {} : []; }
    }
    setField(prop.Name, value);
  };

  const handleBoolChange = (name: string, checked: boolean) => {
    setField(name, checked);
  };

  const renderKeyField = () => {
    const isKeyReadOnly = isUpdate || model.Identity;
    const value = getStringValue(model.KeyName, model.KeyType);
    const error = errors[model.KeyName];

    return (
      <div>
        <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 2 }}>
          {model.KeyName} <span style={{ opacity: 0.5 }}>({model.KeyType})</span>
          <span style={{ color: "var(--color-accent)", marginLeft: 4 }}>(key)</span>
        </label>
        <input
          type={isNumericType(model.KeyType) ? "number" : "text"}
          value={value}
          readOnly={isKeyReadOnly}
          onChange={(e) => {
            if (isKeyReadOnly) return;
            let val: unknown = e.target.value;
            if (isNumericType(model.KeyType)) val = Number(val);
            setData((prev) => ({ ...prev, [model.KeyName]: val }));
          }}
          style={{ width: "100%", ...(isKeyReadOnly ? { opacity: 0.6 } : {}) }}
        />
        {error && <div style={{ fontSize: 11, color: "var(--color-danger)", marginTop: 2 }}>{error}</div>}
      </div>
    );
  };

  const renderPropertyField = (prop: CrudProperty) => {
    const error = errors[prop.Name];
    const hasEnums = prop.Enums && prop.Enums.length > 0;

    if (hasEnums) {
      return (
        <div key={prop.Name}>
          <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 2 }}>
            {prop.Name}
            {prop.IsRequired && <span style={{ color: "var(--color-danger)" }}> *</span>}
          </label>
          <select
            value={getStringValue(prop.Name, prop.Type)}
            onChange={(e) => handleTextChange(prop, e.target.value)}
            style={{ width: "100%", fontSize: 13, padding: "4px 8px" }}
          >
            {!prop.IsRequired && <option value="">—</option>}
            {prop.Enums!.map((ev) => (
              <option key={String(ev)} value={String(ev)}>{String(ev)}</option>
            ))}
          </select>
          {error && <div style={{ fontSize: 11, color: "var(--color-danger)", marginTop: 2 }}>{error}</div>}
        </div>
      );
    }

    if (isBoolType(prop.Type)) {
      return (
        <div key={prop.Name}>
          <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 2 }}>
            {prop.Name}
            {prop.IsRequired && <span style={{ color: "var(--color-danger)" }}> *</span>}
          </label>
          <label className="flex items-center cursor-pointer" style={{ gap: 6 }}>
            <input
              type="checkbox"
              checked={data[prop.Name] === true}
              onChange={(e) => handleBoolChange(prop.Name, e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--color-accent)" }}
            />
            <span style={{ fontSize: 13 }}>{data[prop.Name] === true ? "true" : "false"}</span>
          </label>
          {error && <div style={{ fontSize: 11, color: "var(--color-danger)", marginTop: 2 }}>{error}</div>}
        </div>
      );
    }

    if (isNullableBoolType(prop.Type)) {
      return (
        <div key={prop.Name}>
          <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 2 }}>
            {prop.Name}
            {prop.IsRequired && <span style={{ color: "var(--color-danger)" }}> *</span>}
          </label>
          <select
            value={data[prop.Name] == null ? "" : String(data[prop.Name])}
            onChange={(e) => handleTextChange(prop, e.target.value)}
            style={{ width: "100%", fontSize: 13, padding: "4px 8px" }}
          >
            {!prop.IsRequired && <option value="">—</option>}
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
          {error && <div style={{ fontSize: 11, color: "var(--color-danger)", marginTop: 2 }}>{error}</div>}
        </div>
      );
    }

    if (isJObjectType(prop.Type) || isJArrayType(prop.Type)) {
      const currentValue = data[prop.Name];
      if (isPropertyArray(currentValue)) {
        return (
          <div key={prop.Name}>
            <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 2 }}>
              {prop.Name} <span style={{ opacity: 0.5 }}>({prop.Type})</span>
              {prop.IsRequired && <span style={{ color: "var(--color-danger)" }}> *</span>}
            </label>
            <PropertyArrayEditor
              value={currentValue}
              onChange={(v) => setField(prop.Name, v)}
            />
            {error && <div style={{ fontSize: 11, color: "var(--color-danger)", marginTop: 2 }}>{error}</div>}
          </div>
        );
      }
      return (
        <div key={prop.Name}>
          <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 2 }}>
            {prop.Name} <span style={{ opacity: 0.5 }}>({prop.Type})</span>
            {prop.IsRequired && <span style={{ color: "var(--color-danger)" }}> *</span>}
          </label>
          <div className="border border-border" style={{ height: 180 }}>
            <JsonEditor
              value={data[prop.Name]}
              onChange={(v) => handleTextChange(prop, v)}
            />
          </div>
          {error && <div style={{ fontSize: 11, color: "var(--color-danger)", marginTop: 2 }}>{error}</div>}
        </div>
      );
    }

    const inputType = isNumericType(prop.Type)
      ? "number"
      : isDateTimeType(prop.Type)
        ? "datetime-local"
        : "text";

    const step = isIntType(prop.Type) ? "1" : isDecimalType(prop.Type) ? "any" : undefined;

    return (
      <div key={prop.Name}>
        <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 2 }}>
          {prop.Name} <span style={{ opacity: 0.5 }}>({prop.Type})</span>
          {prop.IsRequired && <span style={{ color: "var(--color-danger)" }}> *</span>}
        </label>
        <input
          type={inputType}
          step={step}
          value={getStringValue(prop.Name, prop.Type)}
          onChange={(e) => handleTextChange(prop, e.target.value)}
          style={{ width: "100%" }}
        />
        {error && <div style={{ fontSize: 11, color: "var(--color-danger)", marginTop: 2 }}>{error}</div>}
      </div>
    );
  };

  if (isDelete) {
    return (
      <div
        className="flex flex-col bg-sidebar border border-border"
        style={{ width: 420, padding: 20, gap: 16 }}
      >
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 13, fontWeight: 600 }}>Delete Record — {model.Name}</span>
          <button
            onClick={onClose}
            disabled={submitting}
            className="toolbar-btn"
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          Вы уверены, что хотите удалить запись
          <br />
          <strong>{model.KeyName} = {record?.[model.KeyName] != null ? String(record[model.KeyName]) : "?"}</strong>?
        </div>
        <div className="flex items-center justify-end" style={{ gap: 8 }}>
          <button
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer disabled:opacity-50"
            style={{ padding: "4px 16px", fontSize: 13, background: "transparent", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="cursor-pointer disabled:opacity-50"
            style={{ padding: "4px 16px", fontSize: 13, background: "var(--color-danger)", color: "#ffffff", border: "none" }}
          >
            {submitting ? "Удаление..." : "Удалить"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-sidebar border border-border"
      style={{
        width: "60vw",
        height: "75vh",
        minWidth: 400,
        minHeight: 300,
        maxWidth: "90vw",
        maxHeight: "90vh",
        padding: 20,
        gap: 14,
        resize: "both",
        overflow: "auto",
      }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13, fontWeight: 600 }}>{title} — {model.Name}</span>
        <button
          onClick={onClose}
          disabled={submitting}
          className="toolbar-btn"
        >
          <X size={16} />
        </button>
      </div>

      {fullJson ? (
        <div className="flex-1 border border-border min-h-0">
          <JsonEditor value={jsonText} onChange={(v) => setJsonText(v)} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-y-auto" style={{ gap: 10 }}>
          {renderKeyField()}
          {model.Properties.map((prop) => renderPropertyField(prop))}
        </div>
      )}

      <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
        <button
          onClick={handleToggleMode}
          disabled={submitting}
          className="cursor-pointer disabled:opacity-50"
          style={{ fontSize: 12, background: "transparent", border: "none", color: "var(--color-accent)" }}
        >
          {fullJson ? "Field editor" : "Full JSON edit"}
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="cursor-pointer disabled:opacity-50"
          style={{
            padding: "4px 16px",
            fontSize: 13,
            background: "var(--color-accent)",
            color: "#ffffff",
            border: "none",
          }}
        >
          {submitting ? (mode === "add" ? "Добавление..." : "Обновление...") : actionLabel}
        </button>
      </div>
    </div>
  );
}

function buildEmptyRecord(model: CrudModel): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  // key default
  if (isNumericType(model.KeyType)) obj[model.KeyName] = 0;
  else if (model.KeyType === "bool") obj[model.KeyName] = false;
  else if (model.KeyType === "JObject") obj[model.KeyName] = {};
  else if (model.KeyType === "JArray") obj[model.KeyName] = [];
  else if (isDateTimeType(model.KeyType) || model.KeyType === "TimeSpan" || model.KeyType === "TimeSpan?") obj[model.KeyName] = null;
  else obj[model.KeyName] = "";

  for (const p of model.Properties) {
    if (p.Type === "bool") obj[p.Name] = false;
    else if (isNumericType(p.Type)) obj[p.Name] = 0;
    else if (p.Type === "JObject") obj[p.Name] = {};
    else if (p.Type === "JArray") obj[p.Name] = [];
    else if (isDateTimeType(p.Type) || p.Type === "TimeSpan" || p.Type === "TimeSpan?") obj[p.Name] = null;
    else obj[p.Name] = "";
  }
  return obj;
}

function toDateTimeLocal(v: unknown): string {
  const str = String(v);
  if (!str) return "";
  // ISO-like: 2024-01-15T10:30:00 or 2024-01-15T10:30:00Z → 2024-01-15T10:30
  return str.slice(0, 16);
}

function isIntType(t: string) {
  return t === "int" || t === "int?" || t === "long" || t === "long?";
}

function isDecimalType(t: string) {
  return t === "decimal" || t === "decimal?" || t === "double" || t === "double?" || t === "float" || t === "float?";
}

function isNumericType(t: string) {
  return isIntType(t) || isDecimalType(t);
}

function isStringType(t: string) {
  return t === "string";
}

function isBoolType(t: string) {
  return t === "bool";
}

function isNullableBoolType(t: string) {
  return t === "bool?";
}

function isDateTimeType(t: string) {
  return t === "DateTime" || t === "DateTime?";
}

function isJObjectType(t: string) {
  return t === "JObject";
}

function isJArrayType(t: string) {
  return t === "JArray";
}

function isPropertyArray(value: unknown): value is CrudProperty[] {
  return Array.isArray(value) && value.every(
    (item) => item && typeof item === "object" && "Name" in item && "Type" in item,
  );
}
