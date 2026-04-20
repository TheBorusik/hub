import type { WebProcess } from "@/lib/ws-api-models";
import type { QuickPickItem } from "./QuickPickDialog";
import type { SpecialView } from "./ProcessBreadcrumbs";

interface BuildPaletteArgs {
  process: WebProcess;
  activeTab: string;
  isStageOpen: boolean;
  autoSaveEnabled: boolean;
  setSpecialView: (v: SpecialView) => void;
  onGotoDiagram: () => void;
  setUsingsDialogOpen: (v: boolean) => void;
  setModelDialog: (kind: "InitObject" | "Context" | "ProcessResult") => void;
  setCreateStagePrefill: (v: string) => void;
  onProcessUpdate: (next: WebProcess) => void;
  handleSave: () => Promise<void>;
  handleValidateProcess: () => Promise<void>;
  handlePack: () => void;
  handleUnpackClick: () => void;
  toggleAutoSave: () => void;
  handleAskDeleteStage: (name: string) => void;
}

/**
 * Сборка items для палитры команд `Ctrl+Shift+P`-style (для текущего процесса).
 * Чисто функция — без UI, чтобы не мешать оркестратору `ProcessEditor.tsx`.
 */
export function buildProcessPaletteItems(args: BuildPaletteArgs): QuickPickItem[] {
  const {
    process, activeTab, isStageOpen, autoSaveEnabled,
    setSpecialView, onGotoDiagram, setUsingsDialogOpen, setModelDialog,
    setCreateStagePrefill, onProcessUpdate,
    handleSave, handleValidateProcess, handlePack, handleUnpackClick,
    toggleAutoSave, handleAskDeleteStage,
  } = args;

  const base: QuickPickItem[] = [
    { id: "save", label: "Save Process", detail: "Ctrl+S", action: () => { void handleSave(); } },
    { id: "run", label: "Run Process", action: () => setSpecialView("run") },
    { id: "diagram", label: "Show Diagram", action: onGotoDiagram },
    { id: "code", label: "Show Code Preview", action: () => setSpecialView("code") },
    { id: "diff", label: "Show Diff", action: () => setSpecialView("diff") },
    { id: "usings", label: "Edit Usings", action: () => setUsingsDialogOpen(true) },
    { id: "global-models", label: "Show Global Models", action: () => setSpecialView("global-models") },
    { id: "io", label: "Edit InitObject", action: () => setModelDialog("InitObject") },
    { id: "ctx", label: "Edit Context", action: () => setModelDialog("Context") },
    { id: "res", label: "Edit ProcessResult", action: () => setModelDialog("ProcessResult") },
    { id: "add-stage", label: "Add Stage...", action: () => setCreateStagePrefill("") },
    { id: "pack", label: "Pack (download JSON dump)", action: handlePack },
    { id: "unpack", label: "Unpack (load JSON dump)", action: handleUnpackClick },
    {
      id: "toggle-autosave",
      label: `Auto Save: ${autoSaveEnabled ? "ON (turn off)" : "OFF (turn on)"}`,
      action: toggleAutoSave,
    },
    { id: "validate", label: "Validate Process", action: () => { void handleValidateProcess(); } },
  ];

  if (!isStageOpen) return base;

  const stageItems: QuickPickItem[] = [
    {
      id: "rename-stage",
      label: "Rename Current Stage",
      detail: "F2",
      // StageHeader сам ловит F2 — это просто подсказка.
      action: () => { /* noop */ },
    },
  ];
  if (process.Startup !== activeTab) {
    stageItems.push({
      id: "set-startup",
      label: `Set Startup: ${activeTab}`,
      action: () => onProcessUpdate({ ...process, Startup: activeTab }),
    });
    stageItems.push({
      id: "delete-stage",
      label: `Delete Stage: ${activeTab}`,
      action: () => handleAskDeleteStage(activeTab),
    });
  }
  return [...base, ...stageItems];
}
