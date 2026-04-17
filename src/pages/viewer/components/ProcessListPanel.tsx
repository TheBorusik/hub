import { useState, useCallback, useEffect, useMemo } from "react";
import { RefreshCw, ChevronDown, ArrowRight } from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import type { ViewerTab } from "../types";
import type { ViewerProcessRow } from "@/lib/ws-api-models";

const PAGE_SIZE = 50;

const TABS: { id: ViewerTab; label: string }[] = [
  { id: "completed", label: "Completed" },
  { id: "manual", label: "Manual" },
  { id: "idle", label: "Idle" },
];

interface ProcessListPanelProps {
  onSelectProcess: (processId: number, name: string, tab: ViewerTab) => void;
  selectedProcessId: number | null;
  /**
   * Опциональное управление активной вкладкой списка снаружи. Если
   * задано — вкладка «контролируется» родителем (используется для
   * синхронизации при навигации из Configurator/Run).
   */
  activeTab?: ViewerTab;
  onActiveTabChange?: (tab: ViewerTab) => void;
}

export function ProcessListPanel({ onSelectProcess, selectedProcessId, activeTab: controlledTab, onActiveTabChange }: ProcessListPanelProps) {
  const api = useContourApi();
  const [internalTab, setInternalTab] = useState<ViewerTab>("completed");
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = useCallback((next: ViewerTab) => {
    if (controlledTab === undefined) setInternalTab(next);
    onActiveTabChange?.(next);
  }, [controlledTab, onActiveTabChange]);
  const [processes, setProcesses] = useState<ViewerProcessRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const loadProcesses = useCallback(
    async (tab: ViewerTab, append = false) => {
      if (!api) return;
      setLoading(true);
      try {
        const startId = append && processes.length > 0
          ? processes[processes.length - 1].ProcessId
          : undefined;
        const result = await api.getProcesses(tab, PAGE_SIZE, startId);
        const list = (result.Processes ?? []) as ViewerProcessRow[];
        setProcesses((prev) => (append ? [...prev, ...list] : list));
        setTotalCount(result.TotalCount ?? list.length);
      } catch (err) {
        console.error("Failed to load processes:", err);
      } finally {
        setLoading(false);
      }
    },
    [api, processes],
  );

  useEffect(() => {
    setProcesses([]);
    setTotalCount(0);
    setSelected(new Set());
    loadProcesses(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, api]);

  const filtered = useMemo(() => {
    if (!search.trim()) return processes;
    const q = search.toLowerCase();
    return processes.filter(
      (p) =>
        String(p.ProcessId).includes(q) ||
        (p.Name ?? "").toLowerCase().includes(q) ||
        (p.Worker ?? "").toLowerCase().includes(q),
    );
  }, [processes, search]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.ProcessId)));
    }
  };

  const handleMoveAction = async () => {
    if (!api || selected.size === 0) return;
    try {
      const ids = Array.from(selected);
      if (activeTab === "completed") {
        await api.moveFromCompleted(ids);
      } else {
        await api.moveToCompleted(ids);
      }
      setSelected(new Set());
      loadProcesses(activeTab);
    } catch (err) {
      console.error("Move failed:", err);
    }
  };

  const computeElapsed = (p: ViewerProcessRow): string => {
    if (p.Elapsed && Number.isFinite(p.Elapsed) && p.Elapsed > 0) {
      const sec = p.Elapsed;
      if (sec < 1) return `${Math.round(sec * 1000)}ms`;
      if (sec < 60) return `${sec.toFixed(1)}s`;
      return `${(sec / 60).toFixed(1)}m`;
    }
    if (p.RegisterTimestamp && p.EndTimestamp) {
      const ms = new Date(p.EndTimestamp).getTime() - new Date(p.RegisterTimestamp).getTime();
      if (Number.isFinite(ms) && ms >= 0) {
        const sec = ms / 1000;
        if (sec < 1) return `${Math.round(ms)}ms`;
        if (sec < 60) return `${sec.toFixed(1)}s`;
        return `${(sec / 60).toFixed(1)}m`;
      }
    }
    return "";
  };

  const formatTime = (ts: string | null | undefined) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      return d.toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" });
    } catch {
      return ts;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab buttons */}
      <div className="flex shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 cursor-pointer border-none"
            style={{
              height: 28,
              fontSize: 12,
              fontWeight: activeTab === t.id ? 600 : 400,
              background: activeTab === t.id ? "var(--color-tab-active)" : "transparent",
              color: activeTab === t.id ? "var(--color-text-active)" : "var(--color-text-muted)",
              borderBottom: activeTab === t.id ? "2px solid var(--color-focus-border)" : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar: search + refresh + mass action */}
      <div className="flex items-center shrink-0" style={{ padding: "4px 6px", gap: 4, borderBottom: "1px solid var(--color-border)" }}>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, fontSize: 12 }}
        />
        <button
          onClick={() => loadProcesses(activeTab)}
          disabled={loading}
          className="toolbar-btn"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Mass action bar */}
      {selected.size > 0 && (
        <div
          className="flex items-center shrink-0"
          style={{ padding: "3px 6px", gap: 6, fontSize: 12, borderBottom: "1px solid var(--color-border)", background: "rgba(0,122,204,0.1)" }}
        >
          <span style={{ color: "var(--color-text-muted)" }}>{selected.size} selected</span>
          <button
            onClick={handleMoveAction}
            className="flex items-center cursor-pointer"
            style={{ marginLeft: "auto", fontSize: 11, padding: "2px 8px", background: "var(--color-accent)", color: "#fff", border: "none", gap: 4 }}
          >
            <ArrowRight size={12} />
            {activeTab === "completed" ? "Move to Last State" : "Move to Completed"}
          </button>
        </div>
      )}

      {/* Process list */}
      <div className="flex-1 overflow-y-auto" style={{ paddingTop: 2 }}>
        {filtered.length === 0 && !loading && (
          <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--color-text-muted)" }}>
            {processes.length === 0 ? "No processes" : "No matches"}
          </div>
        )}
        {filtered.map((p) => {
          const isActive = p.ProcessId === selectedProcessId;
          const isChecked = selected.has(p.ProcessId);
          const resultCode = p.ResultCode && p.ResultCode !== "Null" ? p.ResultCode : null;
          const isFailed = resultCode && resultCode !== "Ok" && resultCode !== "Success";
          return (
            <div
              key={p.ProcessId}
              className="flex items-center cursor-pointer"
              onClick={() => onSelectProcess(p.ProcessId, p.Name, activeTab)}
              style={{
                minHeight: 28,
                padding: "2px 6px",
                gap: 6,
                background: isActive ? "rgba(0,122,204,0.2)" : "transparent",
                outline: isActive ? "1px solid var(--color-focus-border)" : "none",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => { e.stopPropagation(); toggleSelect(p.ProcessId); }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 14, height: 14, accentColor: "var(--color-accent)", flexShrink: 0 }}
              />
              <div className="flex flex-col flex-1 overflow-hidden" style={{ gap: 1 }}>
                <div className="flex items-center" style={{ gap: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)", flexShrink: 0 }}>#{p.ProcessId}</span>
                  <span className="truncate" style={{ fontSize: 12, fontWeight: 500 }}>{p.Name}</span>
                </div>
                <div className="flex items-center" style={{ gap: 6, fontSize: 11, color: "var(--color-text-muted)" }}>
                  {activeTab === "completed" ? (
                    <>
                      <span style={{ color: isFailed ? "#F6511D" : "#4CAF50" }}>
                        {resultCode || p.Status || "—"}
                      </span>
                      <span>{computeElapsed(p)}</span>
                      <span style={{ marginLeft: "auto" }}>{formatTime(p.EndTimestamp)}</span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: p.Status === "ManualControl" ? "#FCA6ED" : p.Status === "Waiting" ? "#5CADD5" : "var(--color-text-muted)" }}>
                        {p.Status}
                      </span>
                      <span>v{p.Version}</span>
                      <span style={{ marginLeft: "auto" }}>{formatTime(p.StatusTimeStamp)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Load more */}
        {processes.length > 0 && processes.length < totalCount && (
          <button
            onClick={() => loadProcesses(activeTab, true)}
            disabled={loading}
            className="flex items-center justify-center cursor-pointer disabled:opacity-50"
            style={{
              width: "100%",
              height: 28,
              fontSize: 12,
              background: "transparent",
              border: "none",
              color: "var(--color-accent)",
              gap: 4,
            }}
          >
            <ChevronDown size={14} />
            Load more ({processes.length} / {totalCount})
          </button>
        )}
      </div>

      {/* Select all / footer */}
      <div
        className="flex items-center shrink-0"
        style={{ padding: "2px 6px", gap: 6, fontSize: 11, color: "var(--color-text-muted)", borderTop: "1px solid var(--color-border)" }}
      >
        <label className="flex items-center cursor-pointer" style={{ gap: 4 }}>
          <input
            type="checkbox"
            checked={filtered.length > 0 && selected.size === filtered.length}
            onChange={toggleSelectAll}
            style={{ width: 12, height: 12, accentColor: "var(--color-accent)" }}
          />
          All
        </label>
        <span style={{ marginLeft: "auto" }}>{totalCount} total</span>
      </div>
    </div>
  );
}
