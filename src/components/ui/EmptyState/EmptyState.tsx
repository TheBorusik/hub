import type { CSSProperties, ReactNode } from "react";
import { t } from "@/lib/design-tokens";

export interface EmptyStateProps {
  /** Крупная иконка сверху (32-48px). */
  icon?: ReactNode;
  /** Заголовок. */
  title: ReactNode;
  /** Пояснение под заголовком. */
  hint?: ReactNode;
  /** Кнопка действия (например, «Create process»). */
  action?: ReactNode;
  /** Компактная версия для тонких боковых панелей. */
  dense?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Стандартное «нет данных» состояние. Заменяет десятки ручных
 * `<div style={{ padding: 16, color: muted, fontSize: 12 }}>No items</div>`.
 */
export function EmptyState({ icon, title, hint, action, dense = false, className, style }: EmptyStateProps) {
  return (
    <div
      className={className}
      role="status"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: dense ? t.space[3] : t.space[4],
        padding: dense ? `${t.space[6]} ${t.space[6]}` : `${t.space[12]} ${t.space[8]}`,
        color: t.color.text.muted,
        minHeight: dense ? 0 : 120,
        ...style,
      }}
    >
      {icon && (
        <div style={{ opacity: 0.6, color: t.color.text.muted, display: "inline-flex" }}>
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: dense ? t.font.size.sm : t.font.size.md,
          fontWeight: 500,
          color: t.color.text.primary,
        }}
      >
        {title}
      </div>
      {hint && (
        <div style={{ fontSize: t.font.size.xs, maxWidth: 320, lineHeight: 1.45 }}>{hint}</div>
      )}
      {action && <div style={{ marginTop: t.space[2] }}>{action}</div>}
    </div>
  );
}
