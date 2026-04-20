import { useState, useEffect, useCallback } from "react";
import { Table2, X } from "lucide-react";
import { Group, Panel } from "react-resizable-panels";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { useContourApi } from "@/lib/ws-api";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";

const BUILD_RULES_TEMPLATE = JSON.stringify({
  Filters: [
    { FieldName: "String", ComparisonOperator: "String", Values: ["String"] },
  ],
  Structure: {},
}, null, 2);

interface BuildRulesEditorProps {
  sectionId: number;
  editedJson: string;
  onJsonChange: (val: string) => void;
  editedBuildRules: string;
  onBuildRulesChange: (val: string) => void;
  editedBuildTable: string;
  onBuildTableChange: (val: string) => void;
  hasBuildRules: boolean;
  onRemoveBuildRules: () => void;
  pathPrefix: string;
}

export function BuildRulesEditor({
  sectionId, editedJson, onJsonChange,
  editedBuildRules, onBuildRulesChange,
  editedBuildTable, onBuildTableChange,
  hasBuildRules, onRemoveBuildRules,
  pathPrefix,
}: BuildRulesEditorProps) {
  if (!hasBuildRules) {
    return (
      <div className="flex flex-col h-full">
        <div style={{ flex: 1, minHeight: 0 }}>
          <JsonEditor value={editedJson} onChange={onJsonChange} path={`${pathPrefix}-json-${sectionId}`} />
        </div>
      </div>
    );
  }

  return (
    <Group orientation="horizontal" id={`${pathPrefix}-editors-${sectionId}`}>
      <Panel minSize="30%">
        <div className="flex flex-col h-full">
          <div className="shrink-0" style={{ padding: "4px 10px", fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", borderBottom: "1px solid var(--color-border)" }}>
            JsonData
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <JsonEditor value={editedJson} onChange={onJsonChange} path={`${pathPrefix}-json-${sectionId}`} />
          </div>
        </div>
      </Panel>
      <ResizeHandle />
      <Panel minSize="20%">
        <div className="flex flex-col h-full" style={{ borderLeft: "1px solid var(--color-border)" }}>
          <div className="shrink-0 flex items-center gap-2" style={{ padding: "4px 10px", borderBottom: "1px solid var(--color-border)" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Build Rules</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>Table:</span>
            <TableCombobox value={editedBuildTable} onChange={onBuildTableChange} />
            <button onClick={onRemoveBuildRules} className="toolbar-btn" style={{ color: "#F44336" }} title="Remove Build Rules">
              <X size={12} />
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <JsonEditor value={editedBuildRules} onChange={onBuildRulesChange} path={`${pathPrefix}-rules-${sectionId}`} />
          </div>
        </div>
      </Panel>
    </Group>
  );
}

export function BuildRulesToggleButton({ hasBuildRules, onCreateBuildRules }: { hasBuildRules: boolean; onCreateBuildRules: () => void }) {
  if (hasBuildRules) return null;
  return (
    <button
      onClick={onCreateBuildRules}
      className="toolbar-btn"
      title="Create Build Table Config"
    >
      <Table2 size={14} />
    </button>
  );
}

export { BUILD_RULES_TEMPLATE };

function TableCombobox({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const api = useContourApi();
  const [tables, setTables] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const loadTables = useCallback(async () => {
    if (!api) return;
    try {
      const res = await api.getAllTables();
      const list = (res as Record<string, unknown>).Tables;
      if (Array.isArray(list)) {
        setTables(list.map((t: unknown) => (typeof t === "string" ? t : (t as Record<string, unknown>).Name as string)).filter(Boolean));
      }
    } catch { /* ignore */ }
  }, [api]);

  useEffect(() => { loadTables(); }, [loadTables]);

  const lowerVal = value.toLowerCase();
  const filtered = lowerVal ? tables.filter((t) => t.toLowerCase().includes(lowerVal)) : tables;

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="table name"
        style={{
          background: "var(--color-input-bg)", border: "1px solid var(--color-border)",
          color: "var(--color-text)", fontSize: 11, padding: "1px 6px", height: 20,
          borderRadius: 3, outline: "none", width: 160,
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 30,
          maxHeight: 200, overflowY: "auto",
          background: "var(--color-sidebar)", border: "1px solid var(--color-border)",
          borderRadius: "0 0 3px 3px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}>
          {filtered.map((t) => (
            <div
              key={t}
              onMouseDown={(e) => { e.preventDefault(); onChange(t); setOpen(false); }}
              style={{
                padding: "3px 8px", fontSize: 11, cursor: "pointer",
                color: "var(--color-text-muted)",
                backgroundColor: t === value ? "rgba(255,255,255,0.07)" : "transparent",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = t === value ? "rgba(255,255,255,0.07)" : "transparent"; }}
            >
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
