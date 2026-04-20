import {
  Play,
  Save,
  Braces,
  FileCode,
  GitCompareArrows,
  Copy,
  Trash2,
  Package,
  Upload,
  Clock,
  List,
} from "lucide-react";
import type { RefObject } from "react";
import type { DiagnosticModel, ProcessStage, WebProcess } from "@/lib/ws-api-models";
import { IconButton } from "@/components/ui/Button/IconButton";
import { CountBadge } from "@/components/ui/CountBadge";
import { t as tok } from "@/lib/design-tokens";
import { STAGE_TYPE_COLORS } from "../lib/stage-colors";

interface ProcessEditorActionRailProps {
  process: WebProcess;
  stages: Record<string, ProcessStage>;
  activeTab: string;
  /** `null` когда открыт основной редактор (Diagram или StageEditor). */
  specialView: "code" | "diff" | "run" | "global-models" | null;
  setSpecialView: (v: "code" | "diff" | "run" | "global-models" | null) => void;
  /** true — открыт `StageEditor` конкретного стейджа (не диаграмма). */
  isStageOpen: boolean;
  saving: boolean;
  autoSaveEnabled: boolean;
  outlineOpen: boolean;
  compileDiagnostics: DiagnosticModel[];

  onSave: () => void;
  onToggleAutoSave: () => void;
  onToggleOutline: () => void;
  onPack: () => void;
  onUnpackClick: () => void;
  onUnpackFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;

  onOpenUsings: () => void;
  onOpenModelDialog: (kind: "InitObject" | "Context" | "ProcessResult") => void;
  onGotoDiagram: () => void;
  onDeleteStage: (stageName: string) => void;
  /** Обновить процесс (используется для `Startup`). */
  onProcessUpdate: (next: WebProcess) => void;
}

function RailDivider() {
  return <div style={{ width: 20, height: 1, background: tok.color.border.default, margin: "4px 0" }} />;
}

/**
 * Правая панель-«рейл» с action-кнопками редактора процесса: Save / AutoSave /
 * Run / Outline, Pack / Unpack, Code / Diff, Usings / GlobalModels, компиляционные
 * ошибки, InitObject / Context / ProcessResult, и специфичные для StageEditor
 * действия (Set Startup, Go to Diagram, Delete Stage).
 *
 * Вся бизнес-логика остаётся в `ProcessEditor`; здесь только presentational JSX.
 */
export function ProcessEditorActionRail({
  process,
  stages,
  activeTab,
  specialView,
  setSpecialView,
  isStageOpen,
  saving,
  autoSaveEnabled,
  outlineOpen,
  compileDiagnostics,
  onSave,
  onToggleAutoSave,
  onToggleOutline,
  onPack,
  onUnpackClick,
  onUnpackFile,
  fileInputRef,
  onOpenUsings,
  onOpenModelDialog,
  onGotoDiagram,
  onDeleteStage,
  onProcessUpdate,
}: ProcessEditorActionRailProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "6px 4px",
        borderLeft: `1px solid ${tok.color.border.default}`,
        background: tok.color.bg.sidebar,
        width: 36,
        flexShrink: 0,
        overflow: "auto",
      }}
    >
      <IconButton
        variant="ghost"
        size="sm"
        label="Save Process (Ctrl+S)"
        icon={<Save size={15} />}
        onClick={onSave}
        disabled={saving}
      />
      <IconButton
        variant="ghost"
        size="sm"
        label={autoSaveEnabled ? "Auto Save: ON (5s debounce). Click to disable." : "Auto Save: OFF. Click to enable."}
        icon={<Clock size={15} style={{ color: autoSaveEnabled ? "#4caf50" : undefined }} />}
        onClick={onToggleAutoSave}
      />
      <IconButton
        variant={specialView === "run" ? "primary" : "ghost"}
        size="sm"
        label="Run Process"
        icon={<Play size={15} />}
        onClick={() => setSpecialView(specialView === "run" ? null : "run")}
      />
      <IconButton
        variant={outlineOpen ? "primary" : "ghost"}
        size="sm"
        label={outlineOpen ? "Hide Stages Outline" : "Show Stages Outline (Ctrl+Shift+O)"}
        icon={<List size={15} />}
        onClick={onToggleOutline}
      />

      <RailDivider />

      <IconButton
        variant="ghost"
        size="sm"
        label="Pack (download JSON dump of process)"
        icon={<Package size={15} />}
        onClick={onPack}
      />
      <IconButton
        variant="ghost"
        size="sm"
        label="Unpack (load JSON dump from file)"
        icon={<Upload size={15} />}
        onClick={onUnpackClick}
      />
      {/* Скрытый input — используется для Unpack. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={onUnpackFile}
        style={{ display: "none" }}
      />

      <RailDivider />

      <IconButton
        variant={specialView === "code" ? "primary" : "ghost"}
        size="sm"
        label="Code Preview"
        icon={<FileCode size={15} />}
        onClick={() => setSpecialView(specialView === "code" ? null : "code")}
      />
      <IconButton
        variant={specialView === "diff" ? "primary" : "ghost"}
        size="sm"
        label="Diff"
        icon={<GitCompareArrows size={15} />}
        onClick={() => setSpecialView(specialView === "diff" ? null : "diff")}
      />

      <RailDivider />

      <IconButton
        variant="ghost"
        size="sm"
        label="Usings"
        icon={<span style={{ fontSize: 11, fontWeight: 600 }}>U</span>}
        onClick={onOpenUsings}
      />
      <IconButton
        variant={specialView === "global-models" ? "primary" : "ghost"}
        size="sm"
        label="Global Models"
        icon={<span style={{ fontSize: 11, fontWeight: 600 }}>GM</span>}
        onClick={() => setSpecialView(specialView === "global-models" ? null : "global-models")}
      />
      <IconButton
        variant="ghost"
        size="sm"
        label={
          compileDiagnostics.length > 0
            ? `Show Syntax Errors in Code Preview (${compileDiagnostics.length})`
            : "No syntax errors in current process"
        }
        icon={
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: compileDiagnostics.length > 0 ? "#f48771" : undefined,
            }}
          >
            !
          </span>
        }
        badge={
          compileDiagnostics.length > 0 ? (
            <CountBadge value={compileDiagnostics.length} tone="danger" />
          ) : undefined
        }
        onClick={() => setSpecialView("code")}
      />

      <RailDivider />

      <IconButton
        variant="ghost"
        size="sm"
        label="InitObject"
        icon={
          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
            <Braces size={14} />
            <span style={{ fontSize: 8 }}>IO</span>
          </span>
        }
        onClick={() => onOpenModelDialog("InitObject")}
      />
      <IconButton
        variant="ghost"
        size="sm"
        label="Context"
        icon={
          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
            <Braces size={14} />
            <span style={{ fontSize: 8 }}>Ctx</span>
          </span>
        }
        onClick={() => onOpenModelDialog("Context")}
      />
      <IconButton
        variant="ghost"
        size="sm"
        label="ProcessResult"
        icon={
          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
            <Braces size={14} />
            <span style={{ fontSize: 8 }}>Res</span>
          </span>
        }
        onClick={() => onOpenModelDialog("ProcessResult")}
      />

      {isStageOpen && (
        <>
          <RailDivider />
          <IconButton
            variant="ghost"
            size="sm"
            label="Set Startup Stage"
            disabled={process.Startup === activeTab}
            icon={
              <span
                style={{
                  fontSize: 14,
                  transform: "rotate(45deg)",
                  display: "inline-block",
                  color:
                    process.Startup === activeTab
                      ? stages[activeTab]?.Type
                        ? STAGE_TYPE_COLORS[stages[activeTab].Type]
                        : tok.color.text.muted
                      : tok.color.accent,
                }}
              >
                ⇒
              </span>
            }
            onClick={() => onProcessUpdate({ ...process, Startup: activeTab })}
          />
          <IconButton
            variant="ghost"
            size="sm"
            label="Go to Diagram (clone from there)"
            icon={<Copy size={15} />}
            onClick={onGotoDiagram}
          />
        </>
      )}

      <div style={{ flex: 1 }} />

      {isStageOpen && (
        <IconButton
          variant="ghost"
          size="sm"
          label="Delete Stage"
          disabled={process.Startup === activeTab}
          icon={
            <Trash2
              size={15}
              style={{ color: process.Startup === activeTab ? tok.color.text.muted : "#f44336" }}
            />
          }
          onClick={() => onDeleteStage(activeTab)}
        />
      )}
    </div>
  );
}
