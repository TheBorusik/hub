import { useCallback, useMemo, useRef } from "react";
import type { Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import {
  Save,
  FileCheck,
  Wand2,
  GitCommitHorizontal,
  AlertCircle,
  FileCode2,
} from "lucide-react";
import type { CodeEditorMarker } from "@/components/ui/CodeEditor";
import type { WebGlobalModel, DiagnosticModel } from "@/lib/ws-api-models";
import { EditorPanel, type EditorAction } from "@/components/ui/EditorPanel";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { CountBadge } from "@/components/ui/CountBadge";
import { t as tok } from "@/lib/design-tokens";
import { setupWfmCSharp } from "../monaco/wfm-csharp";
import { categoryBadgeColor } from "../lib/global-models";

export type GlobalModelBusyState =
  | "idle"
  | "saving"
  | "validating"
  | "formatting"
  | "committing";

interface GlobalModelEditorProps {
  model: WebGlobalModel;
  onCodeChange: (code: string) => void;
  diagnostics: DiagnosticModel[];
  isDirty: boolean;
  busy: GlobalModelBusyState;
  onValidate: () => void;
  onFormat: () => void;
  onSave: () => void;
  onOpenCommit: () => void;
}

/**
 * Правая часть `GlobalModelsPanel`: заголовок + Monaco-редактор с WFM C#
 * setup и сводкой `Problems` под ним.
 *
 * Заголовок и actions — в единой строке через `<EditorPanel>`, чтобы
 * совпадать со StageEditor / ConfigurationPanel / JsonEditor и прочими.
 */
export function GlobalModelEditor({
  model,
  onCodeChange,
  diagnostics,
  isDirty,
  busy,
  onValidate,
  onFormat,
  onSave,
  onOpenCommit,
}: GlobalModelEditorProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const codeMarkers = useMemo<CodeEditorMarker[]>(
    () =>
      diagnostics.map((d) => ({
        severity: "error",
        message: d.Message || d.Text,
        startLineNumber: Math.max(1, d.StartLine),
        startColumn: Math.max(1, d.StartColumn),
        endLineNumber: Math.max(1, d.EndLine || d.StartLine),
        endColumn: Math.max(1, d.EndColumn || d.StartColumn + 1),
        source: "wfm",
      })),
    [diagnostics],
  );

  const jumpToDiagnostic = useCallback((d: DiagnosticModel) => {
    const editor = editorRef.current;
    if (!editor) return;
    const line = Math.max(1, d.StartLine);
    const col = Math.max(1, d.StartColumn);
    editor.revealPositionInCenter({ lineNumber: line, column: col });
    editor.setPosition({ lineNumber: line, column: col });
    editor.focus();
  }, []);

  const actions: EditorAction[] = [
    {
      id: "validate",
      icon: <FileCheck size={13} />,
      label: "Validate",
      title: "Validate",
      hotkey: "Ctrl+Shift+V",
      onClick: onValidate,
      disabled: busy !== "idle",
      loading: busy === "validating",
    },
    {
      id: "format",
      icon: <Wand2 size={13} />,
      label: "Format",
      title: "Format",
      hotkey: "Shift+Alt+F",
      onClick: onFormat,
      disabled: busy !== "idle",
      loading: busy === "formatting",
    },
    {
      id: "save",
      icon: <Save size={13} />,
      label: "Save",
      title: "Save",
      hotkey: "Ctrl+S",
      onClick: onSave,
      disabled: busy !== "idle" || !isDirty,
      loading: busy === "saving",
      variant: isDirty ? "primary" : "secondary",
    },
    {
      id: "commit",
      icon: <GitCommitHorizontal size={13} />,
      label: "Commit",
      title: "Commit",
      onClick: onOpenCommit,
      disabled: busy !== "idle",
    },
  ];

  return (
    <>
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      <EditorPanel
        title={model.TypeName}
        icon={<FileCode2 size={14} style={{ color: tok.color.accent }} />}
        badge={
          <span
            style={{
              fontSize: 9,
              padding: "1px 5px",
              borderRadius: tok.radius.sm,
              background: categoryBadgeColor(model.Category),
              color: "#1e1e1e",
              fontWeight: 700,
              lineHeight: "14px",
              letterSpacing: 0.4,
              flexShrink: 0,
            }}
          >
            {model.Category}
          </span>
        }
        state={{ dirty: isDirty }}
        actions={actions}
        language="csharp"
        theme="wfm-dark"
        value={model.Code ?? ""}
        onChange={onCodeChange}
        markers={codeMarkers}
        markerOwner="wfm-global"
        path={`inmemory://global/${model.Category}/${model.TypeName}.cs`}
        beforeMount={setupWfmCSharp}
        onMount={(ed, m) => {
          editorRef.current = ed;
          monacoRef.current = m;
        }}
        options={{
          fontSize: 13,
          padding: { top: 6 },
          acceptSuggestionOnEnter: "smart",
          tabCompletion: "on",
          minimap: { enabled: false },
        }}
      />
    </div>

      {diagnostics.length > 0 && (
        <div
          className="shrink-0"
          style={{
            maxHeight: 140,
            overflowY: "auto",
            borderTop: `1px solid ${tok.color.border.default}`,
            background: tok.color.bg.sidebar,
            fontSize: tok.font.size.xs,
          }}
        >
          <PanelHeader
            title="Problems"
            icon={<AlertCircle size={12} style={{ color: tok.color.danger }} />}
            badge={<CountBadge value={diagnostics.length} tone="danger" />}
          />
          {diagnostics.map((d, i) => (
            <button
              key={i}
              onClick={() => jumpToDiagnostic(d)}
              className="flex items-start w-full"
              style={{
                padding: "3px 10px",
                background: "transparent",
                border: "none",
                color: "var(--color-text-primary)",
                cursor: "pointer",
                textAlign: "left",
                gap: 6,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--color-list-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <AlertCircle
                size={12}
                style={{ color: "#f48771", flexShrink: 0, marginTop: 2 }}
              />
              <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {d.Message || d.Text}
              </span>
              <span style={{ color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                [{d.StartLine}:{d.StartColumn}]
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
