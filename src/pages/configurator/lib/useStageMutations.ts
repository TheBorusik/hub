import { useCallback } from "react";
import type { WebProcess, ProcessStage } from "@/lib/ws-api-models";
import type { ConfirmFn } from "@/components/ui/ConfirmDialog";
import { recomputeReturnStages } from "../utils/recomputeReturnStages";
import { renameStageInProcess } from "./stage-rename";
import { STAGE_TYPE_COLORS } from "./stage-colors";

interface UseStageMutationsArgs {
  process: WebProcess | null;
  onProcessUpdate: (next: WebProcess) => void;
  /** Закрыть таб удалённого стейджа в UI. */
  onCloseStageTab: (name: string) => void;
  /** При успешном rename — переименовать таб в UI. */
  onStageRenamedTabs: (oldName: string, newName: string) => void;
  /** После создания стейджа — открыть его в редакторе. */
  onStageCreated: (newName: string) => void;
  /** Сбросить prefill addstage диалога. */
  setCreateStagePrefill: (v: string | null) => void;
  /** Открыть ModelClassDialog после Create Property. */
  setModelDialog: (kind: "InitObject" | "Context" | "ProcessResult") => void;
  confirm: ConfirmFn;
}

export interface StageMutations {
  handleStageUpdate: (stageName: string, stage: ProcessStage) => void;
  handleStageRename: (oldName: string, newName: string) => void;
  handleModelUpdate: (field: "InitObject" | "Context" | "ProcessResult", body: string) => void;
  handleCreateStageFromDialog: (type: string, name: string) => void;
  /** Ctrl+Alt+Enter Create Property — добавляет в Body модели свойство и открывает диалог. */
  handleCreateProperty: (
    kind: "Context" | "InitObject" | "ProcessResult",
    propName: string,
  ) => void;
  /** confirm + delete stage + close tab. */
  handleAskDeleteStage: (name: string) => void;
}

/**
 * Чистые мутации процесса: stage update / rename / create / delete +
 * model body update + Create Property. UI-сторону (table tabs, dialogs)
 * получают через колбэки.
 */
export function useStageMutations({
  process,
  onProcessUpdate,
  onCloseStageTab,
  onStageRenamedTabs,
  onStageCreated,
  setCreateStagePrefill,
  setModelDialog,
  confirm,
}: UseStageMutationsArgs): StageMutations {
  const handleStageUpdate = useCallback(
    (stageName: string, stage: ProcessStage) => {
      if (!process) return;
      onProcessUpdate(recomputeReturnStages({
        ...process,
        Stages: { ...process.Stages, [stageName]: stage },
      }));
    },
    [process, onProcessUpdate],
  );

  const handleStageRename = useCallback(
    (oldName: string, newName: string) => {
      if (!process) return;
      const updated = renameStageInProcess(process, oldName, newName);
      if (!updated) return;
      onStageRenamedTabs(oldName, newName);
      onProcessUpdate(recomputeReturnStages(updated));
    },
    [process, onProcessUpdate, onStageRenamedTabs],
  );

  const handleModelUpdate = useCallback(
    (field: "InitObject" | "Context" | "ProcessResult", body: string) => {
      if (!process) return;
      onProcessUpdate({ ...process, [field]: { ...process[field], Body: body } });
    },
    [process, onProcessUpdate],
  );

  const handleCreateStageFromDialog = useCallback(
    (type: string, name: string) => {
      if (!process) return;
      const trimmed = name.trim();
      if (!trimmed || process.Stages?.[trimmed]) {
        setCreateStagePrefill(null);
        return;
      }
      const newStage: ProcessStage = {
        Type: type === "Final" ? "EndDefinition" : type === "SubStart" ? "SubDefinition" : `${type}Definition`,
        DisplayName: trimmed,
        Name: trimmed,
        GetData: "",
        GetNextStage: "",
        GetErrorNextStage: "",
        ReturnStages: [],
        Properties: {},
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
      onStageCreated(trimmed);
    },
    [process, onProcessUpdate, setCreateStagePrefill, onStageCreated],
  );

  const handleCreateProperty = useCallback(
    (kind: "Context" | "InitObject" | "ProcessResult", propName: string) => {
      if (!process) return;
      const existing = process[kind];
      const currentBody = existing?.Body ?? "";
      // Эвристика: если свойство с таким именем уже объявлено как public-property —
      // не добавляем повторно (regex учитывает любые типы, включая generic/array).
      const propRe = new RegExp(
        `\\bpublic\\s+[\\w<>,\\s\\[\\]\\.]+\\s+${propName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`,
      );
      const needle = `public object ${propName} { get; set; }`;
      let newBody = currentBody;
      if (!propRe.test(currentBody)) {
        const suffix = currentBody.length === 0 || currentBody.endsWith("\n") ? "" : "\n";
        newBody = `${currentBody}${suffix}${needle}\n`;
      }
      if (newBody !== currentBody) {
        const base = existing ?? { Name: `${process.TypeName}${kind}`, Body: "" };
        onProcessUpdate({ ...process, [kind]: { ...base, Body: newBody } });
      }
      setModelDialog(kind);
    },
    [process, onProcessUpdate, setModelDialog],
  );

  const handleAskDeleteStage = useCallback(
    (name: string) => {
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
          onCloseStageTab(name);
        },
      });
    },
    [confirm, process, onProcessUpdate, onCloseStageTab],
  );

  return {
    handleStageUpdate,
    handleStageRename,
    handleModelUpdate,
    handleCreateStageFromDialog,
    handleCreateProperty,
    handleAskDeleteStage,
  };
}
