import { useState } from "react";
import { GitCommitHorizontal } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormRow } from "@/components/ui/FormRow";
import { t } from "@/lib/design-tokens";

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
 * `ProcessAssembly`). Enter — commit, Esc — отмена. На <Modal>: focus-trap,
 * return focus, общий backdrop / z-index из дизайн-токенов.
 */
export function CommitMessageDialog({
  typeName,
  busy,
  onCancel,
  onCommit,
}: CommitMessageDialogProps) {
  const [message, setMessage] = useState(`Update ${typeName}`);
  const canCommit = message.trim().length > 0 && !busy;

  return (
    <Modal open onClose={onCancel} size="sm" aria-label={`Commit ${typeName}`}>
      <Modal.Header title={`Commit ${typeName}`} />
      <Modal.Body>
        <FormRow label="Commit message">
          <input
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCommit) {
                e.preventDefault();
                onCommit(message.trim());
              }
            }}
            style={{
              width: "100%",
              background: t.color.bg.editor,
              border: `1px solid ${t.color.border.default}`,
              borderRadius: t.radius.sm,
              padding: `${t.space[2]} ${t.space[4]}`,
              fontSize: t.font.size.xs,
              color: t.color.text.primary,
              outline: "none",
            }}
          />
        </FormRow>
      </Modal.Body>
      <Modal.Footer>
        <Button size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          icon={<GitCommitHorizontal size={13} />}
          disabled={!canCommit}
          busy={busy}
          onClick={() => onCommit(message.trim())}
        >
          {busy ? "Committing..." : "Commit"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
