import type { CSSProperties } from "react";
import { t } from "@/lib/design-tokens";

export type StatusDotTone = "ok" | "warn" | "err" | "info" | "muted" | "accent";
export type StatusDotSize = 8 | 10 | 12;

export interface StatusDotProps {
  tone: StatusDotTone;
  size?: StatusDotSize;
  /** Мягкое свечение (для выделенных/pulsing статусов). */
  glow?: boolean;
  /** Текстовая подпись справа (необязательная). */
  label?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

const TONE_COLOR: Record<StatusDotTone, string> = {
  ok:    t.color.success,
  warn:  t.color.warning,
  err:   t.color.danger,
  info:  t.color.info,
  muted: t.color.text.muted,
  accent: t.color.accent,
};

/**
 * Цветная точка-статус (health, connection, dirty). Объединяет десятки
 * ручных `<span style={{ width:8, height:8, borderRadius:"50%", background:...}} />`
 * в одном компоненте.
 */
export function StatusDot({
  tone,
  size = 8,
  glow = false,
  label,
  className,
  style,
  title,
}: StatusDotProps) {
  const color = TONE_COLOR[tone];

  const dot = (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: t.radius.full,
        background: color,
        boxShadow: glow ? `0 0 0 2px ${t.color.bg.accentSoft}` : undefined,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );

  if (!label) {
    return (
      <span
        className={className}
        style={{ display: "inline-flex", alignItems: "center", ...style }}
        title={title}
      >
        {dot}
      </span>
    );
  }

  return (
    <span
      className={className}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: t.space[2],
        color: t.color.text.primary,
        fontSize: t.font.size.xs,
        ...style,
      }}
    >
      {dot}
      <span>{label}</span>
    </span>
  );
}
