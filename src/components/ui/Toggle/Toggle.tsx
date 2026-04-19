import { forwardRef, useId, type InputHTMLAttributes } from "react";

export type ToggleSize = "sm" | "md";

export interface ToggleProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  size?: ToggleSize;
  /** Текст label (если нужен рядом). */
  label?: string;
  /** Поставить label слева от свитча (default — справа). */
  labelFirst?: boolean;
}

/**
 * Переключатель: обёртка над нативными `.toggle-switch` / `.toggle-switch-sm`
 * из globals.css (сохраняем их стили, чтобы не ломать visual). Новый компонент
 * просто даёт нормальный API с label и accessibility.
 */
export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { size = "md", label, labelFirst = false, id, className, style, disabled, ...rest },
  ref,
) {
  const fallbackId = useId();
  const controlId = id ?? fallbackId;
  const sizeClass = size === "sm" ? "toggle-switch-sm" : "toggle-switch";

  const control = (
    <label
      htmlFor={controlId}
      className={sizeClass}
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? "default" : "pointer" }}
    >
      <input
        id={controlId}
        ref={ref}
        type="checkbox"
        disabled={disabled}
        {...rest}
      />
      <span className="toggle-track" />
    </label>
  );

  if (!label) return control;

  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, ...style }}
    >
      {labelFirst && (
        <label
          htmlFor={controlId}
          style={{ cursor: disabled ? "default" : "pointer", fontSize: "var(--font-size-xs)" }}
        >
          {label}
        </label>
      )}
      {control}
      {!labelFirst && (
        <label
          htmlFor={controlId}
          style={{ cursor: disabled ? "default" : "pointer", fontSize: "var(--font-size-xs)" }}
        >
          {label}
        </label>
      )}
    </span>
  );
});
