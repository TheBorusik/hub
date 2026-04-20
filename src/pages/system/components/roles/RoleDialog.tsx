import { useState, type CSSProperties } from "react";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/design-tokens";
import type { HubWsApi } from "@/lib/ws-api";
import type { Role } from "../../types";
import { inputStyle, labelStyle } from "../adapters/lib/adapter-dialog-styles";

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

const toggleLabel: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "var(--color-text-muted)",
  cursor: "pointer",
  height: 26,
};

export function RoleDialog({ editing, api, onClose, onDone }: RoleDialogProps) {
  const [name, setName] = useState(editing?.Name ?? "");
  const [desc, setDesc] = useState(editing?.Description ?? "");
  const [ttl, setTtl] = useState(editing?.SessionSettings?.TTL ?? editing?.SessionSettings?.SessionTTL ?? "01:00:00");
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
          TTL: ttl,
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
    <Modal
      open
      onClose={onClose}
      size="xl"
      style={{
        width: "min(60vw, 900px)",
        minWidth: 500,
        height: "75vh",
        maxHeight: "85vh",
      }}
    >
      <Modal.Header title={editing ? "Edit Role" : "Add Role"} />
      <Modal.Body
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          gap: t.space[3],
        }}
      >
        <div className="flex gap-3" style={{ flexShrink: 0, flexWrap: "wrap" }}>
          <label style={{ ...labelStyle, flex: 1, minWidth: 200 }}>
            Name*
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} autoFocus placeholder="Role name" />
          </label>
          <label style={{ ...labelStyle, flex: 1, minWidth: 200 }}>
            Description
            <input value={desc} onChange={(e) => setDesc(e.target.value)} style={inputStyle} placeholder="Description" />
          </label>
        </div>

        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)", marginBottom: t.space[2] }}>
            Session Settings
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            <label style={{ ...labelStyle, width: 120 }}>
              Session TTL
              <select value={ttl} onChange={(e) => setTtl(e.target.value)} style={{ ...inputStyle, height: 26, cursor: "pointer" }}>
                {TTL_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label style={toggleLabel}>
              <input type="checkbox" checked={autoPr} onChange={(e) => setAutoPr(e.target.checked)} />
              Auto Prolongation
            </label>
            <label style={toggleLabel}>
              <input type="checkbox" checked={manualPr} onChange={(e) => setManualPr(e.target.checked)} />
              Manual Prolongation
            </label>
            <label style={toggleLabel}>
              <input type="checkbox" checked={encrypt} onChange={(e) => setEncrypt(e.target.checked)} />
              Encryption Required
            </label>
            <label style={toggleLabel}>
              <input type="checkbox" checked={reAuth} onChange={(e) => setReAuth(e.target.checked)} />
              ReAuth Enable
            </label>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 150, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: t.space[1] }}>Session Data (JSON)</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <JsonEditor value={sessionData} onChange={setSessionData} height="100%" />
          </div>
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
          onClick={() => { void handleSave(); }}
          disabled={submitting || !name.trim()}
          busy={submitting}
        >
          {submitting ? "Saving..." : "Save"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
