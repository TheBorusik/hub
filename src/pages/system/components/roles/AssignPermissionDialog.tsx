import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/design-tokens";
import type { HubWsApi } from "@/lib/ws-api";
import type { Permission } from "../../types";

interface AssignPermissionDialogProps {
  roleId: number;
  existingIds: Set<number>;
  api: HubWsApi;
  onClose: () => void;
  onDone: () => void;
}

const searchStyle: CSSProperties = {
  background: "var(--color-input-bg)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text)",
  fontSize: 12,
  padding: "2px 6px",
  height: 22,
  flex: 1,
  borderRadius: 3,
  outline: "none",
};

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
    <Modal
      open
      onClose={onClose}
      size="md"
      style={{ width: 460, maxWidth: "min(460px, 92vw)", maxHeight: "min(70vh, 720px)" }}
    >
      <Modal.Header title="Assign Permissions" />
      <Modal.Body>
        <div className="flex items-center gap-1" style={{ marginBottom: t.space[2] }}>
          <Search size={14} style={{ color: "var(--color-text-muted)" }} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter permissions..."
            style={searchStyle}
          />
        </div>

        <div style={{ maxHeight: "min(45vh, 400px)", overflow: "auto" }}>
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
            <div style={{ color: "var(--color-text-muted)", fontSize: 12, padding: 12, textAlign: "center" }}>
              No available permissions
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="button"
          onClick={() => { void handleAssign(); }}
          disabled={submitting || selectedIds.size === 0}
          busy={submitting}
        >
          {submitting ? "Assigning..." : `Assign (${selectedIds.size})`}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
