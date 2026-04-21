import { useState, useEffect, useCallback, useRef } from "react";
import { Group, Panel } from "react-resizable-panels";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { useAutoSaveLayout } from "@/hooks/useAutoSaveLayout";
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
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { CreateProcessDialog } from "./components/CreateProcessDialog";
import { EditApiDialog } from "./components/EditApiDialog";
import { recomputeReturnStages } from "./utils/recomputeReturnStages";
import { stableJson } from "./utils/stableJson";
import { useToast } from "@/providers/ToastProvider";
import { useProblems } from "@/providers/ProblemsProvider";
import { compileProblemSourceFor } from "./lib/publish-compile-problems";
import { Tabs } from "@/components/ui/Tabs";
import { t as tok } from "@/lib/design-tokens";
import { ChevronRight, ChevronDown, GitBranch, GitCommitHorizontal } from "lucide-react";

export function ConfiguratorPage() {
  const api = useContourApi();
  const toast = useToast();
  const { clearSource: clearProblems } = useProblems();
  const { registerDirtyGuard, consumeIntent, currentSection, intentVersion } = useNavigation();
  const confirm = useConfirm();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [allModels, setAllModels] = useState<ProcessModel[]>([]);
  const [actionColors, setActionColors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showCommit, setShowCommit] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  // rrp v4 убрали `autoSaveId` у Group — тянем layout через localStorage сами.
  const sideLayout = useAutoSaveLayout("cfg-side-v4");
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
  /**
   * Процесс, для которого открыт `EditApiDialog` (WFM API permission editor).
   * `null` — диалог закрыт.
   */
  const [apiDialogFor, setApiDialogFor] = useState<ProcessModel | null>(null);

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
  // `intentVersion` нужен, чтобы сработать, когда Ctrl+P вызвал
  // `navigateTo("configurator", …)` из уже активной секции Configurator
  // — там `currentSection` не меняется, но intent был добавлен.
  useEffect(() => {
    if (currentSection !== "configurator") return;
    const intent = consumeIntent("configurator");
    if (!intent) return;
    if (intent.kind === "openProcessInConfigurator") {
      openProcessByName(intent.processName);
    }
  }, [currentSection, intentVersion, consumeIntent, openProcessByName]);

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
   * Создать новый процесс на сервере — делаем ДВА Upsert'а, как при обычном
   * save (см. DirtyGuard.saveAll выше):
   *  1) Category "PROCESS", Name=<processName>, Model: {}, CreateNew: true —
   *     серверная часть процесса (C# skeleton).
   *  2) Category "WEBDATA", Name=<TypeName>+"WebData", Model: {},
   *     CreateNew: true — метаданные для диаграммы (раскладка стейджей).
   *
   * Оба вызова нужны — без WEBDATA процесс откроется без диаграммной
   * раскладки (это ровно то, что делал old-admin createProcess
   * createNewProcessAssembly('PROCESS') + createNewProcessAssembly('WEBDATA')).
   *
   * Затем подтягиваем полную модель через `loadProcessAssembly(TypeName)`
   * и открываем её в новой табе в чистом (non-dirty) состоянии.
   */
  const createDraftProcessTab = useCallback(async (processName: string, typeNameHint: string) => {
    if (!api) return;
    const trimmed = processName.trim();
    if (!trimmed) return;

    // Если такой TypeName уже открыт в табе — просто активируем.
    const existingTab = tabs.find((t) => t.typeName === typeNameHint);
    if (existingTab) {
      setActiveTab(typeNameHint);
      return;
    }

    // Показываем временный skeleton-таб со `loading: true`, чтобы UI
    // откликнулся сразу.
    const placeholder: OpenTab = {
      typeName: typeNameHint,
      name: trimmed,
      process: null,
      originalJson: "",
      loading: true,
      dirty: false,
    };
    setTabs((prev) => [...prev, placeholder]);
    setActiveTab(typeNameHint);

    try {
      // 1) PROCESS upsert — сервер создаст skeleton, вернёт финальный TypeName.
      const upsertRes = await api.upsertProcessAssembly(trimmed, "PROCESS", {}, true);
      const serverTypeName = upsertRes.TypeName || typeNameHint;

      // 2) WEBDATA upsert — раскладка диаграммы. Имя = TypeName + "WebData"
      //    (тот же паттерн, что и при save в DirtyGuard выше).
      await api.upsertProcessAssembly(`${serverTypeName}WebData`, "WEBDATA", {}, true);

      // 3) Подтянуть полную модель.
      const getRes = await api.loadProcessAssembly(serverTypeName);
      const rawModel = getRes.Model ?? (getRes as unknown as WebProcess);
      const proc = recomputeReturnStages(rawModel);
      const snapshot = stableJson(proc);

      setTabs((prev) =>
        prev.map((t) =>
          t.typeName === typeNameHint
            ? {
                ...t,
                typeName: serverTypeName,
                name: proc.Name ?? serverTypeName,
                process: proc,
                originalJson: snapshot,
                loading: false,
                dirty: false,
              }
            : t,
        ),
      );
      setActiveTab(serverTypeName);

      toast.push("success", `Process created: ${proc.Name ?? serverTypeName}`, {
        duration: 2500,
      });

      // Рефрешим дерево процессов, чтобы новый элемент появился в сайдбаре.
      loadTree();
    } catch (e) {
      console.error("Failed to create process", e);
      setTabs((prev) => prev.filter((t) => t.typeName !== typeNameHint));
      setActiveTab((cur) => (cur === typeNameHint ? null : cur));
      toast.push("error", "Failed to create process", {
        detail: e instanceof Error ? e.message : String(e),
        duration: 4000,
      });
    }
  }, [api, tabs, toast, loadTree]);

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
    // Закрыли вкладку — диагностика этого процесса больше не актуальна
    // для глобальной ProblemsPanel. История остаётся в NotificationsProvider.
    clearProblems(compileProblemSourceFor(typeName));
  }, [tabs, clearProblems]);

  const handleRemoveDraft = useCallback((typeName: string) => {
    void confirm({
      title: "Remove Draft",
      message: `Remove draft for ${typeName}?`,
      confirmLabel: "Remove",
      tone: "danger",
      async onConfirm() {
        if (!api) return;
        try {
          await api.removeDraft(typeName);
          loadTree();
        } catch (e) {
          console.error("Remove draft failed", e);
          throw e instanceof Error ? e : new Error(String(e));
        }
      },
    });
  }, [api, confirm, loadTree]);

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

  const renderTabBar = () => {
    if (tabs.length === 0) return null;
    const activeId = activeTab ?? tabs[0].typeName;
    return (
      <Tabs
        variant="chrome"
        aria-label="Open processes"
        items={tabs.map((tab) => ({
          id: tab.typeName,
          label: tab.typeName.split(".").pop() ?? tab.typeName,
          dirty: tab.dirty,
          closable: true,
          title: tab.dirty ? `${tab.typeName} — unsaved` : tab.typeName,
        }))}
        activeId={activeId}
        onChange={setActiveTab}
        onClose={closeTab}
        // В VS Code tab strip имеет цвет editor.background — активный
        // таб визуально сливается с editor-area, пустое пространство
        // справа от вкладок тоже тёмное (editor), а не высветляется
        // до sidebar.
        style={{ background: tok.color.bg.editor }}
      />
    );
  };

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
                <Group orientation="vertical" id="cfg-side-v4" {...sideLayout}>
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
                        onOpenApi={setApiDialogFor}
                        onCreateProcess={() => setCreateProcessPrefill("")}
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
                      onOpenApi={setApiDialogFor}
                      onCreateProcess={() => setCreateProcessPrefill("")}
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

      {apiDialogFor && api && (
        <EditApiDialog
          api={api}
          processName={apiDialogFor.Name ?? apiDialogFor.TypeName}
          processTypeName={apiDialogFor.TypeName}
          onClose={() => setApiDialogFor(null)}
          onSaved={() => loadTree()}
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
          onSubmit={({ name, typeName /*, description, type */ }) => {
            // description/type пока собираются в форме только для UX-паритета
            // со старой админкой; сервер Upsert их не принимает.
            // Создание идёт через WFM.ProcessAssembly.Upsert с Model:{} +
            // CreateNew:true — сервер сгенерирует skeleton и вернёт TypeName.
            setCreateProcessPrefill(null);
            void createDraftProcessTab(name, typeName);
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
