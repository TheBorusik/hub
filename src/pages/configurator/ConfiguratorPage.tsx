import { useState, useEffect, useCallback, useRef } from "react";
import { Group, Panel } from "react-resizable-panels";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { SidePanel } from "@/components/layout/SidePanel";
import { useContourApi } from "@/lib/ws-api";
import { useNavigation, type DirtyGuard } from "@/providers/NavigationProvider";
import type {
  ProcessModel, WebProcess, Catalog,
  CRUDModelInfo, AdapterCommandInfo, AdapterEventInfo, AdapterTreeNode,
} from "@/lib/ws-api-models";
import type { OpenTab } from "./types";
import { BranchSelector } from "./components/BranchSelector";
import { ProcessTree } from "./components/ProcessTree";
import { ProcessEditor } from "./components/ProcessEditor";
import { CommitDialog } from "./components/CommitDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { CreateProcessDialog } from "./components/CreateProcessDialog";
import { recomputeReturnStages } from "./utils/recomputeReturnStages";
import { stableJson } from "./utils/stableJson";
import { useToast } from "@/providers/ToastProvider";
import { X, ChevronRight, ChevronDown, GitBranch, GitCommitHorizontal } from "lucide-react";

export function ConfiguratorPage() {
  const api = useContourApi();
  const toast = useToast();
  const { registerDirtyGuard, consumeIntent, currentSection } = useNavigation();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [allModels, setAllModels] = useState<ProcessModel[]>([]);
  const [actionColors, setActionColors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showCommit, setShowCommit] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  /**
   * Имя процесса, который нужно открыть как только загрузится `allModels`
   * (пришло из навигации Viewer → Configurator). Если на момент запроса
   * `allModels` уже есть — открываем сразу и сюда не попадаем.
   */
  const [pendingOpenByName, setPendingOpenByName] = useState<string | null>(null);
  /**
   * Ref на актуальный список tabs — нужен для `DirtyGuard`, чтобы
   * не перерегистрировать гард на каждое изменение табов (иначе
   * `Shell → navigateTo` читал бы устаревший список).
   */
  const tabsRef = useRef<OpenTab[]>([]);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  /**
   * Имя процесса, для которого нужно показать диалог создания
   * (когда пользователь нажал «Edit Sub Process», а такого в `allModels` нет).
   */
  const [createProcessPrefill, setCreateProcessPrefill] = useState<string | null>(null);

  const [crudModels, setCrudModels] = useState<CRUDModelInfo[]>([]);
  const [commands, setCommands] = useState<AdapterCommandInfo[]>([]);
  const [events, setEvents] = useState<AdapterEventInfo[]>([]);

  const loadTree = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.getProcessTree();
      setCatalogs(res.Catalogs ?? []);
      setAllModels(res.ProcessModels ?? []);
      setActionColors(res.ActionColors ?? {});
    } catch (e) {
      console.warn("GetProcessTree not available, falling back to GetModels", e);
      try {
        const res2 = await api.getProcessModels();
        const models = res2.Models ?? [];
        setAllModels(models);
        setCatalogs(buildCatalogsFromModels(models));
        setActionColors(generateActionColors(models));
      } catch (e2) {
        console.error("Failed to load models", e2);
      }
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { loadTree(); }, [loadTree]);

  useEffect(() => {
    if (!api) return;
    api.getCrudModels().then((res) => {
      const models = (res.Models ?? []) as Array<{ Name: string; Handlers?: string[]; ServiceType?: string }>;
      const list: CRUDModelInfo[] = [];
      for (const m of models) {
        for (const action of m.Handlers ?? []) {
          list.push({ CommandName: `${m.ServiceType ?? m.Name}.${action}`, Model: m.Name, Action: action });
        }
      }
      list.sort((a, b) => a.CommandName.localeCompare(b.CommandName));
      setCrudModels(list);
    }).catch((e) => console.warn("Failed to load CRUD models for configurator", e));

    api.getAdaptersInfo().then((res) => {
      const cmds: AdapterCommandInfo[] = [];
      const evts: AdapterEventInfo[] = [];
      const seenCmd = new Set<string>();
      const seenEvt = new Set<string>();
      function walk(nodes: AdapterTreeNode[]) {
        for (const n of nodes) {
          if (n.type === "command" && n.data?.CommandName && !seenCmd.has(n.data.CommandName)) {
            seenCmd.add(n.data.CommandName);
            cmds.push({ Name: n.data.CommandName, Json: typeof n.json === "string" ? n.json : undefined });
          }
          if (n.type === "event" && n.label && !seenEvt.has(n.label)) {
            seenEvt.add(n.label);
            evts.push({ Name: n.label });
          }
          if (n.nodes) walk(n.nodes);
        }
      }
      walk(res.Adapters ?? []);
      setCommands(cmds);
      setEvents(evts);
    }).catch((e) => console.warn("Failed to load adapters info for configurator", e));
  }, [api]);

  const openProcess = useCallback(async (model: ProcessModel) => {
    if (!api) return;
    const typeName = model.TypeName;

    const existing = tabs.find((t) => t.typeName === typeName);
    if (existing) {
      setActiveTab(typeName);
      return;
    }

    const stub: OpenTab = { typeName, name: model.Name ?? typeName, process: null, originalJson: "", loading: true, dirty: false };
    setTabs((prev) => [...prev, stub]);
    setActiveTab(typeName);

    try {
      const res = await api.getProcessAssembly(typeName);
      const raw = res.Model ?? (res as unknown as WebProcess);
      const proc = recomputeReturnStages(raw);
      const snapshot = stableJson(proc);
      setTabs((prev) =>
        prev.map((t) => t.typeName === typeName ? { ...t, process: proc, originalJson: snapshot, name: proc.Name ?? typeName, loading: false } : t),
      );
    } catch (e) {
      console.error("Failed to get process", typeName, e);
      setTabs((prev) =>
        prev.map((t) => t.typeName === typeName ? { ...t, loading: false } : t),
      );
    }
  }, [api, tabs]);

  /**
   * Открыть процесс по его доменному имени (`Name`, с точками).
   * Пытается найти модель в `allModels`; если её ещё нет — откладывает
   * открытие до завершения загрузки дерева (не блокирует вызывающую
   * сторону). Используется навигацией из Viewer.
   */
  const openProcessByName = useCallback((processName: string) => {
    const trimmed = processName.trim();
    if (!trimmed) return;

    // 1) Уже открыто как таб — активируем.
    const openTab = tabsRef.current.find((t) => t.name === trimmed || t.process?.Name === trimmed);
    if (openTab) {
      setActiveTab(openTab.typeName);
      return;
    }
    // 2) Есть в каталоге — открываем сразу.
    const model = allModels.find((m) => m.Name === trimmed);
    if (model) {
      openProcess(model);
      return;
    }
    // 3) Каталог ещё грузится — поставим в очередь. Эффект ниже отработает.
    setPendingOpenByName(trimmed);
  }, [allModels, openProcess]);

  // Отложенное открытие по имени, когда `allModels` наконец загрузились.
  useEffect(() => {
    if (!pendingOpenByName) return;
    if (loading) return; // ждём первую загрузку
    const model = allModels.find((m) => m.Name === pendingOpenByName);
    if (model) {
      openProcess(model);
    } else {
      toast.push("error", `Process "${pendingOpenByName}" not found`, {
        detail: "It may be in another branch or not yet created.",
      });
    }
    setPendingOpenByName(null);
  }, [pendingOpenByName, allModels, loading, openProcess, toast]);

  // Подхватить pending-intent от NavigationProvider при каждой
  // активации секции (Shell держит страницу замаунченной, поэтому
  // эффект привязан к `currentSection`, а не только к маунту).
  useEffect(() => {
    if (currentSection !== "configurator") return;
    const intent = consumeIntent("configurator");
    if (!intent) return;
    if (intent.kind === "openProcessInConfigurator") {
      openProcessByName(intent.processName);
    }
  }, [currentSection, consumeIntent, openProcessByName]);

  // Регистрация DirtyGuard — через ref, чтобы не дёргать перерегистрации.
  useEffect(() => {
    const guard: DirtyGuard = {
      isDirty: () => tabsRef.current.some((t) => t.dirty),
      listDirty: () => tabsRef.current.filter((t) => t.dirty).map((t) => t.name || t.typeName),
      saveAll: async () => {
        const dirty = tabsRef.current.filter((t) => t.dirty && t.process);
        if (dirty.length === 0) return true;
        const results = await Promise.allSettled(dirty.map(async (t) => {
          const proc = t.process!;
          await api!.upsertProcessAssembly(proc.TypeName, "PROCESS", proc, false);
          if (proc.WebData) {
            await api!.upsertProcessAssembly(proc.TypeName + "WebData", "WEBDATA", proc.WebData, false);
          }
          return t.typeName;
        }));
        const savedTypeNames = new Set<string>();
        let allOk = true;
        for (const r of results) {
          if (r.status === "fulfilled") savedTypeNames.add(r.value);
          else allOk = false;
        }
        // Сброс dirty-флага — только для успешно сохранённых.
        if (savedTypeNames.size > 0) {
          setTabs((prev) =>
            prev.map((t) => savedTypeNames.has(t.typeName)
              ? { ...t, originalJson: stableJson(t.process), dirty: false }
              : t,
            ),
          );
        }
        return allOk;
      },
    };
    return registerDirtyGuard("configurator", guard);
  }, [api, registerDirtyGuard]);

  /**
   * Создать stub процесса локально (без запроса к серверу) и открыть в новой табе
   * как dirty — пользователь дописывает и сохраняет сам.
   *
   * Базовые стейджи — Start → Success / Failed — чтобы диаграмма была не пустая.
   */
  const createDraftProcessTab = useCallback((processName: string, typeName: string) => {
    if (tabs.some((t) => t.typeName === typeName)) {
      setActiveTab(typeName);
      return;
    }

    const stub: WebProcess = {
      Category: "PROCESS",
      TypeName: typeName,
      Name: processName,
      Namespace: "",
      Startup: "Start",
      ModifyTimeStamp: "",
      InitObject: { Name: `${typeName}InitObject`, Body: "" },
      Context: { Name: `${typeName}Context`, Body: "" },
      ProcessResult: { Name: `${typeName}ProcessResult`, Body: "" },
      Models: [],
      Stages: {
        Start: {
          Type: "Start", Name: "Start", DisplayName: "Старт",
          GetData: "", GetNextStage: "return Success;", GetErrorNextStage: "",
          ReturnStages: ["Success"], Properties: {},
        },
        Success: {
          Type: "EndDefinition", Name: "Success", DisplayName: "Успех",
          GetData: "", GetNextStage: "", GetErrorNextStage: "",
          ReturnStages: [], Properties: {},
        },
        Failed: {
          Type: "EndDefinition", Name: "Failed", DisplayName: "Ошибка",
          GetData: "", GetNextStage: "", GetErrorNextStage: "",
          ReturnStages: [], Properties: {},
        },
      },
      Usings: [],
      WebData: {
        Stages: {
          Start: { Position: { x: 100, y: 100 }, Color: "#5CADD5", Lines: { Success: { LineIn: "top", LineOut: "auto" } } },
          Success: { Position: { x: 420, y: 100 }, Color: "#F6511D", Lines: {} },
          Failed: { Position: { x: 420, y: 260 }, Color: "#F6511D", Lines: {} },
        },
      },
    };

    // originalJson оставляем пустым — любое изменение сразу помечает таб dirty,
    // чтобы пользователь видел, что процесс не сохранён.
    const newTab: OpenTab = {
      typeName,
      name: processName,
      process: stub,
      originalJson: "",
      loading: false,
      dirty: true,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(typeName);
    toast.push("info", `Draft process created: ${processName}`, {
      detail: "Save to persist.",
      duration: 3000,
    });
  }, [tabs, toast]);

  /**
   * Переход к подпроцессу по его `Name`. Если процесс есть в `allModels` —
   * открываем его; если нет — показываем диалог создания с префилом имени.
   */
  const openSubProcess = useCallback((processName: string) => {
    const trimmed = processName.trim();
    if (!trimmed) return;
    // В `allModels` уже лежат только процессы (GetModels/GetTree фильтруют на
    // сервере), поэтому дополнительная проверка Category не нужна.
    const existing = allModels.find((m) => m.Name === trimmed);
    if (existing) {
      openProcess(existing);
      return;
    }
    // Также проверим среди уже открытых табов (возможно это локальный draft,
    // которого ещё нет в `allModels`).
    const draftTab = tabs.find((t) => t.name === trimmed || t.process?.Name === trimmed);
    if (draftTab) {
      setActiveTab(draftTab.typeName);
      return;
    }
    setCreateProcessPrefill(trimmed);
  }, [allModels, openProcess, tabs]);

  const closeTab = useCallback((typeName: string) => {
    setTabs((prev) => prev.filter((t) => t.typeName !== typeName));
    setActiveTab((prev) => {
      if (prev !== typeName) return prev;
      const remaining = tabs.filter((t) => t.typeName !== typeName);
      return remaining.length > 0 ? remaining[remaining.length - 1].typeName : null;
    });
  }, [tabs]);

  const [removeDraftTarget, setRemoveDraftTarget] = useState<string | null>(null);

  const handleRemoveDraft = useCallback((typeName: string) => {
    setRemoveDraftTarget(typeName);
  }, []);

  const doRemoveDraft = useCallback(async () => {
    if (!api || !removeDraftTarget) return;
    try {
      await api.removeDraft(removeDraftTarget);
      loadTree();
    } catch (e) {
      console.error("Remove draft failed", e);
    }
    setRemoveDraftTarget(null);
  }, [api, removeDraftTarget, loadTree]);

  const updateProcess = useCallback((typeName: string, process: WebProcess) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.typeName !== typeName) return t;
        const dirty = stableJson(process) !== t.originalJson;
        return { ...t, process, dirty };
      }),
    );
  }, []);

  const markSaved = useCallback((typeName: string) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.typeName !== typeName) return t;
        return { ...t, originalJson: stableJson(t.process), dirty: false };
      }),
    );
  }, []);

  const activeTabData = tabs.find((t) => t.typeName === activeTab) ?? null;

  const renderTabBar = () => tabs.length > 0 ? (
    <div
      className="flex shrink-0 overflow-x-auto"
      style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-sidebar)", height: 35 }}
    >
      {tabs.map((tab) => (
        <div
          key={tab.typeName}
          className="flex items-center shrink-0 select-none"
          style={{
            padding: "0 4px 0 12px", height: "100%", fontSize: 12, cursor: "pointer",
            borderRight: "1px solid var(--color-border)",
            background: tab.typeName === activeTab ? "var(--color-editor)" : "transparent",
            color: tab.typeName === activeTab ? "var(--color-text-primary)" : "var(--color-text-muted)",
          }}
          onClick={() => setActiveTab(tab.typeName)}
        >
          <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tab.dirty ? "● " : ""}{tab.typeName.split(".").pop()}
          </span>
          <button
            className="toolbar-btn" style={{ marginLeft: 4 }}
            onClick={(e) => { e.stopPropagation(); closeTab(tab.typeName); }}
            title="Close tab"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  ) : null;

  const renderEditor = () => activeTabData ? (
    <ProcessEditor
      tab={activeTabData}
      api={api!}
      allModels={allModels}
      crudModels={crudModels}
      commands={commands}
      events={events}
      onProcessUpdate={(proc) => updateProcess(activeTabData.typeName, proc)}
      onSaved={() => markSaved(activeTabData.typeName)}
      onOpenSubProcess={openSubProcess}
    />
  ) : (
    <div className="flex items-center justify-center h-full" style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
      Select a process in the tree to open it
    </div>
  );

  if (!api) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
        Connecting...
      </div>
    );
  }

  return (
    <>
      <Group orientation="horizontal" id="configurator-main">
        {/* Left side panel: tree + branch (collapsible bottom) */}
        <Panel
          defaultSize="280px"
          minSize="180px"
          maxSize="50%"
          groupResizeBehavior="preserve-pixel-size"
        >
          <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--color-sidebar)" }}>
            {/* Заголовок */}
            <div
              className="flex items-center shrink-0 select-none uppercase tracking-wider"
              style={{ height: 35, padding: "0 20px", fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.04em" }}
            >
              CONFIGURATOR
            </div>
            {/* Дерево + Branch (toggle + resize) */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              {branchOpen ? (
                <Group orientation="vertical" autoSaveId="cfg-side-v4">
                  <Panel minSize="100px">
                    <div style={{ height: "100%", overflow: "auto" }}>
                      <ProcessTree
                        catalogs={catalogs}
                        actionColors={actionColors}
                        loading={loading}
                        selectedTypeName={activeTab}
                        onRefresh={loadTree}
                        onOpenProcess={openProcess}
                        onRemoveDraft={handleRemoveDraft}
                      />
                    </div>
                  </Panel>
                  <ResizeHandle direction="vertical" />
                  <Panel defaultSize={25} minSize="160px">
                    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                      <button
                        className="flex items-center shrink-0 select-none cursor-pointer"
                        onClick={() => setBranchOpen(false)}
                        style={{
                          height: 26, padding: "0 12px", gap: 4, fontSize: 11, fontWeight: 600,
                          color: "var(--color-text-muted)", background: "var(--color-sidebar)",
                          border: "none",
                          width: "100%", textAlign: "left",
                          textTransform: "uppercase", letterSpacing: "0.04em",
                        }}
                      >
                        <ChevronDown size={14} />
                        <GitBranch size={12} />
                        Branch
                      </button>
                      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                        <BranchSelector api={api} onBranchChange={loadTree} />
                        <div style={{ padding: "4px 8px" }}>
                          <button
                            className="toolbar-btn"
                            title="Commit"
                            onClick={() => setShowCommit(true)}
                            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--color-text-muted)", width: "100%" }}
                          >
                            <GitCommitHorizontal size={14} />
                            <span>Commit</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </Panel>
                </Group>
              ) : (
                <>
                  <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                    <ProcessTree
                      catalogs={catalogs}
                      actionColors={actionColors}
                      loading={loading}
                      selectedTypeName={activeTab}
                      onRefresh={loadTree}
                      onOpenProcess={openProcess}
                      onRemoveDraft={handleRemoveDraft}
                    />
                  </div>
                  <button
                    className="flex items-center shrink-0 select-none cursor-pointer"
                    onClick={() => setBranchOpen(true)}
                    style={{
                      height: 26, padding: "0 12px", gap: 4, fontSize: 11, fontWeight: 600,
                      color: "var(--color-text-muted)", background: "var(--color-sidebar)",
                      border: "none", borderTop: "1px solid var(--color-border)",
                      width: "100%", textAlign: "left",
                      textTransform: "uppercase", letterSpacing: "0.04em",
                    }}
                  >
                    <ChevronRight size={14} />
                    <GitBranch size={12} />
                    Branch
                  </button>
                </>
              )}
            </div>
          </div>
        </Panel>
        <ResizeHandle />

        {/* Right: editor area */}
        <Panel minSize="30%">
          <div className="flex flex-col h-full overflow-hidden">
            {renderTabBar()}
            <div className="flex-1 overflow-hidden">{renderEditor()}</div>
          </div>
        </Panel>
      </Group>

      {showCommit && (
        <CommitDialog
          api={api}
          onClose={() => setShowCommit(false)}
          onCommitted={() => { setShowCommit(false); loadTree(); }}
        />
      )}

      {removeDraftTarget && (
        <ConfirmDialog
          title="Remove Draft"
          message={`Remove draft for ${removeDraftTarget}?`}
          confirmLabel="Remove"
          danger
          onConfirm={doRemoveDraft}
          onCancel={() => setRemoveDraftTarget(null)}
        />
      )}

      {createProcessPrefill !== null && (
        <CreateProcessDialog
          initialName={createProcessPrefill}
          takenProcessNames={new Set(allModels.map((m) => m.Name).filter(Boolean))}
          takenTypeNames={new Set([
            ...allModels.map((m) => m.TypeName).filter(Boolean),
            ...tabs.map((t) => t.typeName),
          ])}
          onCancel={() => setCreateProcessPrefill(null)}
          onSubmit={({ name, typeName }) => {
            setCreateProcessPrefill(null);
            createDraftProcessTab(name, typeName);
          }}
        />
      )}
    </>
  );
}

/* ─── Fallback: build Catalogs from flat Models ─────── */

function buildCatalogsFromModels(models: ProcessModel[]): Catalog[] {
  const root: Catalog = { Name: "", Catalogs: [], Contents: [] };

  for (const m of models) {
    const name = m.Name || m.TypeName;
    const parts = name.split(".");
    const action = parts.length > 1 ? parts[parts.length - 1] : name;
    const folderParts = parts.length > 1 ? parts.slice(0, -1) : ["Others"];

    let current = root;
    for (const part of folderParts) {
      let child = current.Catalogs.find((c) => c.Name === part);
      if (!child) {
        child = { Name: part, Catalogs: [], Contents: [] };
        current.Catalogs.push(child);
      }
      current = child;
    }
    current.Contents.push({ ...m, Action: m.Action || action, Name: m.Name || name });
  }

  return root.Catalogs;
}

function generateActionColors(models: ProcessModel[]): Record<string, string> {
  const palette = [
    "#2196f3", "#4caf50", "#e91e63", "#ff9800", "#9c27b0",
    "#00bcd4", "#795548", "#607d8b", "#3f51b5", "#009688",
    "#ff5722", "#cddc39", "#673ab7", "#f44336", "#ffc107",
  ];
  const knownPrefixes: Record<string, string> = {
    Get: "#2196f3", GetAll: "#2196f3", GetFirst: "#2196f3",
    Add: "#4caf50", Register: "#4caf50",
    Update: "#ff9800", Upsert: "#ff9800",
    Delete: "#f44336", Remove: "#f44336",
    Execute: "#9c27b0",
    Send: "#00bcd4",
  };

  const colors: Record<string, string> = {};
  let idx = 0;

  for (const m of models) {
    const action = m.Action || (m.Name || m.TypeName).split(".").pop() || "";
    if (colors[action]) continue;
    const known = Object.entries(knownPrefixes).find(([pfx]) => action.startsWith(pfx));
    colors[action] = known ? known[1] : palette[idx++ % palette.length];
  }

  return colors;
}
