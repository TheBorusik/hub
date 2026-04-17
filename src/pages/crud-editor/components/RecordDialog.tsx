import { useState } from "react";
import { X } from "lucide-react";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";
import type { CrudModel, CrudRecord } from "../types";

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
  const [fields, setFields] = useState<Record<string, string>>(() =>
    buildFieldStrings(model, record),
  );
  const [submitting, setSubmitting] = useState(false);

  const title = mode === "add" ? "Add Record" : mode === "update" ? "Update Record" : "Delete Record";
  const actionLabel = mode === "add" ? "Add" : mode === "update" ? "Update" : "Delete";
  const isDelete = mode === "delete";

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const data = fullJson ? JSON.parse(jsonText) : parseFields(model, fields);
      await onSubmit(data);
    } catch {
      // parsing or network error
    } finally {
      setSubmitting(false);
    }
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
          {model.Properties.map((prop) => {
            const isKey = prop.Name === model.KeyName;
            const readOnlyField = mode === "update" && isKey;
            const isJsonField = prop.Type === "JObject" || prop.Type === "JArray";

            if (isJsonField) {
              return (
                <div key={prop.Name}>
                  <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 2 }}>
                    {prop.Name} <span style={{ opacity: 0.5 }}>({prop.Type})</span>
                    {prop.IsRequired && <span style={{ color: "var(--color-danger)" }}> *</span>}
                  </label>
                  <div className="border border-border" style={{ height: 180 }}>
                    <JsonEditor
                      value={fields[prop.Name] ?? "{}"}
                      onChange={(v) => setFields((f) => ({ ...f, [prop.Name]: v }))}
                    />
                  </div>
                </div>
              );
            }

            return (
              <div key={prop.Name}>
                <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 2 }}>
                  {prop.Name} <span style={{ opacity: 0.5 }}>({prop.Type})</span>
                  {prop.IsRequired && <span style={{ color: "var(--color-danger)" }}> *</span>}
                </label>
                {prop.Type === "bool" ? (
                  <label className="flex items-center cursor-pointer" style={{ gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={fields[prop.Name] === "true"}
                      onChange={(e) => setFields((f) => ({ ...f, [prop.Name]: String(e.target.checked) }))}
                      disabled={readOnlyField}
                      style={{ width: 16, height: 16, accentColor: "var(--color-accent)" }}
                    />
                    <span style={{ fontSize: 13 }}>{fields[prop.Name] === "true" ? "true" : "false"}</span>
                  </label>
                ) : (
                  <input
                    type={isNumericType(prop.Type) ? "number" : prop.Type === "datetime" ? "datetime-local" : "text"}
                    value={fields[prop.Name] ?? ""}
                    onChange={(e) => setFields((f) => ({ ...f, [prop.Name]: e.target.value }))}
                    readOnly={readOnlyField}
                    style={{ width: "100%", ...(readOnlyField ? { opacity: 0.6 } : {}) }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
        <button
          onClick={() => setFullJson(!fullJson)}
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
  for (const p of model.Properties) {
    if (p.Type === "bool") obj[p.Name] = false;
    else if (isNumericType(p.Type)) obj[p.Name] = 0;
    else if (p.Type === "JObject") obj[p.Name] = {};
    else if (p.Type === "JArray") obj[p.Name] = [];
    else obj[p.Name] = "";
  }
  return obj;
}

function buildFieldStrings(model: CrudModel, record?: CrudRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of model.Properties) {
    const v = record?.[p.Name];
    if (v == null) {
      out[p.Name] = p.Type === "bool" ? "false" : p.Type === "JObject" ? "{}" : p.Type === "JArray" ? "[]" : "";
    } else if (typeof v === "object") {
      out[p.Name] = JSON.stringify(v, null, 2);
    } else {
      out[p.Name] = String(v);
    }
  }
  return out;
}

function parseFields(model: CrudModel, fields: Record<string, string>): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const p of model.Properties) {
    const raw = fields[p.Name] ?? "";
    if (p.Type === "bool") obj[p.Name] = raw === "true";
    else if (isNumericType(p.Type)) obj[p.Name] = raw ? Number(raw) : 0;
    else if (p.Type === "JObject" || p.Type === "JArray") obj[p.Name] = raw ? JSON.parse(raw) : (p.Type === "JObject" ? {} : []);
    else obj[p.Name] = raw;
  }
  return obj;
}

function isNumericType(t: string) {
  return t === "int" || t === "long" || t === "decimal" || t === "float" || t === "double";
}
