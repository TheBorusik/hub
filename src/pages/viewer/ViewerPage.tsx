import { useState, useCallback, useEffect } from "react";
import { Group, Panel } from "react-resizable-panels";
import { X } from "lucide-react";
import { ProcessListPanel } from "./components/ProcessListPanel";
import { ProcessDetailPanel } from "./components/ProcessDetailPanel";
import { RestartDialog } from "./components/RestartDialog";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { SidePanel } from "@/components/layout/SidePanel";
import { useContourApi } from "@/lib/ws-api";
import { useNavigation } from "@/providers/NavigationProvider";
import type { ProcessTab, ViewerTab, ProcessDetail } from "./types";

type Overlay =
  | { type: "none" }
  | { type: "json"; data: string; title: string }
  | { type: "stageContext"; loading: boolean; data: string; title: string }
  | { type: "restart"; processId: number; stageIndex: number; stageName: string }
  | { type: "restartWithData"; processId: number; stageIndex: number; stageName: string };

export function ViewerPage() {
  const api = useContourApi();
  const { navigateTo, consumeIntent, currentSection } = useNavigation();
  const [tabs, setTabs] = useState<ProcessTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>({ type: "none" });
  // Активная вкладка списка процессов (Completed/Manual/Idle) — поднята
  // сюда, чтобы переключать её при навигации из Run (для процессов
  // в manualcontrol, например).
  const [listTab, setListTab] = useState<ViewerTab>("completed");

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  const updateTab = useCallback(
    (tabId: string, patch: Partial<ProcessTab>) => {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, ...patch } : t)));
    },
    [],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === tabId);
        const next = prev.filter((t) => t.id !== tabId);
        if (tabId === activeTabId && next.length > 0) {
          const newIdx = Math.min(idx, next.length - 1);
          setActiveTabId(next[newIdx].id);
        } else if (next.length === 0) {
          setActiveTabId(null);
        }
        return next;
      });
    },
    [activeTabId],
  );

  const handleSelectProcess = useCallback(
    async (processId: number, name: string, tab: ViewerTab) => {
      const tabId = `${tab}-${processId}`;
      const existing = tabs.find((t) => t.id === tabId);
      if (existing) {
        setActiveTabId(tabId);
        return;
      }

      const newTab: ProcessTab = {
        id: tabId,
        processId,
        name,
        tab,
        detail: null,
        children: [],
        loading: true,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(tabId);

      if (api) {
        try {
          const detail = await api.getProcessDetail(tab, processId) as unknown as ProcessDetail;
          let children: ProcessDetail[] = [];
          try {
            const childResult = await api.getChildProcesses(tab, processId);
            children = (Array.isArray(childResult) ? childResult : []) as unknown as ProcessDetail[];
          } catch {
            // no children
          }
          setTabs((prev) =>
            prev.map((t) =>
              t.id === tabId ? { ...t, detail, children, loading: false } : t,
            ),
          );
        } catch (err) {
          console.error("Failed to load process detail:", err);
          setTabs((prev) =>
            prev.map((t) => (t.id === tabId ? { ...t, loading: false } : t)),
          );
        }
      }
    },
    [api, tabs],
  );

  const refreshActiveTab = useCallback(async () => {
    if (!api || !activeTab) return;
    updateTab(activeTab.id, { loading: true });
    try {
      const detail = await api.getProcessDetail(activeTab.tab, activeTab.processId) as unknown as ProcessDetail;
      let children: ProcessDetail[] = [];
      try {
        const childResult = await api.getChildProcesses(activeTab.tab, activeTab.processId);
        children = (Array.isArray(childResult) ? childResult : []) as unknown as ProcessDetail[];
      } catch {
        // no children
      }
      updateTab(activeTab.id, { detail, children, loading: false });
    } catch {
      updateTab(activeTab.id, { loading: false });
    }
  }, [api, activeTab, updateTab]);

  const handleViewJson = (data: unknown, title: string) => {
    const json = data != null ? JSON.stringify(data, null, 2) : "null";
    setOverlay({ type: "json", data: json, title });
  };

  const handleViewStageContext = async (processId: number, stageIndex: number, subject: string, label: string) => {
    if (!api || !activeTab) return;
    setOverlay({ type: "stageContext", loading: true, data: "", title: label });
    try {
      const tabMap = { completed: "Completed", manual: "Manual", idle: "Idle" } as const;
      const result = await api.getStageContext(processId, stageIndex, subject, tabMap[activeTab.tab]);
      const json = result.Data != null ? JSON.stringify(result.Data, null, 2) : "null";
      setOverlay({ type: "stageContext", loading: false, data: json, title: label });
    } catch (err) {
      setOverlay({
        type: "stageContext",
        loading: false,
        data: `// Error: ${err instanceof Error ? err.message : String(err)}`,
        title: label,
      });
    }
  };

  const handleEditProcess = useCallback((processName: string) => {
    navigateTo("configurator", { kind: "openProcessInConfigurator", processName });
  }, [navigateTo]);

  // Подхватить навигационный intent «открой процесс в Viewer»
  // (например, от RunProcessPanel в Configurator). ViewerPage остаётся
  // замаунченным между переключениями секций (Shell прячет её через
  // display:none), поэтому эффект должен перепроверять intent при
  // КАЖДОЙ активации секции — ключом служит `currentSection`.
  useEffect(() => {
    if (currentSection !== "viewer") return;
    const intent = consumeIntent("viewer");
    if (!intent || intent.kind !== "openProcessInViewer") return;
    const tab = intent.tab ?? "completed";
    setListTab(tab);
    handleSelectProcess(intent.processId, intent.name, tab);
  }, [currentSection, consumeIntent, handleSelectProcess]);

  const handleRestart = useCallback(
    async (data?: unknown) => {
      if (!api || (overlay.type !== "restart" && overlay.type !== "restartWithData")) return;
      const o = overlay as { processId: number; stageIndex: number };
      if (data !== undefined) {
        await api.restartProcessWithNewData(o.processId, o.stageIndex, data);
      } else {
        await api.restartProcess(o.processId, o.stageIndex);
      }
      setOverlay({ type: "none" });
      refreshActiveTab();
    },
    [api, overlay, refreshActiveTab],
  );

  return (
    <Group orientation="horizontal" id="viewer-main">
      {/* Side Panel */}
      <Panel id="viewer-side" defaultSize="300px" minSize="200px" maxSize="50%" groupResizeBehavior="preserve-pixel-size">
        <SidePanel title="PROCESSES">
          <ProcessListPanel
            onSelectProcess={handleSelectProcess}
            selectedProcessId={activeTab?.processId ?? null}
            activeTab={listTab}
            onActiveTabChange={setListTab}
          />
        </SidePanel>
      </Panel>
      <ResizeHandle />

      {/* Editor Area */}
      <Panel id="viewer-editor" minSize="30%">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Process Tabs */}
          <div
            className="flex items-center shrink-0 select-none overflow-x-auto bg-tab-inactive"
            style={{ height: 35, borderBottom: "1px solid var(--color-border)" }}
          >
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className="flex items-center shrink-0 cursor-pointer border-none"
                  style={{
                    height: 35,
                    padding: "0 10px",
                    gap: 6,
                    fontSize: 13,
                    background: isActive ? "var(--color-tab-active)" : "transparent",
                    color: isActive ? "var(--color-text-active)" : "var(--color-text-muted)",
                    borderRight: "1px solid var(--color-border)",
                    ...(isActive ? { borderBottom: "1px solid var(--color-tab-active)" } : {}),
                  }}
                >
                  {tab.loading && (
                    <span
                      style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: "var(--color-accent)",
                        animation: "pulse 1s infinite",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <span className="truncate" style={{ maxWidth: 200 }}>
                    #{tab.processId} {tab.name}
                  </span>
                  <span
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                    className="flex items-center justify-center toolbar-btn"
                    style={{ width: 16, height: 16, flexShrink: 0 }}
                  >
                    <X size={12} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          {activeTab?.detail ? (
            <div className="flex-1 overflow-hidden relative">
              <ProcessDetailPanel
                detail={activeTab.detail}
                tab={activeTab.tab}
                onViewJson={handleViewJson}
                onViewStageContext={handleViewStageContext}
                onRestart={(stageIndex) => {
                  const stageName = findStageName(activeTab.detail!, stageIndex);
                  setOverlay({ type: "restart", processId: activeTab.processId, stageIndex, stageName });
                }}
                onRestartWithData={(stageIndex) => {
                  const stageName = findStageName(activeTab.detail!, stageIndex);
                  setOverlay({ type: "restartWithData", processId: activeTab.processId, stageIndex, stageName });
                }}
                onEditProcess={handleEditProcess}
              />

              {/* Overlay: JSON viewer */}
              {(overlay.type === "json" || overlay.type === "stageContext") && (
                <div className="absolute inset-0 flex items-start justify-center z-20 overflow-auto" style={{ paddingTop: 40, background: "rgba(0,0,0,0.3)" }}>
                  <div
                    className="flex flex-col bg-sidebar border border-border"
                    style={{
                      width: "60vw", height: "70vh",
                      minWidth: 400, minHeight: 250, maxWidth: "90vw", maxHeight: "90vh",
                      padding: 20, gap: 10, resize: "both", overflow: "hidden",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{overlay.title}</span>
                      <button
                        onClick={() => setOverlay({ type: "none" })}
                        className="toolbar-btn"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex-1 border border-border min-h-0">
                      {overlay.type === "stageContext" && overlay.loading ? (
                        <div className="flex items-center justify-center h-full" style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                          Loading...
                        </div>
                      ) : (
                        <JsonEditor value={overlay.data} readOnly />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Overlay: Restart */}
              {(overlay.type === "restart" || overlay.type === "restartWithData") && (
                <div className="absolute inset-0 flex items-start justify-center z-20 overflow-auto" style={{ paddingTop: 40, background: "rgba(0,0,0,0.3)" }}>
                  <RestartDialog
                    processId={overlay.processId}
                    stageIndex={overlay.stageIndex}
                    stageName={overlay.stageName}
                    mode={overlay.type === "restart" ? "restart" : "restartWithData"}
                    onSubmit={handleRestart}
                    onClose={() => setOverlay({ type: "none" })}
                  />
                </div>
              )}
            </div>
          ) : activeTab?.loading ? (
            <div className="flex-1 flex items-center justify-center" style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              Loading process details...
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              Select a process from the list to view its details
            </div>
          )}
        </div>
      </Panel>
    </Group>
  );
}

function findStageName(detail: ProcessDetail, stageIndex: number): string {
  for (const node of detail.Stages ?? []) {
    if (node.Data?.StageIndex === stageIndex) return node.Data.DisplayName || node.Data.Name;
    for (const child of node.Children ?? []) {
      if (child.Data?.StageIndex === stageIndex) return child.Data.DisplayName || child.Data.Name;
    }
  }
  return `Stage ${stageIndex}`;
}
