import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Trash2, Search, RotateCcw, Send, FileText } from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";
import { ErrorActionDialog } from "./ErrorActionDialog";
import type { ErrorOperation, ErrorType } from "../../types";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { IconButton } from "@/components/ui/Button/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadMoreRow } from "@/components/ui/LoadMoreRow";
import { Modal } from "@/components/ui/Modal";
import { CountBadge } from "@/components/ui/CountBadge";
import { t as tok } from "@/lib/design-tokens";

interface ErrorsTableProps {
  errorType: ErrorType;
}

type Overlay =
  | { type: "none" }
  | { type: "json"; title: string; data: string }
  | { type: "action"; mode: "resend" | "resendWithData" | "sendResult"; row: ErrorOperation };

export function ErrorsTable({ errorType }: ErrorsTableProps) {
  const api = useContourApi();
  const [rows, setRows] = useState<ErrorOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overlay, setOverlay] = useState<Overlay>({ type: "none" });

  const load = useCallback(async (timestamp?: string) => {
    if (!api) return;
    if (!timestamp) setLoading(true);
    try {
      const res = await api.getErrors(errorType, timestamp, 100);
      const list = (res as Record<string, unknown>).ErrorOperations;
      if (Array.isArray(list)) {
        if (timestamp) {
          setRows((prev) => [...prev, ...(list as ErrorOperation[])]);
        } else {
          setRows(list as ErrorOperation[]);
        }
      }
    } catch { if (!timestamp) setRows([]); }
    finally { if (!timestamp) setLoading(false); }
  }, [api, errorType]);

  useEffect(() => {
    setRows([]);
    setSelected(new Set());
    load();
  }, [load]);

  const loadMore = () => {
    if (rows.length === 0) return;
    const lastTs = rows[rows.length - 1].TimeStamp;
    load(lastTs);
  };

  const handleDeleteSelected = async () => {
    if (!api || selected.size === 0) return;
    await api.deleteNotHandled(Array.from(selected));
    setSelected(new Set());
    load();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.CorrelationId)));
    }
  };

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.CorrelationId.toLowerCase().includes(q) ||
      r.AdapterType.toLowerCase().includes(q) ||
      r.AdapterName.toLowerCase().includes(q) ||
      r.Contour.toLowerCase().includes(q) ||
      r.RoutingKey.toLowerCase().includes(q) ||
      (r.ErrorType ?? "").toLowerCase().includes(q),
    );
  }, [rows, filter]);

  const formatTime = (val?: string) => {
    if (!val) return "—";
    try { return new Date(val).toLocaleString(); } catch { return val; }
  };

  const viewJson = (title: string, data: string) => {
    let formatted = data;
    try { formatted = JSON.stringify(JSON.parse(data), null, 2); } catch { /* keep as-is */ }
    setOverlay({ type: "json", title, data: formatted });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ position: "relative" }}>
      <PanelToolbar
        dense
        left={
          <>
            <IconButton
              size="xs"
              label="Refresh"
              icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
              onClick={() => load()}
              disabled={loading}
            />
            <span style={{ fontSize: 11, fontWeight: 600, color: tok.color.text.muted, textTransform: "uppercase" }}>
              {errorType} errors
            </span>
            {selected.size > 0 && (
              <IconButton
                size="xs"
                label={`Delete selected (${selected.size})`}
                icon={<Trash2 size={14} style={{ color: "#F44336" }} />}
                badge={<CountBadge value={selected.size} tone="danger" />}
                onClick={handleDeleteSelected}
              />
            )}
          </>
        }
        right={
          <div className="flex items-center gap-1">
            <Search size={14} style={{ color: tok.color.text.muted }} />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter..."
              style={searchStyle}
            />
          </div>
        }
      />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 30, textAlign: "center" }}>
                <input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length} onChange={toggleAll} />
              </th>
              <th style={thStyle}>Contour</th>
              <th style={thStyle}>Type (Name)</th>
              <th style={thStyle}>Error Type</th>
              <th style={thStyle}>Routing Key</th>
              <th style={thStyle}>TimeStamp</th>
              <th style={thStyle}>CorrelationId</th>
              <th style={thStyle}>Data</th>
              <th style={{ ...thStyle, width: 80 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.CorrelationId} style={trStyle}>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <input type="checkbox" checked={selected.has(r.CorrelationId)} onChange={() => toggleSelect(r.CorrelationId)} />
                </td>
                <td style={tdStyle}>{r.Contour}</td>
                <td style={tdStyle}>
                  <span style={{ fontWeight: 500 }}>{r.AdapterType}</span>
                  <span style={{ color: "var(--color-text-muted)", marginLeft: 3 }}>({r.AdapterName})</span>
                </td>
                <td style={tdStyle}>{r.ErrorType}</td>
                <td style={{ ...tdStyle, maxWidth: 150 }}>{r.RoutingKey}</td>
                <td style={tdStyle}>{formatTime(r.TimeStamp)}</td>
                <td style={{ ...tdStyle, maxWidth: 120, fontSize: 10 }}>{r.CorrelationId}</td>
                <td style={tdStyle}>
                  <div className="flex gap-1">
                    {r.Headers && <button onClick={() => viewJson("Headers", r.Headers)} className="toolbar-btn" style={dataBtnStyle} title="Headers">H</button>}
                    {r.Payload && <button onClick={() => viewJson("Payload", r.Payload)} className="toolbar-btn" style={dataBtnStyle} title="Payload">P</button>}
                    {r.Exception && <button onClick={() => viewJson("Exception", r.Exception)} className="toolbar-btn" style={{ ...dataBtnStyle, color: "#F44336" }} title="Exception">E</button>}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div className="flex gap-1">
                    <IconButton size="xs" label="Resend" icon={<RotateCcw size={12} />} onClick={() => setOverlay({ type: "action", mode: "resend", row: r })} />
                    <IconButton size="xs" label="Resend with new data" icon={<FileText size={12} />} onClick={() => setOverlay({ type: "action", mode: "resendWithData", row: r })} />
                    {r.ExchangeType === "CommandExchange" && (
                      <IconButton size="xs" label="Send command result" icon={<Send size={12} />} onClick={() => setOverlay({ type: "action", mode: "sendResult", row: r })} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9}>
                <EmptyState dense title={loading ? "Loading..." : "No errors"} />
              </td></tr>
            )}
          </tbody>
        </table>
        {rows.length > 0 && (
          <LoadMoreRow onClick={loadMore} loaded={rows.length} />
        )}
      </div>

      <Modal
        open={overlay.type === "json"}
        onClose={() => setOverlay({ type: "none" })}
        size="xl"
        aria-label={overlay.type === "json" ? overlay.title : "JSON viewer"}
      >
        {overlay.type === "json" && (
          <>
            <Modal.Header title={overlay.title} />
            <Modal.Body style={{ height: "55vh", padding: 0 }}>
              <JsonEditor value={overlay.data} readOnly height="100%" />
            </Modal.Body>
          </>
        )}
      </Modal>

      {overlay.type === "action" && api && (
        <ErrorActionDialog
          mode={overlay.mode}
          row={overlay.row}
          api={api}
          onClose={() => setOverlay({ type: "none" })}
          onDone={() => { setOverlay({ type: "none" }); load(); }}
        />
      )}
    </div>
  );
}

const dataBtnStyle: React.CSSProperties = { background: "rgba(255,255,255,0.06)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", cursor: "pointer", padding: "1px 5px", fontSize: 10, borderRadius: 3, fontWeight: 600, transition: "background 0.15s" };
const thStyle: React.CSSProperties = { position: "sticky", top: 0, background: "var(--color-sidebar)", padding: "4px 6px", textAlign: "left", fontWeight: 600, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", fontSize: 10, whiteSpace: "nowrap", userSelect: "none" };
const tdStyle: React.CSSProperties = { padding: "2px 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", height: 26, maxWidth: 180 };
const trStyle: React.CSSProperties = { borderBottom: "1px solid var(--color-border)" };
const searchStyle: React.CSSProperties = { background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 12, padding: "2px 6px", height: 22, width: 180, borderRadius: 3, outline: "none" };
