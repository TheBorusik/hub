import { useState } from "react";
import { createPortal } from "react-dom";
import { X, GitCommitHorizontal } from "lucide-react";

interface CommitMessageDialogProps {
  /** Имя объекта, который коммитим — пре-заполняет сообщение (`Update {typeName}`). */
  typeName: string;
  /** Блокирует кнопку во время commit'а. */
  busy: boolean;
  onCancel: () => void;
  onCommit: (message: string) => void;
}

/**
 * Диалог ввода commit message (используется для коммита global model в
 * `ProcessAssembly`). Enter — commit, Esc — отмена.
 */
export function CommitMessageDialog({
  typeName,
  busy,
  onCancel,
  onCommit,
}: CommitMessageDialogProps) {
  const [message, setMessage] = useState(`Update ${typeName}`);
  const canCommit = message.trim().length > 0 && !busy;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onMouseDown={onCancel}
    >
      <div
        style={{
          background: "var(--color-sidebar)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          width: 420,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between shrink-0"
          style={{ padding: "8px 14px", borderBottom: "1px solid var(--color-border)" }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
            Commit {typeName}
          </span>
          <button className="toolbar-btn" onClick={onCancel}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: "12px 14px" }}>
          <label
            style={{
              fontSize: 11,
              color: "var(--color-text-muted)",
              fontWeight: 600,
              display: "block",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            Commit message
          </label>
          <input
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCommit) {
                e.preventDefault();
                onCommit(message.trim());
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
              }
            }}
            style={{
              width: "100%",
              background: "var(--color-surface-400)",
              border: "1px solid var(--color-border)",
              borderRadius: 3,
              padding: "5px 8px",
              fontSize: 12,
              color: "var(--color-text-primary)",
              outline: "none",
            }}
          />
        </div>
        <div
          className="flex items-center justify-end gap-2 shrink-0"
          style={{ padding: "8px 14px", borderTop: "1px solid var(--color-border)" }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "4px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-primary)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onCommit(message.trim())}
            disabled={!canCommit}
            style={{
              padding: "4px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "none",
              background: canCommit ? "#1bb61b" : "var(--color-surface-400)",
              color: "#fff",
              cursor: canCommit ? "pointer" : "not-allowed",
              opacity: canCommit ? 1 : 0.6,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <GitCommitHorizontal size={13} />
            {busy ? "Committing..." : "Commit"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
