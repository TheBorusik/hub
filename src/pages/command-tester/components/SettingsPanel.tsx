import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { SessionFields, SessionField } from "../types";

interface SettingsPanelProps {
  ttl: string;
  onTtlChange: (v: string) => void;
  createNewSession: boolean;
  onCreateNewSessionChange: (v: boolean) => void;
  resultModeView: boolean;
  onResultModeViewChange: (v: boolean) => void;
  addApiMethod: boolean;
  onAddApiMethodChange: (v: boolean) => void;
  sessionFields: SessionFields;
  onSessionFieldsChange: (f: SessionFields) => void;
  onClose: () => void;
}

export function SettingsPanel({
  ttl,
  onTtlChange,
  createNewSession,
  onCreateNewSessionChange,
  resultModeView,
  onResultModeViewChange,
  addApiMethod,
  onAddApiMethodChange,
  sessionFields,
  onSessionFieldsChange,
  onClose,
}: SettingsPanelProps) {
  const [newFieldName, setNewFieldName] = useState("");

  const addField = () => {
    if (!newFieldName.trim()) return;
    const name = newFieldName.trim();
    onSessionFieldsChange({
      ...sessionFields,
      [name]: { name, value: "", type: "A" },
    });
    setNewFieldName("");
  };

  const updateField = (key: string, patch: Partial<SessionField>) => {
    onSessionFieldsChange({
      ...sessionFields,
      [key]: { ...sessionFields[key], ...patch },
    });
  };

  const removeField = (key: string) => {
    const next = { ...sessionFields };
    delete next[key];
    onSessionFieldsChange(next);
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ width: 300, padding: 16, gap: 12, background: "var(--color-sidebar)", borderRight: "1px solid var(--color-border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13, fontWeight: 600 }}>Settings</span>
        <button onClick={onClose} className="toolbar-btn"><X size={16} /></button>
      </div>

      {/* TTL */}
      <FieldRow label="TTL">
        <input
          type="text"
          value={ttl}
          onChange={(e) => onTtlChange(e.target.value)}
          style={{ width: 100, fontSize: 12 }}
        />
      </FieldRow>

      {/* Toggles */}
      <Toggle label="Create new session" checked={createNewSession} onChange={onCreateNewSessionChange} />
      <Toggle label="Auto add ApiMethod" checked={addApiMethod} onChange={onAddApiMethodChange} />

      {/* Result */}
      <SectionHeader>Result</SectionHeader>
      <Toggle label="Full result mode view" checked={resultModeView} onChange={onResultModeViewChange} />

      {/* Session Fields */}
      <SectionHeader>Session Fields</SectionHeader>
      {Object.entries(sessionFields).map(([key, field]) => (
        <div key={key} className="flex items-center" style={{ gap: 6 }}>
          <select
            value={field.type}
            onChange={(e) => updateField(key, { type: e.target.value as SessionField["type"] })}
            style={{ width: 50, height: 24, fontSize: 11, padding: "2px 4px", borderRadius: 3 }}
          >
            <option value="A">A</option>
            <option value="N">N</option>
            <option value="S">S</option>
          </select>
          <span className="truncate" style={{ width: 80, fontSize: 12, color: "var(--color-text-muted)" }} title={field.name}>
            {field.name}
          </span>
          <input
            type="text"
            value={field.value}
            onChange={(e) => updateField(key, { value: e.target.value })}
            placeholder="Field value..."
            className="flex-1"
            style={{ fontSize: 12 }}
          />
          <button onClick={() => removeField(key)} className="toolbar-btn" style={{ color: "#F44336" }}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <div className="flex items-center" style={{ gap: 6 }}>
        <select disabled style={{ width: 50, height: 24, fontSize: 11, padding: "2px 4px", borderRadius: 3, opacity: 0.4 }}>
          <option>A</option>
        </select>
        <input
          type="text"
          placeholder="Field name"
          value={newFieldName}
          onChange={(e) => setNewFieldName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addField()}
          className="flex-1"
          style={{ fontSize: 12 }}
        />
        <button onClick={addField} className="toolbar-btn" style={{ color: "var(--color-primary)" }}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center" style={{ gap: 10 }}>
      <span style={{ width: 140, fontSize: 12, color: "var(--color-text-muted)", flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center" style={{ gap: 10 }}>
      <span style={{ width: 140, fontSize: 12, color: "var(--color-text-muted)", flexShrink: 0 }}>{label}</span>
      <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-track" />
      </label>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 10, marginTop: 2 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {children}
      </span>
    </div>
  );
}
