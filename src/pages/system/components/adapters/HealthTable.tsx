import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Trash2, Search } from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import type { AdapterHealth } from "../../types";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { IconButton } from "@/components/ui/Button/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusDot } from "@/components/ui/StatusDot";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSort,
} from "@/components/ui/DataTable";
import { t as tok } from "@/lib/design-tokens";

type SortKey = keyof AdapterHealth | "__actions";

const STATE_TONES: Record<string, "ok" | "err" | "muted" | "warn"> = {
  Up: "ok",
  Down: "err",
  Unknown: "muted",
  NotResponding: "warn",
};

function formatTime(val?: string): string {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleString();
  } catch {
    return val;
  }
}

export function HealthTable() {
  const api = useContourApi();
  const [rows, setRows] = useState<AdapterHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<DataTableSort<SortKey> | null>({
    columnId: "Type",
    dir: "asc",
  });

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
    if (!sort) return list;
    const { columnId, dir } = sort;
    if (columnId === "__actions") return list;
    const key = columnId as keyof AdapterHealth;
    return [...list].sort((a, b) => {
      const av = String(a[key] ?? "");
      const bv = String(b[key] ?? "");
      return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [rows, filter, sort]);

  const columns = useMemo<DataTableColumn<AdapterHealth, SortKey>[]>(() => [
    { id: "Contour", header: "Contour", cell: (r) => r.Contour, width: 100, sortable: true },
    {
      id: "Type",
      header: "Type (Name)",
      width: 180,
      sortable: true,
      cell: (r) => (
        <>
          <span style={{ fontWeight: 500 }}>{r.Type}</span>
          <span style={{ color: tok.color.text.muted, marginLeft: 4 }}>({r.Name})</span>
        </>
      ),
    },
    { id: "AdapterVersion", header: "Version", cell: (r) => r.AdapterVersion ?? "", width: 90, sortable: true },
    { id: "SalVersion", header: "SAL", cell: (r) => r.SalVersion ?? "", width: 80, sortable: true },
    { id: "StartTime", header: "Start Time", cell: (r) => formatTime(r.StartTime), width: 150, sortable: true },
    { id: "DownTime", header: "Down Time", cell: (r) => formatTime(r.DownTime), width: 150, sortable: true },
    { id: "LastStateUpdateTime", header: "Last Update", cell: (r) => formatTime(r.LastStateUpdateTime), width: 150, sortable: true },
    {
      id: "State",
      header: "State",
      width: 100,
      sortable: true,
      cell: (r) => (
        <span className="flex items-center gap-1">
          <StatusDot tone={STATE_TONES[r.State] ?? "muted"} size={8} />
          {r.State}
        </span>
      ),
    },
    {
      id: "__actions",
      header: "",
      width: 40,
      align: "center",
      cell: (r) => (
        <span className="ui-row-actions">
          <IconButton
            size="xs"
            label="Delete"
            icon={<Trash2 size={13} />}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(r);
            }}
          />
        </span>
      ),
    },
  ], [handleDelete]);

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
      <div className="flex-1 min-h-0 overflow-hidden">
        <DataTable
          data={filtered}
          columns={columns}
          getRowId={(r, i) => `${r.Type}-${r.Name}-${r.Contour}-${i}`}
          sort={sort}
          onSortChange={setSort}
          dense
          aria-label="Adapters health"
          empty={<EmptyState dense title={loading ? "Loading..." : "No adapters found"} />}
        />
      </div>
    </div>
  );
}
