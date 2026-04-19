import type { CSSProperties, ReactNode } from "react";
import { t } from "@/lib/design-tokens";

export interface PanelToolbarProps {
  /** Группа элементов, выровненная по левому краю. */
  left?: ReactNode;
  /** Группа элементов, выровненная по правому краю (обычно IconButton-ы). */
  right?: ReactNode;
  /**
   * Полностью кастомный layout. Если задан — `left`/`right` игнорируются,
   * consumer сам отвечает за расстановку.
   */
  children?: ReactNode;
  /** Уменьшенный padding. default: false. */
  dense?: boolean;
  /** Подсветка низа (borderBottom). default: true. */
  bordered?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Узкий горизонтальный тулбар под PanelHeader. Обычно содержит поиск слева и
 * набор IconButton справа. Заменяет ручные `<div style={{ display: "flex",
 * padding: "4px 8px", borderBottom, gap: 6 }} />` во всех панелях дерева /
 * GlobalModelsPanel / ConfigurationPanel / PermissionsPanel.
 */
export function PanelToolbar({
  left,
  right,
  children,
  dense = false,
  bordered = true,
  className,
  style,
}: PanelToolbarProps) {
  const paddingY = dense ? t.space[1] : t.component.toolbar.paddingY;
  const paddingX = dense ? t.space[3] : t.component.toolbar.paddingX;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: t.space[3],
        height: dense ? "26px" : t.component.toolbar.height,
        minHeight: dense ? "26px" : t.component.toolbar.height,
        padding: `${paddingY} ${paddingX}`,
        borderBottom: bordered ? `1px solid ${t.color.border.default}` : undefined,
        background: t.color.bg.toolbar,
        flexShrink: 0,
        ...style,
      }}
    >
      {children ?? (
        <>
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: t.space[3] }}>
            {left}
          </div>
          {right && (
            <div style={{ display: "flex", alignItems: "center", gap: t.space[1], flexShrink: 0 }}>
              {right}
            </div>
          )}
        </>
      )}
    </div>
  );
}
