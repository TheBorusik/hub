import type { CSSProperties, ReactNode } from "react";
import { t } from "@/lib/design-tokens";

export interface KbdProps {
  children: ReactNode;
  size?: "sm" | "md";
  className?: string;
  style?: CSSProperties;
}

/**
 * Визуальная подсказка клавиатурного шортката: `<Kbd>Ctrl+S</Kbd>`.
 * Используется в CommandPalette, Tooltip, ContextMenu, меню-подсказках.
 */
export function Kbd({ children, size = "sm", className, style }: KbdProps) {
  const dims =
    size === "sm"
      ? { fontSize: 10, padding: "1px 4px", minWidth: 16 }
      : { fontSize: 11, padding: "2px 6px", minWidth: 20 };
  return (
    <kbd
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: t.color.bg.panel,
        color: t.color.text.muted,
        border: `1px solid ${t.color.border.default}`,
        borderRadius: t.radius.sm,
        fontFamily: t.font.mono,
        fontWeight: 500,
        whiteSpace: "nowrap",
        lineHeight: 1,
        ...dims,
        ...style,
      }}
    >
      {children}
    </kbd>
  );
}
