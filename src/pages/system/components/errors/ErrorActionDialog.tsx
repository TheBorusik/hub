import { useState } from "react";
import { ChevronLeft, ChevronRight, Send, Copy, RotateCcw, Gavel } from "lucide-react";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/design-tokens";
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

  const ariaLabel = `${titleText}: ${adapterLabel} ${row.RoutingKey}`;

  return (
    <Modal
      open
      onClose={onClose}
      size={isCompact ? "sm" : "xl"}
      aria-label={ariaLabel}
      style={
        isCompact
          ? { width: 460, maxWidth: "min(460px, 92vw)" }
          : {
              width: "min(70vw, 960px)",
              height: "70vh",
              maxHeight: "85vh",
            }
      }
    >
      <Modal.Body
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          flex: 1,
        }}
      >
        <div
          className="flex items-center shrink-0"
          style={{
            marginBottom: t.space[3],
            minHeight: 24,
            flexWrap: "wrap",
            gap: t.space[1],
          }}
        >
          <TitleIcon size={14} style={{ color: t.color.danger, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>{titleText}</span>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{adapterLabel}</span>
          <span style={{ fontSize: 12, color: "var(--color-text)" }}>{row.RoutingKey}</span>
          {!isCompact && (
            <>
              <ChevronLeft size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text)" }}>{subtitle}</span>
              <ChevronRight size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
            </>
          )}
        </div>

        {isCompact ? (
          <div style={{ marginBottom: t.space[2] }}>
            <p style={{ fontSize: 12, color: "var(--color-text)", marginBottom: t.space[1] }}>
              Are you sure you want to resend this message?
            </p>
            <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              CorrelationId: {row.CorrelationId}
            </p>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 200, display: "flex", flexDirection: "column" }}>
            <JsonEditor value={editorValue} onChange={setEditorValue} />
          </div>
        )}
      </Modal.Body>

      {isCompact ? (
        <Modal.Footer align="end">
          <div style={{ display: "flex", alignItems: "center", gap: t.space[2] }}>
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="button"
              onClick={() => { void handleSubmit(); }}
              disabled={submitting}
              busy={submitting}
              icon={submitting ? undefined : <Send size={11} />}
            >
              {submitting ? "Sending..." : submitLabel}
            </Button>
          </div>
        </Modal.Footer>
      ) : (
        <Modal.Footer align="between">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            icon={<Copy size={12} />}
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            Copy
          </Button>
          <div style={{ display: "flex", alignItems: "center", gap: t.space[2] }}>
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="button"
              onClick={() => { void handleSubmit(); }}
              disabled={submitting}
              busy={submitting}
              icon={submitting ? undefined : <Send size={11} />}
            >
              {submitting ? "Sending..." : submitLabel}
            </Button>
          </div>
        </Modal.Footer>
      )}
    </Modal>
  );
}
