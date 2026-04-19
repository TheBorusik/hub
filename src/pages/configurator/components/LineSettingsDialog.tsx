import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { t as tok } from "@/lib/design-tokens";

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

  return (
    <Modal open onClose={onClose} size="lg" aria-label="Line Settings">
      <Modal.Header
        title="Line Settings"
      >
        <span style={{ fontSize: 11, color: tok.color.text.muted, marginRight: tok.space[2] }}>
          {stageDisplayName || stageName}
        </span>
      </Modal.Header>
      <Modal.Body>
        {entries.length === 0 ? (
          <EmptyState
            dense
            title="No outgoing lines"
            hint="Add a transition (`return OtherStage;`) to see line settings here."
          />
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
      </Modal.Body>
      <Modal.Footer>
        <Button size="sm" variant="primary" onClick={onClose}>Done</Button>
      </Modal.Footer>
    </Modal>
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
        border: `1px solid ${tok.color.border.default}`,
        borderRadius: tok.radius.md,
        padding: "10px 12px",
        display: "flex", flexDirection: "column", gap: 8,
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center",
          fontSize: 13, fontWeight: 600, color: tok.color.text.primary,
        }}
      >
        <span>→ {target}</span>
        <label
          style={{
            marginLeft: "auto", fontSize: 11, color: tok.color.text.muted,
            display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={line.Dash ?? false}
            onChange={(e) => onUpdate("Dash", e.target.checked)}
            style={{ accentColor: tok.color.accent }}
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
      <span style={{ fontSize: 11, color: tok.color.text.muted, minWidth: 190 }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 14 }}>
        {POSITIONS.map((pos) => (
          <label
            key={pos}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 12, cursor: "pointer", userSelect: "none",
              color: value === pos ? tok.color.accent : tok.color.text.primary,
              fontWeight: value === pos ? 600 : 400,
            }}
          >
            <input
              type="radio"
              name={`${field}-${label}`}
              checked={value === pos}
              onChange={() => onChange(pos)}
              style={{ accentColor: tok.color.accent }}
            />
            {pos}
          </label>
        ))}
      </div>
    </div>
  );
}
