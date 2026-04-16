import { useState, useCallback } from "react";
import { Group, Panel } from "react-resizable-panels";
import {
  RefreshCw,
  Plus,
  Copy,
  Search,
  X,
} from "lucide-react";
import { ModelListPanel } from "./components/ModelListPanel";
import { DataTable } from "./components/DataTable";
import { RecordDialog } from "./components/RecordDialog";
import { JsonViewerDialog } from "./components/JsonViewerDialog";
import { ConfigPanel } from "./components/ConfigPanel";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { SidePanel } from "@/components/layout/SidePanel";
import { useContourApi } from "@/lib/ws-api";
import type { CrudModel, CrudRecord, ModelTab } from "./types";

type Overlay =
  | { type: "none" }
  | { type: "add"; model: CrudModel }
  | { type: "update"; model: CrudModel; record: CrudRecord }
  | { type: "delete"; model: CrudModel; record: CrudRecord }
  | { type: "json"; value: unknown; title: string };

export function CrudEditorPage() {
  const api = useContourApi();
  const [tabs, setTabs] = useState<ModelTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>({ type: "none" });

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  const updateTab = useCallback(
    (tabId: string, patch: Partial<ModelTab>) => {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, ...patch } : t)));
    },
    [],
  );

  const loadModelData = useCallback(
    async (tab: ModelTab) => {
      if (!api) return;
      updateTab(tab.id, { loading: true });
      try {
        const res = await api.getModelData(tab.model.Name, tab.model.ServiceType);
        updateTab(tab.id, { records: (res.Models ?? []) as CrudRecord[], loading: false });
      } catch (err) {
        console.error("Failed to load model data:", err);
        updateTab(tab.id, { loading: false });
      }
    },
    [api, updateTab],
  );

  const handleSelectModel = useCallback(
    async (model: CrudModel) => {
      const existing = tabs.find((t) => t.id === model.Name);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }
      const newTab: ModelTab = {
        id: model.Name,
        model,
        records: [],
        loading: false,
        search: "",
        page: 0,
        pageSize: 25,
        sortCol: null,
        sortDir: "asc",
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(model.Name);
      if (api) {
        updateTab(model.Name, { loading: true });
        setTimeout(async () => {
          try {
            const res = await api.getModelData(model.Name, model.ServiceType);
            setTabs((prev) =>
              prev.map((t) =>
                t.id === model.Name ? { ...t, records: (res.Models ?? []) as CrudRecord[], loading: false } : t,
              ),
            );
          } catch {
            setTabs((prev) =>
              prev.map((t) => (t.id === model.Name ? { ...t, loading: false } : t)),
            );
          }
        }, 0);
      }
    },
    [tabs, api, updateTab],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== tabId);
        if (activeTabId === tabId) {
          const idx = prev.findIndex((t) => t.id === tabId);
          setActiveTabId(next[Math.min(idx, next.length - 1)]?.id ?? null);
        }
        return next;
      });
    },
    [activeTabId],
  );

  const handleSort = (col: string) => {
    if (!activeTab) return;
    if (activeTab.sortCol === col) {
      updateTab(activeTab.id, { sortDir: activeTab.sortDir === "asc" ? "desc" : "asc" });
    } else {
      updateTab(activeTab.id, { sortCol: col, sortDir: "asc" });
    }
  };

  const handleCopy = () => {
    if (!activeTab) return;
    navigator.clipboard.writeText(JSON.stringify(activeTab.records, null, 2));
  };

  const handleSubmitRecord = useCallback(
    async (data: Record<string, unknown>) => {
      if (!api || !activeTab) return;
      const { model } = activeTab;
      try {
        if (overlay.type === "add") {
          await api.addRecord(model.Name, model.ServiceType, data);
        } else if (overlay.type === "update") {
          await api.updateRecord(model.Name, model.ServiceType, data);
        } else if (overlay.type === "delete") {
          await api.deleteRecord(model.Name, model.ServiceType, model.KeyName, data[model.KeyName]);
        }
        setOverlay({ type: "none" });
        loadModelData(activeTab);
      } catch (err) {
        console.error("CRUD operation failed:", err);
      }
    },
    [api, activeTab, overlay, loadModelData],
  );

  const hasHandler = (handler: string) =>
    activeTab?.model.Handlers?.includes(handler) ?? false;

  return (
    <Group orientation="horizontal" id="crud-editor-main">
      {/* Side Panel: Model List */}
      <Panel id="crud-side" defaultSize="280px" minSize="170px" maxSize="50%" groupResizeBehavior="preserve-pixel-size">
        <SidePanel title="CRUD MODELS">
          <ModelListPanel
            onSelectModel={handleSelectModel}
            selectedModelName={activeTabId}
          />
        </SidePanel>
      </Panel>

      <ResizeHandle />

      {/* Editor Area */}
      <Panel id="crud-editor" minSize="30%">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Model Tabs */}
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
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-warning)" }} className="animate-pulse shrink-0" />
                  )}
                  <span className="truncate" style={{ maxWidth: 180 }}>{tab.model.Name}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                    className="flex items-center justify-center shrink-0 toolbar-btn"
                    style={{ width: 20, height: 20 }}
                  >
                    <X size={16} />
                  </span>
                </button>
              );
            })}
            {tabs.length === 0 && (
              <span style={{ padding: "0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
                Select a model from the list
              </span>
            )}
          </div>

          {/* Content */}
          {activeTab ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Toolbar */}
              <div
                className="flex items-center shrink-0 border-b border-border"
                style={{ height: 32, padding: "0 8px", gap: 4 }}
              >
                <button
                  onClick={() => loadModelData(activeTab)}
                  disabled={activeTab.loading}
                  className="toolbar-btn"
                  title="Refresh data"
                >
                  <RefreshCw size={14} className={activeTab.loading ? "animate-spin" : ""} />
                </button>
                {hasHandler("Add") && (
                  <button
                    onClick={() => setOverlay({ type: "add", model: activeTab.model })}
                    className="toolbar-btn"
                    title="Add record"
                    style={{ color: "var(--color-success)" }}
                  >
                    <Plus size={14} />
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="toolbar-btn"
                  title="Copy all as JSON"
                >
                  <Copy size={14} />
                </button>
                {activeTab.model.ConfigTable && (
                  <ConfigPanel model={activeTab.model} records={activeTab.records} />
                )}

                <div style={{ flex: 1 }} />

                <div className="flex items-center" style={{ gap: 4 }}>
                  <Search size={14} style={{ color: "var(--color-text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={activeTab.search}
                    onChange={(e) => updateTab(activeTab.id, { search: e.target.value, page: 0 })}
                    style={{ width: 160, fontSize: 12 }}
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-hidden relative">
                <DataTable
                  model={activeTab.model}
                  records={activeTab.records}
                  search={activeTab.search}
                  page={activeTab.page}
                  pageSize={activeTab.pageSize}
                  sortCol={activeTab.sortCol}
                  sortDir={activeTab.sortDir}
                  hasDelete={hasHandler("Delete")}
                  onSort={handleSort}
                  onPageChange={(p) => updateTab(activeTab.id, { page: p })}
                  onPageSizeChange={(s) => updateTab(activeTab.id, { pageSize: s })}
                  onClickRow={(record) =>
                    setOverlay({ type: "update", model: activeTab.model, record })
                  }
                  onDeleteRow={(record) =>
                    setOverlay({ type: "delete", model: activeTab.model, record })
                  }
                  onViewJson={(value, title) =>
                    setOverlay({ type: "json", value, title })
                  }
                />

                {/* Overlays */}
                {overlay.type === "add" && (
                  <div className="absolute inset-0 flex items-start justify-center z-20 overflow-auto" style={{ paddingTop: 40, background: "rgba(0,0,0,0.3)" }}>
                    <RecordDialog
                      model={overlay.model}
                      mode="add"
                      onSubmit={handleSubmitRecord}
                      onClose={() => setOverlay({ type: "none" })}
                    />
                  </div>
                )}
                {overlay.type === "update" && (
                  <div className="absolute inset-0 flex items-start justify-center z-20 overflow-auto" style={{ paddingTop: 40, background: "rgba(0,0,0,0.3)" }}>
                    <RecordDialog
                      model={overlay.model}
                      mode="update"
                      record={overlay.record}
                      onSubmit={handleSubmitRecord}
                      onClose={() => setOverlay({ type: "none" })}
                    />
                  </div>
                )}
                {overlay.type === "delete" && (
                  <div className="absolute inset-0 flex items-start justify-center z-20 overflow-auto" style={{ paddingTop: 40, background: "rgba(0,0,0,0.3)" }}>
                    <RecordDialog
                      model={overlay.model}
                      mode="delete"
                      record={overlay.record}
                      onSubmit={() =>
                        handleSubmitRecord({ [overlay.model.KeyName]: overlay.record[overlay.model.KeyName] })
                      }
                      onClose={() => setOverlay({ type: "none" })}
                    />
                  </div>
                )}
                {overlay.type === "json" && (
                  <div className="absolute inset-0 flex items-start justify-center z-20 overflow-auto" style={{ paddingTop: 40, background: "rgba(0,0,0,0.3)" }}>
                    <JsonViewerDialog
                      title={overlay.title}
                      value={overlay.value}
                      onClose={() => setOverlay({ type: "none" })}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              Select a model from the list to view its data
            </div>
          )}
        </div>
      </Panel>
    </Group>
  );
}
