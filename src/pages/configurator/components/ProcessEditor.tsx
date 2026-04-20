import { useState, useCallback, useEffect, useMemo } from "react";
import type { HubWsApi } from "@/lib/ws-api";
import type {
  ProcessModel, WebProcess,
  CRUDModelInfo, AdapterCommandInfo, AdapterEventInfo,
} from "@/lib/ws-api-models";
import type { OpenTab } from "../types";
import { StagesOutline } from "./StagesOutline";
import { ModelClassDialog } from "./ModelClassDialog";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { AddStageDialog } from "./AddStageDialog";
import { QuickPickDialog, type QuickPickItem } from "./QuickPickDialog";
import { UsingsDialog } from "./UsingsDialog";
import { recomputeReturnStages } from "../utils/recomputeReturnStages";
import { useToast } from "@/providers/ToastProvider";
import { useNotifications } from "@/providers/NotificationsProvider";
import { useProblems } from "@/providers/ProblemsProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { compileProblemSourceFor } from "../lib/publish-compile-problems";
import { STAGE_TYPE_COLORS } from "../lib/stage-colors";
import { ProcessEditorActionRail } from "./ProcessEditorActionRail";
import { ProcessBreadcrumbs, type SpecialView } from "./ProcessBreadcrumbs";
import { ProcessTabsBar } from "./ProcessTabsBar";
import { ProcessContent } from "./ProcessContent";
import { buildProcessPaletteItems } from "./processQuickPickPalette";
import { useStageDirtyTracking } from "../lib/useStageDirtyTracking";
import { useProcessSave, useAutoSave } from "../lib/useProcessSave";
import { useProcessPack } from "../lib/useProcessPack";
import { useStageMutations } from "../lib/useStageMutations";
import { useProcessHotkeys } from "../lib/useProcessHotkeys";
import { usePersistedToggle } from "../lib/usePersistedToggle";

interface ProcessEditorProps {
  tab: OpenTab;
  api: HubWsApi;
  allModels: ProcessModel[];
  crudModels: CRUDModelInfo[];
  commands: AdapterCommandInfo[];
  events: AdapterEventInfo[];
  onProcessUpdate: (process: WebProcess) => void;
  onSaved?: () => void;
  /** Открыть подпроцесс по его `Name` (как в `[Process("...")]`). */
  onOpenSubProcess?: (processName: string) => void;
}

/**
 * Главный редактор процесса. Оркестратор:
 *  - <ProcessBreadcrumbs>      — путь Catalog/Process/Stage|View
 *  - <ProcessTabsBar>          — Diagram + per-stage tabs (dirty/closable)
 *  - <ProcessContent>          — switch активного контента
 *  - <StagesOutline>           — collapsible right sidebar
 *  - <ProcessEditorActionRail> — IconButton-стек справа
 *
 * Бизнес-логика — в хуках `lib/useProcess*` / `lib/useStage*`.
 */
export function ProcessEditor({
  tab, api, allModels, crudModels, commands, events,
  onProcessUpdate, onSaved, onOpenSubProcess,
}: ProcessEditorProps) {
  const confirm = useConfirm();
  const toast = useToast();
  const notifications = useNotifications();
  const problems = useProblems();
  const { navigateTo } = useNavigation();

  const process = tab.process;

  const [openStageTabs, setOpenStageTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("__diagram__");
  const [specialView, setSpecialView] = useState<SpecialView>(null);
  const [modelDialog, setModelDialog] = useState<"InitObject" | "Context" | "ProcessResult" | null>(null);
  const [createStagePrefill, setCreateStagePrefill] = useState<string | null>(null);
  const [quickPick, setQuickPick] = useState<"stages" | "palette" | null>(null);
  const [usingsDialogOpen, setUsingsDialogOpen] = useState(false);

  const onAutoSaveToast = useCallback(
    (next: boolean) => toast.push("info", next ? "Auto Save: ON" : "Auto Save: OFF", { duration: 1500 }),
    [toast],
  );
  const [autoSaveEnabled, toggleAutoSave] = usePersistedToggle("wfm_autosave", false, onAutoSaveToast);
  const [outlineOpen, toggleOutline] = usePersistedToggle("wfm_outline");

  const { dirtyStages, reset: resetDirtySnapshot } = useStageDirtyTracking(process);

  // Смена процесса — сбрасываем UI-стейт редактора.
  useEffect(() => {
    setActiveTab("__diagram__");
    setOpenStageTabs([]);
    setSpecialView(null);
  }, [process?.TypeName]);

  const {
    saving, validating, compileDiagnostics, setCompileDiagnostics,
    handleSave, handleValidateProcess,
  } = useProcessSave({
    api, process, toast, notifications, problems, navigateTo,
    onSavedSnapshot: resetDirtySnapshot, onSaved,
  });

  useAutoSave({ enabled: autoSaveEnabled, process, saving, dirtyCount: dirtyStages.size, handleSave });

  const { fileInputRef, handlePack, handleUnpackClick, handleUnpackFile } = useProcessPack({
    process, toast, notifications, onProcessUpdate,
  });

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

  const openStageEditor = useCallback((stageName: string) => {
    setOpenStageTabs((prev) => prev.includes(stageName) ? prev : [...prev, stageName]);
    setActiveTab(stageName);
    setSpecialView(null);
  }, []);

  const renameStageInTabs = useCallback((oldName: string, newName: string) => {
    setOpenStageTabs((prev) => prev.map((t) => t === oldName ? newName : t));
    setActiveTab((prev) => prev === oldName ? newName : prev);
  }, []);

  const {
    handleStageUpdate, handleStageRename, handleModelUpdate,
    handleCreateStageFromDialog, handleCreateProperty, handleAskDeleteStage,
  } = useStageMutations({
    process, onProcessUpdate, confirm,
    onCloseStageTab: closeStageTab,
    onStageRenamedTabs: renameStageInTabs,
    onStageCreated: openStageEditor,
    setCreateStagePrefill, setModelDialog,
  });

  const handleOpenOrCreateStage = useCallback((name: string) => {
    if (!process) return;
    if (process.Stages?.[name]) openStageEditor(name);
    else setCreateStagePrefill(name);
  }, [process, openStageEditor]);

  const gotoDiagram = useCallback(() => {
    setActiveTab("__diagram__");
    setSpecialView(null);
  }, []);

  useProcessHotkeys({
    onSave: handleSave,
    onQuickOpenStages: useCallback(() => setQuickPick("stages"), []),
  });

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
  const isStageOpen = activeTab !== "__diagram__" && !specialView && !!stages[activeTab];

  const handleApplyCode = (next: WebProcess) => {
    // Сохраняем существующий WebData — сервер при парсинге кода
    // не знает про раскладку на диаграмме.
    const merged: WebProcess = { ...next, WebData: process.WebData ?? next.WebData };
    onProcessUpdate(recomputeReturnStages(merged));
    // Apply вызывается только если createProcessAssembly не вернул
    // ошибок — компиляция валидна, индикатор можно очистить.
    setCompileDiagnostics([]);
    problems.clearSource(compileProblemSourceFor(next.TypeName));
    toast.push("success", `Code applied to ${next.TypeName}`);
  };

  const stagesQuickPickItems = useMemo<QuickPickItem[]>(
    () => Object.values(stages).map((s) => ({
      id: s.Name,
      label: s.Name,
      description: s.DisplayName && s.DisplayName !== s.Name ? s.DisplayName : undefined,
      detail: s.Type.replace("Definition", ""),
      iconColor: STAGE_TYPE_COLORS[s.Type] ?? "#888",
      searchHay: `${s.DisplayName ?? ""} ${s.Type}`,
      action: () => openStageEditor(s.Name),
    })),
    [stages, openStageEditor],
  );

  const paletteItems = useMemo<QuickPickItem[]>(
    () => buildProcessPaletteItems({
      process, activeTab, isStageOpen, autoSaveEnabled,
      setSpecialView, onGotoDiagram: gotoDiagram,
      setUsingsDialogOpen, setModelDialog, setCreateStagePrefill,
      onProcessUpdate,
      handleSave, handleValidateProcess, handlePack, handleUnpackClick,
      toggleAutoSave, handleAskDeleteStage,
    }),
    [
      process, activeTab, isStageOpen, autoSaveEnabled,
      gotoDiagram, onProcessUpdate,
      handleSave, handleValidateProcess, handlePack, handleUnpackClick,
      toggleAutoSave, handleAskDeleteStage,
    ],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ProcessBreadcrumbs
        process={process}
        activeTab={activeTab}
        specialView={specialView}
        isDiagram={isDiagram}
        isStageOpen={isStageOpen}
        stages={stages}
        onGotoDiagram={gotoDiagram}
      />
      <ProcessTabsBar
        activeId={specialView ? "__none__" : activeTab}
        openStageTabs={openStageTabs}
        stages={stages}
        dirtyStages={dirtyStages}
        onChange={(id) => { setActiveTab(id); setSpecialView(null); }}
        onCloseStageTab={closeStageTab}
      />

      <div className="flex-1 overflow-hidden" style={{ display: "flex" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <ProcessContent
            api={api}
            process={process}
            stages={stages}
            stageNames={stageNames}
            activeTab={activeTab}
            specialView={specialView}
            isDiagram={isDiagram}
            isStageOpen={isStageOpen}
            validating={validating}
            allModels={allModels}
            crudModels={crudModels}
            commands={commands}
            events={events}
            onProcessUpdate={onProcessUpdate}
            onSelectStage={openStageEditor}
            onShowModel={(m) => setModelDialog(m)}
            onSave={handleSave}
            onValidate={handleValidateProcess}
            onApplyCode={handleApplyCode}
            onStageUpdate={handleStageUpdate}
            onStageRename={handleStageRename}
            onOpenOrCreateStage={handleOpenOrCreateStage}
            onCreateProperty={handleCreateProperty}
            onOpenSubProcess={onOpenSubProcess}
          />
        </div>

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
          isStageOpen={isStageOpen}
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
          items={stagesQuickPickItems}
          onClose={() => setQuickPick(null)}
        />
      )}

      {quickPick === "palette" && (
        <QuickPickDialog
          placeholder="Type command..."
          items={paletteItems}
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
