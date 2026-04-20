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
  Loader2,
} from "lucide-react";
import { CodeEditor, type CodeEditorMarker } from "@/components/ui/CodeEditor";
import type { WebGlobalModel, DiagnosticModel } from "@/lib/ws-api-models";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { Button } from "@/components/ui/Button";
import { CountBadge } from "@/components/ui/CountBadge";
import { StatusDot } from "@/components/ui/StatusDot";
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
 * Правая часть `GlobalModelsPanel`: toolbar (имя+category+actions),
 * Monaco-редактор с WFM C# setup и сводка `Problems` под ним.
 *
 * Всё состояние и api-вызовы — в родителе; компонент принимает коллбеки.
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

  return (
    <>
      <PanelToolbar
        dense
        left={
          <span style={{ display: "inline-flex", alignItems: "center", gap: tok.space[3], minWidth: 0 }}>
            <FileCode2 size={14} style={{ color: tok.color.accent, flexShrink: 0 }} />
            <span
              style={{
                fontSize: tok.font.size.md,
                fontWeight: 600,
                color: tok.color.text.primary,
                fontFamily: "'Consolas','Courier New',monospace",
              }}
            >
              {model.TypeName}
            </span>
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
            {isDirty && <StatusDot tone="accent" size={10} title="Unsaved changes" />}
          </span>
        }
        right={
          <>
            <Button
              size="sm"
              variant="secondary"
              icon={busy === "validating" ? <Loader2 size={13} className="animate-spin" /> : <FileCheck size={13} />}
              onClick={onValidate}
              disabled={busy !== "idle"}
              title="Validate (Ctrl+Shift+V)"
            >
              Validate
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={busy === "formatting" ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
              onClick={onFormat}
              disabled={busy !== "idle"}
              title="Format (Shift+Alt+F)"
            >
              Format
            </Button>
            <Button
              size="sm"
              variant={isDirty ? "primary" : "secondary"}
              icon={busy === "saving" ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              onClick={onSave}
              disabled={busy !== "idle" || !isDirty}
              title="Save (Ctrl+S)"
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<GitCommitHorizontal size={13} />}
              onClick={onOpenCommit}
              disabled={busy !== "idle"}
              title="Commit"
            >
              Commit
            </Button>
          </>
        }
      />

      <div className="flex-1 min-h-0" style={{ background: "var(--color-editor)" }}>
        <CodeEditor
          path={`inmemory://global/${model.Category}/${model.TypeName}.cs`}
          language="csharp"
          value={model.Code ?? ""}
          onChange={onCodeChange}
          theme="wfm-dark"
          markers={codeMarkers}
          markerOwner="wfm-global"
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
