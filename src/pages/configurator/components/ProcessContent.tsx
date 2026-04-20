import type { HubWsApi } from "@/lib/ws-api";
import type {
  ProcessModel, WebProcess, ProcessStage,
  CRUDModelInfo, AdapterCommandInfo, AdapterEventInfo,
} from "@/lib/ws-api-models";
import { StageEditor } from "./StageEditor";
import { ProcessDiagram } from "./ProcessDiagram";
import { CodePreview } from "./CodePreview";
import { DiffView } from "./DiffView";
import { RunProcessPanel } from "./RunProcessPanel";
import { GlobalModelsPanel } from "./GlobalModelsPanel";
import type { SpecialView } from "./ProcessBreadcrumbs";

interface ProcessContentProps {
  api: HubWsApi;
  process: WebProcess;
  stages: Record<string, ProcessStage>;
  stageNames: string[];
  activeTab: string;
  specialView: SpecialView;
  isDiagram: boolean;
  isStageOpen: boolean;
  validating: boolean;
  allModels: ProcessModel[];
  crudModels: CRUDModelInfo[];
  commands: AdapterCommandInfo[];
  events: AdapterEventInfo[];
  onProcessUpdate: (next: WebProcess) => void;
  onSelectStage: (name: string) => void;
  onShowModel: (m: "InitObject" | "Context" | "ProcessResult") => void;
  onSave: () => void;
  onValidate: () => Promise<void>;
  onApplyCode: (next: WebProcess) => void;
  onStageUpdate: (stageName: string, stage: ProcessStage) => void;
  onStageRename: (oldName: string, newName: string) => void;
  onOpenOrCreateStage: (name: string) => void;
  onCreateProperty: (kind: "Context" | "InitObject" | "ProcessResult", propName: string) => void;
  onOpenSubProcess?: (processName: string) => void;
}

/**
 * Switch активного контента: один из 6 view-режимов
 * (Code / Diff / Run / GlobalModels / Diagram / StageEditor) или placeholder.
 * Полностью презентационный — никакого state.
 */
export function ProcessContent({
  api, process, stages, stageNames, activeTab, specialView,
  isDiagram, isStageOpen, validating,
  allModels, crudModels, commands, events,
  onProcessUpdate, onSelectStage, onShowModel,
  onSave, onValidate, onApplyCode,
  onStageUpdate, onStageRename, onOpenOrCreateStage, onCreateProperty,
  onOpenSubProcess,
}: ProcessContentProps) {
  if (specialView === "code") {
    return <CodePreview api={api} process={process} onApplyToProcess={onApplyCode} />;
  }
  if (specialView === "diff") return <DiffView api={api} process={process} />;
  if (specialView === "run") return <RunProcessPanel api={api} processName={process.TypeName} />;
  if (specialView === "global-models") return <GlobalModelsPanel api={api} />;

  if (isDiagram) {
    return (
      <ProcessDiagram
        process={process}
        onProcessUpdate={onProcessUpdate}
        onSelectStage={onSelectStage}
        onSave={onSave}
        onShowModel={onShowModel}
        onValidate={onValidate}
        validating={validating}
        onOpenSubProcess={onOpenSubProcess}
      />
    );
  }
  if (isStageOpen) {
    return (
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
        onUpdate={(s) => onStageUpdate(activeTab, s)}
        onRename={onStageRename}
        onOpenOrCreateStage={onOpenOrCreateStage}
        onCreateProperty={onCreateProperty}
        onOpenSubProcess={onOpenSubProcess}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center h-full"
      style={{ color: "var(--color-text-muted)", fontSize: 13 }}
    >
      Select a stage from the diagram
    </div>
  );
}
