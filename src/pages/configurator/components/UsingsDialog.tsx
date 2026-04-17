import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

interface UsingsDialogProps {
  usings: string[];
  onSave: (usings: string[]) => void;
  onClose: () => void;
}

export function UsingsDialog({ usings, onSave, onClose }: UsingsDialogProps) {
  const [items, setItems] = useState<string[]>(usings);
  const [input, setInput] = useState("");

  const addUsing = () => {
    const trimmed = input.trim().replace(/;+$/, "").trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) {
      setInput("");
      return;
    }
    setItems([...items, trimmed]);
    setInput("");
  };

  const removeAt = (i: number) => {
    setItems(items.filter((_, idx) => idx !== i));
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-sidebar)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          width: 520,
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div
          className="flex items-center justify-between shrink-0"
          style={{ padding: "10px 14px", borderBottom: "1px solid var(--color-border)" }}
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>Usings</span>
          <button className="toolbar-btn" onClick={onClose}><X size={14} /></button>
        </div>

        <div style={{ padding: "10px 14px", display: "flex", gap: 6 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addUsing(); }
            }}
            placeholder="e.g. System.Text.RegularExpressions"
            style={{
              flex: 1,
              background: "var(--color-surface-400)",
              border: "1px solid var(--color-border)",
              padding: "4px 8px",
              color: "var(--color-text-primary)",
              fontSize: 12,
              fontFamily: "Consolas, monospace",
              borderRadius: 3,
              outline: "none",
            }}
          />
          <button
            className="toolbar-btn"
            onClick={addUsing}
            title="Add using"
            style={{ padding: "4px 8px" }}
          >
            <Plus size={14} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 14px 10px" }}>
          {items.length === 0 ? (
            <div style={{ padding: 12, fontSize: 12, color: "var(--color-text-muted)", textAlign: "center" }}>
              No usings. The process relies only on the default set.
            </div>
          ) : (
            items.map((u, i) => (
              <div
                key={`${u}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 6px",
                  borderBottom: "1px solid var(--color-border)",
                  fontSize: 12,
                  fontFamily: "Consolas, monospace",
                }}
              >
                <span style={{ color: "var(--color-text-muted)" }}>using</span>
                <span style={{ flex: 1 }}>{u};</span>
                <button
                  className="toolbar-btn"
                  title="Remove"
                  onClick={() => removeAt(i)}
                  style={{ color: "#f44336" }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        <div
          className="flex items-center justify-end shrink-0"
          style={{ gap: 8, padding: "10px 14px", borderTop: "1px solid var(--color-border)" }}
        >
          <button className="toolbar-btn" style={{ padding: "4px 12px" }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="toolbar-btn"
            style={{ padding: "4px 12px", background: "#0e639c", color: "#fff", borderRadius: 3 }}
            onClick={() => onSave(items)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
