import type { CSSProperties, ReactNode } from "react";
import { t } from "@/lib/design-tokens";

export type PanelBackground = "sidebar" | "editor" | "panel" | "transparent";
export type PanelScroll = "auto" | "y" | "none";

export interface PanelProps {
  /** Верхняя «плашка» заголовка (обычно <PanelHeader />). */
  header?: ReactNode;
  /** Тулбар сразу под заголовком (обычно <PanelToolbar />). */
  toolbar?: ReactNode;
  /** Подвал (actions, счётчики, статус). */
  footer?: ReactNode;
  /** Содержимое панели. */
  children: ReactNode;
  /** Как прокручивать основную зону. default: "auto" */
  scroll?: PanelScroll;
  /** Цвет фона. default: "panel" (соответствует --color-bg-panel). */
  bg?: PanelBackground;
  /** Показать внешнюю рамку (для подпанелей внутри редактора). */
  bordered?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Для ARIA: если панель логически — регион. */
  role?: string;
  /** Для ARIA. */
  "aria-label"?: string;
  /** Для тестов / автоматизации. */
  "data-testid"?: string;
}

const BG_MAP: Record<PanelBackground, string> = {
  sidebar: t.color.bg.sidebar,
  editor: t.color.bg.editor,
  panel: t.color.bg.panel,
  transparent: "transparent",
};

/**
 * Универсальный каркас панели (левая/правая/встроенная зона). Всегда
 * `flex-col h-full`; сама ничего не знает про домен. Заменяет ~25 дублей
 * вёрстки `<div className="flex flex-col h-full overflow-hidden">` в
 * существующих экранах.
 */
export function Panel({
  header,
  toolbar,
  footer,
  children,
  scroll = "auto",
  bg = "panel",
  bordered = false,
  className,
  style,
  role,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: PanelProps) {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      data-testid={testId}
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        background: BG_MAP[bg],
        border: bordered ? `1px solid ${t.color.border.default}` : undefined,
        ...style,
      }}
    >
      {header}
      {toolbar}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: scroll === "none" ? "hidden" : "auto",
          overflowX: scroll === "y" ? "hidden" : "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}
