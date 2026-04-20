import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface ConfigurationTreeRowProps {
  depth: number;
  icon: ReactNode;
  label: string;
  sublabel?: string;
  badge?: string;
  /**
   * Если задано — у строки есть дети; показывается шеврон и работает `onToggle`.
   * `undefined` означает «лист» (шеврон заменяется на пустой spacer).
   */
  expanded?: boolean;
  selected?: boolean;
  dotIndicator?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  /** Кнопки, видимые только на hover (через `group-hover:flex`). */
  actions?: ReactNode;
  /** Кнопки/контролы, всегда видимые (например toggle-switch включения адаптера). */
  visibleActions?: ReactNode;
}

/**
 * Строка tree'а в ConfigurationPanel: унифицирует левую область (chevron +
 * icon + label + sublabel + badge) и действия справа.
 *
 * Сознательно не завязана на `<TreeView>` из UI-kit — она здесь не
 * виртуализирована и не управляет состоянием дерева (expanded/selection
 * живут в родителе). Если в будущем перевезём ConfigurationPanel на
 * `<TreeView>`, этот файл уйдёт.
 */
export function ConfigurationTreeRow({
  depth,
  icon,
  label,
  sublabel,
  badge,
  expanded,
  selected,
  dotIndicator,
  onToggle,
  onClick,
  actions,
  visibleActions,
}: ConfigurationTreeRowProps) {
  const hasChildren = expanded !== undefined;
  const paddingLeft = 8 + depth * 16;
  return (
    <div
      className="flex items-center group adapter-tree-row"
      data-selected={selected ? "true" : undefined}
      style={{ height: 26, paddingLeft, paddingRight: 6, cursor: "pointer", userSelect: "none", gap: 4 }}
      onClick={onClick}
    >
      {hasChildren ? (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, width: 16 }}
        >
          {expanded ? (
            <ChevronDown size={14} style={{ opacity: 0.6 }} />
          ) : (
            <ChevronRight size={14} style={{ opacity: 0.6 }} />
          )}
        </span>
      ) : (
        <span style={{ width: 16, flexShrink: 0 }} />
      )}
      <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center" }}>{icon}</span>
      <span
        style={{
          fontSize: 12,
          color: selected ? "var(--color-text)" : "var(--color-text-muted)",
          fontWeight: selected ? 500 : 400,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
        }}
      >
        {label}
      </span>
      {sublabel && (
        <span
          style={{
            fontSize: 10,
            color: "var(--color-text-muted)",
            opacity: 0.6,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 100,
          }}
        >
          {sublabel}
        </span>
      )}
      {badge && (
        <span
          style={{
            fontSize: 9,
            background: "rgba(255,255,255,0.1)",
            color: "var(--color-text-muted)",
            borderRadius: 3,
            padding: "0 3px",
            lineHeight: "16px",
            flexShrink: 0,
          }}
        >
          {badge}
        </span>
      )}
      {dotIndicator && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--color-text-muted)",
            opacity: 0.4,
            flexShrink: 0,
          }}
        />
      )}
      <div className="hidden group-hover:flex items-center gap-0" style={{ flexShrink: 0 }}>
        {actions}
      </div>
      {visibleActions && (
        <div className="flex items-center gap-0" style={{ flexShrink: 0 }}>
          {visibleActions}
        </div>
      )}
    </div>
  );
}
