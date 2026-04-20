import { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { t as tok } from "@/lib/design-tokens";
import { STAGE_TYPE_COLORS } from "../lib/stage-colors";

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

  return (
    <Modal open onClose={onCancel} size="sm" initialFocus={inputRef} aria-label="Add Stage">
      <Modal.Header title="Add Stage" />
      <Modal.Body>
        {/* Mode tabs */}
        {!cloneSource && (
          <div style={{ display: "flex", gap: 0, marginBottom: 12, borderBottom: `1px solid ${tok.color.border.default}` }}>
            {(["new", "clone"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                style={{
                  padding: "4px 12px",
                  fontSize: 12,
                  background: "transparent",
                  border: "none",
                  borderBottom: mode === m ? `2px solid ${tok.color.accent}` : "2px solid transparent",
                  color: mode === m ? tok.color.text.primary : tok.color.text.muted,
                  cursor: "pointer",
                }}
              >
                {m === "new" ? "New" : "Clone"}
              </button>
            ))}
          </div>
        )}

        {mode === "new" && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: tok.color.text.muted, fontWeight: 600, display: "block", marginBottom: 4 }}>Type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {STAGE_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  style={{
                    padding: "3px 10px",
                    fontSize: 11,
                    borderRadius: tok.radius.sm,
                    border: selectedType === t ? `1px solid ${STAGE_TYPE_COLORS[t]}` : `1px solid ${tok.color.border.default}`,
                    background: selectedType === t ? `${STAGE_TYPE_COLORS[t]}22` : "transparent",
                    color: selectedType === t ? STAGE_TYPE_COLORS[t] : tok.color.text.muted,
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

        {mode === "clone" && !cloneSource && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: tok.color.text.muted, fontWeight: 600, display: "block", marginBottom: 4 }}>Clone from</label>
            <select
              value={cloneFrom}
              onChange={(e) => { setCloneFrom(e.target.value); if (!name || name.endsWith("Copy")) setName(e.target.value + "Copy"); }}
              style={{
                width: "100%",
                padding: "4px 8px",
                fontSize: 12,
                background: tok.color.bg.panel,
                border: `1px solid ${tok.color.border.default}`,
                borderRadius: tok.radius.sm,
                color: tok.color.text.primary,
                outline: "none",
              }}
            >
              <option value="">Select stage...</option>
              {existingNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: tok.color.text.muted, fontWeight: 600, display: "block", marginBottom: 4 }}>Name</label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 13,
              background: tok.color.bg.editor,
              border: error ? "1px solid #f44336" : `1px solid ${tok.color.border.default}`,
              borderRadius: tok.radius.sm,
              color: tok.color.text.primary,
              outline: "none",
              boxSizing: "border-box",
            }}
            placeholder="Stage name..."
          />
          {error && <div style={{ fontSize: 11, color: "#f44336", marginTop: 2 }}>{error}</div>}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="primary" onClick={handleSubmit} disabled={mode === "clone" && !cloneFrom}>
          Add
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
