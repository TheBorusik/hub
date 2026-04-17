import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = "OK", cancelLabel = "Cancel", danger, onConfirm, onCancel }: ConfirmDialogProps) {
  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}
      onMouseDown={onCancel}
    >
      <div
        style={{
          background: "var(--color-sidebar)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          padding: "16px 20px",
          minWidth: 320,
          maxWidth: 450,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>{message}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "5px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-primary)",
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "5px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "none",
              background: danger ? "#d32f2f" : "var(--color-accent)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
