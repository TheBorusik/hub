import { useState, useCallback, useRef, useEffect, useMemo } from "react";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
import {
  Play, Save, Braces, X, LayoutGrid,
  FileCode, GitCompareArrows,
  Copy, Trash2,
  Package, Upload, Clock,
} from "lucide-react";
import type { HubWsApi } from "@/lib/ws-api";
import type {
  ProcessModel, WebProcess, ProcessStage,
  CRUDModelInfo, AdapterCommandInfo, AdapterEventInfo,
  DiagnosticModel, UpsertProcessAssemblyResponse,
} from "@/lib/ws-api-models";
import type { OpenTab } from "../types";
import { StageEditor } from "./StageEditor";
import { ProcessDiagram } from "./ProcessDiagram";
import { CodePreview } from "./CodePreview";
import { DiffView } from "./DiffView";
import { RunProcessPanel } from "./RunProcessPanel";
import { ModelClassDialog } from "./ModelClassDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { AddStageDialog } from "./AddStageDialog";
import { QuickPickDialog, type QuickPickItem } from "./QuickPickDialog";
import { UsingsDialog } from "./UsingsDialog";
import { GlobalModelsPanel } from "./GlobalModelsPanel";
import { recomputeReturnStages } from "../utils/recomputeReturnStages";
import { stableJson } from "../utils/stableJson";
import { useToast } from "@/providers/ToastProvider";
import { useNotifications } from "@/providers/NotificationsProvider";

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

const STAGE_TYPE_COLORS: Record<string, string> = {
  Start: "#5CADD5",
  CRUDDefinition: "seagreen",
  CommandDefinition: "#0FD334",
  TransformDefinition: "#0F8B8D",
  EventDefinition: "#FCA6ED",
  SubDefinition: "#0089ED",
  EndDefinition: "#F6511D",
};

type SpecialView = "code" | "diff" | "run" | "global-models";

export function ProcessEditor({ tab, api, allModels, crudModels, commands, events, onProcessUpdate, onSaved, onOpenSubProcess }: ProcessEditorProps) {
  const [openStageTabs, setOpenStageTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("__diagram__");
  const [specialView, setSpecialView] = useState<SpecialView | null>(null);
  const [modelDialog, setModelDialog] = useState<"InitObject" | "Context" | "ProcessResult" | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteStageTarget, setDeleteStageTarget] = useState<string | null>(null);
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  const notifications = useNotifications();

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
  }, [api, process, toast, notifications]);

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
  }, [api, process, toast, notifications]);

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
    const stages = { ...process.Stages };
    if (stages[newName] || !stages[oldName]) return;

    const newStages: Record<string, ProcessStage> = {};
    for (const [k, v] of Object.entries(stages)) {
      if (k === oldName) {
        newStages[newName] = { ...v, Name: newName };
      } else {
        const updated = { ...v };
        if (updated.GetNextStage) {
          updated.GetNextStage = updated.GetNextStage.replace(
            new RegExp(`\\breturn\\s+${escapeRegex(oldName)}\\s*;`, "g"),
            `return ${newName};`,
          );
        }
        if (updated.GetErrorNextStage) {
          updated.GetErrorNextStage = updated.GetErrorNextStage.replace(
            new RegExp(`\\breturn\\s+${escapeRegex(oldName)}\\s*;`, "g"),
            `return ${newName};`,
          );
        }
        if (updated.ReturnStages) {
          updated.ReturnStages = updated.ReturnStages.map((r) => r === oldName ? newName : r);
        }
        newStages[k] = updated;
      }
    }

    const webStages = { ...(process.WebData?.Stages ?? {}) };
    if (webStages[oldName]) {
      webStages[newName] = webStages[oldName];
      delete webStages[oldName];
    }
    for (const ws of Object.values(webStages)) {
      if (ws.Lines?.[oldName]) {
        ws.Lines[newName] = ws.Lines[oldName];
        delete ws.Lines[oldName];
      }
    }

    const updatedProcess: WebProcess = {
      ...process,
      Stages: newStages,
      Startup: process.Startup === oldName ? newName : process.Startup,
      WebData: process.WebData ? { ...process.WebData, Stages: webStages } : process.WebData,
    };

    setOpenStageTabs((prev) => prev.map((t) => t === oldName ? newName : t));
    setActiveTab((prev) => prev === oldName ? newName : prev);
    onProcessUpdate(recomputeReturnStages(updatedProcess));
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

  // Global hotkeys: Ctrl+S (save), Ctrl+P (quick open stages), Ctrl+Shift+P (command palette)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      if (!e.shiftKey && !e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        handleSave();
        return;
      }
      if (e.shiftKey && !e.altKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        setQuickPick("palette");
        return;
      }
      if (!e.shiftKey && !e.altKey && (e.key === "p" || e.key === "P")) {
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar: Diagram + open stage tabs */}
      <div
        className="flex shrink-0 overflow-x-auto"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-sidebar)",
          height: 30,
          minHeight: 30,
        }}
      >
        {/* Diagram tab */}
        <div
          className="flex items-center shrink-0 select-none"
          style={{
            padding: "0 10px",
            height: "100%",
            fontSize: 11,
            cursor: "pointer",
            borderRight: "1px solid var(--color-border)",
            borderBottom: isDiagram ? "2px solid var(--color-accent)" : "2px solid transparent",
            background: isDiagram ? "var(--color-editor)" : "transparent",
            color: isDiagram ? "var(--color-text-primary)" : "var(--color-text-muted)",
            gap: 4,
          }}
          onClick={() => { setActiveTab("__diagram__"); setSpecialView(null); }}
        >
          <LayoutGrid size={12} />
          Diagram
        </div>

        {/* Stage tabs */}
        {openStageTabs.map((sn) => {
          const st = stages[sn];
          if (!st) return null;
          const stColor = STAGE_TYPE_COLORS[st.Type] ?? "#888";
          const isActive = activeTab === sn && !specialView;
          return (
            <div
              key={sn}
              className="flex items-center shrink-0 select-none"
              style={{
                padding: "0 4px 0 8px",
                height: "100%",
                fontSize: 11,
                cursor: "pointer",
                borderRight: "1px solid var(--color-border)",
                borderBottom: isActive ? `2px solid ${stColor}` : "2px solid transparent",
                background: isActive ? "var(--color-editor)" : "transparent",
                color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)",
              }}
              onClick={() => { setActiveTab(sn); setSpecialView(null); }}
            >
              <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {dirtyStages.has(sn) ? "● " : ""}{st.DisplayName || sn}
              </span>
              <button
                className="toolbar-btn"
                style={{ marginLeft: 4, padding: 1 }}
                onClick={(e) => { e.stopPropagation(); closeStageTab(sn); }}
                title="Close"
              >
                <X size={10} />
              </button>
            </div>
          );
        })}

      </div>

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

        {/* Right action panel — always visible */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            padding: "6px 4px",
            borderLeft: "1px solid var(--color-border)",
            background: "var(--color-sidebar)",
            width: 36,
            flexShrink: 0,
            overflow: "auto",
          }}
        >
          <button className="toolbar-btn" title="Save Process (Ctrl+S)" onClick={handleSave} disabled={saving}>
            <Save size={15} />
          </button>
          <button
            className="toolbar-btn"
            title={autoSaveEnabled ? "Auto Save: ON (5s debounce). Click to disable." : "Auto Save: OFF. Click to enable."}
            onClick={toggleAutoSave}
            style={{ color: autoSaveEnabled ? "#4caf50" : undefined }}
          >
            <Clock size={15} />
          </button>
          <button
            className="toolbar-btn"
            title="Run Process"
            onClick={() => setSpecialView(specialView === "run" ? null : "run")}
            style={{ background: specialView === "run" ? "rgba(14,99,156,0.35)" : undefined }}
          >
            <Play size={15} />
          </button>

          <div style={{ width: 20, height: 1, background: "var(--color-border)", margin: "4px 0" }} />

          <button
            className="toolbar-btn"
            title="Pack (download JSON dump of process)"
            onClick={handlePack}
          >
            <Package size={15} />
          </button>
          <button
            className="toolbar-btn"
            title="Unpack (load JSON dump from file)"
            onClick={handleUnpackClick}
          >
            <Upload size={15} />
          </button>
          {/* Скрытый input — используется для Unpack. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleUnpackFile}
            style={{ display: "none" }}
          />

          <div style={{ width: 20, height: 1, background: "var(--color-border)", margin: "4px 0" }} />

          <button
            className="toolbar-btn"
            title="Code Preview"
            onClick={() => setSpecialView(specialView === "code" ? null : "code")}
            style={{ background: specialView === "code" ? "rgba(14,99,156,0.35)" : undefined }}
          >
            <FileCode size={15} />
          </button>
          <button
            className="toolbar-btn"
            title="Diff"
            onClick={() => setSpecialView(specialView === "diff" ? null : "diff")}
            style={{ background: specialView === "diff" ? "rgba(14,99,156,0.35)" : undefined }}
          >
            <GitCompareArrows size={15} />
          </button>

          <div style={{ width: 20, height: 1, background: "var(--color-border)", margin: "4px 0" }} />

          <button
            className="toolbar-btn"
            title="Usings"
            onClick={() => setUsingsDialogOpen(true)}
          >
            <span style={{ fontSize: 11, fontWeight: 600 }}>U</span>
          </button>
          <button
            className="toolbar-btn"
            title="Global Models"
            onClick={() => setSpecialView(specialView === "global-models" ? null : "global-models")}
            style={{ background: specialView === "global-models" ? "rgba(14,99,156,0.35)" : undefined }}
          >
            <span style={{ fontSize: 11, fontWeight: 600 }}>GM</span>
          </button>
          <button
            className="toolbar-btn"
            title={
              compileDiagnostics.length > 0
                ? `Show Syntax Errors in Code Preview (${compileDiagnostics.length})`
                : "No syntax errors in current process"
            }
            onClick={() => setSpecialView("code")}
            style={{
              position: "relative",
              color: compileDiagnostics.length > 0 ? "#f48771" : undefined,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700 }}>!</span>
            {compileDiagnostics.length > 0 && (
              <span
                style={{
                  position: "absolute", top: 0, right: 0,
                  minWidth: 12, height: 12, padding: "0 3px",
                  borderRadius: 6, background: "#f44336", color: "#fff",
                  fontSize: 9, fontWeight: 700, lineHeight: "12px",
                }}
              >
                {compileDiagnostics.length > 99 ? "99+" : compileDiagnostics.length}
              </span>
            )}
          </button>

          <div style={{ width: 20, height: 1, background: "var(--color-border)", margin: "4px 0" }} />

          <button className="toolbar-btn" title="InitObject" onClick={() => setModelDialog("InitObject")}>
            <Braces size={14} />
            <span style={{ fontSize: 8 }}>IO</span>
          </button>
          <button className="toolbar-btn" title="Context" onClick={() => setModelDialog("Context")}>
            <Braces size={14} />
            <span style={{ fontSize: 8 }}>Ctx</span>
          </button>
          <button className="toolbar-btn" title="ProcessResult" onClick={() => setModelDialog("ProcessResult")}>
            <Braces size={14} />
            <span style={{ fontSize: 8 }}>Res</span>
          </button>

          {isStageOpen && (
            <>
              <div style={{ width: 20, height: 1, background: "var(--color-border)", margin: "4px 0" }} />
              <button
                className="toolbar-btn"
                title="Set Startup Stage"
                disabled={process.Startup === activeTab}
                onClick={() => onProcessUpdate({ ...process, Startup: activeTab })}
                style={{ opacity: process.Startup === activeTab ? 0.3 : 1 }}
              >
                <span style={{ fontSize: 14, transform: "rotate(45deg)", display: "inline-block", color: process.Startup === activeTab ? stages[activeTab]?.Type ? STAGE_TYPE_COLORS[stages[activeTab].Type] : "var(--color-text-muted)" : "var(--color-accent)" }}>⇒</span>
              </button>
              <button className="toolbar-btn" title="Go to Diagram (clone from there)" onClick={() => setActiveTab("__diagram__")}>
                <Copy size={15} />
              </button>
            </>
          )}

          <div style={{ flex: 1 }} />

          {isStageOpen && (
            <button
              className="toolbar-btn"
              title="Delete Stage"
              disabled={process.Startup === activeTab}
              style={{ color: process.Startup === activeTab ? "var(--color-text-muted)" : "#f44336" }}
              onClick={() => setDeleteStageTarget(activeTab)}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
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

      {deleteStageTarget && (
        <ConfirmDialog
          title="Delete Stage"
          message={`Are you sure you want to delete "${deleteStageTarget}"?`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            const name = deleteStageTarget;
            const newStages = { ...stages };
            delete newStages[name];
            const newWebStages = { ...(process.WebData?.Stages ?? {}) };
            delete newWebStages[name];
            onProcessUpdate(recomputeReturnStages({
              ...process,
              Stages: newStages,
              WebData: process.WebData ? { ...process.WebData, Stages: newWebStages } : process.WebData,
            }));
            closeStageTab(name);
            setDeleteStageTarget(null);
          }}
          onCancel={() => setDeleteStageTarget(null)}
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
                    ? [{ id: "delete-stage", label: `Delete Stage: ${activeTab}`, action: () => setDeleteStageTarget(activeTab) } as QuickPickItem]
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
