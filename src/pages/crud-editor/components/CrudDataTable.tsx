import { useMemo } from "react";
import { Braces, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { CrudModel, CrudRecord } from "../types";

interface CrudDataTableProps {
  model: CrudModel;
  records: CrudRecord[];
  search: string;
  page: number;
  pageSize: number;
  sortCol: string | null;
  sortDir: "asc" | "desc";
  hasDelete: boolean;
  onSort: (col: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onClickRow: (record: CrudRecord) => void;
  onDeleteRow: (record: CrudRecord) => void;
  onViewJson: (value: unknown, title: string) => void;
}

const PAGE_SIZES = [10, 25, 50, 100];

export function CrudDataTable({
  model,
  records,
  search,
  page,
  pageSize,
  sortCol,
  sortDir,
  hasDelete,
  onSort,
  onPageChange,
  onPageSizeChange,
  onClickRow,
  onDeleteRow,
  onViewJson,
}: CrudDataTableProps) {
  const columns = model.Properties ?? [];
  const keyName = model.KeyName;

  const filtered = useMemo(() => {
    if (!search) return records;
    const lf = search.toLowerCase();
    return records.filter((r) =>
      columns.some((col) => {
        const v = r[col.Name];
        if (v == null) return false;
        if (typeof v === "object") return JSON.stringify(v).toLowerCase().includes(lf);
        return String(v).toLowerCase().includes(lf);
      }),
    );
  }, [records, search, columns]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const isJsonType = (type: string) => type === "JObject" || type === "JArray";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.Name}
                  onClick={() => onSort(col.Name)}
                  className="select-none cursor-pointer"
                  style={{
                    position: "sticky",
                    top: 0,
                    height: 26,
                    padding: "0 8px",
                    textAlign: "left",
                    fontWeight: 600,
                    fontSize: 12,
                    background: "var(--color-sidebar)",
                    borderBottom: "1px solid var(--color-border)",
                    whiteSpace: "nowrap",
                    color: "var(--color-text-muted)",
                    zIndex: 1,
                  }}
                >
                  <span className="flex items-center" style={{ gap: 2 }}>
                    {col.Name}
                    {col.Name === keyName && <span style={{ color: "var(--color-accent)", marginLeft: 2 }}>*</span>}
                    {sortCol === col.Name && (
                      sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </span>
                </th>
              ))}
              {hasDelete && (
                <th
                  style={{
                    position: "sticky",
                    top: 0,
                    width: 40,
                    height: 26,
                    padding: "0 4px",
                    textAlign: "center",
                    fontWeight: 600,
                    fontSize: 12,
                    background: "var(--color-sidebar)",
                    borderBottom: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                    zIndex: 1,
                  }}
                />
              )}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (hasDelete ? 1 : 0)}
                  style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)" }}
                >
                  {records.length === 0 ? "No data" : "No matches"}
                </td>
              </tr>
            )}
            {pageData.map((record, idx) => (
              <tr
                key={String(record[keyName] ?? idx)}
                onClick={() => onClickRow(record)}
                className="cursor-pointer"
                style={{
                  height: 26,
                  background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)"; }}
              >
                {columns.map((col) => {
                  const value = record[col.Name];
                  if (isJsonType(col.Type) && value != null) {
                    return (
                      <td
                        key={col.Name}
                        style={{ padding: "0 8px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewJson(value, `${model.Name}.${col.Name}`);
                          }}
                          className="toolbar-btn"
                          style={{ padding: "2px 6px", color: "var(--color-accent)", gap: 4, fontSize: 12 }}
                          title="View JSON"
                        >
                          <Braces size={12} />
                          {col.Type}
                        </button>
                      </td>
                    );
                  }
                  return (
                    <td
                      key={col.Name}
                      style={{
                        padding: "0 8px",
                        maxWidth: 300,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        borderBottom: "1px solid rgba(255,255,255,0.03)",
                      }}
                    >
                      {value == null ? "" : typeof value === "boolean" ? (value ? "true" : "false") : String(value)}
                    </td>
                  );
                })}
                {hasDelete && (
                  <td style={{ padding: "0 4px", borderBottom: "1px solid rgba(255,255,255,0.03)", textAlign: "center" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRow(record);
                      }}
                      className="tree-action-btn"
                      title="Delete"
                      style={{ width: 24, height: 22, margin: "0 auto" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Paginator */}
      <div
        className="flex items-center justify-between shrink-0 select-none"
        style={{
          height: 28,
          padding: "0 8px",
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-sidebar)",
          fontSize: 12,
          color: "var(--color-text-muted)",
        }}
      >
        <span>
          {sorted.length} record{sorted.length !== 1 ? "s" : ""}
          {search && ` (filtered from ${records.length})`}
        </span>
        <div className="flex items-center" style={{ gap: 8 }}>
          <select
            value={pageSize}
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(0); }}
            style={{
              height: 20,
              fontSize: 12,
              background: "var(--color-surface-300)",
              border: "1px solid var(--color-border)",
              color: "inherit",
              padding: "0 4px",
            }}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span>
            {safePage + 1} / {totalPages}
          </span>
          <button
            disabled={safePage === 0}
            onClick={() => onPageChange(safePage - 1)}
            className="toolbar-btn"
            style={{ width: 20, height: 20 }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            disabled={safePage >= totalPages - 1}
            onClick={() => onPageChange(safePage + 1)}
            className="toolbar-btn"
            style={{ width: 20, height: 20 }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
