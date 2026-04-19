import { useMemo, useState, useEffect, useCallback } from "react";
import { RefreshCw, Trash2, Plus, Pencil, X, Search } from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";
import type { FieldInfo } from "../../types";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { IconButton } from "@/components/ui/Button/IconButton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { t as tok } from "@/lib/design-tokens";

type Overlay =
  | { type: "none" }
  | { type: "upsertRow"; existingRow: Record<string, unknown> | null };

interface TableEntry {
  Name: string;
  ExportedData?: boolean;
}

export function TablesPanel() {
  const api = useContourApi();
  const confirm = useConfirm();
  const [tables, setTables] = useState<TableEntry[]>([]);
  const [selected, setSelected] = useState("");
  const [meta, setMeta] = useState<FieldInfo[]>([]);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [overlay, setOverlay] = useState<Overlay>({ type: "none" });

  const loadTables = useCallback(async () => {
    if (!api) return;
    try {
      const res = await api.getAllTables();
      const list = (res as Record<string, unknown>).Tables;
      if (Array.isArray(list)) {
        setTables(list.map((t: unknown) => {
          if (typeof t === "string") return { Name: t };
          return t as TableEntry;
        }).filter((t) => t.Name));
      }
    } catch { setTables([]); }
  }, [api]);

  const loadData = useCallback(async (tableName: string) => {
    if (!api || !tableName) return;
    setLoading(true);
    try {
      const metaRes = await api.getTableMeta(tableName);
      const fieldInfos = (metaRes as Record<string, unknown>).FieldInfos;
      const parsedMeta: FieldInfo[] = Array.isArray(fieldInfos) ? (fieldInfos as FieldInfo[]) : [];
      setMeta(parsedMeta);

      const dataRes = await api.getTableData(tableName);
      const rows = (dataRes as Record<string, unknown>).Data;
      setData(Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []);
    } catch {
      setMeta([]);
      setData([]);
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { loadTables(); }, [loadTables]);
  useEffect(() => { if (selected) loadData(selected); else { setMeta([]); setData([]); } }, [selected, loadData]);

  const colName = (f: FieldInfo) => f.FieldName || f.ColumnName;
  const cols = meta.length > 0 ? meta.map(colName) : (data.length > 0 ? Object.keys(data[0]) : []);

  const handleDelete = async (row: Record<string, unknown>) => {
    if (!api || !selected) return;
    const ok = await confirm({
      title: "Delete Row",
      message: `Delete this row from "${selected}"?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    await api.deleteTableData(selected, [row]);
    loadData(selected);
  };

  const handleUpsert = async (json: string) => {
    if (!api || !selected) return;
    const parsed = JSON.parse(json);
    meta.forEach((f) => {
      const name = colName(f);
      if (f.FieldType.toLowerCase() === "object" && typeof parsed[name] === "string") {
        try { parsed[name] = JSON.parse(parsed[name]); } catch { /* keep string */ }
      }
    });
    await api.upsertTableData(selected, [parsed]);
    setOverlay({ type: "none" });
    loadData(selected);
  };

  const buildRowJson = (row: Record<string, unknown> | null): string => {
    if (!row) {
      const obj: Record<string, unknown> = {};
      meta.forEach((f) => {
        const name = colName(f);
        const t = f.FieldType.toLowerCase();
        if (t === "boolean") obj[name] = false;
        else if (t === "number" || t === "int" || t === "long" || t === "float" || t === "double") obj[name] = 0;
        else if (t === "object") obj[name] = {};
        else obj[name] = "";
      });
      return JSON.stringify(obj, null, 2);
    }
    const obj: Record<string, unknown> = {};
    meta.forEach((f) => {
      const name = colName(f);
      const val = row[name];
      obj[name] = (f.FieldType.toLowerCase() === "object" && typeof val === "object")
        ? JSON.stringify(val, null, 2)
        : val;
    });
    return JSON.stringify(obj, null, 2);
  };

  const lowerFilter = filter.toLowerCase();
  const filteredData = lowerFilter
    ? data.filter((row) => cols.some((c) => String(row[c] ?? "").toLowerCase().includes(lowerFilter)))
    : data;

  // Колонки для <DataTable>: данные + колонка actions справа (Edit/Delete
  // появляются при hover строки, как было до миграции).
  const columns = useMemo<DataTableColumn<Record<string, unknown>>[]>(() => {
    const dataCols: DataTableColumn<Record<string, unknown>>[] = cols.map((c) => {
      const fieldMeta = meta.find((f) => colName(f) === c);
      return {
        id: c,
        header: (
          <>
            {c}
            {fieldMeta?.IsPrimaryKey && (
              <span style={{ color: "#FFD700", marginLeft: 4, fontSize: 9 }}>PK</span>
            )}
          </>
        ),
        cell: (row) => {
          const v = row[c];
          return typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
        },
      };
    });
    const actionsCol: DataTableColumn<Record<string, unknown>> = {
      id: "__actions",
      header: "",
      width: 64,
      align: "center",
      cell: (row) => (
        <span className="ui-row-actions">
          <IconButton
            size="xs"
            label="Edit"
            icon={<Pencil size={12} />}
            onClick={(e) => {
              e.stopPropagation();
              setOverlay({ type: "upsertRow", existingRow: row });
            }}
          />
          <IconButton
            size="xs"
            label="Delete"
            icon={<Trash2 size={12} style={{ color: "#F44336" }} />}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
          />
        </span>
      ),
    };
    return [...dataCols, actionsCol];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, meta]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ position: "relative" }}>
      <PanelToolbar
        dense
        left={
          <>
            <select
              value={selected}
              onChange={(e) => { setSelected(e.target.value); setFilter(""); }}
              style={{
                fontSize: tok.font.size.xs,
                padding: "2px 6px",
                height: 22,
                borderRadius: tok.radius.sm,
                background: tok.color.bg.panel,
                border: `1px solid ${tok.color.border.default}`,
                color: tok.color.text.primary,
              }}
            >
              <option value="">Select table...</option>
              {tables.map((t) => (
                <option key={t.Name} value={t.Name}>
                  {t.Name}{t.ExportedData != null ? ` (Exported: ${t.ExportedData})` : ""}
                </option>
              ))}
            </select>
            <IconButton
              size="xs"
              label="Refresh"
              icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
              onClick={() => { if (selected) loadData(selected); }}
              disabled={loading || !selected}
            />
            {selected && (
              <IconButton
                size="xs"
                label="Add Row"
                icon={<Plus size={14} />}
                onClick={() => setOverlay({ type: "upsertRow", existingRow: null })}
              />
            )}
          </>
        }
        right={
          <>
            {selected && (
              <div
                className="flex items-center gap-1"
                style={{
                  background: tok.color.bg.panel,
                  border: `1px solid ${tok.color.border.default}`,
                  borderRadius: tok.radius.sm,
                  padding: "0 6px",
                  height: 22,
                }}
              >
                <Search size={12} style={{ flexShrink: 0, color: tok.color.text.muted }} />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter rows..."
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    color: tok.color.text.primary,
                    fontSize: 11,
                    outline: "none",
                    height: "100%",
                    width: 140,
                  }}
                />
                {filter && (
                  <IconButton size="xs" label="Clear filter" icon={<X size={10} />} onClick={() => setFilter("")} />
                )}
              </div>
            )}
            {selected && (
              <span style={{ fontSize: 10, color: tok.color.text.muted }}>{filteredData.length} rows</span>
            )}
          </>
        }
      />

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!selected ? (
          <EmptyState title="Select a table" />
        ) : loading ? (
          <EmptyState title="Loading..." />
        ) : (
          <DataTable
            data={filteredData}
            columns={columns}
            getRowId={(_row, i) => String(i)}
            onRowActivate={(row) => setOverlay({ type: "upsertRow", existingRow: row })}
            dense
            striped
            aria-label={`Table data: ${selected}`}
            empty={<EmptyState dense title={filter ? "No matching rows" : "No data"} />}
          />
        )}
      </div>

      <UpsertRowModal
        open={overlay.type === "upsertRow"}
        initialJson={overlay.type === "upsertRow" ? buildRowJson(overlay.existingRow) : ""}
        isEdit={overlay.type === "upsertRow" && !!overlay.existingRow}
        tableName={selected}
        onSave={handleUpsert}
        onClose={() => setOverlay({ type: "none" })}
      />
    </div>
  );
}

function UpsertRowModal({ open, initialJson, isEdit, tableName, onSave, onClose }: {
  open: boolean;
  initialJson: string;
  isEdit: boolean;
  tableName: string;
  onSave: (json: string) => Promise<void>;
  onClose: () => void;
}) {
  const [json, setJson] = useState(initialJson);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setJson(initialJson);
      setError("");
      setSubmitting(false);
    }
  }, [open, initialJson]);

  const handleSave = async () => {
    setError("");
    try { JSON.parse(json); } catch {
      setError("Invalid JSON");
      return;
    }
    setSubmitting(true);
    try { await onSave(json); }
    catch (e) { setError(String(e)); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" aria-label={`${isEdit ? "Edit" : "Add"} row`}>
      <Modal.Header title={`${isEdit ? "Edit" : "Add"} Row in ${tableName}`} />
      <Modal.Body padded={false} style={{ height: "50vh", padding: 0 }}>
        <JsonEditor value={json} onChange={setJson} height="100%" />
      </Modal.Body>
      {error && (
        <div
          style={{
            color: "#F44336",
            fontSize: 11,
            padding: `${tok.space[2]} ${tok.space[6]}`,
            background: tok.color.bg.panel,
            borderTop: `1px solid ${tok.color.border.default}`,
          }}
        >
          {error}
        </div>
      )}
      <Modal.Footer>
        <Button size="sm" variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button size="sm" variant="primary" onClick={handleSave} disabled={submitting}>
          {submitting ? "Saving..." : "Save"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

