import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Trash2, Plus, Pencil, X, Search } from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";
import type { FieldInfo } from "../../types";

type Overlay =
  | { type: "none" }
  | { type: "upsertRow"; existingRow: Record<string, unknown> | null }
  | { type: "confirm"; title: string; onConfirm: () => void };

interface TableEntry {
  Name: string;
  ExportedData?: boolean;
}

export function TablesPanel() {
  const api = useContourApi();
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

  const handleDelete = (row: Record<string, unknown>) => {
    if (!api || !selected) return;
    setOverlay({
      type: "confirm",
      title: `Delete this row from "${selected}"?`,
      onConfirm: async () => {
        await api.deleteTableData(selected, [row]);
        setOverlay({ type: "none" });
        loadData(selected);
      },
    });
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

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ position: "relative" }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 shrink-0" style={{ height: 35, padding: "0 12px", borderBottom: "1px solid var(--color-border)" }}>
        <select
          value={selected}
          onChange={(e) => { setSelected(e.target.value); setFilter(""); }}
          style={{ fontSize: 12, padding: "2px 6px", height: 22, borderRadius: 3 }}
        >
          <option value="">Select table...</option>
          {tables.map((t) => (
            <option key={t.Name} value={t.Name}>
              {t.Name}{t.ExportedData != null ? ` (Exported: ${t.ExportedData})` : ""}
            </option>
          ))}
        </select>
        <button onClick={() => { if (selected) loadData(selected); }} disabled={loading || !selected} className="toolbar-btn" title="Refresh">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
        {selected && (
          <button onClick={() => setOverlay({ type: "upsertRow", existingRow: null })} className="toolbar-btn" title="Add Row">
            <Plus size={14} />
          </button>
        )}
        {selected && (
          <div className="flex items-center gap-1" style={{ marginLeft: 8, background: "var(--color-surface-200)", border: "1px solid var(--color-border)", borderRadius: 3, padding: "0 6px", height: 22 }}>
            <Search size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter rows..." style={{ flex: 1, background: "none", border: "none", color: "var(--color-text-primary)", fontSize: 11, outline: "none", height: "100%", width: 140 }} />
            {filter && <button onClick={() => setFilter("")} className="toolbar-btn" style={{ padding: 0 }}><X size={10} /></button>}
          </div>
        )}
        {selected && <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginLeft: "auto" }}>{filteredData.length} rows</span>}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {!selected ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-text-muted)", fontSize: 12 }}>
            Select a table
          </div>
        ) : loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-text-muted)", fontSize: 12 }}>
            Loading...
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {cols.map((c) => {
                  const fieldMeta = meta.find((f) => colName(f) === c);
                  return (
                    <th key={c} style={thStyle}>
                      {c}
                      {fieldMeta?.IsPrimaryKey && <span style={{ color: "#FFD700", marginLeft: 4, fontSize: 9 }}>PK</span>}
                    </th>
                  );
                })}
                <th style={{ ...thStyle, width: 60, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, i) => (
                <tr key={i} style={trStyle} className="group">
                  {cols.map((c) => (
                    <td key={c} style={tdStyle}>
                      {typeof row[c] === "object" ? JSON.stringify(row[c]) : String(row[c] ?? "")}
                    </td>
                  ))}
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span className="hidden group-hover:inline-flex" style={{ gap: 2 }}>
                      <button onClick={() => setOverlay({ type: "upsertRow", existingRow: row })} className="tree-action-btn" title="Edit"><Pencil size={12} /></button>
                      <button onClick={() => handleDelete(row)} className="tree-action-btn" style={{ color: "#F44336" }} title="Delete"><Trash2 size={12} /></button>
                    </span>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr><td colSpan={cols.length + 1} style={{ ...tdStyle, textAlign: "center", color: "var(--color-text-muted)", padding: 24 }}>
                  {filter ? "No matching rows" : "No data"}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {overlay.type === "upsertRow" && (
        <UpsertRowOverlay
          initialJson={buildRowJson(overlay.existingRow)}
          isEdit={!!overlay.existingRow}
          tableName={selected}
          onSave={handleUpsert}
          onClose={() => setOverlay({ type: "none" })}
        />
      )}

      {overlay.type === "confirm" && (
        <ConfirmOverlay title={overlay.title} onConfirm={overlay.onConfirm} onCancel={() => setOverlay({ type: "none" })} />
      )}
    </div>
  );
}

function UpsertRowOverlay({ initialJson, isEdit, tableName, onSave, onClose }: {
  initialJson: string; isEdit: boolean; tableName: string;
  onSave: (json: string) => Promise<void>; onClose: () => void;
}) {
  const [json, setJson] = useState(initialJson);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    <div style={overlayBg}>
      <div style={{ ...dialogStyle, width: "50vw", height: "50vh", display: "flex", flexDirection: "column", resize: "both", overflow: "hidden" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{isEdit ? "Edit" : "Add"} Row in {tableName}</span>
          <button onClick={onClose} className="toolbar-btn"><X size={14} /></button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <JsonEditor value={json} onChange={setJson} height="100%" />
        </div>
        {error && <div style={{ color: "#F44336", fontSize: 11, marginTop: 4 }}>{error}</div>}
        <div className="flex gap-2" style={{ justifyContent: "flex-end", marginTop: 12, flexShrink: 0 }}>
          <button onClick={onClose} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleSave} disabled={submitting} style={primaryBtnStyle}>
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmOverlay({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <div style={overlayBg}>
      <div style={dialogStyle}>
        <p style={{ fontSize: 13, marginBottom: 16 }}>{title}</p>
        <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
          <button onClick={async () => { setSubmitting(true); await onConfirm(); setSubmitting(false); }} disabled={submitting} style={dangerBtnStyle}>{submitting ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "4px 8px", textAlign: "left", fontWeight: 600, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", fontSize: 11, whiteSpace: "nowrap", position: "sticky", top: 0, background: "var(--color-sidebar)" };
const tdStyle: React.CSSProperties = { padding: "3px 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", height: 28, maxWidth: 300 };
const trStyle: React.CSSProperties = { borderBottom: "1px solid var(--color-border)" };
const overlayBg: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 20, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60 };
const dialogStyle: React.CSSProperties = { backgroundColor: "var(--color-sidebar)", border: "1px solid var(--color-border)", borderRadius: 6, padding: 20, minWidth: 340, maxWidth: "80%", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const cancelBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: 3, cursor: "pointer" };
const primaryBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "#0e639c", border: "none", color: "#fff", borderRadius: 3, cursor: "pointer" };
const dangerBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "#c53030", border: "none", color: "#fff", borderRadius: 3, cursor: "pointer" };
