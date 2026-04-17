import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type * as MonacoNs from "monaco-editor";
import { Group, Panel, usePanelRef } from "react-resizable-panels";
import { ChevronRight, ChevronDown, ExternalLink } from "lucide-react";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import type { HubWsApi } from "@/lib/ws-api";
import type {
  ProcessModel, ProcessStage,
  CRUDModelInfo, AdapterCommandInfo, AdapterEventInfo,
} from "@/lib/ws-api-models";
import { AutocompleteInput } from "./AutocompleteInput";
import {
  setupWfmCSharp,
  attachWfmContext,
  registerStageEditorActions,
  type StageEditorActionCallbacks,
} from "../monaco/wfm-csharp";
import { useToast } from "@/providers/ToastProvider";

interface StageEditorProps {
  stageName: string;
  stage: ProcessStage;
  allStageNames: string[];
  allModels: ProcessModel[];
  crudModels: CRUDModelInfo[];
  commands: AdapterCommandInfo[];
  events: AdapterEventInfo[];
  processResultName: string;
  api: HubWsApi;
  onUpdate: (stage: ProcessStage) => void;
  onRename: (oldName: string, newName: string) => void;
  /** Alt+Enter — по `return <Name>;`: если стейдж есть — открыть, иначе — создать. */
  onOpenOrCreateStage?: (name: string) => void;
  /** Ctrl+Alt+Enter — создать свойство модели InitObject/Context/ProcessResult. */
  onCreateProperty?: (modelKind: "Context" | "InitObject" | "ProcessResult", propName: string) => void;
  /**
   * Переход к подпроцессу по его `Name` (то, что указано в `[Process("...")]`).
   * Если процесс существует — открывается в новой вкладке; если нет — показывается
   * диалог создания нового процесса с префилом имени.
   */
  onOpenSubProcess?: (processName: string) => void;
}

const STAGE_TYPE_COLORS: Record<string, string> = {
  Start: "#5CADD5",
  CRUD: "seagreen", CRUDDefinition: "seagreen",
  Command: "#0FD334", CommandDefinition: "#0FD334",
  Transform: "#0F8B8D", TransformDefinition: "#0F8B8D",
  Event: "#FCA6ED", EventDefinition: "#FCA6ED",
  Sub: "#0089ED", SubStart: "#0089ED", SubDefinition: "#0089ED",
  Final: "#F6511D", End: "#F6511D", EndDefinition: "#F6511D",
};

interface CSharpEditorProps {
  value: string;
  onChange: (v: string) => void;
  label: string;
  stageNames: string[];
  currentStageName: string;
  processResultName: string;
  actions?: StageEditorActionCallbacks;
}

function CSharpEditor({
  value,
  onChange,
  label,
  stageNames,
  currentStageName,
  processResultName,
  actions,
}: CSharpEditorProps) {
  const uid = useId();
  const path = `inmemory://stage/${uid}/${label}`;

  // Держим актуальный контекст в ref, чтобы global completion provider
  // всегда видел свежие значения без перерегистрации.
  const ctxRef = useRef({ stageNames, currentStageName, processResultName });
  useEffect(() => {
    ctxRef.current = { stageNames, currentStageName, processResultName };
  }, [stageNames, currentStageName, processResultName]);

  // Коллбеки для хоткеев — через ref, чтобы не перерегистрировать actions.
  const actionsRef = useRef<StageEditorActionCallbacks>(actions ?? {});
  useEffect(() => {
    actionsRef.current = actions ?? {};
  }, [actions]);

  const detachRef = useRef<(() => void) | null>(null);
  const actionDisposablesRef = useRef<MonacoNs.IDisposable[]>([]);
  const editorRef = useRef<MonacoNs.editor.IStandaloneCodeEditor | null>(null);

  const handleMount = useCallback(
    (editor: MonacoNs.editor.IStandaloneCodeEditor, monaco: Monaco) => {
      setupWfmCSharp(monaco);
      editorRef.current = editor;
      const uri = editor.getModel()?.uri.toString();
      if (uri) {
        detachRef.current = attachWfmContext(uri, () => ctxRef.current);
      }
      actionDisposablesRef.current = registerStageEditorActions(
        editor,
        monaco,
        () => actionsRef.current,
      );
    },
    [],
  );

  useEffect(() => {
    return () => {
      detachRef.current?.();
      detachRef.current = null;
      for (const d of actionDisposablesRef.current) d.dispose();
      actionDisposablesRef.current = [];
      editorRef.current = null;
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {label && (
        <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600, padding: "4px 6px", flexShrink: 0 }}>
          {label}
        </span>
      )}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <Editor
          path={path}
          language="csharp"
          value={value}
          onChange={(v) => { const next = v ?? ""; if (next !== value) onChange(next); }}
          theme="wfm-dark"
          onMount={handleMount}
          options={{
            fontSize: 13,
            fontFamily: "Consolas, 'Courier New', monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            automaticLayout: true,
            tabSize: 4,
            wordWrap: "on",
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            padding: { top: 4 },
            // "smart" — как в VS Code: Enter принимает подсказку только когда
            // она явно выбрана (стрелками) или явно подсвечена; в остальных
            // случаях Enter работает как перенос строки.
            acceptSuggestionOnEnter: "smart",
            quickSuggestions: { other: true, comments: false, strings: false },
            suggestOnTriggerCharacters: true,
            tabCompletion: "on",
          }}
        />
      </div>
    </div>
  );
}

function norm(type: string): string {
  return type.replace("Definition", "");
}

function getDataLabel(type: string): string {
  const t = norm(type);
  switch (t) {
    case "CRUD": return "Make Command Payload Script:";
    case "Command": return "Make Command Payload Script:";
    case "Sub":
    case "SubStart": return "Make Init Params Script:";
    case "Event": return "Make Event Payload Script:";
    case "End":
    case "Final": return "Make Result Payload Script:";
    default: return "GetData:";
  }
}

function hasGetData(type: string): boolean {
  const t = norm(type);
  return !["Start", "Transform"].includes(t);
}

function hasGetNextStage(type: string): boolean {
  const t = norm(type);
  return !["End", "Final"].includes(t);
}

function hasGetErrorNextStage(type: string): boolean {
  const t = norm(type);
  return !["End", "Final", "Transform", "Event", "Start"].includes(t);
}

const errorToggleStyle: React.CSSProperties = {
  height: 26, padding: "0 12px", gap: 4, fontSize: 11, fontWeight: 600,
  color: "var(--color-text-muted)", background: "var(--color-sidebar)",
  border: "none",
  width: "100%", textAlign: "left",
  textTransform: "uppercase", letterSpacing: "0.04em",
};

interface NextStageWithErrorProps {
  stageName: string;
  nextValue: string;
  errorValue: string;
  initiallyOpen: boolean;
  onChangeNext: (v: string) => void;
  onChangeError: (v: string) => void;
  stageNames: string[];
  processResultName: string;
  actions?: StageEditorActionCallbacks;
}

/**
 * Всегда держим одинаковое дерево: `<Group>` + верхний `<Panel>` (Get Next Stage)
 * + `<ResizeHandle>` + нижний `<Panel collapsible>` (Get Error Next Stage).
 *
 * Это важно, потому что при переключении видимости нижней секции раньше
 * менялось родительское дерево JSX (ранее был `errorOpen ? <Group/> : <div/>`),
 * из-за чего React-у приходилось переcоздавать `CSharpEditor` для «Get Next
 * Stage», Monaco строил новую модель — и это давало видимое мигание.
 * Стабильное дерево + `collapsible` Panel убирают ремоунт (как сделано
 * для «Request Data» в CommandTester).
 */
function NextStageWithError({
  stageName, nextValue, errorValue, initiallyOpen, onChangeNext, onChangeError,
  stageNames, processResultName, actions,
}: NextStageWithErrorProps) {
  const errorPanelRef = usePanelRef();
  const [collapsed, setCollapsed] = useState(!initiallyOpen);

  const toggle = useCallback(() => {
    const panel = errorPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed())
      panel.expand();
    else panel.collapse();
  }, [errorPanelRef]);

  return (
    <Group orientation="vertical" autoSaveId={`stage-v2-${stageName}`}>
      <Panel minSize="80px">
        <CSharpEditor
          label="Get Next Stage:"
          value={nextValue}
          onChange={onChangeNext}
          stageNames={stageNames}
          currentStageName={stageName}
          processResultName={processResultName}
          actions={actions}
        />
      </Panel>
      <ResizeHandle direction="vertical" />
      <Panel
        id="get-error-next-stage"
        panelRef={errorPanelRef}
        collapsible
        collapsedSize="26px"
        defaultSize={initiallyOpen ? 25 : 8}
        minSize="126px"
        onResize={() => {
          setCollapsed(errorPanelRef.current?.isCollapsed() ?? false);
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          <button
            className="flex items-center shrink-0 select-none cursor-pointer"
            onClick={toggle}
            style={errorToggleStyle}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            Get Error Next Stage
          </button>
          {!collapsed && (
            <div style={{ flex: 1, minHeight: 0 }}>
              <CSharpEditor
                label=""
                value={errorValue}
                onChange={onChangeError}
                stageNames={stageNames}
                currentStageName={stageName}
                processResultName={processResultName}
                actions={actions}
              />
            </div>
          )}
        </div>
      </Panel>
    </Group>
  );
}

function extractProcessResult(raw: unknown): Record<string, unknown> | null {
  const wrapper = raw as Record<string, unknown> | null;
  const cr = (wrapper?.CommandResult ?? wrapper) as Record<string, unknown> | null;
  const pr = (cr?.ProcessResult ?? cr?.Result ?? cr) as Record<string, unknown> | null;
  return pr ?? null;
}

export function StageEditor({
  stageName,
  stage,
  allStageNames,
  allModels,
  crudModels,
  commands,
  events,
  processResultName,
  api,
  onUpdate,
  onRename,
  onOpenOrCreateStage,
  onCreateProperty,
  onOpenSubProcess,
}: StageEditorProps) {
  const toast = useToast();
  const color = STAGE_TYPE_COLORS[stage.Type] ?? STAGE_TYPE_COLORS[norm(stage.Type)] ?? "#888";
  const t = norm(stage.Type);
  const isCrud = t === "CRUD";
  const isCommand = t === "Command";
  const isSub = t === "Sub" || t === "SubStart";
  const isEvent = t === "Event";
  const showData = hasGetData(stage.Type);
  const showNext = hasGetNextStage(stage.Type);
  const showError = hasGetErrorNextStage(stage.Type);

  // Начальное состояние свёрнутости секции «Get Error Next Stage»: открыта, если
  // в стейдже уже есть код; далее сам `NextStageWithError` управляет своим
  // collapsed-состоянием через `usePanelRef` (react-resizable-panels).
  const errorInitiallyOpen = !!stage.GetErrorNextStage?.trim();
  const [localName, setLocalName] = useState(stageName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // При переключении таба стейджа (в `ProcessEditor` рендерится один и тот же
  // `StageEditor`, меняется только проп `stageName`) синхронизируем локальный
  // буфер имени с пропом — иначе поле "Name" «залипает» на имени последнего
  // открытого стейджа.
  useEffect(() => {
    setLocalName(stageName);
  }, [stageName]);

  // F2 — rename stage: фокус + select имени
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2" && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
        const active = document.activeElement as HTMLElement | null;
        // Не перехватываем F2 если фокус в Monaco-редакторе или другом input/textarea
        if (active) {
          const tag = active.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA") return;
          if (active.classList.contains("monaco-editor") || active.closest(".monaco-editor")) return;
        }
        if (nameInputRef.current) {
          e.preventDefault();
          nameInputRef.current.focus();
          nameInputRef.current.select();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const updateField = <K extends keyof ProcessStage>(key: K, value: ProcessStage[K]) => {
    onUpdate({ ...stage, [key]: value });
  };

  const commitRename = useCallback(() => {
    const trimmed = localName.trim();
    if (trimmed && trimmed !== stageName) {
      onRename(stageName, trimmed);
    } else {
      setLocalName(stageName);
    }
  }, [localName, stageName, onRename]);

  const updateProp = useCallback(
    (key: string, value: string) => {
      onUpdate({ ...stage, Properties: { ...stage.Properties, [key]: value } });
    },
    [stage, onUpdate],
  );

  const crudOptions = useMemo(() => crudModels.map((m) => m.CommandName), [crudModels]);

  /**
   * Эффективное имя CRUD-команды для отображения в инпуте.
   *
   * Сервер по существующим процессам присылает `Properties: { Model, Action }`
   * (например `Model: "BackProcessHandler", Action: "Add"`) — без поля `CommandName`.
   * Поэтому без приоритета по `CommandName` инпут был бы пустой, хотя значение выбрано.
   *
   * Логика:
   *   1) если в `Properties.CommandName` уже лежит значение — используем его;
   *   2) иначе пытаемся подобрать `CommandName` из `crudModels` по паре
   *      `Model` + `Action` (имя команды сервер умеет форматировать по-разному —
   *      например с плюральной формой "BackProcessHandlers.Add");
   *   3) если модель в списке не нашли — отдаём `{Model}.{Action}` как запасной вариант,
   *      чтобы пользователь видел хотя бы то, что сохранено.
   */
  const effectiveCrudCommandName = useMemo(() => {
    const existing = stage.Properties?.CommandName;
    if (existing) return existing;
    const m = stage.Properties?.Model;
    const a = stage.Properties?.Action;
    if (!m && !a) return "";
    const match = crudModels.find((x) => x.Model === m && x.Action === a);
    if (match) return match.CommandName;
    if (m && a) return `${m}.${a}`;
    return m ?? a ?? "";
  }, [stage.Properties, crudModels]);

  const commandOptions = useMemo(() => commands.map((c) => c.Name), [commands]);
  const eventOptions = useMemo(() => events.map((e) => e.Name), [events]);
  // В подпроцессе указываем именно `Name` процесса (то, что в `[Process("...")]`),
  // а не `TypeName` класса. `allModels` в этом контексте приходит из
  // `WFM.ProcessAssembly.GetModels` / `System.WFM.Process.GetTree` и содержит
  // только процессы — дополнительный фильтр по Category не нужен (и может
  // отрезать всё, если сервер сериализует поле иначе). Берём все непустые `Name`.
  const processOptions = useMemo(
    () => {
      const names = new Set<string>();
      for (const m of allModels) {
        if (m.Name) names.add(m.Name);
      }
      return Array.from(names).sort();
    },
    [allModels],
  );

  const handleCrudSelect = useCallback(
    (commandName: string) => {
      const model = crudModels.find((m) => m.CommandName === commandName);
      const newProps: Record<string, string> = { ...stage.Properties, CommandName: commandName };
      if (model) {
        newProps.Model = model.Model;
        newProps.Action = model.Action;
      }
      onUpdate({ ...stage, Properties: newProps });
    },
    [crudModels, stage, onUpdate],
  );

  const handleCommandSelect = useCallback(
    (commandName: string) => {
      const cmd = commands.find((c) => c.Name === commandName);
      const newProps = { ...stage.Properties, CommandName: commandName };
      let newGetData = stage.GetData;
      if (cmd?.Json && !stage.GetData) {
        try {
          const parsed = JSON.parse(cmd.Json);
          let script = "";
          for (const key of Object.keys(parsed)) {
            if (typeof parsed[key] === "object") {
              script += `Command.${key} = JObject.FromObject(new {\n});\n`;
            } else {
              script += `Command.${key} = ;\n`;
            }
          }
          newGetData = script;
        } catch { /* ignore */ }
      }
      onUpdate({ ...stage, Properties: newProps, GetData: newGetData });
    },
    [commands, stage, onUpdate],
  );

  const handleProcessSelect = useCallback(
    (processName: string) => {
      // При выборе из списка подтягиваем `TypeName` класса-реализации процесса —
      // он нужен серверным хоткеям вроде `GetInitObjectStructure`. Если
      // пользователь ввёл имя вручную (и модель ещё не загружена) — просто
      // очищаем `ProcessTypeName`.
      const proc = allModels.find((m) => m.Name === processName);
      const newProps = {
        ...stage.Properties,
        ProcessName: processName,
        ProcessTypeName: proc?.TypeName ?? "",
      };
      onUpdate({ ...stage, Properties: newProps });
    },
    [allModels, stage, onUpdate],
  );

  const handleEventSelect = useCallback(
    (eventName: string) => {
      updateProp("EventName", eventName);
    },
    [updateProp],
  );

  // ---- Monaco editor action callbacks (Shift+Alt+F, Alt+Enter, Ctrl+Alt+*, Ctrl+Alt+Enter) ----
  const editorActions: StageEditorActionCallbacks = useMemo(() => ({
    onFormat: async (code: string) => {
      try {
        const resp = await api.formatCode(code);
        return resp?.Code ?? null;
      } catch (e) {
        console.error("FormatCode failed", e);
        toast.push("error", "Format failed", { detail: e instanceof Error ? e.message : String(e) });
        return null;
      }
    },
    onStageRefFromReturn: (name: string) => {
      onOpenOrCreateStage?.(name);
    },
    onCreateProperty: (kind, prop) => {
      onCreateProperty?.(kind, prop);
    },
    onInsertReturnProperties: async (editor) => {
      const model = stage.Properties?.Model;
      if (!model) {
        toast.push("warning", "CRUD Model is empty", { detail: "Fill in 'Model' to insert ReturnProperties." });
        return;
      }
      try {
        const raw = await api.executeProcess("System.WFM.CRUD.GetProperties", { Model: model });
        const result = extractProcessResult(raw);
        const config = result?.Config as Record<string, unknown> | undefined;
        if (!config) {
          toast.push("warning", `No config for model '${model}'`);
          return;
        }
        const keyName = config.KeyName as string | undefined;
        const props = (config.Properties as Array<{ Name: string }> | undefined) ?? [];
        const lines: string[] = [];
        if (keyName) lines.push(`\t\t"${keyName}"`);
        for (const p of props) {
          if (p?.Name && p.Name !== keyName) lines.push(`\t\t"${p.Name}"`);
        }
        const text = `ReturnProperties = new[] {\n${lines.join(",\n")}\n\t}`;
        const pos = editor.getPosition();
        if (!pos) return;
        editor.executeEdits("wfm-insert-rp", [{
          range: {
            startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber,
            startColumn: pos.column, endColumn: pos.column,
          },
          text, forceMoveMarkers: true,
        }]);
        editor.focus();
      } catch (e) {
        console.error("GetProperties failed", e);
        toast.push("error", "Failed to load CRUD properties", { detail: e instanceof Error ? e.message : String(e) });
      }
    },
    onInsertInitObjectStructure: async (editor) => {
      const processTypeName = stage.Properties?.ProcessTypeName;
      if (!processTypeName) {
        toast.push("warning", "ProcessTypeName is empty", { detail: "Select a sub-process first." });
        return;
      }
      try {
        const raw = await api.executeProcess("System.WFM.Process.GetInitObjectStructure", { ProcessTypeName: processTypeName });
        const result = extractProcessResult(raw);
        const text = (result?.InitObjectStructure as string | undefined) ?? "";
        if (!text) {
          toast.push("warning", `No InitObject structure for '${processTypeName}'`);
          return;
        }
        const pos = editor.getPosition();
        if (!pos) return;
        editor.executeEdits("wfm-insert-ios", [{
          range: {
            startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber,
            startColumn: pos.column, endColumn: pos.column,
          },
          text, forceMoveMarkers: true,
        }]);
        editor.focus();
      } catch (e) {
        console.error("GetInitObjectStructure failed", e);
        toast.push("error", "Failed to load InitObject structure", { detail: e instanceof Error ? e.message : String(e) });
      }
    },
  }), [api, toast, stage.Properties?.Model, stage.Properties?.ProcessTypeName, onOpenOrCreateStage, onCreateProperty]);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-editor)" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          borderBottom: `2px solid ${color}`,
          background: "var(--color-sidebar)",
          flexShrink: 0,
        }}
      >
        <label style={{ fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>Display Name</label>
        <input
          value={stage.DisplayName ?? ""}
          onChange={(e) => updateField("DisplayName", e.target.value)}
          placeholder="Display Name"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 12,
            color: "var(--color-text-primary)",
            padding: "2px 4px",
            minWidth: 0,
          }}
        />
        <label style={{ fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>Name</label>
        <input
          ref={nameInputRef}
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setLocalName(stageName); (e.target as HTMLInputElement).blur(); }
          }}
          placeholder="Name"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 12,
            color: "var(--color-text-primary)",
            padding: "2px 4px",
            minWidth: 0,
          }}
        />
        <span style={{ fontSize: 10, color, fontWeight: 600, whiteSpace: "nowrap" }}>{t}</span>
      </div>

      {/* Autocomplete row */}
      {(isCrud || isCommand || isSub || isEvent) && (
        <div style={{ padding: "4px 8px", flexShrink: 0, borderBottom: "1px solid var(--color-border)" }}>
          {isCrud && (
            <AutocompleteInput label="CRUD Command Name" value={effectiveCrudCommandName} options={crudOptions} onChange={handleCrudSelect} placeholder="Search CRUD command..." />
          )}
          {isCommand && (
            <AutocompleteInput label="Command Name" value={stage.Properties?.CommandName ?? ""} options={commandOptions} onChange={handleCommandSelect} placeholder="Search command..." />
          )}
          {isSub && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <AutocompleteInput label="Process Name" value={stage.Properties?.ProcessName ?? ""} options={processOptions} onChange={handleProcessSelect} placeholder="Search process..." />
              </div>
              <button
                className="toolbar-btn"
                title={
                  (stage.Properties?.ProcessName ?? "").trim()
                    ? "Edit sub-process (open in new tab, or create if missing)"
                    : "Enter or select a process name first"
                }
                onClick={() => {
                  const name = (stage.Properties?.ProcessName ?? "").trim();
                  if (!name) {
                    toast.push("warning", "Process Name is empty", { detail: "Enter or select a sub-process first." });
                    return;
                  }
                  if (!onOpenSubProcess) return;
                  onOpenSubProcess(name);
                }}
                disabled={!(stage.Properties?.ProcessName ?? "").trim() || !onOpenSubProcess}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 8px", fontSize: 11,
                  height: 24, flexShrink: 0,
                  color: "var(--color-text-primary)",
                }}
              >
                <ExternalLink size={12} />
                <span>Edit</span>
              </button>
            </div>
          )}
          {isEvent && (
            <AutocompleteInput label="Event Name" value={stage.Properties?.EventName ?? ""} options={eventOptions} onChange={handleEventSelect} placeholder="Search event..." />
          )}
        </div>
      )}

      {/* Code editors: left = GetData | right = GetNextStage + GetErrorNextStage (toggle + resize) */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {showData && showNext ? (
          <Group orientation="horizontal" autoSaveId={`stage-h-${stageName}`}>
            <Panel defaultSizePercentage={50} minSizePercentage={20}>
              <CSharpEditor
                label={getDataLabel(stage.Type)}
                value={stage.GetData ?? ""}
                onChange={(v) => updateField("GetData", v)}
                stageNames={allStageNames}
                currentStageName={stageName}
                processResultName={processResultName}
                actions={editorActions}
              />
            </Panel>
            <ResizeHandle />
            <Panel defaultSizePercentage={50} minSizePercentage={20}>
              {showError ? (
                <NextStageWithError
                  stageName={stageName}
                  nextValue={stage.GetNextStage ?? ""}
                  errorValue={stage.GetErrorNextStage ?? ""}
                  initiallyOpen={errorInitiallyOpen}
                  onChangeNext={(v) => updateField("GetNextStage", v)}
                  onChangeError={(v) => updateField("GetErrorNextStage", v)}
                  stageNames={allStageNames}
                  processResultName={processResultName}
                  actions={editorActions}
                />
              ) : (
                <CSharpEditor
                  label="Get Next Stage:"
                  value={stage.GetNextStage ?? ""}
                  onChange={(v) => updateField("GetNextStage", v)}
                  stageNames={allStageNames}
                  currentStageName={stageName}
                  processResultName={processResultName}
                  actions={editorActions}
                />
              )}
            </Panel>
          </Group>
        ) : showData && !showNext ? (
          <CSharpEditor
            label={getDataLabel(stage.Type)}
            value={stage.GetData ?? ""}
            onChange={(v) => updateField("GetData", v)}
            stageNames={allStageNames}
            currentStageName={stageName}
            processResultName={processResultName}
            actions={editorActions}
          />
        ) : showNext ? (
          showError ? (
            <NextStageWithError
              stageName={stageName}
              nextValue={stage.GetNextStage ?? ""}
              errorValue={stage.GetErrorNextStage ?? ""}
              initiallyOpen={errorInitiallyOpen}
              onChangeNext={(v) => updateField("GetNextStage", v)}
              onChangeError={(v) => updateField("GetErrorNextStage", v)}
              stageNames={allStageNames}
              processResultName={processResultName}
              actions={editorActions}
            />
          ) : (
            <CSharpEditor
              label="Get Next Stage:"
              value={stage.GetNextStage ?? ""}
              onChange={(v) => updateField("GetNextStage", v)}
              stageNames={allStageNames}
              currentStageName={stageName}
              processResultName={processResultName}
              actions={editorActions}
            />
          )
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
            No code editors for this stage type
          </div>
        )}
      </div>
    </div>
  );
}
