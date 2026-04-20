import { useMemo } from "react";
import type { HubWsApi } from "@/lib/ws-api";
import type { ProcessStage } from "@/lib/ws-api-models";
import type { useToast } from "@/providers/ToastProvider";
import type { StageEditorActionCallbacks } from "../monaco/wfm-csharp";
import { extractProcessResult } from "./stage-type-helpers";

type ToastApi = ReturnType<typeof useToast>;

interface UseStageEditorActionsArgs {
  api: HubWsApi;
  toast: ToastApi;
  stage: ProcessStage;
  onOpenOrCreateStage?: (name: string) => void;
  onCreateProperty?: (
    modelKind: "Context" | "InitObject" | "ProcessResult",
    propName: string,
  ) => void;
}

/**
 * Колбэки Monaco actions редактора C#-стейджа:
 *  - Shift+Alt+F   → format через `api.formatCode`
 *  - Alt+Enter     → openOrCreateStage(name) (родитель решает open/create)
 *  - Ctrl+Alt+Enter→ createProperty(kind, propName)
 *  - Ctrl+Alt+R    → insert ReturnProperties (читает CRUD GetProperties с сервера)
 *  - Ctrl+Alt+P    → insert InitObjectStructure подпроцесса
 *
 * Вынесено из `StageEditor.tsx` чтобы оркестратор остался ≤ 300 строк.
 */
export function useStageEditorActions({
  api,
  toast,
  stage,
  onOpenOrCreateStage,
  onCreateProperty,
}: UseStageEditorActionsArgs): StageEditorActionCallbacks {
  const model = stage.Properties?.Model;
  const processTypeName = stage.Properties?.ProcessTypeName;

  return useMemo<StageEditorActionCallbacks>(
    () => ({
      onFormat: async (code: string) => {
        try {
          const resp = await api.formatCode(code);
          return resp?.Code ?? null;
        } catch (e) {
          console.error("FormatCode failed", e);
          toast.push("error", "Format failed", {
            detail: e instanceof Error ? e.message : String(e),
          });
          return null;
        }
      },
      onStageRefFromReturn: (name: string) => onOpenOrCreateStage?.(name),
      onCreateProperty: (kind, prop) => onCreateProperty?.(kind, prop),
      onInsertReturnProperties: async (editor) => {
        if (!model) {
          toast.push("warning", "CRUD Model is empty", {
            detail: "Fill in 'Model' to insert ReturnProperties.",
          });
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
          insertAtCursor(editor, `ReturnProperties = new[] {\n${lines.join(",\n")}\n\t}`, "wfm-insert-rp");
        } catch (e) {
          console.error("GetProperties failed", e);
          toast.push("error", "Failed to load CRUD properties", {
            detail: e instanceof Error ? e.message : String(e),
          });
        }
      },
      onInsertInitObjectStructure: async (editor) => {
        if (!processTypeName) {
          toast.push("warning", "ProcessTypeName is empty", {
            detail: "Select a sub-process first.",
          });
          return;
        }
        try {
          const raw = await api.executeProcess("System.WFM.Process.GetInitObjectStructure", {
            ProcessTypeName: processTypeName,
          });
          const result = extractProcessResult(raw);
          const text = (result?.InitObjectStructure as string | undefined) ?? "";
          if (!text) {
            toast.push("warning", `No InitObject structure for '${processTypeName}'`);
            return;
          }
          insertAtCursor(editor, text, "wfm-insert-ios");
        } catch (e) {
          console.error("GetInitObjectStructure failed", e);
          toast.push("error", "Failed to load InitObject structure", {
            detail: e instanceof Error ? e.message : String(e),
          });
        }
      },
    }),
    [api, toast, model, processTypeName, onOpenOrCreateStage, onCreateProperty],
  );
}

function insertAtCursor(
  editor: Parameters<NonNullable<StageEditorActionCallbacks["onInsertReturnProperties"]>>[0],
  text: string,
  source: string,
): void {
  const pos = editor.getPosition();
  if (!pos) return;
  editor.executeEdits(source, [
    {
      range: {
        startLineNumber: pos.lineNumber,
        endLineNumber: pos.lineNumber,
        startColumn: pos.column,
        endColumn: pos.column,
      },
      text,
      forceMoveMarkers: true,
    },
  ]);
  editor.focus();
}
