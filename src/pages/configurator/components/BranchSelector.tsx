import { useState, useEffect, useCallback } from "react";
import { GitBranch, RefreshCw, Upload, Trash2 } from "lucide-react";
import type { HubWsApi } from "@/lib/ws-api";
import type { BranchInfo } from "@/lib/ws-api-models";

interface BranchSelectorProps {
  api: HubWsApi;
  onBranchChange?: () => void;
}

export function BranchSelector({ api, onBranchChange }: BranchSelectorProps) {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getBranches();
      setBranches(res.Branches ?? []);
    } catch {
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const currentBranch = branches.find((b) => b.IsLoaded);

  const handleRefresh = async () => {
    try {
      await api.refreshBranch();
      await load();
      onBranchChange?.();
    } catch (e) {
      console.error("Refresh branch failed", e);
    }
  };

  return (
    <div style={{ padding: "6px 8px", borderBottom: "1px solid var(--color-border)" }}>
      <div className="flex items-center gap-1">
        <GitBranch size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
        <button
          onClick={() => setOpen(!open)}
          style={{
            flex: 1,
            textAlign: "left",
            background: "var(--color-surface-400)",
            border: "1px solid var(--color-border)",
            borderRadius: 3,
            padding: "3px 8px",
            fontSize: 12,
            color: "var(--color-text-primary)",
            cursor: "pointer",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "Loading..." : currentBranch?.Name ?? "No branch loaded"}
        </button>
        <button className="toolbar-btn" title="Refresh branch" onClick={handleRefresh}>
          <RefreshCw size={14} />
        </button>
      </div>

      {open && (
        <div style={{
          marginTop: 4,
          background: "var(--color-surface-400)",
          border: "1px solid var(--color-border)",
          borderRadius: 3,
          maxHeight: 200,
          overflowY: "auto",
        }}>
          {branches.length === 0 && (
            <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-muted)" }}>
              No branches available
            </div>
          )}
          {branches.map((b) => (
            <div
              key={b.Name}
              className="flex items-center justify-between"
              style={{
                padding: "4px 8px",
                fontSize: 12,
                cursor: "pointer",
                background: b.IsLoaded ? "rgba(14,99,156,0.15)" : "transparent",
              }}
              onMouseEnter={(e) => { if (!b.IsLoaded) e.currentTarget.style.background = "var(--color-list-hover)"; }}
              onMouseLeave={(e) => { if (!b.IsLoaded) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ color: b.IsLoaded ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                {b.Name}
              </span>
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                {b.IsLoaded ? "active" : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
