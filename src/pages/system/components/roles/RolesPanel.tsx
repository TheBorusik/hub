import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Plus, Search, ChevronRight, ChevronDown, Pencil, Trash2, UserPlus, ShieldCheck, ShieldOff, X as XIcon } from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import { RoleDialog } from "./RoleDialog";
import { AssignPermissionDialog } from "./AssignPermissionDialog";
import type { Role, RolePermission } from "../../types";

type Overlay =
  | { type: "none" }
  | { type: "upsertRole"; editing: Role | null }
  | { type: "assignPerms"; roleId: number; existingIds: Set<number> }
  | { type: "confirm"; title: string; onConfirm: () => void };

export function RolesPanel() {
  const api = useContourApi();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [expandedRoles, setExpandedRoles] = useState<Set<number>>(new Set());
  const [rolePerms, setRolePerms] = useState<Record<number, RolePermission[]>>({});
  const [overlay, setOverlay] = useState<Overlay>({ type: "none" });

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.getRoles();
      const list = (res as Record<string, unknown>).Roles;
      setRoles(Array.isArray(list) ? (list as Role[]) : []);
    } catch { setRoles([]); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const loadPerms = useCallback(async (roleId: number) => {
    if (!api) return;
    try {
      const res = await api.getRolePermissions(roleId);
      const list = (res as Record<string, unknown>).Permissions;
      setRolePerms((prev) => ({ ...prev, [roleId]: Array.isArray(list) ? (list as RolePermission[]) : [] }));
    } catch {
      setRolePerms((prev) => ({ ...prev, [roleId]: [] }));
    }
  }, [api]);

  const toggleRole = (roleId: number) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) { next.delete(roleId); } else {
        next.add(roleId);
        if (!rolePerms[roleId]) loadPerms(roleId);
      }
      return next;
    });
  };

  const handleDeleteRole = (role: Role) => {
    if (!api) return;
    setOverlay({
      type: "confirm",
      title: `Delete role "${role.Name}" (ID: ${role.RoleId})?`,
      onConfirm: async () => {
        await api.removeRole(role.RoleId);
        setOverlay({ type: "none" });
        load();
      },
    });
  };

  const handleTogglePermAction = async (roleId: number, perm: RolePermission) => {
    if (!api) return;
    if (perm.Action === "Allow") {
      await api.denyPermissionsForRole(roleId, [perm.PermissionId]);
    } else {
      await api.assignPermissionsToRole(roleId, [perm.PermissionId]);
    }
    loadPerms(roleId);
  };

  const handleRemovePerm = async (roleId: number, permId: number) => {
    if (!api) return;
    await api.removePermissionsFromRole(roleId, [permId]);
    loadPerms(roleId);
  };

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => r.Name.toLowerCase().includes(q) || String(r.RoleId).includes(q));
  }, [roles, filter]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ position: "relative" }}>
      <div className="flex items-center gap-2 shrink-0" style={{ height: 35, padding: "0 12px", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={load} disabled={loading} className="toolbar-btn" title="Refresh">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
        <button onClick={() => setOverlay({ type: "upsertRole", editing: null })} className="toolbar-btn" title="Add Role">
          <Plus size={14} />
        </button>
        <div className="flex items-center gap-1" style={{ marginLeft: "auto" }}>
          <Search size={14} style={{ color: "var(--color-text-muted)" }} />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter..." style={searchStyle} />
        </div>
      </div>

      <div className="flex-1 overflow-auto" style={{ padding: "4px 0" }}>
        {filtered.map((role) => {
          const isExp = expandedRoles.has(role.RoleId);
          const perms = rolePerms[role.RoleId];
          return (
            <div key={role.RoleId} style={{ borderBottom: "1px solid var(--color-border)" }}>
              {/* Header */}
              <div
                className="flex items-center gap-2"
                style={{ height: 32, padding: "0 12px", cursor: "pointer", userSelect: "none" }}
                onClick={() => toggleRole(role.RoleId)}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                {isExp ? <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.6 }} /> : <ChevronRight size={14} style={{ flexShrink: 0, opacity: 0.6 }} />}
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text)", flex: 1 }}>
                  {role.Name}
                </span>
                <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginRight: 8 }}>ID: {role.RoleId}</span>
                <button onClick={(e) => { e.stopPropagation(); setOverlay({ type: "upsertRole", editing: role }); }} className="toolbar-btn" title="Edit"><Pencil size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }} className="toolbar-btn" title="Delete"><Trash2 size={12} /></button>
              </div>

              {/* Expanded body */}
              {isExp && (
                <div style={{ padding: "4px 12px 12px 30px" }}>
                  {role.Description && (
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>{role.Description}</div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 8 }}>
                    TTL: {role.SessionSettings?.SessionTTL ?? "—"} |
                    Auto: {role.SessionSettings?.AutoProlongation ? "Yes" : "No"} |
                    Manual: {role.SessionSettings?.ManualProlongation ? "Yes" : "No"} |
                    Encrypt: {role.SessionSettings?.EncryptionRequired ? "Yes" : "No"} |
                    ReAuth: {role.SessionSettings?.ReAuthEnable ? "Yes" : "No"}
                  </div>

                  {/* Permissions */}
                  <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Permissions</span>
                    <button
                      onClick={() => {
                        const existingIds = new Set((perms ?? []).map((p) => p.PermissionId));
                        setOverlay({ type: "assignPerms", roleId: role.RoleId, existingIds });
                      }}
                      className="toolbar-btn"
                      title="Add Permission"
                    >
                      <UserPlus size={13} />
                    </button>
                  </div>

                  {perms ? (
                    perms.length > 0 ? (
                      perms.map((p) => (
                        <div key={p.PermissionId} className="flex items-center gap-2" style={{ height: 24, fontSize: 12 }}>
                          <button
                            onClick={() => handleTogglePermAction(role.RoleId, p)}
                            className="toolbar-btn"
                            style={{ color: p.Action === "Allow" ? "#4CAF50" : "#F44336" }}
                            title={p.Action === "Allow" ? "Click to Deny" : "Click to Allow"}
                          >
                            {p.Action === "Allow" ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
                          </button>
                          <span style={{ flex: 1, color: "var(--color-text)" }}>{p.Name}</span>
                          <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>#{p.PermissionId}</span>
                          <button onClick={() => handleRemovePerm(role.RoleId, p.PermissionId)} className="toolbar-btn" title="Remove">
                            <XIcon size={11} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", padding: 4 }}>No permissions assigned</div>
                    )
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", padding: 4 }}>Loading...</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && !loading && (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 24, fontSize: 12 }}>No roles found</div>
        )}
      </div>

      {overlay.type === "upsertRole" && api && (
        <RoleDialog editing={overlay.editing} api={api} onClose={() => setOverlay({ type: "none" })} onDone={() => { setOverlay({ type: "none" }); load(); }} />
      )}

      {overlay.type === "assignPerms" && api && (
        <AssignPermissionDialog
          roleId={overlay.roleId}
          existingIds={overlay.existingIds}
          api={api}
          onClose={() => setOverlay({ type: "none" })}
          onDone={() => { setOverlay({ type: "none" }); loadPerms(overlay.roleId); }}
        />
      )}

      {overlay.type === "confirm" && (
        <ConfirmOverlay title={overlay.title} onConfirm={overlay.onConfirm} onCancel={() => setOverlay({ type: "none" })} />
      )}
    </div>
  );
}

function ConfirmOverlay({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <div style={overlayBg}>
      <div style={dialogStyle}>
        <p style={{ fontSize: 13, marginBottom: 16 }}>{title}</p>
        <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
          <button onClick={async () => { setSubmitting(true); await onConfirm(); setSubmitting(false); }} disabled={submitting} style={dangerBtnStyle}>{submitting ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

const searchStyle: React.CSSProperties = { background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 12, padding: "2px 6px", height: 22, width: 160, borderRadius: 3, outline: "none" };
const overlayBg: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 20, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60 };
const dialogStyle: React.CSSProperties = { backgroundColor: "var(--color-sidebar)", border: "1px solid var(--color-border)", borderRadius: 6, padding: 20, minWidth: 340, maxWidth: "80%", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const cancelBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: 3, cursor: "pointer" };
const dangerBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "#c53030", border: "none", color: "#fff", borderRadius: 3, cursor: "pointer" };
