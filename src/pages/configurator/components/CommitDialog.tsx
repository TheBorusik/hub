import { useState, useEffect } from "react";
import { GitCommitHorizontal } from "lucide-react";
import type { HubWsApi } from "@/lib/ws-api";
import type { ProcessModel } from "@/lib/ws-api-models";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { t as tok } from "@/lib/design-tokens";

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
    <Modal open onClose={onClose} size="md" aria-label="Commit Changes">
      <Modal.Header title="Commit Changes" icon={<GitCommitHorizontal size={16} />} />
      {result ? (
        <Modal.Body>
          <div style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: "#4ec9b0", marginBottom: 8 }}>Committed successfully</div>
            <div style={{ fontSize: 12, color: tok.color.text.muted }}>Hash: {result.hash}</div>
            <div style={{ fontSize: 12, color: tok.color.text.muted, marginTop: 4 }}>
              {result.names.length} file(s)
            </div>
          </div>
        </Modal.Body>
      ) : (
        <>
          <Modal.Body padded={false}>
            <div style={{ padding: "8px 16px", borderBottom: `1px solid ${tok.color.border.default}` }}>
              <input
                type="text"
                placeholder="Search..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  width: "100%",
                  background: tok.color.bg.panel,
                  border: `1px solid ${tok.color.border.default}`,
                  borderRadius: tok.radius.sm,
                  padding: "4px 8px",
                  fontSize: 12,
                  color: tok.color.text.primary,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ flex: 1, overflow: "auto", minHeight: 100, maxHeight: 300 }}>
              {loading ? (
                <EmptyState dense title="Loading..." />
              ) : filtered.length === 0 ? (
                <EmptyState dense title="No changed models" />
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${tok.color.border.default}` }}>
                      <th style={{ padding: "4px 8px", width: 30 }}>
                        <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                      </th>
                      <th style={{ padding: "4px 8px", textAlign: "left", color: tok.color.text.muted, fontWeight: 600 }}>Category</th>
                      <th style={{ padding: "4px 8px", textAlign: "left", color: tok.color.text.muted, fontWeight: 600 }}>TypeName</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m) => (
                      <tr
                        key={m.TypeName}
                        style={{ borderBottom: `1px solid ${tok.color.border.default}`, cursor: "pointer" }}
                        onClick={() => toggle(m.TypeName)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-list-hover)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <td style={{ padding: "4px 8px", textAlign: "center" }}>
                          <input type="checkbox" checked={selected.has(m.TypeName)} readOnly />
                        </td>
                        <td style={{ padding: "4px 8px", color: tok.color.text.muted }}>{m.Category}</td>
                        <td style={{ padding: "4px 8px", color: tok.color.text.primary }}>{m.TypeName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: "8px 16px", borderTop: `1px solid ${tok.color.border.default}` }}>
              <span style={{ fontSize: 11, color: tok.color.text.muted, fontWeight: 600 }}>Commit Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  marginTop: 4,
                  background: tok.color.bg.panel,
                  border: `1px solid ${tok.color.border.default}`,
                  borderRadius: tok.radius.sm,
                  padding: "6px 8px",
                  fontSize: 12,
                  color: tok.color.text.primary,
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>
          </Modal.Body>
          <Modal.Footer align="between">
            <span style={{ fontSize: 11, color: tok.color.text.muted }}>
              {selected.size} of {models.length} selected
            </span>
            <div style={{ display: "flex", gap: tok.space[2] }}>
              <Button size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleCommit}
                disabled={selected.size === 0 || committing}
              >
                {committing ? "Committing..." : "Commit"}
              </Button>
            </div>
          </Modal.Footer>
        </>
      )}
    </Modal>
  );
}
