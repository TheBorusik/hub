import type { CSSProperties } from "react";
import { t } from "@/lib/design-tokens";

export type CountBadgeTone = "muted" | "accent" | "danger" | "warning" | "success" | "info";
export type CountBadgeSize = "sm" | "md";

export interface CountBadgeProps {
  /** Значение для отображения (число или произвольная строка, например «99+»). */
  value: number | string;
  /** Не рендерить, если value <= 0 (для чисел). default: true. */
  hideZero?: boolean;
  /** Округлить до «99+» после threshold. default: 99. */
  maxNumber?: number;
  tone?: CountBadgeTone;
  size?: CountBadgeSize;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

const TONE_BG: Record<CountBadgeTone, string> = {
  muted:   t.color.bg.hoverStrong,
  accent:  t.color.bg.accentSoft,
  danger:  t.color.bg.dangerSoft,
  warning: t.color.bg.warningSoft,
  success: t.color.bg.successSoft,
  info:    t.color.bg.infoSoft,
};

const TONE_FG: Record<CountBadgeTone, string> = {
  muted:   t.color.text.muted,
  accent:  t.color.text.info,
  danger:  t.color.text.danger,
  warning: t.color.text.warning,
  success: t.color.text.success,
  info:    t.color.text.info,
};

/**
 * Маленький бейдж-счётчик. Используется в заголовках панелей, вкладках
 * ActivityBar, секциях фильтров. Кроме числа поддерживает произвольную строку
 * (например, метку «NEW» или «beta»).
 */
export function CountBadge({
  value,
  hideZero = true,
  maxNumber = 99,
  tone = "muted",
  size = "sm",
  className,
  style,
  title,
}: CountBadgeProps) {
  if (typeof value === "number") {
    if (hideZero && value <= 0) return null;
  } else if (hideZero && value.length === 0) {
    return null;
  }

  const shown =
    typeof value === "number" && value > maxNumber ? `${maxNumber}+` : String(value);

  const dims =
    size === "sm"
      ? { minWidth: 16, height: 16, padding: "0 5px", fontSize: 10 }
      : { minWidth: 18, height: 18, padding: "0 6px", fontSize: 11 };

  return (
    <span
      className={className}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: TONE_BG[tone],
        color: TONE_FG[tone],
        borderRadius: t.radius.full,
        fontWeight: 600,
        letterSpacing: 0,
        textTransform: "none",
        lineHeight: 1,
        ...dims,
        ...style,
      }}
    >
      {shown}
    </span>
  );
}
