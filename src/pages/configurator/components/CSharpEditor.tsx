import { useCallback, useEffect, useId, useRef } from "react";
import type { Monaco } from "@monaco-editor/react";
import type * as MonacoNs from "monaco-editor";
import { EditorPanel, type EditorAction } from "@/components/ui/EditorPanel";
import {
  setupWfmCSharp,
  attachWfmContext,
  registerStageEditorActions,
  type StageEditorActionCallbacks,
} from "../monaco/wfm-csharp";

export interface CSharpEditorProps {
  value: string;
  onChange: (v: string) => void;
  /** Заголовок панели. Если не задан — заголовок не рисуется. */
  label?: string;
  stageNames: string[];
  currentStageName: string;
  processResultName: string;
  /** Monaco-actions внутри редактора (Shift+Alt+F, Alt+Enter и т.п.). */
  actions?: StageEditorActionCallbacks;
  /**
   * Кнопки в правой части заголовка (label, Format, Save и т.п.). Приходят
   * полностью от consumer'а — EditorPanel сам ничего не добавляет.
   */
  headerActions?: EditorAction[];
}

/**
 * Обёртка над `<EditorPanel>` для C# полей процесса (GetData / GetNextStage /
 * GetErrorNextStage). Добавляет WFM-specific language server
 * (`setupWfmCSharp`), держит актуальный completion-context в ref и
 * регистрирует Monaco-actions (Alt+Enter / Ctrl+Alt+Enter / Shift+Alt+F) через
 * `registerStageEditorActions`.
 *
 * Общий visual (хидер, цвет, высота, padding) — через EditorPanel, чтобы
 * не расходиться с остальными редакторами приложения.
 */
export function CSharpEditor({
  value,
  onChange,
  label,
  stageNames,
  currentStageName,
  processResultName,
  actions,
  headerActions,
}: CSharpEditorProps) {
  const uid = useId();
  const path = `inmemory://stage/${uid}/${label ?? "body"}`;

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
    <EditorPanel
      title={label}
      showHeader={!!label}
      language="csharp"
      theme="wfm-dark"
      value={value}
      onChange={(next) => { if (next !== value) onChange(next); }}
      path={path}
      actions={headerActions}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      options={{
        fontSize: 13,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        padding: { top: 4 },
        wordWrap: "on",
        // "smart" — как в VS Code: Enter принимает подсказку только когда
        // она явно выбрана (стрелками) или явно подсвечена; в остальных
        // случаях Enter работает как перенос строки.
        acceptSuggestionOnEnter: "smart",
        quickSuggestions: { other: true, comments: false, strings: false },
        suggestOnTriggerCharacters: true,
        tabCompletion: "on",
        minimap: { enabled: false },
      }}
    />
  );
}
