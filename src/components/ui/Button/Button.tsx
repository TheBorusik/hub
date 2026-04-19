import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { t } from "@/lib/design-tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "size"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Иконка слева от label. */
  icon?: ReactNode;
  /** Иконка справа от label. */
  iconEnd?: ReactNode;
  /** Флаг загрузки: disable + спиннер вместо icon. */
  busy?: boolean;
  /** Растянуть на ширину родителя. */
  block?: boolean;
}

const SIZE: Record<ButtonSize, { height: string; paddingX: string; fontSize: string }> = {
  sm: { height: t.component.button.heightSm, paddingX: t.space[4], fontSize: t.font.size.xs },
  md: { height: t.component.button.height, paddingX: t.space[5], fontSize: t.font.size.sm },
};

function variantStyle(variant: ButtonVariant): CSSProperties {
  switch (variant) {
    case "primary":
      return {
        background: t.color.accent,
        color: "#ffffff",
        border: `1px solid ${t.color.accent}`,
      };
    case "secondary":
      return {
        background: t.color.bg.panel,
        color: t.color.text.primary,
        border: `1px solid ${t.color.border.default}`,
      };
    case "ghost":
      return {
        background: "transparent",
        color: t.color.text.primary,
        border: "1px solid transparent",
      };
    case "danger":
      return {
        background: t.color.danger,
        color: "#ffffff",
        border: `1px solid ${t.color.danger}`,
      };
    case "link":
      return {
        background: "transparent",
        color: t.color.text.link,
        border: "1px solid transparent",
        textDecoration: "underline",
        padding: 0,
      };
  }
}

/**
 * Базовая кнопка. Собрана на токенах — не содержит hex/числовых размеров.
 * `variant="ghost"` используется для иконочных/вторичных действий в тулбарах.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    icon,
    iconEnd,
    busy = false,
    block = false,
    disabled,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const s = SIZE[size];
  const isDisabled = disabled || busy;

  return (
    <button
      ref={ref}
      className={className}
      disabled={isDisabled}
      data-variant={variant}
      data-busy={busy || undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: t.space[3],
        height: s.height,
        padding: `0 ${s.paddingX}`,
        fontSize: s.fontSize,
        fontFamily: "inherit",
        fontWeight: 500,
        borderRadius: t.radius.md,
        cursor: isDisabled ? "default" : "pointer",
        opacity: isDisabled ? 0.55 : 1,
        transition: `background ${t.duration.fast}, border-color ${t.duration.fast}`,
        width: block ? "100%" : undefined,
        whiteSpace: "nowrap",
        userSelect: "none",
        ...variantStyle(variant),
        ...style,
      }}
      {...rest}
    >
      {busy ? (
        <Loader2 size={size === "sm" ? 12 : 14} className="animate-spin" />
      ) : (
        icon && <span style={{ display: "inline-flex", flexShrink: 0 }}>{icon}</span>
      )}
      {children}
      {iconEnd && <span style={{ display: "inline-flex", flexShrink: 0 }}>{iconEnd}</span>}
    </button>
  );
});
