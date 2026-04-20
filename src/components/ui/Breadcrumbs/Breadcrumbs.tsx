import { Fragment, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { t } from "@/lib/design-tokens";

export interface BreadcrumbItem {
  /** Стабильный id (для key). Если не задан — используется label. */
  id?: string;
  /** Текст сегмента. */
  label: ReactNode;
  /** Иконка слева от label. Опционально. */
  icon?: ReactNode;
  /** Клик по сегменту. Если не задан — сегмент не интерактивен. */
  onClick?: () => void;
  /** Подсказка при наведении. */
  title?: string;
  /** Приглушить цвет (для «родительских» сегментов). default: true, если onClick не задан. */
  muted?: boolean;
  /** Отметить как активный (последний). default: false. */
  active?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Разделитель между сегментами. default: ChevronRight. */
  separator?: ReactNode;
  /** Дополнительные классы. */
  className?: string;
  "aria-label"?: string;
}

/**
 * Компактная «хлебная крошка» под VS Code.
 * Последний сегмент отрисовывается ярче. Родительские, если у них есть
 * `onClick`, подсвечиваются на hover (через тот же `.ui-row-actions`
 * паттерн недоступен — используем inline + `data-interactive`).
 */
export function Breadcrumbs({
  items,
  separator,
  className,
  "aria-label": ariaLabel = "Breadcrumbs",
}: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "nowrap",
        overflow: "hidden",
        height: 22,
        padding: `0 ${t.space[4]}`,
        fontSize: t.font.size.xs,
        color: t.color.text.muted,
        borderBottom: `1px solid ${t.color.border.default}`,
        background: t.color.bg.panel,
        userSelect: "none",
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const interactive = typeof item.onClick === "function" && !item.active;
        const muted = item.muted ?? !(item.active || interactive);
        const key = item.id ?? (typeof item.label === "string" ? item.label : String(i));
        return (
          <Fragment key={key}>
            <span
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              title={item.title}
              onClick={interactive ? item.onClick : undefined}
              onKeyDown={
                interactive
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        item.onClick?.();
                      }
                    }
                  : undefined
              }
              className={interactive ? "breadcrumb-item-interactive" : undefined}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: t.space[1],
                maxWidth: 220,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                cursor: interactive ? "pointer" : "default",
                color: muted
                  ? t.color.text.muted
                  : item.active
                  ? t.color.text.primary
                  : t.color.text.primary,
                fontWeight: item.active ? 600 : 400,
                padding: `2px ${t.space[1]}`,
                borderRadius: t.radius.sm,
              }}
            >
              {item.icon && <span style={{ display: "inline-flex", flexShrink: 0 }}>{item.icon}</span>}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
            </span>
            {!isLast && (
              <span
                aria-hidden
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: `0 ${t.space[1]}`,
                  color: t.color.text.muted,
                  flexShrink: 0,
                }}
              >
                {separator ?? <ChevronRight size={12} />}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
