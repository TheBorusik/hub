import { useId, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { t } from "@/lib/design-tokens";
import { CountBadge } from "@/components/ui/CountBadge";

export interface SectionGroupProps {
  /** Иконка слева (обычно 12-14px). */
  icon?: ReactNode;
  /** Заголовок секции. */
  label: ReactNode;
  /** Мелкий серый подзаголовок. */
  hint?: ReactNode;
  /** Число для бейджа справа. */
  count?: number;
  /** Свернуто или нет. */
  collapsed: boolean;
  /** Обработчик сворачивания. */
  onToggle: () => void;
  /** Контент под заголовком (рендерится, только если !collapsed). */
  children: ReactNode;
  /** Отступ слева у контента. default: 14. */
  indent?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Секция-аккордеон: кликабельный заголовок + раскрывающееся тело. Используется
 * в ProcessFiltersPanel, Outline, группах настроек. Заменяет ручные
 * «SectionHeader», которые я встречал в несколько местах.
 */
export function SectionGroup({
  icon,
  label,
  hint,
  count,
  collapsed,
  onToggle,
  children,
  indent = 14,
  className,
  style,
}: SectionGroupProps) {
  const bodyId = useId();
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", ...style }}>
      <button
        type="button"
        aria-expanded={!collapsed}
        aria-controls={bodyId}
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: t.space[2],
          padding: `${t.space[1]} ${t.space[2]}`,
          background: "transparent",
          border: "none",
          color: t.color.text.muted,
          cursor: "pointer",
          textAlign: "left",
          fontSize: t.font.size.xs,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: t.component.panelHeader.letterSpacing,
          userSelect: "none",
        }}
      >
        <span style={{ display: "inline-flex", color: t.color.text.muted }}>
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </span>
        {icon && <span style={{ display: "inline-flex" }}>{icon}</span>}
        <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {label}
        </span>
        {typeof count === "number" && count > 0 && (
          <CountBadge value={count} tone="accent" />
        )}
        {hint && (
          <span
            style={{
              fontWeight: 400,
              textTransform: "none",
              letterSpacing: 0,
              color: t.color.text.muted,
              marginLeft: t.space[2],
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {hint}
          </span>
        )}
      </button>
      {!collapsed && (
        <div
          id={bodyId}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: t.space[3],
            paddingLeft: indent,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
