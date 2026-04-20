import { useCallback, useEffect, useId, useRef } from "react";
import type { Monaco } from "@monaco-editor/react";
import type * as MonacoNs from "monaco-editor";
import { CodeEditor } from "@/components/ui/CodeEditor";
import {
  setupWfmCSharp,
  attachWfmContext,
  registerStageEditorActions,
  type StageEditorActionCallbacks,
} from "../monaco/wfm-csharp";

export interface CSharpEditorProps {
  value: string;
  onChange: (v: string) => void;
  label: string;
  stageNames: string[];
  currentStageName: string;
  processResultName: string;
  actions?: StageEditorActionCallbacks;
}

/**
 * Тонкая обёртка вокруг `<CodeEditor>` специально для C#-полей процесса
 * (`GetData`, `GetNextStage`, `GetErrorNextStage`): прописывает тему
 * `wfm-dark`, подключает WFM-специфичный language server (`setupWfmCSharp`),
 * держит актуальный WFM-контекст (список стейджей, текущий стейдж, имя
 * ProcessResult) в `ref`, чтобы completion provider всегда видел свежие
 * значения без перерегистрации, и подключает Alt+Enter / Ctrl+Alt+Enter
 * actions через `registerStageEditorActions`.
 */
export function CSharpEditor({
  value,
  onChange,
  label,
  stageNames,
  currentStageName,
  processResultName,
  actions,
}: CSharpEditorProps) {
  const uid = useId();
  const path = `inmemory://stage/${uid}/${label}`;

  const ctxRef = useRef({ stageNames, currentStageName, processResultName });
  useEffect(() => {
    ctxRef.current = { stageNames, currentStageName, processResultName };
  }, [stageNames, currentStageName, processResultName]);

  const actionsRef = useRef<StageEditorActionCallbacks>(actions ?? {});
  useEffect(() => {
    actionsRef.current = actions ?? {};
  }, [actions]);

  const detachRef = useRef<(() => void) | null>(null);
  const actionDisposablesRef = useRef<MonacoNs.IDisposable[]>([]);
  const editorRef = useRef<MonacoNs.editor.IStandaloneCodeEditor | null>(null);

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    setupWfmCSharp(monaco);
  }, []);

  const handleMount = useCallback(
    (editor: MonacoNs.editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor;
      const uri = editor.getModel()?.uri.toString();
      if (uri) {
        detachRef.current = attachWfmContext(uri, () => ctxRef.current);
      }
      actionDisposablesRef.current = registerStageEditorActions(
        editor,
        monaco,
        () => actionsRef.current,
      );
    },
    [],
  );

  useEffect(() => {
    return () => {
      detachRef.current?.();
      detachRef.current = null;
      for (const d of actionDisposablesRef.current) d.dispose();
      actionDisposablesRef.current = [];
      editorRef.current = null;
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {label && (
        <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600, padding: "4px 6px", flexShrink: 0 }}>
          {label}
        </span>
      )}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <CodeEditor
          path={path}
          language="csharp"
          value={value}
          onChange={(next) => { if (next !== value) onChange(next); }}
          theme="wfm-dark"
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          wordWrap="on"
          options={{
            fontSize: 13,
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            padding: { top: 4 },
            // "smart" — как в VS Code: Enter принимает подсказку только когда
            // она явно выбрана (стрелками) или явно подсвечена; в остальных
            // случаях Enter работает как перенос строки.
            acceptSuggestionOnEnter: "smart",
            quickSuggestions: { other: true, comments: false, strings: false },
            suggestOnTriggerCharacters: true,
            tabCompletion: "on",
          }}
        />
      </div>
    </div>
  );
}
