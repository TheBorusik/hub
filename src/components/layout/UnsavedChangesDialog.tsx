import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { SectionId } from "./ActivityBar";

interface UnsavedChangesDialogProps {
  fromSection: SectionId;
  targetSection: SectionId;
  /** Человеко-читаемый список dirty-сущностей. */
  dirtyList: string[];
  saving: boolean;
  error: string | null;
  onSaveAndGo: () => void;
  onDiscardAndGo: () => void;
  onCancel: () => void;
}

const SECTION_TITLES: Record<SectionId, string> = {
  configurator: "Configurator",
  viewer: "Viewer",
  "command-tester": "Command Tester",
  "crud-editor": "CRUD",
  system: "System",
  projects: "Projects",
  "db-explorer": "DB Explorer",
};

export function UnsavedChangesDialog({
  fromSection, targetSection, dirtyList, saving, error,
  onSaveAndGo, onDiscardAndGo, onCancel,
}: UnsavedChangesDialogProps) {
  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 11000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
      }}
      onMouseDown={saving ? undefined : onCancel}
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
          <AlertTriangle size={16} color="#F6AA1C" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
            Unsaved changes
          </span>
        </div>

        <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 10 }}>
          You are leaving <strong>{SECTION_TITLES[fromSection]}</strong>
          {" → "}
          <strong>{SECTION_TITLES[targetSection]}</strong>.
          {dirtyList.length > 0
            ? ` ${dirtyList.length} item${dirtyList.length === 1 ? "" : "s"} not saved:`
            : " There are unsaved changes."}
        </div>

        {dirtyList.length > 0 && (
          <div
            style={{
              maxHeight: 140,
              overflow: "auto",
              marginBottom: 12,
              padding: "6px 10px",
              background: "var(--color-editor)",
              border: "1px solid var(--color-border)",
              borderRadius: 3,
              fontSize: 12,
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {dirtyList.map((name, i) => (
              <div key={i}>• {name}</div>
            ))}
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: "6px 10px",
              background: "rgba(246,81,29,0.15)",
              border: "1px solid rgba(246,81,29,0.5)",
              borderRadius: 3,
              fontSize: 12,
              color: "#F6511D",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: "5px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-primary)",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onDiscardAndGo}
            disabled={saving}
            style={{
              padding: "5px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-primary)",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
            title="Leave without saving — changes stay in the editor for later"
          >
            Continue anyway
          </button>
          <button
            onClick={onSaveAndGo}
            disabled={saving}
            style={{
              padding: "5px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "none",
              background: "var(--color-accent)",
              color: "#fff",
              cursor: saving ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Save & go
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
