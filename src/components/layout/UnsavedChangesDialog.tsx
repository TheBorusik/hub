import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/design-tokens";
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
  return (
    <Modal
      open
      onClose={saving ? () => {} : onCancel}
      dismissible={!saving}
      size="sm"
      aria-label="Unsaved changes"
    >
      <Modal.Header
        title="Unsaved changes"
        icon={<AlertTriangle size={16} color={t.color.warning} />}
      />
      <Modal.Body>
        <div
          style={{
            fontSize: t.font.size.sm,
            color: t.color.text.muted,
            marginBottom: t.space[5],
          }}
        >
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
              padding: `${t.space[3]} ${t.space[5]}`,
              background: t.color.bg.editor,
              border: `1px solid ${t.color.border.default}`,
              borderRadius: t.radius.sm,
              fontSize: t.font.size.xs,
              color: t.color.text.primary,
              fontFamily: t.font.mono,
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
              marginTop: t.space[5],
              padding: `${t.space[3]} ${t.space[5]}`,
              background: t.color.bg.dangerSoft,
              border: `1px solid ${t.color.border.default}`,
              borderRadius: t.radius.sm,
              fontSize: t.font.size.xs,
              color: t.color.text.danger,
            }}
          >
            {error}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDiscardAndGo}
          disabled={saving}
          title="Leave without saving — changes stay in the editor for later"
        >
          Continue anyway
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={onSaveAndGo}
          busy={saving}
        >
          Save & go
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
