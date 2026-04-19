import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Визуально-акцентный стиль для destructive-действий (delete). */
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Универсальный модальный диалог подтверждения. Для destructive-действий
 * (удаление) — `danger={true}` подкрашивает CTA в красный.
 */
export function ConfirmDialog({
  title, message, confirmLabel = "Confirm", cancelLabel = "Cancel",
  danger = false, busy = false, error = null,
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 11000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
      }}
      onMouseDown={busy ? undefined : onCancel}
    >
      <div
        style={{
          background: "var(--color-sidebar)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
          padding: "16px 20px",
          minWidth: 380,
          maxWidth: 520,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <AlertTriangle size={16} color={danger ? "#F6511D" : "#F6AA1C"} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
            {title}
          </span>
        </div>

        <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 10, whiteSpace: "pre-wrap" }}>
          {message}
        </div>

        {error && (
          <div style={{ fontSize: 12, color: "#ef9a9a", marginBottom: 8 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button
            onClick={onCancel}
            disabled={busy}
            className="toolbar-btn"
            style={{ fontSize: 12, padding: "4px 10px" }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              fontSize: 12,
              padding: "4px 12px",
              background: danger ? "#c62828" : "var(--color-accent)",
              color: "#fff",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
