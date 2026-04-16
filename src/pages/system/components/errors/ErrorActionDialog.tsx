import { useState } from "react";
import { X } from "lucide-react";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";
import type { HubWsApi } from "@/lib/ws-api";

type Mode = "resend" | "resendWithData" | "sendResult";

interface ErrorActionDialogProps {
  mode: Mode;
  correlationId: string;
  payload?: string;
  api: HubWsApi;
  onClose: () => void;
  onDone: () => void;
}

export function ErrorActionDialog({ mode, correlationId, payload, api, onClose, onDone }: ErrorActionDialogProps) {
  const [newPayload, setNewPayload] = useState(payload ?? "{}");
  const [resultCode, setResultCode] = useState("Ok");
  const [resultJson, setResultJson] = useState("{}");
  const [errorJson, setErrorJson] = useState("null");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (mode === "resend") {
        await api.resendError(correlationId);
      } else if (mode === "resendWithData") {
        const parsed = JSON.parse(newPayload);
        await api.resendWithNewData(correlationId, parsed);
      } else {
        const res = JSON.parse(resultJson);
        const err = JSON.parse(errorJson);
        await api.sendCommandResult(correlationId, res, err, resultCode);
      }
      onDone();
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const titles: Record<Mode, string> = {
    resend: "Resend",
    resendWithData: "Resend with New Data",
    sendResult: "Send Command Result",
  };

  return (
    <div style={overlayBg}>
      <div style={{ ...dialogStyle, width: mode === "resend" ? 420 : "55vw", maxHeight: "75vh", display: "flex", flexDirection: "column", resize: mode === "resend" ? "none" : "both", overflow: "hidden" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{titles[mode]}</span>
          <button onClick={onClose} disabled={submitting} className="toolbar-btn"><X size={14} /></button>
        </div>

        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8, flexShrink: 0 }}>
          CorrelationId: <span style={{ color: "var(--color-text)" }}>{correlationId}</span>
        </div>

        {mode === "resend" && (
          <p style={{ fontSize: 13, color: "var(--color-text)", marginBottom: 16 }}>
            Are you sure you want to resend this message?
          </p>
        )}

        {mode === "resendWithData" && (
          <div style={{ flex: 1, minHeight: 150 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}>Payload</div>
            <JsonEditor value={newPayload} onChange={setNewPayload} height="100%" />
          </div>
        )}

        {mode === "sendResult" && (
          <div className="flex flex-col gap-2" style={{ flex: 1, minHeight: 0 }}>
            <label style={labelStyle}>
              ResultCode
              <input value={resultCode} onChange={(e) => setResultCode(e.target.value)} style={inputStyle} />
            </label>
            <div style={{ flex: 1, minHeight: 80 }}>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}>Result</div>
              <JsonEditor value={resultJson} onChange={setResultJson} height="calc(100% - 18px)" />
            </div>
            <div style={{ flex: 1, minHeight: 80 }}>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}>Error</div>
              <JsonEditor value={errorJson} onChange={setErrorJson} height="calc(100% - 18px)" />
            </div>
          </div>
        )}

        <div className="flex gap-2" style={{ justifyContent: "flex-end", marginTop: 12, flexShrink: 0 }}>
          <button onClick={onClose} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={mode === "resend" ? primaryBtnStyle : primaryBtnStyle}>
            {submitting ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayBg: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 20, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60 };
const dialogStyle: React.CSSProperties = { backgroundColor: "var(--color-sidebar)", border: "1px solid var(--color-border)", borderRadius: 6, padding: 20, minWidth: 340, maxWidth: "80%", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-text-muted)", flexShrink: 0 };
const inputStyle: React.CSSProperties = { background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 12, padding: "4px 8px", height: 24, borderRadius: 3, outline: "none" };
const cancelBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: 3, cursor: "pointer" };
const primaryBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "#0e639c", border: "none", color: "#fff", borderRadius: 3, cursor: "pointer" };
