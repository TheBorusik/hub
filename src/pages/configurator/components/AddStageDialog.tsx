import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const STAGE_TYPE_COLORS: Record<string, string> = {
  Transform: "#0F8B8D",
  CRUD: "seagreen",
  Command: "#0FD334",
  SubStart: "#0089ED",
  Event: "#FCA6ED",
  Final: "#F6511D",
};

const STAGE_TYPES = ["Transform", "CRUD", "Command", "SubStart", "Event", "Final"] as const;

interface AddStageDialogProps {
  existingNames: string[];
  cloneSource?: string | null;
  initialName?: string;
  onAdd: (type: string, name: string) => void;
  onClone?: (sourceName: string, newName: string) => void;
  onCancel: () => void;
}

export function AddStageDialog({ existingNames, cloneSource, initialName, onAdd, onClone, onCancel }: AddStageDialogProps) {
  const [mode, setMode] = useState<"new" | "clone">(cloneSource ? "clone" : "new");
  const [selectedType, setSelectedType] = useState<string>("Transform");
  const [name, setName] = useState(cloneSource ? cloneSource + "Copy" : (initialName ?? ""));
  const [cloneFrom, setCloneFrom] = useState(cloneSource ?? "");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Name is required"); return; }
    if (existingNames.includes(trimmed)) { setError(`"${trimmed}" already exists`); return; }
    if (mode === "new") {
      onAdd(selectedType, trimmed);
    } else {
      onClone?.(cloneFrom, trimmed);
    }
  };

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}
      onMouseDown={onCancel}
    >
      <div
        style={{
          background: "var(--color-sidebar)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          padding: "16px 20px",
          width: 380,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 12 }}>
          Add Stage
        </div>

        {/* Mode tabs */}
        {!cloneSource && (
          <div style={{ display: "flex", gap: 0, marginBottom: 12, borderBottom: "1px solid var(--color-border)" }}>
            {(["new", "clone"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                style={{
                  padding: "4px 12px",
                  fontSize: 12,
                  background: "transparent",
                  border: "none",
                  borderBottom: mode === m ? "2px solid var(--color-accent)" : "2px solid transparent",
                  color: mode === m ? "var(--color-text-primary)" : "var(--color-text-muted)",
                  cursor: "pointer",
                }}
              >
                {m === "new" ? "New" : "Clone"}
              </button>
            ))}
          </div>
        )}

        {/* Type selector (new mode) */}
        {mode === "new" && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>Type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {STAGE_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  style={{
                    padding: "3px 10px",
                    fontSize: 11,
                    borderRadius: 3,
                    border: selectedType === t ? `1px solid ${STAGE_TYPE_COLORS[t]}` : "1px solid var(--color-border)",
                    background: selectedType === t ? `${STAGE_TYPE_COLORS[t]}22` : "transparent",
                    color: selectedType === t ? STAGE_TYPE_COLORS[t] : "var(--color-text-muted)",
                    cursor: "pointer",
                    fontWeight: selectedType === t ? 600 : 400,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Clone source (clone mode, no pre-selected source) */}
        {mode === "clone" && !cloneSource && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>Clone from</label>
            <select
              value={cloneFrom}
              onChange={(e) => { setCloneFrom(e.target.value); if (!name || name.endsWith("Copy")) setName(e.target.value + "Copy"); }}
              style={{
                width: "100%",
                padding: "4px 8px",
                fontSize: 12,
                background: "var(--color-surface-400)",
                border: "1px solid var(--color-border)",
                borderRadius: 3,
                color: "var(--color-text-primary)",
                outline: "none",
              }}
            >
              <option value="">Select stage...</option>
              {existingNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}

        {/* Name input */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>Name</label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onCancel(); }}
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 13,
              background: "var(--color-editor)",
              border: error ? "1px solid #f44336" : "1px solid var(--color-border)",
              borderRadius: 3,
              color: "var(--color-text-primary)",
              outline: "none",
              boxSizing: "border-box",
            }}
            placeholder="Stage name..."
          />
          {error && <div style={{ fontSize: 11, color: "#f44336", marginTop: 2 }}>{error}</div>}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "5px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-primary)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={mode === "clone" && !cloneFrom}
            style={{
              padding: "5px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "none",
              background: "var(--color-accent)",
              color: "#fff",
              cursor: "pointer",
              opacity: mode === "clone" && !cloneFrom ? 0.5 : 1,
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
