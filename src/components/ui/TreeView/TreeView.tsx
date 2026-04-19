import {
  useCallback,
  useMemo,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { t } from "@/lib/design-tokens";

export interface TreeNode<TMeta = unknown> {
  id: string;
  label: ReactNode;
  /** Иконка слева от label. */
  icon?: ReactNode;
  /** Вспомогательные действия справа (обычно IconButton-ы), только при hover/focus. */
  actions?: ReactNode;
  /** Лёгкий префикс (для цветной точки/dirty-индикатора). */
  prefix?: ReactNode;
  /** Правая короткая метка (тип, счётчик). */
  suffix?: ReactNode;
  /** Если задан — узел «контейнер». */
  children?: TreeNode<TMeta>[];
  /** Это «папка, которая может раскрываться даже без children пока» — актуально для lazy. */
  expandable?: boolean;
  /** Дисейбл выделения. */
  disabled?: boolean;
  /** Произвольные метаданные — полезно в onSelect. */
  meta?: TMeta;
  /** Дополнительные data-атрибуты (пока не требуется, но оставим место). */
  "data-testid"?: string;
  title?: string;
}

export interface TreeViewProps<TMeta = unknown> {
  nodes: TreeNode<TMeta>[];
  /** ID узла, выделенного синим. */
  selectedId?: string | null;
  /** Поменять выделение. */
  onSelect?: (node: TreeNode<TMeta>, event: ReactMouseEvent | ReactKeyboardEvent) => void;
  /** Множество раскрытых групп (controlled). */
  expandedIds: Set<string>;
  /** Поменять раскрытое множество. */
  onToggleExpand: (id: string, expanded: boolean) => void;
  /** Double-click. */
  onActivate?: (node: TreeNode<TMeta>) => void;
  /** Context menu (правый клик). */
  onContextMenu?: (node: TreeNode<TMeta>, event: ReactMouseEvent) => void;
  /** Отступ per-level. default: 12. */
  indent?: number;
  /** Высота строки. default: 22. */
  rowHeight?: number;
  /** ARIA. */
  "aria-label"?: string;
  className?: string;
  style?: CSSProperties;
}

interface FlatNode<TMeta> {
  node: TreeNode<TMeta>;
  depth: number;
  parentExpanded: boolean;
}

function flatten<TMeta>(
  nodes: TreeNode<TMeta>[],
  expanded: Set<string>,
  depth: number,
  parentExpanded: boolean,
  out: FlatNode<TMeta>[],
): void {
  for (const n of nodes) {
    out.push({ node: n, depth, parentExpanded });
    const isExpanded = expanded.has(n.id);
    if (isExpanded && n.children && n.children.length > 0) {
      flatten(n.children, expanded, depth + 1, parentExpanded && isExpanded, out);
    }
  }
}

/**
 * Плоский tree-view с controlled expand/select. Поддерживает клавиатурную
 * навигацию внутри видимых строк (ArrowUp/Down, ArrowRight/Left, Enter, Home/End).
 * Не виртуализирует — для N > 500 оборачивать в <VirtualList>; большинство
 * наших деревьев (ProcessTree, CrudModelsPanel, adapter tree) < 300 nodes.
 */
export function TreeView<TMeta = unknown>({
  nodes,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
  onActivate,
  onContextMenu,
  indent = 12,
  rowHeight = 22,
  "aria-label": ariaLabel,
  className,
  style,
}: TreeViewProps<TMeta>) {
  const flat = useMemo<FlatNode<TMeta>[]>(() => {
    const out: FlatNode<TMeta>[] = [];
    flatten(nodes, expandedIds, 0, true, out);
    return out;
  }, [nodes, expandedIds]);

  const visibleIndex = useCallback(
    (id: string) => flat.findIndex((f) => f.node.id === id),
    [flat],
  );

  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!selectedId) return;
    const idx = visibleIndex(selectedId);
    if (idx < 0) return;
    const cur = flat[idx].node;
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = flat[idx + 1];
        if (next && !next.node.disabled) onSelect?.(next.node, e);
        return;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = flat[idx - 1];
        if (prev && !prev.node.disabled) onSelect?.(prev.node, e);
        return;
      }
      case "Home": {
        e.preventDefault();
        const first = flat.find((f) => !f.node.disabled);
        if (first) onSelect?.(first.node, e);
        return;
      }
      case "End": {
        e.preventDefault();
        for (let i = flat.length - 1; i >= 0; i--) {
          if (!flat[i].node.disabled) {
            onSelect?.(flat[i].node, e);
            return;
          }
        }
        return;
      }
      case "ArrowRight": {
        e.preventDefault();
        const isContainer = !!(cur.children && cur.children.length > 0) || cur.expandable;
        if (isContainer && !expandedIds.has(cur.id)) {
          onToggleExpand(cur.id, true);
        } else if (isContainer) {
          const firstChild = flat[idx + 1];
          if (firstChild && firstChild.depth > flat[idx].depth) onSelect?.(firstChild.node, e);
        }
        return;
      }
      case "ArrowLeft": {
        e.preventDefault();
        const isContainer = !!(cur.children && cur.children.length > 0) || cur.expandable;
        if (isContainer && expandedIds.has(cur.id)) {
          onToggleExpand(cur.id, false);
        } else {
          const curDepth = flat[idx].depth;
          for (let i = idx - 1; i >= 0; i--) {
            if (flat[i].depth < curDepth) {
              onSelect?.(flat[i].node, e);
              return;
            }
          }
        }
        return;
      }
      case "Enter": {
        e.preventDefault();
        if (onActivate) onActivate(cur);
        else if (cur.children && cur.children.length > 0) {
          onToggleExpand(cur.id, !expandedIds.has(cur.id));
        }
        return;
      }
    }
  };

  return (
    <div
      role="tree"
      aria-label={ariaLabel}
      tabIndex={0}
      className={className}
      onKeyDown={onKey}
      style={{
        display: "flex",
        flexDirection: "column",
        outline: "none",
        fontSize: t.font.size.sm,
        color: t.color.text.primary,
        ...style,
      }}
    >
      {flat.map(({ node, depth }) => {
        const isContainer = !!(node.children && node.children.length > 0) || !!node.expandable;
        const isExpanded = expandedIds.has(node.id);
        const isSelected = selectedId === node.id;
        return (
          <div
            key={node.id}
            role="treeitem"
            aria-expanded={isContainer ? isExpanded : undefined}
            aria-selected={isSelected}
            data-testid={node["data-testid"]}
            title={node.title}
            onClick={(e) => {
              if (node.disabled) return;
              onSelect?.(node, e);
            }}
            onDoubleClick={() => {
              if (node.disabled) return;
              if (onActivate) {
                onActivate(node);
              } else if (isContainer) {
                onToggleExpand(node.id, !isExpanded);
              }
            }}
            onContextMenu={(e) => {
              if (node.disabled) return;
              onContextMenu?.(node, e);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: t.space[2],
              height: rowHeight,
              paddingLeft: depth * indent + t.space[2],
              paddingRight: t.space[2],
              background: isSelected ? t.color.bg.selected : "transparent",
              color: node.disabled ? t.color.text.muted : t.color.text.primary,
              opacity: node.disabled ? 0.6 : 1,
              cursor: node.disabled ? "default" : "pointer",
              userSelect: "none",
            }}
          >
            <span
              style={{
                width: 14,
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: t.color.text.muted,
              }}
              onClick={
                isContainer
                  ? (e) => {
                      e.stopPropagation();
                      onToggleExpand(node.id, !isExpanded);
                    }
                  : undefined
              }
            >
              {isContainer ? (
                isExpanded ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )
              ) : null}
            </span>
            {node.prefix && <span style={{ display: "inline-flex", flexShrink: 0 }}>{node.prefix}</span>}
            {node.icon && <span style={{ display: "inline-flex", flexShrink: 0 }}>{node.icon}</span>}
            <span
              style={{
                flex: 1,
                minWidth: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {node.label}
            </span>
            {node.suffix && (
              <span style={{ display: "inline-flex", color: t.color.text.muted, flexShrink: 0 }}>
                {node.suffix}
              </span>
            )}
            {node.actions && (
              <span
                className="tree-row-actions"
                style={{ display: "inline-flex", gap: t.space[1], flexShrink: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                {node.actions}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
