import type { ReactNode } from "react";
import { AlertTriangle, Info as InfoIcon, AlertCircle } from "lucide-react";
import { t } from "@/lib/design-tokens";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export type ConfirmDialogTone = "info" | "warning" | "danger";

export interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: ReactNode;
  message: ReactNode;
  /** Подробное пояснение под сообщением (например, список идентификаторов). */
  details?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Тон: info (ok/cancel), warning (confirm обычный), danger (confirm красный). */
  tone?: ConfirmDialogTone;
  /** Флаг «выполняется сейчас» — дизейблит кнопки + спиннер на confirm. */
  busy?: boolean;
  /** Сообщение об ошибке выполнения (показывается над кнопками). */
  error?: string | null;
  /** Изменяемая ширина (sm/md/lg). default: "sm". */
  size?: "sm" | "md" | "lg";
}

const ICON_MAP = {
  info: <InfoIcon size={18} color={t.color.info} />,
  warning: <AlertTriangle size={18} color={t.color.warning} />,
  danger: <AlertCircle size={18} color={t.color.danger} />,
} as const;

/**
 * Унифицированный диалог подтверждения на базе общего <Modal/>.
 *
 * Для декларативного использования из любой точки приложения — см. `useConfirm`,
 * он даёт функцию `confirm({...}): Promise<boolean>` без локального useState.
 */
export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  details,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "warning",
  busy = false,
  error = null,
  size = "sm",
}: ConfirmDialogProps) {
  const confirmVariant = tone === "danger" ? "danger" : "primary";
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onCancel}
      size={size}
      dismissible={!busy}
    >
      <Modal.Header title={title} icon={ICON_MAP[tone]} showClose={!busy} />
      <Modal.Body>
        <div
          style={{
            fontSize: t.font.size.md,
            color: t.color.text.primary,
            whiteSpace: "pre-wrap",
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>
        {details && (
          <div style={{ marginTop: t.space[4], fontSize: t.font.size.xs, color: t.color.text.muted }}>
            {details}
          </div>
        )}
        {error && (
          <div
            role="alert"
            style={{
              marginTop: t.space[4],
              fontSize: t.font.size.xs,
              color: t.color.text.danger,
              background: t.color.bg.dangerSoft,
              padding: `${t.space[2]} ${t.space[4]}`,
              borderRadius: t.radius.md,
              border: `1px solid ${t.color.danger}`,
            }}
          >
            {error}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} size="sm" onClick={onConfirm} busy={busy}>
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
