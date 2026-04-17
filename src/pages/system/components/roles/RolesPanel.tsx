import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  RefreshCw, Plus, Search, Pencil, Trash2, UserPlus,
  ShieldCheck, ShieldOff, X as XIcon, Shield,
} from "lucide-react";
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
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [rolePerms, setRolePerms] = useState<Record<number, RolePermission[]>>({});
  const [permsLoading, setPermsLoading] = useState(false);
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
    setPermsLoading(true);
    try {
      const res = await api.getRolePermissions(roleId);
      const list = (res as Record<string, unknown>).Permissions;
      setRolePerms((prev) => ({ ...prev, [roleId]: Array.isArray(list) ? (list as RolePermission[]) : [] }));
    } catch {
      setRolePerms((prev) => ({ ...prev, [roleId]: [] }));
    } finally { setPermsLoading(false); }
  }, [api]);

  const selectRole = useCallback((roleId: number) => {
    setSelectedRoleId(roleId);
    if (!rolePerms[roleId]) loadPerms(roleId);
  }, [rolePerms, loadPerms]);

  const selectedRole = useMemo(() => roles.find((r) => r.RoleId === selectedRoleId) ?? null, [roles, selectedRoleId]);
  const perms = selectedRoleId != null ? rolePerms[selectedRoleId] : undefined;

  const handleDeleteRole = (role: Role) => {
    if (!api) return;
    setOverlay({
      type: "confirm",
      title: `Delete role "${role.Name}" (ID: ${role.RoleId})?`,
      onConfirm: async () => {
        await api.removeRole(role.RoleId);
        setOverlay({ type: "none" });
        if (selectedRoleId === role.RoleId) setSelectedRoleId(null);
        load();
      },
    });
  };

  const handleTogglePermAction = async (perm: RolePermission) => {
    if (!api || selectedRoleId == null) return;
    if (perm.Action === "Allow") {
      await api.denyPermissionsForRole(selectedRoleId, [perm.PermissionId]);
    } else {
      await api.assignPermissionsToRole(selectedRoleId, [perm.PermissionId]);
    }
    loadPerms(selectedRoleId);
  };

  const handleRemovePerm = async (permId: number) => {
    if (!api || selectedRoleId == null) return;
    await api.removePermissionsFromRole(selectedRoleId, [permId]);
    loadPerms(selectedRoleId);
  };

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => r.Name.toLowerCase().includes(q) || String(r.RoleId).includes(q));
  }, [roles, filter]);

  const ss = selectedRole?.SessionSettings;

  const [leftWidth, setLeftWidth] = useState(250);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX;
    const startW = leftWidth;

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = ev.clientX - startX;
      const newW = Math.max(150, Math.min(500, startW + delta));
      setLeftWidth(newW);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [leftWidth]);

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden" style={{ position: "relative" }}>
      {/* ===== LEFT: Role list ===== */}
      <div className="flex flex-col shrink-0" style={{ width: leftWidth, borderRight: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-1 shrink-0" style={{ height: 35, padding: "0 8px", borderBottom: "1px solid var(--color-border)" }}>
          <button onClick={load} disabled={loading} className="toolbar-btn" title="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setOverlay({ type: "upsertRole", editing: null })} className="toolbar-btn" title="Add Role">
            <Plus size={14} />
          </button>
          <div className="flex items-center gap-1" style={{ marginLeft: "auto", flex: 1, minWidth: 0 }}>
            <Search size={12} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter..." style={searchStyle} />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.map((role) => {
            const isActive = role.RoleId === selectedRoleId;
            return (
              <div
                key={role.RoleId}
                className="flex items-center gap-2"
                onClick={() => selectRole(role.RoleId)}
                style={{
                  height: 30, padding: "0 10px", cursor: "pointer", fontSize: 12, userSelect: "none",
                  backgroundColor: isActive ? "rgba(14,99,156,0.35)" : "transparent",
                  color: isActive ? "#fff" : "var(--color-text)",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <Shield size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isActive ? 500 : 400 }}>
                  {role.Name}
                </span>
                <span style={{ fontSize: 9, color: "var(--color-text-muted)", flexShrink: 0 }}>
                  {role.RoleId}
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && !loading && (
            <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 24, fontSize: 12 }}>No roles found</div>
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          width: 4, cursor: "col-resize", flexShrink: 0,
          background: "transparent", transition: "background 150ms",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(14,99,156,0.5)"; }}
        onMouseLeave={(e) => { if (!draggingRef.current) e.currentTarget.style.background = "transparent"; }}
      />

      {/* ===== RIGHT: Role details ===== */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {selectedRole ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-2 shrink-0" style={{ height: 35, padding: "0 12px", borderBottom: "1px solid var(--color-border)" }}>
              <Shield size={14} style={{ flexShrink: 0, color: "#5CADD5" }} />
              <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{selectedRole.Name}</span>
              <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginRight: 4 }}>ID: {selectedRole.RoleId}</span>
              <button onClick={() => setOverlay({ type: "upsertRole", editing: selectedRole })} className="toolbar-btn" title="Edit Role"><Pencil size={13} /></button>
              <button onClick={() => handleDeleteRole(selectedRole)} className="toolbar-btn" style={{ color: "#F44336" }} title="Delete Role"><Trash2 size={13} /></button>
            </div>

            <div className="flex-1 overflow-auto" style={{ padding: 12 }}>
              {/* Description */}
              {selectedRole.Description && (
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 10 }}>{selectedRole.Description}</div>
              )}

              {/* Session Settings summary */}
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 12, lineHeight: 1.8 }}>
                <span style={tagStyle}>TTL: {ss?.TTL ?? ss?.SessionTTL ?? "—"}</span>
                <span style={tagStyle}>Auto: {ss?.AutoProlongation ? "Yes" : "No"}</span>
                <span style={tagStyle}>Manual: {ss?.ManualProlongation ? "Yes" : "No"}</span>
                <span style={tagStyle}>Encrypt: {ss?.EncryptionRequired ? "Yes" : "No"}</span>
                <span style={tagStyle}>ReAuth: {ss?.ReAuthEnable ? "Yes" : "No"}</span>
              </div>

              {/* Permissions section */}
              <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Permissions
                </span>
                <button
                  onClick={() => {
                    const existingIds = new Set((perms ?? []).map((p) => p.PermissionId));
                    setOverlay({ type: "assignPerms", roleId: selectedRole.RoleId, existingIds });
                  }}
                  className="toolbar-btn"
                  title="Add Permission"
                >
                  <UserPlus size={13} />
                </button>
                <button onClick={() => loadPerms(selectedRole.RoleId)} className="toolbar-btn" title="Refresh Permissions">
                  <RefreshCw size={12} className={permsLoading ? "animate-spin" : ""} />
                </button>
              </div>

              {perms ? (
                perms.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {perms.map((p) => (
                      <div
                        key={p.PermissionId}
                        className="flex items-center gap-2"
                        style={{ height: 28, fontSize: 12, padding: "0 4px", borderRadius: 3 }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                      >
                        <button
                          onClick={() => handleTogglePermAction(p)}
                          className="toolbar-btn"
                          style={{ color: p.Action === "Allow" ? "#4CAF50" : "#F44336" }}
                          title={p.Action === "Allow" ? "Click to Deny" : "Click to Allow"}
                        >
                          {p.Action === "Allow" ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                        </button>
                        <span style={{ flex: 1, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.Name}</span>
                        <span style={{ fontSize: 9, color: "var(--color-text-muted)", background: "rgba(255,255,255,0.06)", borderRadius: 3, padding: "0 4px", lineHeight: "16px", flexShrink: 0 }}>
                          #{p.PermissionId}
                        </span>
                        <button onClick={() => handleRemovePerm(p.PermissionId)} className="toolbar-btn" style={{ color: "#F44336" }} title="Remove Permission">
                          <XIcon size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", padding: "12px 4px" }}>No permissions assigned</div>
                )
              ) : (
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", padding: "12px 4px" }}>Loading permissions...</div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full" style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
            Select a role to view details
          </div>
        )}
      </div>

      {/* Overlays */}
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

const tagStyle: React.CSSProperties = { display: "inline-block", background: "rgba(255,255,255,0.06)", borderRadius: 3, padding: "1px 6px", marginRight: 6, fontSize: 11 };
const searchStyle: React.CSSProperties = { background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 11, padding: "2px 6px", height: 22, width: "100%", borderRadius: 3, outline: "none" };
const overlayBg: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 20, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60 };
const dialogStyle: React.CSSProperties = { backgroundColor: "var(--color-sidebar)", border: "1px solid var(--color-border)", borderRadius: 6, padding: 20, minWidth: 340, maxWidth: "80%", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const cancelBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: 3, cursor: "pointer" };
const dangerBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "#c53030", border: "none", color: "#fff", borderRadius: 3, cursor: "pointer" };
