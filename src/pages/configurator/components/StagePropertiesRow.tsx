import { useCallback, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import type {
  ProcessModel, ProcessStage,
  CRUDModelInfo, AdapterCommandInfo, AdapterEventInfo,
} from "@/lib/ws-api-models";
import { useToast } from "@/providers/ToastProvider";
import { AutocompleteInput } from "./AutocompleteInput";
import { normStageType } from "../lib/stage-type-helpers";

interface StagePropertiesRowProps {
  stage: ProcessStage;
  allModels: ProcessModel[];
  crudModels: CRUDModelInfo[];
  commands: AdapterCommandInfo[];
  events: AdapterEventInfo[];
  onUpdate: (stage: ProcessStage) => void;
  onOpenSubProcess?: (processName: string) => void;
}

/**
 * Inline-row под header'ом с автокомплитом по типу стейджа: CRUD CommandName /
 * Command Name / Process Name (+ Edit-кнопка в новой вкладке) / Event Name.
 *
 * Для CRUD имя команды восстанавливается из пары (Model, Action), потому что
 * сервер не всегда присылает CommandName — см. длинный комментарий в коде ниже.
 */
export function StagePropertiesRow({
  stage,
  allModels,
  crudModels,
  commands,
  events,
  onUpdate,
  onOpenSubProcess,
}: StagePropertiesRowProps) {
  const toast = useToast();
  const t = normStageType(stage.Type);
  const isCrud = t === "CRUD";
  const isCommand = t === "Command";
  const isSub = t === "Sub" || t === "SubStart";
  const isEvent = t === "Event";

  const crudOptions = useMemo(() => crudModels.map((m) => m.CommandName), [crudModels]);
  const commandOptions = useMemo(() => commands.map((c) => c.Name), [commands]);
  const eventOptions = useMemo(() => events.map((e) => e.Name), [events]);
  const processOptions = useMemo(() => {
    const names = new Set<string>();
    for (const m of allModels) {
      if (m.Name) names.add(m.Name);
    }
    return Array.from(names).sort();
  }, [allModels]);

  /**
   * Сервер по существующим CRUD-стейджам присылает `Properties: {Model, Action}`
   * без `CommandName`. Восстанавливаем отображаемое имя по паре, иначе fallback —
   * "Model.Action" / любое из них.
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

  const updateProp = useCallback(
    (key: string, value: string) => {
      onUpdate({ ...stage, Properties: { ...stage.Properties, [key]: value } });
    },
    [stage, onUpdate],
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

  const subProcessName = (stage.Properties?.ProcessName ?? "").trim();

  if (!isCrud && !isCommand && !isSub && !isEvent) return null;

  return (
    <div style={{ padding: "4px 8px", flexShrink: 0, borderBottom: "1px solid var(--color-border)" }}>
      {isCrud && (
        <AutocompleteInput
          label="CRUD Command Name"
          value={effectiveCrudCommandName}
          options={crudOptions}
          onChange={handleCrudSelect}
          placeholder="Search CRUD command..."
        />
      )}
      {isCommand && (
        <AutocompleteInput
          label="Command Name"
          value={stage.Properties?.CommandName ?? ""}
          options={commandOptions}
          onChange={handleCommandSelect}
          placeholder="Search command..."
        />
      )}
      {isSub && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <AutocompleteInput
              label="Process Name"
              value={stage.Properties?.ProcessName ?? ""}
              options={processOptions}
              onChange={handleProcessSelect}
              placeholder="Search process..."
            />
          </div>
          <button
            className="toolbar-btn"
            title={
              subProcessName
                ? "Edit sub-process (open in new tab, or create if missing)"
                : "Enter or select a process name first"
            }
            onClick={() => {
              if (!subProcessName) {
                toast.push("warning", "Process Name is empty", {
                  detail: "Enter or select a sub-process first.",
                });
                return;
              }
              onOpenSubProcess?.(subProcessName);
            }}
            disabled={!subProcessName || !onOpenSubProcess}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              fontSize: 11,
              height: 24,
              flexShrink: 0,
              color: "var(--color-text-primary)",
            }}
          >
            <ExternalLink size={12} />
            <span>Edit</span>
          </button>
        </div>
      )}
      {isEvent && (
        <AutocompleteInput
          label="Event Name"
          value={stage.Properties?.EventName ?? ""}
          options={eventOptions}
          onChange={(v) => updateProp("EventName", v)}
        />
      )}
    </div>
  );
}
