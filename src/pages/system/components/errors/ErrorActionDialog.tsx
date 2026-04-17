import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Send, Copy, RotateCcw, Gavel } from "lucide-react";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";
import type { HubWsApi } from "@/lib/ws-api";
import type { ErrorOperation } from "../../types";

type Mode = "resend" | "resendWithData" | "sendResult";

interface ErrorActionDialogProps {
  mode: Mode;
  row: ErrorOperation;
  api: HubWsApi;
  onClose: () => void;
  onDone: () => void;
}

function extractPayload(raw: string): string {
  try {
    const outer = JSON.parse(raw);
    const inner = outer?.Payload?.Payload ?? outer?.Payload ?? outer;
    return JSON.stringify(inner, null, 2);
  } catch {
    return raw || "{}";
  }
}

const SEND_RESULT_TEMPLATE = JSON.stringify({ Result: {}, Error: {}, ResultCode: "" }, null, 2);

export function ErrorActionDialog({ mode, row, api, onClose, onDone }: ErrorActionDialogProps) {
  const [editorValue, setEditorValue] = useState(() => {
    if (mode === "resendWithData") return extractPayload(row.Payload || "{}");
    if (mode === "sendResult") return SEND_RESULT_TEMPLATE;
    return "";
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (mode === "resend") {
        await api.resendError(row.CorrelationId);
      } else if (mode === "resendWithData") {
        const parsed = JSON.parse(editorValue);
        await api.resendWithNewData(row.CorrelationId, parsed);
      } else {
        const parsed = JSON.parse(editorValue);
        await api.sendCommandResult(
          row.CorrelationId,
          parsed.Result ?? {},
          parsed.Error ?? {},
          parsed.ResultCode ?? "",
        );
      }
      onDone();
    } catch {
      /* keep dialog open on error */
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editorValue).catch(() => {});
  };

  const titleText = mode === "resend"
    ? "Resend"
    : mode === "resendWithData"
      ? "Resend"
      : "Send result";

  const subtitle = mode === "sendResult" ? "CommandResult" : "Payload";

  const adapterLabel = `${row.AdapterType}(${row.AdapterName})`;

  const submitLabel = mode === "resend"
    ? "Resend"
    : mode === "resendWithData"
      ? "Resend Data"
      : "Send Result";

  const TitleIcon = mode === "sendResult" ? Gavel : mode === "resend" ? RotateCcw : Send;
  const isCompact = mode === "resend";

  return (
    <div style={overlayBg}>
      <div style={{
        ...dialogStyle,
        width: isCompact ? 460 : "70vw",
        height: isCompact ? "auto" : "70vh",
        display: "flex",
        flexDirection: "column",
        resize: isCompact ? "none" : "both",
        overflow: "hidden",
      }}>
        {/* Breadcrumb header */}
        <div className="flex items-center gap-1 shrink-0" style={{ marginBottom: 12, minHeight: 24, flexWrap: "wrap" }}>
          <TitleIcon size={14} style={{ color: "#F44336", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>{titleText}</span>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{adapterLabel}</span>
          <span style={{ fontSize: 12, color: "var(--color-text)" }}>{row.RoutingKey}</span>
          {!isCompact && (<>
            <ChevronLeft size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text)" }}>{subtitle}</span>
            <ChevronRight size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
          </>)}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} disabled={submitting} className="toolbar-btn"><X size={14} /></button>
        </div>

        {/* Content */}
        {isCompact ? (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: "var(--color-text)", marginBottom: 4 }}>
              Are you sure you want to resend this message?
            </p>
            <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              CorrelationId: {row.CorrelationId}
            </p>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, marginBottom: 12 }}>
            <JsonEditor value={editorValue} onChange={setEditorValue} height="100%" />
          </div>
        )}

        {/* Bottom bar */}
        <div className="flex items-center shrink-0" style={{ borderTop: isCompact ? undefined : "1px solid var(--color-border)", paddingTop: isCompact ? 0 : 10 }}>
          {!isCompact && (
            <button onClick={handleCopy} className="toolbar-btn" style={{ gap: 4, fontSize: 12, color: "var(--color-text-muted)" }} title="Copy to clipboard">
              <Copy size={12} /> Copy
            </button>
          )}
          <div style={{ flex: 1 }} />
          <div className="flex gap-2">
            <button onClick={onClose} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} style={sendBtnStyle}>
              {submitting ? "Sending..." : submitLabel}
              {!submitting && <Send size={11} style={{ marginLeft: 4 }} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlayBg: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 20, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 48 };
const dialogStyle: React.CSSProperties = { backgroundColor: "var(--color-sidebar)", border: "1px solid var(--color-border)", borderRadius: 6, padding: 16, minWidth: 340, maxWidth: "90%", maxHeight: "85vh", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const cancelBtnStyle: React.CSSProperties = { padding: "4px 14px", fontSize: 12, background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: 3, cursor: "pointer" };
const sendBtnStyle: React.CSSProperties = { padding: "4px 14px", fontSize: 12, background: "#c53030", border: "none", color: "#fff", borderRadius: 3, cursor: "pointer", display: "inline-flex", alignItems: "center" };
