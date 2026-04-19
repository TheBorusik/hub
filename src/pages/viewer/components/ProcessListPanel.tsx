import { useState, useCallback, useEffect, useMemo } from "react";
import { RefreshCw, ArrowRight, Trash2, Filter as FilterIcon } from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import { useToast } from "@/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tabs } from "@/components/ui/Tabs";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { IconButton, Button } from "@/components/ui/Button";
import { CountBadge } from "@/components/ui/CountBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadMoreRow } from "@/components/ui/LoadMoreRow";
import { MassActionBar } from "@/components/ui/MassActionBar";
import { t as tok } from "@/lib/design-tokens";
import { ProcessFiltersPanel, buildServerFilters, EMPTY_FILTERS, type ViewerFiltersState } from "./ProcessFiltersPanel";
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

export function ProcessListPanel({
  onSelectProcess,
  selectedProcessId,
  activeTab: controlledTab,
  onActiveTabChange,
}: ProcessListPanelProps) {
  const api = useContourApi();
  const toast = useToast();
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
  const [filters, setFilters] = useState<ViewerFiltersState>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ViewerFiltersState>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  type ConfirmState =
    | { kind: "none" }
    | { kind: "delete"; ids: number[]; busy: boolean; error: string | null };
  const [confirm, setConfirm] = useState<ConfirmState>({ kind: "none" });

  const loadProcesses = useCallback(
    async (tab: ViewerTab, append = false) => {
      if (!api) return;
      setLoading(true);
      try {
        const startId = append && processes.length > 0
          ? processes[processes.length - 1].ProcessId
          : undefined;
        const serverFilters = buildServerFilters(appliedFilters, tab);
        const result = await api.getProcesses(tab, PAGE_SIZE, startId, serverFilters);
        const list = (result.Processes ?? []) as ViewerProcessRow[];
        setProcesses((prev) => (append ? [...prev, ...list] : list));
        setTotalCount(result.TotalCount ?? list.length);
      } catch (err) {
        console.error("Failed to load processes:", err);
        toast.push("error", "Failed to load processes", {
          detail: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setLoading(false);
      }
    },
    [api, processes, appliedFilters, toast],
  );

  useEffect(() => {
    setProcesses([]);
    setTotalCount(0);
    setSelected(new Set());
    loadProcesses(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, api, appliedFilters]);

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
    const ids = Array.from(selected);
    const direction = activeTab === "completed" ? "from-completed" : "to-completed";
    try {
      const response = direction === "from-completed"
        ? await api.moveFromCompleted(ids)
        : await api.moveToCompleted(ids);

      const statuses = response?.MoveStatus ?? [];
      const failed = statuses.filter((s) => s.ErrorCode);
      const okCount = statuses.length - failed.length;

      if (okCount > 0) {
        toast.push(
          "success",
          direction === "from-completed"
            ? `Moved ${okCount} back to last state`
            : `Moved ${okCount} to Completed`,
        );
      }
      if (failed.length > 0) {
        toast.push("error", `Failed to move ${failed.length} process(es)`, {
          detail: failed.map((f) => `#${f.ProcessId}: ${f.ErrorCode}`).join("\n"),
        });
      }

      setSelected(new Set());
      loadProcesses(activeTab);
    } catch (err) {
      console.error("Move failed:", err);
      toast.push("error", "Move failed", {
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleDeleteAction = () => {
    if (!api || selected.size === 0) return;
    setConfirm({ kind: "delete", ids: Array.from(selected), busy: false, error: null });
  };

  const performDelete = async () => {
    if (confirm.kind !== "delete" || !api) return;
    setConfirm({ ...confirm, busy: true, error: null });
    try {
      const response = await api.deleteProcesses(confirm.ids);
      const results = response?.Results ?? [];
      const okIds = results.filter((r) => r.Deleted).map((r) => r.ProcessId);
      const failed = results.filter((r) => !r.Deleted);

      if (okIds.length > 0) {
        toast.push("success", `Deleted ${okIds.length} process(es)`);
      }
      if (failed.length > 0) {
        toast.push("error", `Failed to delete ${failed.length} process(es)`, {
          detail: failed.map((f) => `#${f.ProcessId}: ${f.ErrorCode ?? "unknown"}`).join("\n"),
        });
      }

      setConfirm({ kind: "none" });
      setSelected(new Set());
      loadProcesses(activeTab);
    } catch (err) {
      setConfirm({
        ...confirm,
        busy: false,
        error: err instanceof Error ? err.message : String(err),
      });
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

  const activeFilterCount =
    appliedFilters.custom.length +
    (appliedFilters.dateFrom ? 1 : 0) +
    (appliedFilters.dateTo ? 1 : 0) +
    (appliedFilters.standard.processId.trim() ? 1 : 0) +
    (appliedFilters.standard.name.trim() ? 1 : 0) +
    (appliedFilters.standard.operationId.trim() ? 1 : 0) +
    (appliedFilters.standard.authId.trim() ? 1 : 0) +
    (activeTab === "completed" && appliedFilters.standard.resultCode.trim() ? 1 : 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs (inline variant, stretched) */}
      <Tabs
        items={TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeId={activeTab}
        onChange={setActiveTab}
        variant="inline"
        aria-label="Process status"
      />

      {/* Toolbar: search + filters + refresh */}
      <PanelToolbar
        dense
        left={
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, fontSize: 12, minWidth: 0 }}
          />
        }
        right={
          <>
            <IconButton
              icon={<FilterIcon size={13} />}
              label="Filters"
              size="sm"
              active={showFilters || activeFilterCount > 0}
              onClick={() => setShowFilters((v) => !v)}
              badge={activeFilterCount > 0 ? <CountBadge value={activeFilterCount} tone="accent" /> : undefined}
            />
            <IconButton
              icon={<RefreshCw size={13} className={loading ? "animate-spin" : ""} />}
              label="Refresh"
              size="sm"
              onClick={() => loadProcesses(activeTab)}
              disabled={loading}
            />
          </>
        }
      />

      {/* Filters panel */}
      {showFilters && (
        <ProcessFiltersPanel
          tab={activeTab}
          value={filters}
          onChange={setFilters}
          onApply={() => setAppliedFilters(filters)}
        />
      )}

      {/* Mass action bar */}
      <MassActionBar
        selectedCount={selected.size}
        noun="selected"
        onClear={() => setSelected(new Set())}
        actions={
          <>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 size={11} />}
              onClick={handleDeleteAction}
              title="Delete selected processes (cascade)"
            >
              Delete
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<ArrowRight size={11} />}
              onClick={handleMoveAction}
            >
              {activeTab === "completed" ? "Move to Last State" : "Move to Completed"}
            </Button>
          </>
        }
      />

      {/* Process list */}
      <div className="flex-1 overflow-y-auto" style={{ paddingTop: 2 }}>
        {filtered.length === 0 && !loading && (
          <EmptyState
            dense
            title={processes.length === 0 ? "No processes" : "No matches"}
            hint={processes.length === 0 ? "Try changing filters or switch tab" : "Try a different search query"}
          />
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
          <LoadMoreRow
            onClick={() => loadProcesses(activeTab, true)}
            loading={loading}
            loaded={processes.length}
            total={totalCount}
          />
        )}
      </div>

      {/* Select all / footer */}
      <div
        className="flex items-center shrink-0"
        style={{
          padding: `${tok.space[1]} ${tok.space[3]}`,
          gap: tok.space[3],
          fontSize: tok.font.size.xs,
          color: tok.color.text.muted,
          borderTop: `1px solid ${tok.color.border.default}`,
        }}
      >
        <label className="flex items-center cursor-pointer" style={{ gap: 4 }}>
          <input
            type="checkbox"
            checked={filtered.length > 0 && selected.size === filtered.length}
            onChange={toggleSelectAll}
            style={{ width: 12, height: 12, accentColor: tok.color.accent }}
          />
          All
        </label>
        <span style={{ marginLeft: "auto" }}>{totalCount} total</span>
      </div>

      {/* Confirm: delete */}
      <ConfirmDialog
        open={confirm.kind === "delete"}
        title="Delete processes"
        message={
          confirm.kind === "delete"
            ? `Are you sure you want to permanently delete ${confirm.ids.length} process(es)?\n\n` +
              `This removes the process, its sub-processes and related command results from both worked (processes) and completed (completed_processes) tables. The action cannot be undone.`
            : ""
        }
        confirmLabel={confirm.kind === "delete" ? `Delete ${confirm.ids.length}` : "Delete"}
        cancelLabel="Cancel"
        tone="danger"
        busy={confirm.kind === "delete" ? confirm.busy : false}
        error={confirm.kind === "delete" ? confirm.error : null}
        onConfirm={performDelete}
        onCancel={() => setConfirm({ kind: "none" })}
      />

    </div>
  );
}
