import { createPortal } from "react-dom";
import { X } from "lucide-react";

const POSITIONS = ["auto", "left", "bottom", "top", "right"] as const;

export interface LineData {
  LineIn?: string;
  LineOut?: string;
  Dash?: boolean;
}

interface LineSettingsDialogProps {
  stageName: string;
  stageDisplayName?: string;
  lines: Record<string, LineData>;
  onLineUpdate: (stageName: string, targetName: string, field: string, value: string | boolean) => void;
  onClose: () => void;
}

export function LineSettingsDialog({
  stageName, stageDisplayName, lines, onLineUpdate, onClose,
}: LineSettingsDialogProps) {
  const entries = Object.entries(lines);

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-editor)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          minWidth: 520, maxWidth: 720, maxHeight: "80vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 16px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-sidebar)",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
              Line Settings
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
              {stageDisplayName || stageName}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--color-text-muted)", padding: 4, display: "flex",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: 12, padding: 20 }}>
              No outgoing lines. Add a transition (`return OtherStage;`) to see line settings here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {entries.map(([target, line]) => (
                <LineRow
                  key={target}
                  target={target}
                  line={line}
                  onUpdate={(field, value) => onLineUpdate(stageName, target, field, value)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex", justifyContent: "flex-end",
            padding: "8px 16px",
            borderTop: "1px solid var(--color-border)",
            background: "var(--color-sidebar)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "4px 14px", fontSize: 12,
              background: "var(--color-accent)", color: "#fff",
              border: "none", borderRadius: 3, cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function LineRow({
  target, line, onUpdate,
}: {
  target: string;
  line: LineData;
  onUpdate: (field: string, value: string | boolean) => void;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 4,
        padding: "10px 12px",
        display: "flex", flexDirection: "column", gap: 8,
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center",
          fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)",
        }}
      >
        <span>→ {target}</span>
        <label
          style={{
            marginLeft: "auto", fontSize: 11, color: "var(--color-text-muted)",
            display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={line.Dash ?? false}
            onChange={(e) => onUpdate("Dash", e.target.checked)}
            style={{ accentColor: "var(--color-accent)" }}
          />
          Dashed
        </label>
      </div>

      <RadioRow label="Start (outgoing from this stage)" field="LineOut" value={line.LineOut ?? "auto"} onChange={(v) => onUpdate("LineOut", v)} />
      <RadioRow label="End (incoming to target)" field="LineIn" value={line.LineIn ?? "top"} onChange={(v) => onUpdate("LineIn", v)} />
    </div>
  );
}

function RadioRow({
  label, field, value, onChange,
}: {
  label: string;
  field: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, color: "var(--color-text-muted)", minWidth: 190 }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 14 }}>
        {POSITIONS.map((pos) => (
          <label
            key={pos}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 12, cursor: "pointer", userSelect: "none",
              color: value === pos ? "var(--color-accent)" : "var(--color-text-primary)",
              fontWeight: value === pos ? 600 : 400,
            }}
          >
            <input
              type="radio"
              name={`${field}-${label}`}
              checked={value === pos}
              onChange={() => onChange(pos)}
              style={{ accentColor: "var(--color-accent)" }}
            />
            {pos}
          </label>
        ))}
      </div>
    </div>
  );
}
