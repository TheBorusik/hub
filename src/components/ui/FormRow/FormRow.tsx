import { useId, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { t } from "@/lib/design-tokens";

export type FormRowLayout = "stacked" | "inline";

export interface FormRowProps {
  /** Текст label. */
  label: ReactNode;
  /** Нижняя подсказка. */
  hint?: ReactNode;
  /** Сообщение об ошибке (перекрывает hint визуально). */
  error?: ReactNode;
  /** Пометить поле как обязательное. */
  required?: boolean;
  /** Расположение label→input. default: "stacked". */
  layout?: FormRowLayout;
  /** Ширина label для layout="inline". default: 140. */
  labelWidth?: number;
  /**
   * Единственный child — управляемый input/textarea/select. В него пробрасываются
   * id + aria-describedby.
   */
  children: ReactElement<Record<string, unknown>>;
  className?: string;
  style?: CSSProperties;
}

/**
 * Обёртка для поля формы с label, hint и error. Не навязывает стиль сáмого
 * input — consumer рендерит input произвольно; мы только гарантируем
 * связность ID / aria.
 */
export function FormRow({
  label,
  hint,
  error,
  required,
  layout = "stacked",
  labelWidth = 140,
  children,
  className,
  style,
}: FormRowProps) {
  const inputId = useId();
  const hintId = useId();

  const child = {
    ...children,
    props: {
      ...children.props,
      id: (children.props.id as string | undefined) ?? inputId,
      "aria-describedby": hint || error ? hintId : (children.props["aria-describedby"] as string | undefined),
      "aria-invalid": error ? true : (children.props["aria-invalid"] as boolean | undefined),
    },
  } as ReactElement;

  const labelEl = (
    <label
      htmlFor={inputId}
      style={{
        fontSize: t.font.size.xs,
        color: t.color.text.muted,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: t.space[1],
        flexShrink: 0,
      }}
    >
      {label}
      {required && <span style={{ color: t.color.text.danger }}>*</span>}
    </label>
  );

  const footer = (error || hint) && (
    <div
      id={hintId}
      style={{
        fontSize: t.font.size.xs,
        color: error ? t.color.text.danger : t.color.text.muted,
        lineHeight: 1.4,
      }}
    >
      {error ?? hint}
    </div>
  );

  if (layout === "inline") {
    return (
      <div
        className={className}
        style={{ display: "flex", alignItems: "center", gap: t.space[4], ...style }}
      >
        <div style={{ width: labelWidth, flexShrink: 0 }}>{labelEl}</div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: t.space[1] }}>
          {child}
          {footer}
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: t.space[2], ...style }}
    >
      {labelEl}
      {child}
      {footer}
    </div>
  );
}
