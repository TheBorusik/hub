import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { t } from "@/lib/design-tokens";

export type IconButtonVariant = "ghost" | "primary" | "danger";
export type IconButtonSize = "xs" | "sm" | "md";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size" | "title"> {
  icon: ReactNode;
  /** Обязательная подпись для accessibility + tooltip. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  busy?: boolean;
  /** Внешне показывает "активное" состояние (например, фильтр включён). */
  active?: boolean;
  /**
   * Маленький значок в правом-верхнем углу (обычно CountBadge с числом,
   * напр. число применённых фильтров). Визуально — absolute-позиционирование
   * внутри обёртки; кнопка при этом остаётся кнопкой.
   */
  badge?: ReactNode;
}

const SIZE_BOX: Record<IconButtonSize, string> = {
  xs: "20px",
  sm: "24px",
  md: "28px",
};

/**
 * Квадратная «иконочная» кнопка для тулбаров и плашек. Обязан иметь `label`
 * (aria-label + title). Заменяет класс `.toolbar-btn` и
 * `.tree-action-btn` из globals.css.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    label,
    variant = "ghost",
    size = "sm",
    busy = false,
    active = false,
    badge,
    disabled,
    className,
    style,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || busy;
  const box = SIZE_BOX[size];

  // Базовый background задаём inline только для состояний, где он важен
  // (primary/danger/active). Для ghost+inactive фон управляется CSS-классом
  // `ui-icon-btn`, чтобы работал :hover (inline style имеет приоритет и ломал hover).
  const inlineBg =
    variant === "primary"
      ? t.color.accent
      : variant === "danger"
        ? t.color.danger
        : active
          ? t.color.bg.hoverStrong
          : undefined;
  const fg =
    variant === "ghost"
      ? active
        ? t.color.text.primary
        : t.color.text.muted
      : "#ffffff";

  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      disabled={isDisabled}
      data-variant={variant}
      data-active={active ? "true" : undefined}
      className={["ui-icon-btn", className].filter(Boolean).join(" ")}
      style={{
        position: "relative",
        width: box,
        height: box,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...(inlineBg !== undefined ? { background: inlineBg } : null),
        color: fg,
        border: "none",
        borderRadius: t.radius.md,
        cursor: isDisabled ? "default" : "pointer",
        opacity: isDisabled ? 0.45 : 1,
        transition: `background ${t.duration.fast}, color ${t.duration.fast}`,
        padding: 0,
        flexShrink: 0,
        ...style,
      }}
      {...rest}
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : icon}
      {badge && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -3,
            right: -3,
            pointerEvents: "none",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
});
