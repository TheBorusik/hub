import {
  useMemo,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { t } from "@/lib/design-tokens";
import { EmptyState } from "@/components/ui/EmptyState";

export type DataTableSortDir = "asc" | "desc";

export interface DataTableSort<K extends string = string> {
  columnId: K;
  dir: DataTableSortDir;
}

export interface DataTableColumn<T, K extends string = string> {
  id: K;
  header: ReactNode;
  /** Функция извлечения/рендеринга ячейки. */
  cell: (row: T, index: number) => ReactNode;
  /** Фиксированная ширина (px) или auto. */
  width?: number | string;
  /** Мин. ширина. */
  minWidth?: number;
  /** Выравнивание. default: "start". */
  align?: "start" | "center" | "end";
  /** Можно сортировать (клик по заголовку). */
  sortable?: boolean;
  /** Отдельный ключ для сортировки (если отличается от id). */
  sortKey?: K;
  /** Подсказка для `<th title>`. */
  title?: string;
}

export interface DataTableProps<T, K extends string = string> {
  data: T[];
  columns: DataTableColumn<T, K>[];
  /** Ключ для <tr key=>. */
  getRowId: (row: T, index: number) => string;
  /** Controlled сортировка. */
  sort?: DataTableSort<K> | null;
  /** Клик по сортируемому заголовку. */
  onSortChange?: (next: DataTableSort<K> | null) => void;
  /** Выделение строк (controlled). Для single-select — Set размера ≤ 1. */
  selection?: Set<string>;
  /** Обновить выделение. */
  onSelectionChange?: (next: Set<string>) => void;
  /** Клик по строке (не checkbox). */
  onRowClick?: (row: T, index: number, e: ReactMouseEvent) => void;
  /** Double-click по строке. */
  onRowActivate?: (row: T, index: number) => void;
  /** Показать колонку checkbox слева. */
  selectable?: boolean;
  /** Высота строки. default: 28. */
  rowHeight?: number;
  /** Пустой state (рендерится, если data.length === 0). */
  empty?: ReactNode;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}

/**
 * Компактная HTML-таблица с controlled sort и опциональным selection. Не
 * виртуализирует — при N > 500 оборачивать строки в <VirtualList>; но для
 * обычных экранов достаточно.
 *
 * Rationale: я встречал в проекте ~6 ручных реализаций таблиц с разной
 * логикой сортировки/выделения — DataTable унифицирует их API.
 */
export function DataTable<T, K extends string = string>({
  data,
  columns,
  getRowId,
  sort,
  onSortChange,
  selection,
  onSelectionChange,
  onRowClick,
  onRowActivate,
  selectable = false,
  rowHeight = 28,
  empty,
  className,
  style,
  "aria-label": ariaLabel,
}: DataTableProps<T, K>) {
  const toggleAll = () => {
    if (!onSelectionChange) return;
    const next = new Set<string>();
    if (!selection || selection.size < data.length) {
      data.forEach((row, i) => next.add(getRowId(row, i)));
    }
    onSelectionChange(next);
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const onHeaderClick = (col: DataTableColumn<T, K>) => {
    if (!col.sortable || !onSortChange) return;
    const key = col.sortKey ?? col.id;
    if (!sort || sort.columnId !== key) {
      onSortChange({ columnId: key, dir: "asc" });
    } else if (sort.dir === "asc") {
      onSortChange({ columnId: key, dir: "desc" });
    } else {
      onSortChange(null);
    }
  };

  const allChecked = useMemo(
    () => data.length > 0 && !!selection && selection.size >= data.length,
    [data.length, selection],
  );

  if (data.length === 0 && empty !== null) {
    return (
      <div className={className} style={style}>
        {empty ?? <EmptyState title="No data" dense />}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "auto",
        ...style,
      }}
    >
      <table
        role="grid"
        aria-label={ariaLabel}
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          fontSize: t.font.size.xs,
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr>
            {selectable && (
              <th
                scope="col"
                style={{
                  width: 28,
                  padding: `0 ${t.space[2]}`,
                  textAlign: "center",
                  background: t.color.bg.panel,
                  borderBottom: `1px solid ${t.color.border.default}`,
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map((c) => {
              const key = c.sortKey ?? c.id;
              const isSorted = sort?.columnId === key;
              const dir = isSorted ? sort?.dir : undefined;
              return (
                <th
                  key={c.id}
                  scope="col"
                  title={c.title}
                  onClick={() => onHeaderClick(c)}
                  style={{
                    width: c.width,
                    minWidth: c.minWidth,
                    textAlign: c.align === "end" ? "right" : c.align === "center" ? "center" : "left",
                    padding: `${t.space[2]} ${t.space[3]}`,
                    background: t.color.bg.panel,
                    borderBottom: `1px solid ${t.color.border.default}`,
                    fontWeight: 600,
                    color: t.color.text.muted,
                    cursor: c.sortable ? "pointer" : "default",
                    userSelect: "none",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: t.space[1],
                      color: isSorted ? t.color.text.primary : t.color.text.muted,
                    }}
                  >
                    {c.header}
                    {c.sortable && (
                      <span style={{ display: "inline-flex", opacity: isSorted ? 1 : 0.5 }}>
                        {dir === "asc" ? (
                          <ChevronUp size={10} />
                        ) : dir === "desc" ? (
                          <ChevronDown size={10} />
                        ) : (
                          <ChevronsUpDown size={10} />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const id = getRowId(row, i);
            const isSelected = !!selection?.has(id);
            return (
              <tr
                key={id}
                aria-selected={isSelected}
                onClick={(e) => onRowClick?.(row, i, e)}
                onDoubleClick={() => onRowActivate?.(row, i)}
                style={{
                  height: rowHeight,
                  background: isSelected ? t.color.bg.selected : "transparent",
                  cursor: onRowClick || onRowActivate ? "pointer" : "default",
                }}
              >
                {selectable && (
                  <td
                    style={{
                      width: 28,
                      padding: `0 ${t.space[2]}`,
                      textAlign: "center",
                      borderBottom: `1px solid ${t.color.border.subtle}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(id)}
                      aria-label="Select row"
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.id}
                    style={{
                      padding: `${t.space[2]} ${t.space[3]}`,
                      borderBottom: `1px solid ${t.color.border.subtle}`,
                      textAlign: c.align === "end" ? "right" : c.align === "center" ? "center" : "left",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.cell(row, i)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
