import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  RefreshCw, Plus, Search, Pencil, Trash2, UserPlus,
  ShieldCheck, ShieldOff, X as XIcon, Shield,
} from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import { RoleDialog } from "./RoleDialog";
import { AssignPermissionDialog } from "./AssignPermissionDialog";
import type { Role, RolePermission } from "../../types";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { IconButton } from "@/components/ui/Button/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { t as tok } from "@/lib/design-tokens";

type Overlay =
  | { type: "none" }
  | { type: "upsertRole"; editing: Role | null }
  | { type: "assignPerms"; roleId: number; existingIds: Set<number> };

export function RolesPanel() {
  const api = useContourApi();
  const confirm = useConfirm();
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

  const handleDeleteRole = async (role: Role) => {
    if (!api) return;
    const ok = await confirm({
      title: "Delete Role",
      message: `Delete role "${role.Name}" (ID: ${role.RoleId})?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    await api.removeRole(role.RoleId);
    if (selectedRoleId === role.RoleId) setSelectedRoleId(null);
    load();
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
      <div className="flex flex-col shrink-0" style={{ width: leftWidth, borderRight: `1px solid ${tok.color.border.default}` }}>
        <PanelToolbar
          dense
          left={
            <>
              <IconButton
                size="xs"
                label="Refresh"
                icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
                onClick={load}
                disabled={loading}
              />
              <IconButton
                size="xs"
                label="Add Role"
                icon={<Plus size={14} />}
                onClick={() => setOverlay({ type: "upsertRole", editing: null })}
              />
            </>
          }
          right={
            <div className="flex items-center gap-1" style={{ flex: 1, minWidth: 0 }}>
              <Search size={12} style={{ color: tok.color.text.muted, flexShrink: 0 }} />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter..." style={searchStyle} />
            </div>
          }
        />
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
                  color: isActive ? "#fff" : tok.color.text.primary,
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <Shield size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isActive ? 500 : 400 }}>
                  {role.Name}
                </span>
                <span style={{ fontSize: 9, color: tok.color.text.muted, flexShrink: 0 }}>
                  {role.RoleId}
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && !loading && (
            <EmptyState dense title="No roles found" />
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
            <PanelHeader
              icon={<Shield size={14} style={{ color: "#5CADD5" }} />}
              title={selectedRole.Name}
              hint={`ID: ${selectedRole.RoleId}`}
              actions={
                <>
                  <IconButton
                    size="xs"
                    label="Edit Role"
                    icon={<Pencil size={13} />}
                    onClick={() => setOverlay({ type: "upsertRole", editing: selectedRole })}
                  />
                  <IconButton
                    size="xs"
                    label="Delete Role"
                    icon={<Trash2 size={13} style={{ color: "#F44336" }} />}
                    onClick={() => handleDeleteRole(selectedRole)}
                  />
                </>
              }
            />

            <div className="flex-1 overflow-auto" style={{ padding: 12 }}>
              {/* Description */}
              {selectedRole.Description && (
                <div style={{ fontSize: 12, color: tok.color.text.muted, marginBottom: 10 }}>{selectedRole.Description}</div>
              )}

              {/* Session Settings summary */}
              <div style={{ fontSize: 11, color: tok.color.text.muted, marginBottom: 12, lineHeight: 1.8 }}>
                <span style={tagStyle}>TTL: {ss?.TTL ?? ss?.SessionTTL ?? "—"}</span>
                <span style={tagStyle}>Auto: {ss?.AutoProlongation ? "Yes" : "No"}</span>
                <span style={tagStyle}>Manual: {ss?.ManualProlongation ? "Yes" : "No"}</span>
                <span style={tagStyle}>Encrypt: {ss?.EncryptionRequired ? "Yes" : "No"}</span>
                <span style={tagStyle}>ReAuth: {ss?.ReAuthEnable ? "Yes" : "No"}</span>
              </div>

              {/* Permissions section */}
              <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: tok.color.text.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Permissions
                </span>
                <IconButton
                  size="xs"
                  label="Add Permission"
                  icon={<UserPlus size={13} />}
                  onClick={() => {
                    const existingIds = new Set((perms ?? []).map((p) => p.PermissionId));
                    setOverlay({ type: "assignPerms", roleId: selectedRole.RoleId, existingIds });
                  }}
                />
                <IconButton
                  size="xs"
                  label="Refresh Permissions"
                  icon={<RefreshCw size={12} className={permsLoading ? "animate-spin" : ""} />}
                  onClick={() => loadPerms(selectedRole.RoleId)}
                />
              </div>

              {perms ? (
                perms.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {perms.map((p) => (
                      <div
                        key={p.PermissionId}
                        className="flex items-center gap-2"
                        style={{ height: 28, fontSize: 12, padding: "0 4px", borderRadius: tok.radius.sm }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                      >
                        <IconButton
                          size="xs"
                          label={p.Action === "Allow" ? "Click to Deny" : "Click to Allow"}
                          icon={
                            p.Action === "Allow"
                              ? <ShieldCheck size={14} style={{ color: "#4CAF50" }} />
                              : <ShieldOff size={14} style={{ color: "#F44336" }} />
                          }
                          onClick={() => handleTogglePermAction(p)}
                        />
                        <span style={{ flex: 1, color: tok.color.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.Name}</span>
                        <span style={{ fontSize: 9, color: tok.color.text.muted, background: "rgba(255,255,255,0.06)", borderRadius: tok.radius.sm, padding: "0 4px", lineHeight: "16px", flexShrink: 0 }}>
                          #{p.PermissionId}
                        </span>
                        <IconButton
                          size="xs"
                          label="Remove Permission"
                          icon={<XIcon size={12} style={{ color: "#F44336" }} />}
                          onClick={() => handleRemovePerm(p.PermissionId)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState dense title="No permissions assigned" />
                )
              ) : (
                <EmptyState dense title="Loading permissions..." />
              )}
            </div>
          </>
        ) : (
          <EmptyState title="Select a role to view details" />
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
    </div>
  );
}

const tagStyle: React.CSSProperties = { display: "inline-block", background: "rgba(255,255,255,0.06)", borderRadius: 3, padding: "1px 6px", marginRight: 6, fontSize: 11 };
const searchStyle: React.CSSProperties = { background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 11, padding: "2px 6px", height: 22, width: "100%", borderRadius: 3, outline: "none" };
