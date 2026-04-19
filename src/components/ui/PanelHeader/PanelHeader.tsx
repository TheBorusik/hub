import type { CSSProperties, ReactNode } from "react";
import { t } from "@/lib/design-tokens";

export type PanelHeaderSize = "sm" | "md";
export type PanelHeaderVariant = "plain" | "subtle";

export interface PanelHeaderProps {
  /** Текст/нода заголовка (обычно uppercase). */
  title: ReactNode;
  /** Иконка слева от заголовка. */
  icon?: ReactNode;
  /** Бейдж-счётчик справа от заголовка (обычно <CountBadge />). */
  badge?: ReactNode;
  /** Мелкий подзаголовок после title (serif/normal, muted). */
  hint?: ReactNode;
  /** Группа иконочных кнопок справа. */
  actions?: ReactNode;
  /** Визуальный размер. default: "sm" */
  size?: PanelHeaderSize;
  /** "subtle" — bg-sidebar + border-bottom; "plain" — прозрачный. default: "subtle" */
  variant?: PanelHeaderVariant;
  /** Кликабельность всей плашки (например для collapse). */
  onClick?: () => void;
  /** Флаг «collapsed» для aria и data-атрибута. */
  "aria-expanded"?: boolean;
  className?: string;
  style?: CSSProperties;
}

const SIZE_MAP: Record<
  PanelHeaderSize,
  { fontSize: string; height: string; paddingX: string; paddingY: string }
> = {
  sm: {
    fontSize: t.component.panelHeader.fontSize,
    height: t.component.panelHeader.height,
    paddingX: t.component.panelHeader.paddingX,
    paddingY: t.component.panelHeader.paddingY,
  },
  md: {
    fontSize: t.font.size.sm,
    height: "32px",
    paddingX: t.space[6],
    paddingY: t.space[3],
  },
};

/**
 * Единый компонент-«плашка» заголовка панели. Заменяет 25+ мест ручной
 * вёрстки вида
 *   <div style={{ padding: "4px 12px", background: sidebar, borderBottom: 1, textTransform: "uppercase", letterSpacing: 0.04em, fontSize: 11, color: muted }}>
 */
export function PanelHeader({
  title,
  icon,
  badge,
  hint,
  actions,
  size = "sm",
  variant = "subtle",
  onClick,
  "aria-expanded": ariaExpanded,
  className,
  style,
}: PanelHeaderProps) {
  const s = SIZE_MAP[size];
  const clickable = typeof onClick === "function";

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-expanded={ariaExpanded}
      className={className}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      style={{
        display: "flex",
        alignItems: "center",
        gap: t.space[3],
        height: s.height,
        minHeight: s.height,
        padding: `${s.paddingY} ${s.paddingX}`,
        background: variant === "subtle" ? t.color.bg.sidebar : "transparent",
        borderBottom: variant === "subtle" ? `1px solid ${t.color.border.default}` : undefined,
        color: t.color.text.muted,
        fontSize: s.fontSize,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: t.component.panelHeader.letterSpacing,
        userSelect: "none",
        cursor: clickable ? "pointer" : undefined,
        flexShrink: 0,
        ...style,
      }}
    >
      {icon && (
        <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
          {icon}
        </span>
      )}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </span>
      {badge && <span style={{ flexShrink: 0 }}>{badge}</span>}
      {hint && (
        <span
          style={{
            fontSize: t.font.size.xs,
            fontWeight: 400,
            letterSpacing: 0,
            textTransform: "none",
            color: t.color.text.muted,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          {hint}
        </span>
      )}
      {actions && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: t.space[1],
            flexShrink: 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </span>
      )}
    </div>
  );
}
