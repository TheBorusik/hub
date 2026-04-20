import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { JsonEditor } from "./JsonEditor";
import type { TestCaseModel } from "../types";

interface TestCasesPanelProps {
  cases: TestCaseModel[];
  onSelect: (tc: TestCaseModel) => void;
  onRemove: (tc: TestCaseModel) => void;
  onClose: () => void;
}

export function TestCasesPanel({ cases, onSelect, onRemove, onClose }: TestCasesPanelProps) {
  const [search, setSearch] = useState("");

  const filtered = cases.filter(
    (c) =>
      !search ||
      c.Name.toLowerCase().includes(search.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => {
    if (a.Name === "DEFAULT") return 1;
    if (b.Name === "DEFAULT") return -1;
    return a.Name.localeCompare(b.Name);
  });

  return (
    <div className="flex flex-col h-full bg-sidebar" style={{ borderLeft: "1px solid var(--color-border)" }}>
      <div className="flex items-center shrink-0" style={{ height: 35, padding: "0 8px", borderBottom: "1px solid var(--color-border)", gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", flex: 1 }}>Test Cases</span>
        <button onClick={onClose} className="toolbar-btn"><X size={14} /></button>
      </div>
      <div className="shrink-0" style={{ padding: "4px 8px", borderBottom: "1px solid var(--color-border)" }}>
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", fontSize: 12 }} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((tc) => (
          <div
            key={tc.Name}
            onClick={() => onSelect(tc)}
            className="flex items-center justify-between cursor-pointer group ui-tree-row"
            style={{
              height: 26,
              padding: "0 8px",
              fontSize: 13,
            }}
          >
            <span className="flex-1 truncate">{tc.Name}</span>
            {tc.Name !== "DEFAULT" && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(tc); }}
                className="hidden group-hover:inline-flex tree-action-btn"
                style={{ color: "#F44336" }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {sorted.length === 0 && (
          <div style={{ padding: 12, fontSize: 13, color: "var(--color-text-muted)", textAlign: "center" }}>
            No test cases
          </div>
        )}
      </div>
    </div>
  );
}

interface AddTestCasePanelProps {
  json: string;
  onAdd: (name: string, description: string) => void;
  onClose: () => void;
}

export function AddTestCasePanel({ json, onAdd, onClose }: AddTestCasePanelProps) {
  const [name, setName] = useState(() => {
    try {
      const parsed = JSON.parse(json);
      return parsed?.ProcessName ?? "";
    } catch {
      return "";
    }
  });
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try { await onAdd(name.trim(), description.trim()); }
    finally { setSubmitting(false); }
  };

  return (
    <div
      className="flex flex-col bg-sidebar border border-border"
      style={{
        width: "50vw", minWidth: 400, maxWidth: "80vw",
        height: "70vh", minHeight: 300, maxHeight: "85vh",
        padding: 20, gap: 14, resize: "both", overflow: "hidden",
      }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13, fontWeight: 600 }}>Add Test Case</span>
        <button onClick={onClose} className="toolbar-btn" disabled={submitting}><X size={16} /></button>
      </div>

      <div>
        <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 2 }}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          style={{ width: "100%" }}
        />
      </div>

      <div>
        <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 2 }}>Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: "100%" }}
        />
      </div>

      <div className="flex-1 border border-border" style={{ minHeight: 0 }}>
        <JsonEditor value={json} readOnly />
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={handleAdd}
          disabled={submitting || !name.trim()}
          className="cursor-pointer disabled:opacity-50"
          style={{
            padding: "4px 16px",
            fontSize: 13,
            background: "var(--color-accent)",
            color: "#ffffff",
            border: "none",
          }}
        >
          {submitting ? "Adding..." : "Add"}
        </button>
      </div>
    </div>
  );
}
