import { useRef, type CSSProperties, type ReactNode } from "react";
import { X } from "lucide-react";
import { t } from "@/lib/design-tokens";

export type TabsVariant = "chrome" | "inline" | "segmented";
export type TabsAlign = "start" | "stretch";

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  /** Показать dirty-индикатор (●). */
  dirty?: boolean;
  /** Показать кнопку закрытия. Используется в variant="chrome". */
  closable?: boolean;
  disabled?: boolean;
  /** Всплывающий tooltip. */
  title?: string;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  /**
   *  - chrome:    как TabBar (сверху, с плашкой активной вкладки и нижним border)
   *  - inline:    subtabs внутри панели (текст muted → primary при активном)
   *  - segmented: сегмент-контрол
   */
  variant?: TabsVariant;
  /** Выровнять табы. default: "start" (chrome/segmented) / "stretch" (inline) */
  align?: TabsAlign;
  /** Обработчик закрытия вкладки (для closable). */
  onClose?: (id: T) => void;
  /** Справа от списка (кнопка «+», селектор). */
  addon?: ReactNode;
  /** Для ARIA. */
  "aria-label"?: string;
  className?: string;
  style?: CSSProperties;
}

function tabStyle(
  variant: TabsVariant,
  isActive: boolean,
  disabled: boolean | undefined,
  stretch: boolean,
): CSSProperties {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: t.space[2],
    cursor: disabled ? "default" : "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.5 : 1,
    background: "transparent",
    border: "none",
    color: t.color.text.muted,
    fontFamily: "inherit",
    fontSize: t.font.size.xs,
    flex: stretch ? 1 : undefined,
    justifyContent: stretch ? "center" : undefined,
  };

  if (variant === "chrome") {
    return {
      ...base,
      height: t.component.tab.height,
      padding: `0 ${t.space[5]}`,
      background: isActive ? t.color.bg.tabActive : t.color.bg.tabInactive,
      color: isActive ? t.color.text.active : t.color.text.muted,
      borderRight: `1px solid ${t.color.border.default}`,
      borderBottom: isActive ? "none" : `1px solid ${t.color.border.default}`,
      position: "relative",
    };
  }
  if (variant === "inline") {
    return {
      ...base,
      height: t.component.subtab.height,
      padding: `0 ${t.space[4]}`,
      color: isActive ? t.color.text.primary : t.color.text.muted,
      borderBottom: isActive
        ? `2px solid ${t.color.accent}`
        : "2px solid transparent",
      fontWeight: isActive ? 600 : 500,
    };
  }
  return {
    ...base,
    height: 24,
    padding: `0 ${t.space[4]}`,
    borderRadius: t.radius.md,
    background: isActive ? t.color.bg.accentSoft : "transparent",
    color: isActive ? t.color.text.primary : t.color.text.muted,
    fontWeight: 500,
  };
}

/**
 * Универсальные вкладки. Закрывает 4 ручных реализации в TabBar,
 * subtabs ProcessListPanel, subtabs AddStageDialog, stage tabs в ProcessEditor.
 */
export function Tabs<T extends string = string>({
  items,
  activeId,
  onChange,
  variant = "chrome",
  align,
  onClose,
  addon,
  "aria-label": ariaLabel,
  className,
  style,
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement | null>(null);

  const stretch = (align ?? (variant === "inline" ? "stretch" : "start")) === "stretch";

  return (
    <div
      className={className}
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: "flex",
        alignItems: "center",
        background: variant === "chrome" ? t.color.bg.titlebar : "transparent",
        borderBottom: variant !== "segmented" ? `1px solid ${t.color.border.default}` : undefined,
        ...style,
      }}
    >
      <div
        ref={listRef}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          overflowX: "auto",
          gap: variant === "segmented" ? t.space[1] : 0,
          padding: variant === "segmented" ? `${t.space[1]} ${t.space[2]}` : 0,
        }}
      >
        {items.map((it) => {
          const isActive = it.id === activeId;
          return (
            <button
              key={it.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={it.disabled}
              tabIndex={isActive ? 0 : -1}
              title={it.title}
              onClick={() => {
                if (it.disabled) return;
                if (!isActive) onChange(it.id);
              }}
              onKeyDown={(e) => {
                if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                e.preventDefault();
                const idx = items.findIndex((x) => x.id === activeId);
                const step = e.key === "ArrowRight" ? 1 : -1;
                let next = idx;
                for (let i = 0; i < items.length; i++) {
                  next = (next + step + items.length) % items.length;
                  if (!items[next].disabled) break;
                }
                if (!items[next].disabled) onChange(items[next].id);
              }}
              style={tabStyle(variant, isActive, it.disabled, stretch)}
            >
              {it.dirty && (
                <span
                  aria-hidden="true"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: t.radius.full,
                    background: isActive ? t.color.text.primary : t.color.text.muted,
                    marginRight: 2,
                  }}
                />
              )}
              {it.icon && <span style={{ display: "inline-flex", flexShrink: 0 }}>{it.icon}</span>}
              <span style={{ whiteSpace: "nowrap" }}>{it.label}</span>
              {it.badge && <span style={{ display: "inline-flex" }}>{it.badge}</span>}
              {it.closable && onClose && (
                <span
                  role="button"
                  aria-label="Close tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(it.id);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 16,
                    height: 16,
                    marginLeft: t.space[2],
                    color: t.color.text.muted,
                    borderRadius: t.radius.sm,
                  }}
                >
                  <X size={10} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {addon && <div style={{ padding: `0 ${t.space[3]}`, flexShrink: 0 }}>{addon}</div>}
    </div>
  );
}
