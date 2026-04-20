import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { LayoutGrid } from "lucide-react";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import type { HubWsApi } from "@/lib/ws-api";
import type {
  ProcessModel, WebProcess, ProcessStage,
  CRUDModelInfo, AdapterCommandInfo, AdapterEventInfo,
  DiagnosticModel, UpsertProcessAssemblyResponse,
} from "@/lib/ws-api-models";
import type { OpenTab } from "../types";
import { StageEditor } from "./StageEditor";
import { StagesOutline } from "./StagesOutline";
import { ProcessDiagram } from "./ProcessDiagram";
import { CodePreview } from "./CodePreview";
import { DiffView } from "./DiffView";
import { RunProcessPanel } from "./RunProcessPanel";
import { ModelClassDialog } from "./ModelClassDialog";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { AddStageDialog } from "./AddStageDialog";
import { QuickPickDialog, type QuickPickItem } from "./QuickPickDialog";
import { UsingsDialog } from "./UsingsDialog";
import { GlobalModelsPanel } from "./GlobalModelsPanel";
import { recomputeReturnStages } from "../utils/recomputeReturnStages";
import { stableJson } from "../utils/stableJson";
import { useToast } from "@/providers/ToastProvider";
import { useNotifications } from "@/providers/NotificationsProvider";
import { useProblems } from "@/providers/ProblemsProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import {
  publishCompileProblems,
  compileProblemSourceFor,
} from "../lib/publish-compile-problems";
import { STAGE_TYPE_COLORS } from "../lib/stage-colors";
import { renameStageInProcess } from "../lib/stage-rename";
import { ProcessEditorActionRail } from "./ProcessEditorActionRail";

interface ProcessEditorProps {
  tab: OpenTab;
  api: HubWsApi;
  allModels: ProcessModel[];
  crudModels: CRUDModelInfo[];
  commands: AdapterCommandInfo[];
  events: AdapterEventInfo[];
  onProcessUpdate: (process: WebProcess) => void;
  onSaved?: () => void;
  /**
   * Открыть подпроцесс по его `Name` (то, что указано в `[Process("...")]`).
   * Если процесса нет — вызывающая сторона покажет диалог создания.
   */
  onOpenSubProcess?: (processName: string) => void;
}

type SpecialView = "code" | "diff" | "run" | "global-models";

export function ProcessEditor({ tab, api, allModels, crudModels, commands, events, onProcessUpdate, onSaved, onOpenSubProcess }: ProcessEditorProps) {
  const confirm = useConfirm();
  const [openStageTabs, setOpenStageTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("__diagram__");
  const [specialView, setSpecialView] = useState<SpecialView | null>(null);
  const [modelDialog, setModelDialog] = useState<"InitObject" | "Context" | "ProcessResult" | null>(null);
  const [saving, setSaving] = useState(false);
  const [createStagePrefill, setCreateStagePrefill] = useState<string | null>(null);
  const [quickPick, setQuickPick] = useState<"stages" | "palette" | null>(null);
  const [usingsDialogOpen, setUsingsDialogOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  /**
   * Актуальные компиляционные диагностики текущего процесса.
   * Обновляются после каждого Save / Validate (в отличие от истории в notifications).
   * Используются для индикатора ошибок `!` в правой панели.
   */
  const [compileDiagnostics, setCompileDiagnostics] = useState<DiagnosticModel[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem("wfm_autosave") === "1"; } catch { return false; }
  });
  /**
   * Outline — правая collapsible панель со списком стейджей текущего
   * процесса. Состояние запоминается в localStorage, чтобы не сбрасывалось
   * между сессиями. По умолчанию выключена, чтобы не «раздувать» UI для
   * пользователей, которые об этой фиче не знают.
   */
  const [outlineOpen, setOutlineOpen] = useState<boolean>(() => {
    try { return localStorage.getItem("wfm_outline") === "1"; } catch { return false; }
  });
  const toggleOutline = useCallback(() => {
    setOutlineOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem("wfm_outline", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  const notifications = useNotifications();
  const problems = useProblems();
  const { navigateTo } = useNavigation();

  const process = tab.process;

  const stageFingerprint = (s: ProcessStage) =>
    [
      s.DisplayName ?? "",
      s.Name ?? "",
      s.GetData ?? "",
      s.GetNextStage ?? "",
      s.GetErrorNextStage ?? "",
      stableJson(s.Properties ?? {}),
    ].join("\0");

  const stageSnapshots = useRef<Record<string, string>>({});
  const snapshotTaken = useRef(false);
  const [saveGeneration, setSaveGeneration] = useState(0);

  // При смене процесса (новая вкладка) сбрасываем внутренний UI-стейт редактора:
  // — `activeTab` / `openStageTabs`: иначе отрендерится `StageEditor` для имени
  //   стейджа, которого в новом процессе нет (пустая форма), пока пользователь
  //   не переключится на диаграмму вручную.
  // — `specialView`: Code/Diff/Run/GlobalModels относятся к конкретному процессу.
  // — снимки стейджей и индикатор компиляции: принадлежат предыдущему процессу.
  const currentTypeNameRef = useRef<string | null>(null);
  useEffect(() => {
    const name = process?.TypeName ?? null;
    if (currentTypeNameRef.current !== name) {
      currentTypeNameRef.current = name;
      setActiveTab("__diagram__");
      setOpenStageTabs([]);
      setSpecialView(null);
      setCompileDiagnostics([]);
      stageSnapshots.current = {};
      snapshotTaken.current = false;
    }
  }, [process?.TypeName]);

  if (process?.Stages && !snapshotTaken.current) {
    const snap: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.Stages)) {
      snap[k] = stageFingerprint(v);
    }
    stageSnapshots.current = snap;
    snapshotTaken.current = true;
  }

  const dirtyStages = useMemo(() => {
    void saveGeneration;
    const set = new Set<string>();
    if (!process?.Stages) return set;
    for (const [k, v] of Object.entries(process.Stages)) {
      if (stageFingerprint(v) !== stageSnapshots.current[k]) {
        set.add(k);
      }
    }
    return set;
  }, [process?.Stages, saveGeneration]);

  const handleSave = useCallback(async () => {
    if (!process) return;
    setSaving(true);

    const hasWebData = !!process.WebData;
    const tasks: Array<Promise<unknown>> = [
      api.upsertProcessAssembly(process.TypeName, "PROCESS", process, false),
    ];
    if (hasWebData) {
      tasks.push(
        api.upsertProcessAssembly(process.TypeName + "WebData", "WEBDATA", process.WebData, false),
      );
    }

    const results = await Promise.allSettled(tasks);
    const processRes = results[0];
    const webDataRes = hasWebData ? results[1] : undefined;

    const errDetail = (r: PromiseRejectedResult) => {
      const e = r.reason;
      if (e instanceof Error) return e.message;
      if (typeof e === "string") return e;
      // SAL server отправляет ошибку как объект Payload'а — вытягиваем
      // наиболее типичные поля.
      if (e && typeof e === "object") {
        const anyE = e as Record<string, unknown>;
        if (typeof anyE.Error === "string") return anyE.Error;
        if (typeof anyE.Message === "string") return anyE.Message;
      }
      try { return JSON.stringify(e); } catch { return String(e); }
    };

    const processOk = processRes.status === "fulfilled";
    const webDataOk = !webDataRes || webDataRes.status === "fulfilled";

    if (processOk) {
      // Сбрасываем dirty только для сохранённой PROCESS-части.
      if (process.Stages) {
        const snap: Record<string, string> = {};
        for (const [k, v] of Object.entries(process.Stages)) {
          snap[k] = stageFingerprint(v);
        }
        stageSnapshots.current = snap;
      }
      setSaveGeneration((g) => g + 1);
      onSaved?.();
    }

    // Парсим `Errors` из payload ответа PROCESS-запроса (компиляция и т.п.).
    // Запрос при этом сам по себе успешный — это отдельная доменная логика.
    const respDiagnostics: DiagnosticModel[] = [];
    const respStringErrors: string[] = [];
    if (processOk) {
      const payload = (processRes as PromiseFulfilledResult<UpsertProcessAssemblyResponse>).value;
      const rawErrors = payload?.Errors ?? [];
      for (const e of rawErrors) {
        if (typeof e === "string") respStringErrors.push(e);
        else if (e && typeof e === "object" && "Message" in e) respDiagnostics.push(e as DiagnosticModel);
      }
    }
    const hasCompileIssues = respDiagnostics.length > 0 || respStringErrors.length > 0;

    // Обновляем индикатор «текущие компиляционные ошибки» только после
    // успешного запроса PROCESS — иначе оставляем предыдущее значение.
    if (processOk) {
      setCompileDiagnostics(respDiagnostics);
      publishCompileProblems(
        process.TypeName, process.Name, respDiagnostics, respStringErrors, problems, navigateTo,
      );
    }

    // Сначала — инфраструктурный исход (упало ли сохранение PROCESS/WEBDATA).
    if (!processOk && !webDataOk) {
      const detail =
        `PROCESS: ${errDetail(processRes as PromiseRejectedResult)}\n` +
        `WEBDATA: ${errDetail(webDataRes as PromiseRejectedResult)}`;
      notifications.push("error", "Failed to save both PROCESS and WEBDATA", {
        source: process.TypeName,
        body: detail,
      });
      console.error("Save failed (PROCESS)", (processRes as PromiseRejectedResult).reason);
      console.error("Save failed (WEBDATA)", (webDataRes as PromiseRejectedResult).reason);
    } else if (!processOk) {
      notifications.push("error", "Failed to save PROCESS", {
        source: process.TypeName,
        body: errDetail(processRes as PromiseRejectedResult),
      });
      console.error("Save failed (PROCESS)", (processRes as PromiseRejectedResult).reason);
    } else if (!webDataOk) {
      notifications.push("warning", "PROCESS saved, but WEBDATA failed", {
        source: process.TypeName,
        body: errDetail(webDataRes as PromiseRejectedResult),
      });
      console.error("Save failed (WEBDATA)", (webDataRes as PromiseRejectedResult).reason);
    }

    // Если запросы ушли успешно, но в ответе есть компиляционные ошибки — отдельное уведомление.
    if (processOk && hasCompileIssues) {
      const n = respDiagnostics.length + respStringErrors.length;
      const bodyLines: string[] = [];
      if (respStringErrors.length > 0) bodyLines.push(...respStringErrors);
      notifications.push("warning", `Saved with ${n} compile error${n === 1 ? "" : "s"}: ${process.TypeName}`, {
        source: process.TypeName,
        body: bodyLines.length > 0 ? bodyLines.join("\n") : undefined,
        diagnostics: respDiagnostics.length > 0 ? respDiagnostics : undefined,
      });
    } else if (processOk && webDataOk) {
      // Полный успех без ошибок — только toast, в историю не пушим (чтобы не замусоривать).
      toast.push("success", `Saved: ${process.TypeName}`);
    }

    setSaving(false);
  }, [api, process, toast, notifications, problems, navigateTo]);

  // ---------- Auto Save ----------
  const toggleAutoSave = useCallback(() => {
    setAutoSaveEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem("wfm_autosave", next ? "1" : "0"); } catch { /* ignore */ }
      toast.push("info", next ? "Auto Save: ON" : "Auto Save: OFF", { duration: 1500 });
      return next;
    });
  }, [toast]);

  // debounce: после любого изменения процесса, если автосейв включён и есть
  // грязные стейджи — через 5 секунд покоя сохраняем.
  const autoSaveTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!autoSaveEnabled || !process) return;
    if (saving) return;
    if (dirtyStages.size === 0) return;
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      handleSave();
    }, 5000);
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [autoSaveEnabled, process, dirtyStages, saving, handleSave]);

  // ---------- Pack / Unpack ----------
  /** Скачать текущий WebProcess как JSON-дамп. */
  const handlePack = useCallback(() => {
    if (!process) return;
    try {
      const json = JSON.stringify(process, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${process.TypeName || "process"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Освобождаем URL чуть позже, после того как браузер инициировал скачивание.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.push("success", `Packed ${process.TypeName}.json`, { duration: 2000 });
    } catch (e) {
      notifications.push("error", "Failed to pack process", {
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }, [process, toast, notifications]);

  /** Диалог выбора файла для Unpack. */
  const handleUnpackClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUnpackFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // чтобы тот же файл можно было выбрать повторно
    if (!file || !process) return;
    const reader = new FileReader();
    reader.onerror = () => {
      notifications.push("error", "Failed to read file", { body: String(reader.error) });
    };
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const parsed = JSON.parse(text) as WebProcess;
        if (!parsed || typeof parsed !== "object" || !("TypeName" in parsed)) {
          throw new Error("Invalid WebProcess dump: missing TypeName");
        }
        onProcessUpdate(parsed);
        toast.push("success", `Unpacked: ${parsed.TypeName}`);
      } catch (err) {
        notifications.push("error", "Failed to unpack file", {
          body: err instanceof Error ? err.message : String(err),
        });
      }
    };
    reader.readAsText(file);
  }, [process, onProcessUpdate, toast, notifications]);

  // ---------- Validate Process (server-side, структурная валидация) ----------
  const handleValidateProcess = useCallback(async () => {
    if (!process) return;
    setValidating(true);
    try {
      const res = await api.validateProcess(process);
      const raw = res?.Errors ?? [];
      const diagnostics: DiagnosticModel[] = [];
      const stringErrors: string[] = [];
      for (const e of raw) {
        if (typeof e === "string") stringErrors.push(e);
        else if (e && typeof e === "object" && "Message" in e) diagnostics.push(e as DiagnosticModel);
      }
      const total = diagnostics.length + stringErrors.length;
      // Пушим в Problems (перезаписывает прошлые диагностики того же процесса).
      publishCompileProblems(
        process.TypeName, process.Name, diagnostics, stringErrors, problems, navigateTo,
      );
      if (total === 0) {
        toast.push("success", `Validation passed: ${process.TypeName}`);
      } else {
        notifications.push(
          "warning",
          `Validation: ${total} issue${total === 1 ? "" : "s"} in ${process.TypeName}`,
          {
            source: process.TypeName,
            body: stringErrors.length > 0 ? stringErrors.join("\n") : undefined,
            diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
          },
        );
      }
    } catch (e) {
      notifications.push("error", "Validate Process failed", {
        source: process.TypeName,
        body: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setValidating(false);
    }
  }, [api, process, toast, notifications, problems, navigateTo]);

  const handleStageUpdate = useCallback((stageName: string, stage: ProcessStage) => {
    if (!process) return;
    const updatedProcess = {
      ...process,
      Stages: { ...process.Stages, [stageName]: stage },
    };
    onProcessUpdate(recomputeReturnStages(updatedProcess));
  }, [process, onProcessUpdate]);

  const handleStageRename = useCallback((oldName: string, newName: string) => {
    if (!process) return;
    const updated = renameStageInProcess(process, oldName, newName);
    if (!updated) return;

    setOpenStageTabs((prev) => prev.map((t) => t === oldName ? newName : t));
    setActiveTab((prev) => prev === oldName ? newName : prev);
    onProcessUpdate(recomputeReturnStages(updated));
  }, [process, onProcessUpdate]);

  const handleModelUpdate = useCallback((field: "InitObject" | "Context" | "ProcessResult", body: string) => {
    if (!process) return;
    const model = process[field];
    onProcessUpdate({
      ...process,
      [field]: { ...model, Body: body },
    });
  }, [process, onProcessUpdate]);

  const handleWebDataUpdate = useCallback((updatedProcess: WebProcess) => {
    onProcessUpdate(updatedProcess);
  }, [onProcessUpdate]);

  const openStageEditor = useCallback((stageName: string) => {
    setOpenStageTabs((prev) => prev.includes(stageName) ? prev : [...prev, stageName]);
    setActiveTab(stageName);
    setSpecialView(null);
  }, []);

  /** Alt+Enter callback: если стейдж есть — открыть; нет — диалог создания с предзаполненным именем. */
  const handleOpenOrCreateStage = useCallback((name: string) => {
    if (!process) return;
    if (process.Stages?.[name]) {
      openStageEditor(name);
    } else {
      setCreateStagePrefill(name);
    }
  }, [process, openStageEditor]);

  /** Создание стейджа по имени и типу (из Alt+Enter диалога). */
  const handleCreateStageFromDialog = useCallback((type: string, name: string) => {
    if (!process) return;
    const trimmed = name.trim();
    if (!trimmed || process.Stages?.[trimmed]) {
      setCreateStagePrefill(null);
      return;
    }
    const newStage: ProcessStage = {
      Type: type === "Final" ? "EndDefinition" : type === "SubStart" ? "SubDefinition" : `${type}Definition`,
      DisplayName: trimmed, Name: trimmed,
      GetData: "", GetNextStage: "", GetErrorNextStage: "",
      ReturnStages: [], Properties: {},
    };
    const ct = Object.keys(process.Stages ?? {}).length;
    const newWebStage = {
      Position: { x: (ct % 5) * 200 + 50, y: Math.floor(ct / 5) * 150 + 50 },
      Color: STAGE_TYPE_COLORS[newStage.Type] ?? "#888",
      Lines: {},
    };
    onProcessUpdate(recomputeReturnStages({
      ...process,
      Stages: { ...(process.Stages ?? {}), [trimmed]: newStage },
      WebData: process.WebData
        ? { ...process.WebData, Stages: { ...(process.WebData.Stages ?? {}), [trimmed]: newWebStage } }
        : { Stages: { [trimmed]: newWebStage } },
    }));
    setCreateStagePrefill(null);
    openStageEditor(trimmed);
  }, [process, onProcessUpdate, openStageEditor]);

  /**
   * Ctrl+Alt+Enter: Create Property — добавляет в Body модели
   * строку `public object <PropName> { get; set; }` (если свойство ещё не объявлено),
   * после чего открывает ModelClassDialog, где можно уточнить тип.
   */
  const handleCreateProperty = useCallback(
    (kind: "Context" | "InitObject" | "ProcessResult", propName: string) => {
      if (!process) return;
      const existing = process[kind];
      const currentBody = existing?.Body ?? "";
      // Простая эвристика: если свойство с таким именем уже объявлено (включая `public X Name {`)
      // или уже есть как public-property в любом месте body — не добавляем повторно.
      const propRe = new RegExp(`\\bpublic\\s+[\\w<>,\\s\\[\\]\\.]+\\s+${propName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`);
      const needle = `public object ${propName} { get; set; }`;
      let newBody = currentBody;
      if (!propRe.test(currentBody)) {
        const suffix = currentBody.length === 0 || currentBody.endsWith("\n") ? "" : "\n";
        newBody = `${currentBody}${suffix}${needle}\n`;
      }
      if (newBody !== currentBody) {
        const base = existing ?? { Name: `${process.TypeName}${kind}`, Body: "" };
        onProcessUpdate({
          ...process,
          [kind]: { ...base, Body: newBody },
        });
      }
      setModelDialog(kind);
    },
    [process, onProcessUpdate],
  );

  // Local hotkeys:
  //   Ctrl+S            — save current process
  //   Ctrl+Shift+O      — quick open a stage in the current process
  //                       (VS Code "Go to Symbol"-style)
  //
  // Глобальные Ctrl+P (Quick Open process) и Ctrl+Shift+P (Command Palette)
  // слушаются на уровне Shell — локально их дублировать нельзя, иначе
  // открывается сразу две панели (локальная + глобальная).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      if (!e.shiftKey && !e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSave();
        return;
      }
      if (e.shiftKey && !e.altKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        setQuickPick("stages");
        return;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  const closeStageTab = useCallback((stageName: string) => {
    setOpenStageTabs((prev) => {
      const next = prev.filter((t) => t !== stageName);
      setActiveTab((cur) => {
        if (cur !== stageName) return cur;
        return next.length > 0 ? next[next.length - 1] : "__diagram__";
      });
      return next;
    });
  }, []);

  const handleAskDeleteStage = useCallback((name: string) => {
    void confirm({
      title: "Delete Stage",
      message: `Are you sure you want to delete "${name}"?`,
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: () => {
        if (!process) return;
        const newStages = { ...(process.Stages ?? {}) };
        delete newStages[name];
        const newWebStages = { ...(process.WebData?.Stages ?? {}) };
        delete newWebStages[name];
        onProcessUpdate(recomputeReturnStages({
          ...process,
          Stages: newStages,
          WebData: process.WebData ? { ...process.WebData, Stages: newWebStages } : process.WebData,
        }));
        closeStageTab(name);
      },
    });
  }, [confirm, process, onProcessUpdate, closeStageTab]);

  if (tab.loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
        Loading {tab.typeName}...
      </div>
    );
  }

  if (!process) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
        Failed to load process
      </div>
    );
  }

  const stages = process.Stages ?? {};
  const stageNames = Object.keys(stages);
  const isDiagram = activeTab === "__diagram__" && !specialView;
  const isStageOpen = activeTab !== "__diagram__" && !specialView && stages[activeTab];

  // Breadcrumbs: Catalog > SubCatalog > ... > ProcessName [> StageName / > Code / > Diff / ...]
  // Строится из Name процесса (разделитель — точка). Пока клики по
  // каталог-сегментам не навигируют — этим займётся D.3 (Outline) или
  // отдельный вопрос «как показать в ProcessTree этот путь».
  const nameParts = (process.Name ?? process.TypeName).split(".").filter(Boolean);
  const processLeafName = nameParts[nameParts.length - 1] ?? process.TypeName;
  const parentSegments = nameParts.slice(0, -1);
  const crumbs: BreadcrumbItem[] = parentSegments.map((p, i) => ({
    id: `cat-${i}-${p}`,
    label: p,
    muted: true,
  }));
  crumbs.push({
    id: "process",
    label: processLeafName,
    title: process.TypeName,
    onClick: specialView || !isDiagram
      ? () => { setActiveTab("__diagram__"); setSpecialView(null); }
      : undefined,
    active: isDiagram,
  });
  if (specialView === "code") {
    crumbs.push({ id: "view", label: "Code", active: true });
  } else if (specialView === "diff") {
    crumbs.push({ id: "view", label: "Diff", active: true });
  } else if (specialView === "run") {
    crumbs.push({ id: "view", label: "Run", active: true });
  } else if (specialView === "global-models") {
    crumbs.push({ id: "view", label: "Global Models", active: true });
  } else if (isStageOpen) {
    const st = stages[activeTab];
    crumbs.push({
      id: `stage-${activeTab}`,
      label: st.DisplayName || activeTab,
      title: activeTab,
      active: true,
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Breadcrumbs items={crumbs} aria-label="Process path" />
      {/* Tab bar: Diagram + open stage tabs */}
      <Tabs
        variant="chrome"
        aria-label="Process editor tabs"
        activeId={specialView ? "__none__" : activeTab}
        onChange={(id) => { setActiveTab(id); setSpecialView(null); }}
        onClose={(id) => { if (id !== "__diagram__") closeStageTab(id); }}
        items={[
          {
            id: "__diagram__",
            label: "Diagram",
            icon: <LayoutGrid size={12} />,
          } satisfies TabItem,
          ...openStageTabs
            .map<TabItem | null>((sn) => {
              const st = stages[sn];
              if (!st) return null;
              return {
                id: sn,
                label: (
                  <span
                    style={{
                      maxWidth: 140,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "inline-block",
                    }}
                  >
                    {st.DisplayName || sn}
                  </span>
                ),
                title: st.DisplayName || sn,
                dirty: dirtyStages.has(sn),
                closable: true,
              } satisfies TabItem;
            })
            .filter((x): x is TabItem => x !== null),
        ]}
      />

      {/* Main content area */}
      <div className="flex-1 overflow-hidden" style={{ display: "flex" }}>
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {specialView === "code" ? (
            <CodePreview
              api={api}
              process={process}
              onApplyToProcess={(next) => {
                // Сохраняем существующие позиции/линии WebData — сервер при парсинге
                // кода не знает про раскладку на диаграмме.
                // `recomputeReturnStages` синхронизирует `Lines` из фактических
                // `return <StageName>;` в теле стейджей.
                const merged: WebProcess = {
                  ...next,
                  WebData: process.WebData ?? next.WebData,
                };
                onProcessUpdate(recomputeReturnStages(merged));
                // Apply вызывается только если `createProcessAssembly` не вернул
                // ошибок — значит компиляция валидна, индикатор можно очистить.
                setCompileDiagnostics([]);
                problems.clearSource(compileProblemSourceFor(next.TypeName));
                toast.push("success", `Code applied to ${next.TypeName}`);
              }}
            />
          ) : specialView === "diff" ? (
            <DiffView api={api} process={process} />
          ) : specialView === "run" ? (
            <RunProcessPanel api={api} processName={process.TypeName} />
          ) : specialView === "global-models" ? (
            <GlobalModelsPanel api={api} />
          ) : isDiagram ? (
            <ProcessDiagram
              process={process}
              onProcessUpdate={handleWebDataUpdate}
              onSelectStage={openStageEditor}
              onSave={handleSave}
              onShowModel={(m) => setModelDialog(m)}
              onValidate={handleValidateProcess}
              validating={validating}
              onOpenSubProcess={onOpenSubProcess}
            />
          ) : isStageOpen ? (
            <StageEditor
              stageName={activeTab}
              stage={stages[activeTab]}
              allStageNames={stageNames}
              allModels={allModels}
              crudModels={crudModels}
              commands={commands}
              events={events}
              processResultName={`${process.TypeName}ProcessResult`}
              api={api}
              onUpdate={(s) => handleStageUpdate(activeTab, s)}
              onRename={handleStageRename}
              onOpenOrCreateStage={handleOpenOrCreateStage}
              onCreateProperty={handleCreateProperty}
              onOpenSubProcess={onOpenSubProcess}
            />
          ) : (
            <div className="flex items-center justify-center h-full" style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
              Select a stage from the diagram
            </div>
          )}
        </div>

        {/* Stage outline — right sidebar before action rail */}
        {outlineOpen && (
          <StagesOutline
            stages={stages}
            activeStage={activeTab}
            startupStage={process.Startup}
            dirtyStages={dirtyStages}
            onOpenStage={openStageEditor}
            onCollapse={toggleOutline}
          />
        )}

        <ProcessEditorActionRail
          process={process}
          stages={stages}
          activeTab={activeTab}
          specialView={specialView}
          setSpecialView={setSpecialView}
          isStageOpen={!!isStageOpen}
          saving={saving}
          autoSaveEnabled={autoSaveEnabled}
          outlineOpen={outlineOpen}
          compileDiagnostics={compileDiagnostics}
          onSave={handleSave}
          onToggleAutoSave={toggleAutoSave}
          onToggleOutline={toggleOutline}
          onPack={handlePack}
          onUnpackClick={handleUnpackClick}
          onUnpackFile={handleUnpackFile}
          fileInputRef={fileInputRef}
          onOpenUsings={() => setUsingsDialogOpen(true)}
          onOpenModelDialog={(kind) => setModelDialog(kind)}
          onGotoDiagram={() => setActiveTab("__diagram__")}
          onDeleteStage={handleAskDeleteStage}
          onProcessUpdate={onProcessUpdate}
        />
      </div>

      {/* Model class dialogs */}
      {modelDialog && (
        <ModelClassDialog
          title={modelDialog}
          body={process[modelDialog]?.Body ?? ""}
          onSave={(body) => { handleModelUpdate(modelDialog, body); setModelDialog(null); }}
          onClose={() => setModelDialog(null)}
        />
      )}

      {createStagePrefill != null && (
        <AddStageDialog
          existingNames={stageNames}
          initialName={createStagePrefill}
          onAdd={handleCreateStageFromDialog}
          onCancel={() => setCreateStagePrefill(null)}
        />
      )}

      {quickPick === "stages" && (
        <QuickPickDialog
          placeholder="Find stage by name..."
          items={Object.values(stages).map<QuickPickItem>((s) => ({
            id: s.Name,
            label: s.Name,
            description: s.DisplayName && s.DisplayName !== s.Name ? s.DisplayName : undefined,
            detail: s.Type.replace("Definition", ""),
            iconColor: STAGE_TYPE_COLORS[s.Type] ?? "#888",
            searchHay: `${s.DisplayName ?? ""} ${s.Type}`,
            action: () => openStageEditor(s.Name),
          }))}
          onClose={() => setQuickPick(null)}
        />
      )}

      {quickPick === "palette" && (
        <QuickPickDialog
          placeholder="Type command..."
          items={[
            { id: "save", label: "Save Process", detail: "Ctrl+S", action: () => handleSave() },
            { id: "run", label: "Run Process", action: () => setSpecialView("run") },
            { id: "diagram", label: "Show Diagram", action: () => { setActiveTab("__diagram__"); setSpecialView(null); } },
            { id: "code", label: "Show Code Preview", action: () => setSpecialView("code") },
            { id: "diff", label: "Show Diff", action: () => setSpecialView("diff") },
            { id: "usings", label: "Edit Usings", action: () => setUsingsDialogOpen(true) },
            { id: "global-models", label: "Show Global Models", action: () => setSpecialView("global-models") },
            { id: "io", label: "Edit InitObject", action: () => setModelDialog("InitObject") },
            { id: "ctx", label: "Edit Context", action: () => setModelDialog("Context") },
            { id: "res", label: "Edit ProcessResult", action: () => setModelDialog("ProcessResult") },
            { id: "add-stage", label: "Add Stage...", action: () => setCreateStagePrefill("") },
            { id: "pack", label: "Pack (download JSON dump)", action: () => handlePack() },
            { id: "unpack", label: "Unpack (load JSON dump)", action: () => handleUnpackClick() },
            { id: "toggle-autosave", label: `Auto Save: ${autoSaveEnabled ? "ON (turn off)" : "OFF (turn on)"}`, action: () => toggleAutoSave() },
            { id: "validate", label: "Validate Process", action: () => { void handleValidateProcess(); } },
            ...(isStageOpen
              ? [
                  { id: "rename-stage", label: "Rename Current Stage", detail: "F2", action: () => { /* StageEditor сам ловит F2 */ } } as QuickPickItem,
                  ...(process.Startup !== activeTab
                    ? [{ id: "set-startup", label: `Set Startup: ${activeTab}`, action: () => onProcessUpdate({ ...process, Startup: activeTab }) } as QuickPickItem]
                    : []),
                  ...(process.Startup !== activeTab
                    ? [{ id: "delete-stage", label: `Delete Stage: ${activeTab}`, action: () => handleAskDeleteStage(activeTab) } as QuickPickItem]
                    : []),
                ]
              : []),
          ]}
          onClose={() => setQuickPick(null)}
        />
      )}

      {usingsDialogOpen && (
        <UsingsDialog
          usings={process.Usings ?? []}
          onSave={(usings) => {
            onProcessUpdate({ ...process, Usings: usings });
            setUsingsDialogOpen(false);
          }}
          onClose={() => setUsingsDialogOpen(false)}
        />
      )}
    </div>
  );
}
