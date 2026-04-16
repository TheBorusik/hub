import { useState } from "react";
import { X } from "lucide-react";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";
import type { HubWsApi } from "@/lib/ws-api";
import type { Role } from "../../types";

interface RoleDialogProps {
  editing: Role | null;
  api: HubWsApi;
  onClose: () => void;
  onDone: () => void;
}

const TTL_OPTIONS = [
  "00:05:00", "00:10:00", "00:15:00", "00:30:00",
  "01:00:00", "02:00:00", "04:00:00", "08:00:00",
  "12:00:00", "1.00:00:00", "7.00:00:00", "30.00:00:00",
];

export function RoleDialog({ editing, api, onClose, onDone }: RoleDialogProps) {
  const [name, setName] = useState(editing?.Name ?? "");
  const [desc, setDesc] = useState(editing?.Description ?? "");
  const [ttl, setTtl] = useState(editing?.SessionSettings?.SessionTTL ?? "01:00:00");
  const [autoPr, setAutoPr] = useState(editing?.SessionSettings?.AutoProlongation ?? false);
  const [manualPr, setManualPr] = useState(editing?.SessionSettings?.ManualProlongation ?? false);
  const [encrypt, setEncrypt] = useState(editing?.SessionSettings?.EncryptionRequired ?? false);
  const [reAuth, setReAuth] = useState(editing?.SessionSettings?.ReAuthEnable ?? false);
  const [sessionData, setSessionData] = useState(
    editing?.SessionData ? JSON.stringify(editing.SessionData, null, 2) : "{}",
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      let parsedSessionData: unknown = {};
      try { parsedSessionData = JSON.parse(sessionData); } catch { /* keep empty */ }

      await api.upsertRole({
        RoleId: editing?.RoleId ?? undefined,
        Name: name.trim(),
        Description: desc,
        SessionSettings: {
          SessionTTL: ttl,
          AutoProlongation: autoPr,
          ManualProlongation: manualPr,
          EncryptionRequired: encrypt,
          ReAuthEnable: reAuth,
        },
        SessionData: parsedSessionData,
      });
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayBg}>
      <div style={{ ...dialogStyle, width: "50vw", maxHeight: "80vh", display: "flex", flexDirection: "column", resize: "both", overflow: "hidden" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{editing ? "Edit Role" : "Add Role"}</span>
          <button onClick={onClose} disabled={submitting} className="toolbar-btn"><X size={14} /></button>
        </div>

        <div className="flex flex-col gap-2" style={{ flexShrink: 0 }}>
          <label style={labelStyle}>Name <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>Description <input value={desc} onChange={(e) => setDesc(e.target.value)} style={inputStyle} /></label>

          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)", marginTop: 8 }}>Session Settings</div>
          <label style={labelStyle}>
            Session TTL
            <select value={ttl} onChange={(e) => setTtl(e.target.value)} style={inputStyle}>
              {TTL_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <div className="flex gap-4 flex-wrap">
            <label style={checkStyle}><input type="checkbox" checked={autoPr} onChange={(e) => setAutoPr(e.target.checked)} /> Auto Prolongation</label>
            <label style={checkStyle}><input type="checkbox" checked={manualPr} onChange={(e) => setManualPr(e.target.checked)} /> Manual Prolongation</label>
            <label style={checkStyle}><input type="checkbox" checked={encrypt} onChange={(e) => setEncrypt(e.target.checked)} /> Encryption Required</label>
            <label style={checkStyle}><input type="checkbox" checked={reAuth} onChange={(e) => setReAuth(e.target.checked)} /> ReAuth Enable</label>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 100, marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}>Session Data (JSON)</div>
          <JsonEditor value={sessionData} onChange={setSessionData} height="calc(100% - 18px)" />
        </div>

        <div className="flex gap-2" style={{ justifyContent: "flex-end", marginTop: 12, flexShrink: 0 }}>
          <button onClick={onClose} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleSave} disabled={submitting} style={primaryBtnStyle}>{submitting ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

const overlayBg: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 20, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 40 };
const dialogStyle: React.CSSProperties = { backgroundColor: "var(--color-sidebar)", border: "1px solid var(--color-border)", borderRadius: 6, padding: 20, minWidth: 400, maxWidth: "80%", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-text-muted)" };
const checkStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-muted)", cursor: "pointer" };
const inputStyle: React.CSSProperties = { background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 12, padding: "4px 8px", height: 24, borderRadius: 3, outline: "none" };
const cancelBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: 3, cursor: "pointer" };
const primaryBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "#0e639c", border: "none", color: "#fff", borderRadius: 3, cursor: "pointer" };
