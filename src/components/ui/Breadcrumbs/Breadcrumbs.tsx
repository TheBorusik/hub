import type { CSSProperties, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { t } from "@/lib/design-tokens";

export interface BreadcrumbItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  /** Клик по сегменту. Последний часто без onClick — это "текущий". */
  onClick?: () => void;
  /** Подсветка — нужна для активного (последнего) сегмента. */
  active?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Разделитель между сегментами. default: chevron. */
  separator?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Компактный breadcrumb: `Contour › Catalog › Process › Stage`. Для случаев
 * «активный dropdown со списком sibling-ов» consumer может обернуть item в
 * собственный <Popover>, компонент сам по себе не содержит dropdown-логики.
 */
export function Breadcrumbs({
  items,
  separator,
  className,
  style,
}: BreadcrumbsProps) {
  const sep = separator ?? (
    <ChevronRight size={12} style={{ color: t.color.text.muted, flexShrink: 0 }} />
  );
  return (
    <nav
      aria-label="Breadcrumb"
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: t.space[2],
        fontSize: t.font.size.xs,
        color: t.color.text.muted,
        minWidth: 0,
        ...style,
      }}
    >
      {items.map((it, i) => {
        const last = i === items.length - 1;
        const isClickable = !!it.onClick && !last;
        const content = (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: t.space[1],
              color: it.active || last ? t.color.text.primary : t.color.text.muted,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 240,
            }}
          >
            {it.icon && <span style={{ display: "inline-flex" }}>{it.icon}</span>}
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {it.label}
            </span>
          </span>
        );
        return (
          <span key={it.id} style={{ display: "inline-flex", alignItems: "center", gap: t.space[2], minWidth: 0 }}>
            {isClickable ? (
              <button
                type="button"
                onClick={it.onClick}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "inherit",
                  font: "inherit",
                  minWidth: 0,
                }}
              >
                {content}
              </button>
            ) : (
              content
            )}
            {!last && sep}
          </span>
        );
      })}
    </nav>
  );
}
