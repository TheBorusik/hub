import { useState, useEffect, useCallback } from "react";
import { GitCommitHorizontal, X } from "lucide-react";
import type { HubWsApi } from "@/lib/ws-api";
import type { ProcessModel } from "@/lib/ws-api-models";

interface CommitDialogProps {
  api: HubWsApi;
  onClose: () => void;
  onCommitted: () => void;
}

export function CommitDialog({ api, onClose, onCommitted }: CommitDialogProps) {
  const [models, setModels] = useState<ProcessModel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("WorkflowConfigurator");
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [filter, setFilter] = useState("");
  const [result, setResult] = useState<{ hash: string; names: string[] } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getChangedModels();
        const changed = res.Models ?? [];
        setModels(changed);
        setSelected(new Set(changed.map((m) => m.TypeName)));
      } catch (e) {
        console.error("Failed to get changed models", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  const filtered = filter
    ? models.filter((m) => m.TypeName.toLowerCase().includes(filter.toLowerCase()))
    : models;

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((m) => m.TypeName)));
    }
  };

  const toggle = (tn: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tn)) next.delete(tn); else next.add(tn);
      return next;
    });
  };

  const handleCommit = async () => {
    if (selected.size === 0) return;
    setCommitting(true);
    try {
      const res = await api.commitProcessAssembly(Array.from(selected), message);
      setResult({ hash: res.CommitHash, names: res.Names });
      setTimeout(() => onCommitted(), 2000);
    } catch (e) {
      console.error("Commit failed", e);
      setCommitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-sidebar)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          width: 560,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0" style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)" }}>
          <div className="flex items-center gap-2">
            <GitCommitHorizontal size={16} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Commit Changes</span>
          </div>
          <button className="toolbar-btn" onClick={onClose}><X size={16} /></button>
        </div>

        {result ? (
          <div style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "#4ec9b0", marginBottom: 8 }}>Committed successfully</div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Hash: {result.hash}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
              {result.names.length} file(s)
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--color-border)" }}>
              <input
                type="text"
                placeholder="Search..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--color-surface-400)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 3,
                  padding: "4px 8px",
                  fontSize: 12,
                  color: "var(--color-text-primary)",
                  outline: "none",
                }}
              />
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: "auto", minHeight: 100, maxHeight: 300 }}>
              {loading ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>Loading...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>No changed models</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <th style={{ padding: "4px 8px", width: 30 }}>
                        <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                      </th>
                      <th style={{ padding: "4px 8px", textAlign: "left", color: "var(--color-text-muted)", fontWeight: 600 }}>Category</th>
                      <th style={{ padding: "4px 8px", textAlign: "left", color: "var(--color-text-muted)", fontWeight: 600 }}>TypeName</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m) => (
                      <tr
                        key={m.TypeName}
                        style={{ borderBottom: "1px solid var(--color-border)", cursor: "pointer" }}
                        onClick={() => toggle(m.TypeName)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-list-hover)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <td style={{ padding: "4px 8px", textAlign: "center" }}>
                          <input type="checkbox" checked={selected.has(m.TypeName)} readOnly />
                        </td>
                        <td style={{ padding: "4px 8px", color: "var(--color-text-muted)" }}>{m.Category}</td>
                        <td style={{ padding: "4px 8px", color: "var(--color-text-primary)" }}>{m.TypeName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Message */}
            <div style={{ padding: "8px 16px", borderTop: "1px solid var(--color-border)" }}>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600 }}>Commit Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  marginTop: 4,
                  background: "var(--color-surface-400)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 3,
                  padding: "6px 8px",
                  fontSize: 12,
                  color: "var(--color-text-primary)",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2" style={{ padding: "8px 16px", borderTop: "1px solid var(--color-border)" }}>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginRight: "auto" }}>
                {selected.size} of {models.length} selected
              </span>
              <button
                className="toolbar-btn"
                style={{ padding: "4px 12px" }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="toolbar-btn"
                style={{
                  padding: "4px 12px",
                  background: selected.size > 0 ? "#0e639c" : undefined,
                  color: selected.size > 0 ? "#fff" : undefined,
                  borderRadius: 3,
                }}
                onClick={handleCommit}
                disabled={selected.size === 0 || committing}
              >
                {committing ? "Committing..." : "Commit"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
