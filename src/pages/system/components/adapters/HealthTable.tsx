import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Trash2, Search, ArrowUp, ArrowDown } from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import type { AdapterHealth } from "../../types";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { IconButton } from "@/components/ui/Button/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusDot } from "@/components/ui/StatusDot";
import { t as tok } from "@/lib/design-tokens";

type SortKey = keyof AdapterHealth;
type SortDir = "asc" | "desc";

const STATE_TONES: Record<string, "ok" | "err" | "muted" | "warn"> = {
  Up: "ok",
  Down: "err",
  Unknown: "muted",
  NotResponding: "warn",
};

export function HealthTable() {
  const api = useContourApi();
  const [rows, setRows] = useState<AdapterHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("Type");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.getAdaptersHealth();
      const list = (res as Record<string, unknown>).AdaptersHealth;
      setRows(Array.isArray(list) ? (list as AdapterHealth[]) : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (row: AdapterHealth) => {
    if (!api) return;
    try {
      await api.deleteAdapterHealth(row.Type, row.Name, row.Contour);
      setRows((prev) => prev.filter((r) => !(r.Type === row.Type && r.Name === row.Name && r.Contour === row.Contour)));
    } catch { /* ignore */ }
  }, [api]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    let list = rows;
    if (q) {
      list = list.filter(
        (r) =>
          r.Name.toLowerCase().includes(q) ||
          r.Type.toLowerCase().includes(q) ||
          r.Contour.toLowerCase().includes(q) ||
          r.State.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [rows, filter, sortKey, sortDir]);

  const formatTime = (val?: string) => {
    if (!val) return "—";
    try {
      return new Date(val).toLocaleString();
    } catch {
      return val;
    }
  };

  const columns: { key: SortKey; label: string; width?: number }[] = [
    { key: "Contour", label: "Contour", width: 100 },
    { key: "Type", label: "Type (Name)", width: 180 },
    { key: "AdapterVersion", label: "Version", width: 90 },
    { key: "SalVersion", label: "SAL", width: 80 },
    { key: "StartTime", label: "Start Time", width: 150 },
    { key: "DownTime", label: "Down Time", width: 150 },
    { key: "LastStateUpdateTime", label: "Last Update", width: 150 },
    { key: "State", label: "State", width: 100 },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PanelToolbar
        dense
        left={
          <IconButton
            size="xs"
            label="Refresh"
            icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
            onClick={load}
            disabled={loading}
          />
        }
        right={
          <div className="flex items-center gap-1">
            <Search size={14} style={{ color: tok.color.text.muted }} />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter..."
              style={{
                background: tok.color.bg.panel,
                border: `1px solid ${tok.color.border.default}`,
                color: tok.color.text.primary,
                fontSize: 12,
                padding: "2px 6px",
                height: 22,
                width: 180,
                borderRadius: tok.radius.sm,
                outline: "none",
              }}
            />
          </div>
        }
      />
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "var(--color-sidebar)",
                    borderBottom: "1px solid var(--color-border)",
                    padding: "4px 8px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontWeight: 600,
                    color: "var(--color-text-muted)",
                    whiteSpace: "nowrap",
                    width: col.width,
                    userSelect: "none",
                    fontSize: 11,
                  }}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (sortDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                  </span>
                </th>
              ))}
              <th
                style={{
                  position: "sticky",
                  top: 0,
                  background: "var(--color-sidebar)",
                  borderBottom: "1px solid var(--color-border)",
                  width: 40,
                  padding: "4px 8px",
                  fontSize: 11,
                }}
              />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr
                key={`${row.Type}-${row.Name}-${row.Contour}-${i}`}
                style={{ borderBottom: "1px solid var(--color-border)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <td style={tdStyle}>{row.Contour}</td>
                <td style={tdStyle}>
                  <span style={{ fontWeight: 500 }}>{row.Type}</span>
                  <span style={{ color: "var(--color-text-muted)", marginLeft: 4 }}>({row.Name})</span>
                </td>
                <td style={tdStyle}>{row.AdapterVersion}</td>
                <td style={tdStyle}>{row.SalVersion}</td>
                <td style={tdStyle}>{formatTime(row.StartTime)}</td>
                <td style={tdStyle}>{formatTime(row.DownTime)}</td>
                <td style={tdStyle}>{formatTime(row.LastStateUpdateTime)}</td>
                <td style={tdStyle}>
                  <span className="flex items-center gap-1">
                    <StatusDot tone={STATE_TONES[row.State] ?? "muted"} size={8} />
                    {row.State}
                  </span>
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <IconButton size="xs" label="Delete" icon={<Trash2 size={13} />} onClick={() => handleDelete(row)} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState dense title={loading ? "Loading..." : "No adapters found"} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tdStyle: React.CSSProperties = {
  padding: "3px 8px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 200,
  height: 28,
};
