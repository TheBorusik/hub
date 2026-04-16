import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { HubWsApi } from "@/lib/ws-api";
import type { PermissionTreeNode, PermissionSettings } from "../../types";

type Mode = "catalog" | "permission";

interface PermissionDialogProps {
  mode: Mode;
  editing: PermissionTreeNode | null;
  api: HubWsApi;
  onClose: () => void;
  onDone: () => void;
}

export function PermissionDialog({ mode, editing, api, onClose, onDone }: PermissionDialogProps) {
  const [name, setName] = useState(editing?.Name ?? "");
  const [desc, setDesc] = useState(editing?.Description ?? "");
  const [strId, setStrId] = useState(editing?.StrId ?? "");
  const [catalogId, setCatalogId] = useState<number | "">(editing?.CatalogId ?? "");
  const [permId, setPermId] = useState<number | "">(editing?.PermissionId ?? "");
  const [settingsType, setSettingsType] = useState<string>(editing?.PermissionSettings?.Type ?? "Unknown");
  const [confirmRequired, setConfirmRequired] = useState(editing?.PermissionSettings?.ConfirmationRequired ?? false);
  const [apiPath, setApiPath] = useState(editing?.PermissionSettings?.ApiPath?.join(", ") ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "permission" && !editing && permId === "") {
      api.getPermissionId().then((res) => setPermId(res.Id)).catch(() => {});
    }
  }, [mode, editing, permId, api]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (mode === "catalog") {
        await api.upsertPermissionCatalog({
          CatalogId: editing?.CatalogId ?? undefined,
          Name: name.trim(),
          Description: desc,
          ParentId: catalogId || undefined,
        });
      } else {
        const settings: PermissionSettings = {
          Type: settingsType as PermissionSettings["Type"],
          ConfirmationRequired: confirmRequired,
          ApiPath: apiPath ? apiPath.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        };
        await api.upsertPermission({
          PermissionId: permId || undefined,
          StrId: strId || undefined,
          Name: name.trim(),
          Description: desc,
          CatalogId: catalogId || undefined,
          PermissionSettings: settings,
        });
      }
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayBg}>
      <div style={{ ...dialogStyle, width: 460 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {editing ? "Edit" : "Add"} {mode === "catalog" ? "Catalog" : "Permission"}
          </span>
          <button onClick={onClose} disabled={submitting} className="toolbar-btn"><X size={14} /></button>
        </div>

        <div className="flex flex-col gap-2">
          <label style={labelStyle}>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Description
            <input value={desc} onChange={(e) => setDesc(e.target.value)} style={inputStyle} />
          </label>
          <label style={labelStyle}>
            {mode === "catalog" ? "Parent Catalog ID" : "Catalog ID"}
            <input type="number" value={catalogId} onChange={(e) => setCatalogId(e.target.value ? Number(e.target.value) : "")} style={inputStyle} />
          </label>

          {mode === "permission" && (
            <>
              <label style={labelStyle}>
                Permission ID
                <input type="number" value={permId} onChange={(e) => setPermId(e.target.value ? Number(e.target.value) : "")} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                StrId
                <input value={strId} onChange={(e) => setStrId(e.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Settings Type
                <select value={settingsType} onChange={(e) => setSettingsType(e.target.value)} style={inputStyle}>
                  <option value="Unknown">Unknown</option>
                  <option value="Api">Api</option>
                  <option value="UI">UI</option>
                  <option value="Event">Event</option>
                </select>
              </label>
              <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={confirmRequired} onChange={(e) => setConfirmRequired(e.target.checked)} />
                Confirmation Required
              </label>
              <label style={labelStyle}>
                API Path (comma separated)
                <input value={apiPath} onChange={(e) => setApiPath(e.target.value)} style={inputStyle} placeholder="/api/path1, /api/path2" />
              </label>
            </>
          )}
        </div>

        <div className="flex gap-2" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleSave} disabled={submitting} style={primaryBtnStyle}>{submitting ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

const overlayBg: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 20, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60 };
const dialogStyle: React.CSSProperties = { backgroundColor: "var(--color-sidebar)", border: "1px solid var(--color-border)", borderRadius: 6, padding: 20, minWidth: 340, maxWidth: "80%", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-text-muted)" };
const inputStyle: React.CSSProperties = { background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 12, padding: "4px 8px", height: 24, borderRadius: 3, outline: "none" };
const cancelBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: 3, cursor: "pointer" };
const primaryBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "#0e639c", border: "none", color: "#fff", borderRadius: 3, cursor: "pointer" };
