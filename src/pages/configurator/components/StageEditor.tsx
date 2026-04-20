import { useCallback } from "react";
import { Group, Panel } from "react-resizable-panels";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { useAutoSaveLayout } from "@/hooks/useAutoSaveLayout";
import type { HubWsApi } from "@/lib/ws-api";
import type {
  ProcessModel, ProcessStage,
  CRUDModelInfo, AdapterCommandInfo, AdapterEventInfo,
} from "@/lib/ws-api-models";
import { useToast } from "@/providers/ToastProvider";
import { CSharpEditor } from "./CSharpEditor";
import { NextStageWithError } from "./NextStageWithError";
import { StageHeader } from "./StageHeader";
import { StagePropertiesRow } from "./StagePropertiesRow";
import {
  getDataLabel,
  stageHasGetData,
  stageHasGetNextStage,
  stageHasGetErrorNextStage,
} from "../lib/stage-type-helpers";
import { useStageEditorActions } from "../lib/useStageEditorActions";

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

/**
 * Редактор одного stage процесса. Оркестратор:
 *  - <StageHeader>          — Display Name / Name + type-badge + F2 rename
 *  - <StagePropertiesRow>   — autocomplete row (CRUD / Command / Sub / Event)
 *  - <CSharpEditor>×N       — GetData / GetNextStage / GetErrorNextStage
 *  - useStageEditorActions  — Monaco actions (Shift+Alt+F, Alt+Enter, Ctrl+Alt+*)
 */
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
  const hLayout = useAutoSaveLayout(`stage-h-${stageName}`);
  const showData = stageHasGetData(stage.Type);
  const showNext = stageHasGetNextStage(stage.Type);
  const showError = stageHasGetErrorNextStage(stage.Type);
  // initial collapsed-состояние «Get Error Next Stage»: открыт если уже
  // есть код. Дальше им управляет сам `<NextStageWithError>` через panelRef.
  const errorInitiallyOpen = !!stage.GetErrorNextStage?.trim();

  const updateField = useCallback(
    <K extends keyof ProcessStage>(key: K, value: ProcessStage[K]) => {
      onUpdate({ ...stage, [key]: value });
    },
    [stage, onUpdate],
  );

  const editorActions = useStageEditorActions({
    api,
    toast,
    stage,
    onOpenOrCreateStage,
    onCreateProperty,
  });

  const renderDataEditor = () => (
    <CSharpEditor
      label={getDataLabel(stage.Type)}
      value={stage.GetData ?? ""}
      onChange={(v) => updateField("GetData", v)}
      stageNames={allStageNames}
      currentStageName={stageName}
      processResultName={processResultName}
      actions={editorActions}
    />
  );

  const renderNextEditor = () =>
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
    );

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--color-editor)" }}>
      <StageHeader
        stageName={stageName}
        stage={stage}
        onChangeDisplayName={(v) => updateField("DisplayName", v)}
        onRename={onRename}
      />
      <StagePropertiesRow
        stage={stage}
        allModels={allModels}
        crudModels={crudModels}
        commands={commands}
        events={events}
        onUpdate={onUpdate}
        onOpenSubProcess={onOpenSubProcess}
      />

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {showData && showNext ? (
          <Group orientation="horizontal" id={`stage-h-${stageName}`} {...hLayout}>
            <Panel id="data" defaultSize={50} minSize={20}>
              {renderDataEditor()}
            </Panel>
            <ResizeHandle />
            <Panel id="next" defaultSize={50} minSize={20}>
              {renderNextEditor()}
            </Panel>
          </Group>
        ) : showData && !showNext ? (
          renderDataEditor()
        ) : showNext ? (
          renderNextEditor()
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-muted)",
              fontSize: 13,
            }}
          >
            No code editors for this stage type
          </div>
        )}
      </div>
    </div>
  );
}
