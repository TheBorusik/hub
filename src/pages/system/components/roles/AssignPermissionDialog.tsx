import { useState, useEffect, useMemo } from "react";
import { X, Search } from "lucide-react";
import type { HubWsApi } from "@/lib/ws-api";
import type { Permission } from "../../types";

interface AssignPermissionDialogProps {
  roleId: number;
  existingIds: Set<number>;
  api: HubWsApi;
  onClose: () => void;
  onDone: () => void;
}

export function AssignPermissionDialog({ roleId, existingIds, api, onClose, onDone }: AssignPermissionDialogProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getAllPermissions()
      .then((res) => {
        const list = (res as Record<string, unknown>).Permissions;
        setPermissions(Array.isArray(list) ? (list as Permission[]) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  const available = useMemo(() => {
    const q = filter.toLowerCase();
    return permissions
      .filter((p) => !existingIds.has(p.PermissionId))
      .filter((p) => !q || p.Name.toLowerCase().includes(q) || String(p.PermissionId).includes(q));
  }, [permissions, existingIds, filter]);

  const togglePerm = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      await api.assignPermissionsToRole(roleId, Array.from(selectedIds));
      onDone();
    } finally { setSubmitting(false); }
  };

  return (
    <div style={overlayBg}>
      <div style={{ ...dialogStyle, width: 460, maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Assign Permissions</span>
          <button onClick={onClose} disabled={submitting} className="toolbar-btn"><X size={14} /></button>
        </div>

        <div className="flex items-center gap-1" style={{ marginBottom: 8, flexShrink: 0 }}>
          <Search size={14} style={{ color: "var(--color-text-muted)" }} />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter permissions..." style={searchStyle} />
        </div>

        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          {loading && <div style={{ color: "var(--color-text-muted)", fontSize: 12, padding: 12 }}>Loading...</div>}
          {available.map((p) => (
            <label
              key={p.PermissionId}
              className="flex items-center gap-2"
              style={{ height: 26, padding: "0 8px", fontSize: 12, cursor: "pointer", color: "var(--color-text)" }}
            >
              <input type="checkbox" checked={selectedIds.has(p.PermissionId)} onChange={() => togglePerm(p.PermissionId)} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.Name}</span>
              <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>#{p.PermissionId}</span>
            </label>
          ))}
          {!loading && available.length === 0 && (
            <div style={{ color: "var(--color-text-muted)", fontSize: 12, padding: 12, textAlign: "center" }}>No available permissions</div>
          )}
        </div>

        <div className="flex gap-2" style={{ justifyContent: "flex-end", marginTop: 12, flexShrink: 0 }}>
          <button onClick={onClose} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleAssign} disabled={submitting || selectedIds.size === 0} style={primaryBtnStyle}>
            {submitting ? "Assigning..." : `Assign (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

const searchStyle: React.CSSProperties = { background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 12, padding: "2px 6px", height: 22, flex: 1, borderRadius: 3, outline: "none" };
const overlayBg: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 20, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60 };
const dialogStyle: React.CSSProperties = { backgroundColor: "var(--color-sidebar)", border: "1px solid var(--color-border)", borderRadius: 6, padding: 20, minWidth: 340, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const cancelBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: 3, cursor: "pointer" };
const primaryBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "#0e639c", border: "none", color: "#fff", borderRadius: 3, cursor: "pointer" };
