import { useEffect, useRef, type CSSProperties } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type * as MonacoNs from "monaco-editor";
import { t } from "@/lib/design-tokens";
import { ensureHubDarkTheme } from "./MonacoProvider";

export type CodeEditorLanguage =
  | "csharp"
  | "json"
  | "javascript"
  | "typescript"
  | "xml"
  | "sql"
  | "markdown"
  | "plaintext"
  | "yaml"
  | "html"
  | "css";

export interface CodeEditorMarker {
  message: string;
  severity: "error" | "warning" | "info";
  startLineNumber: number;
  startColumn: number;
  endLineNumber?: number;
  endColumn?: number;
  source?: string;
}

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language: CodeEditorLanguage;
  readOnly?: boolean;
  /** Уникальный путь модели. Нужен, чтобы не перемешивать модели между табами. */
  path?: string;
  /** Тема. default: определяется языком: csharp → "wfm-dark" (регистрируется снаружи), иначе "hub-dark". */
  theme?: string;
  /** Minimap. default: false — экономим пространство в боковых панелях. */
  minimap?: boolean;
  /** Folding. default: true. */
  folding?: boolean;
  /** Word wrap. default: "off". */
  wordWrap?: "off" | "on" | "bounded";
  /** Высота CSS. default: "100%". */
  height?: number | string;
  /** Ширина CSS. default: "100%". */
  width?: number | string;
  /** Вызывается один раз после монтирования Monaco. */
  onMount?: (editor: MonacoNs.editor.IStandaloneCodeEditor, monaco: Monaco) => void;
  /**
   * Вызывается до монтирования редактора, как только Monaco загружен. Нужен для
   * регистрации тем/языков до того, как редактор попробует применить
   * `theme` — иначе на секунду может мигнуть дефолтная тема.
   */
  beforeMount?: (monaco: Monaco) => void;
  /** Маркеры (ошибки/варнинги). Обновляются при каждом рендере. */
  markers?: CodeEditorMarker[];
  /** Имя owner'а для маркеров. default: "hub". */
  markerOwner?: string;
  /** Доп. опции Monaco (переопределяют встроенные). */
  options?: MonacoNs.editor.IStandaloneEditorConstructionOptions;
  className?: string;
  style?: CSSProperties;
  /** Для ARIA. */
  "aria-label"?: string;
}

const LANG_TO_THEME: Partial<Record<CodeEditorLanguage, string>> = {
  csharp: "wfm-dark",
};

const SEVERITY_TO_MARKER: Record<
  CodeEditorMarker["severity"],
  (monaco: Monaco) => MonacoNs.MarkerSeverity
> = {
  error: (m) => m.MarkerSeverity.Error,
  warning: (m) => m.MarkerSeverity.Warning,
  info: (m) => m.MarkerSeverity.Info,
};

/**
 * Тонкая обёртка над @monaco-editor/react. Задача:
 *   - фон редактора совпадает с token-ом `--color-editor`;
 *   - тема выбирается по языку (wfm-dark для C#, hub-dark для остальных);
 *   - экспорт маркеров через декларативный пропс — без лишних refs у consumer-а;
 *   - минимум «vscode-смотрится» настроек по умолчанию.
 *
 * Не регистрирует WFM C# сама — это ответственность Configurator (он уже
 * вызывает setupWfmCSharp).
 */
export function CodeEditor({
  value,
  onChange,
  language,
  readOnly,
  path,
  theme,
  minimap = false,
  folding = true,
  wordWrap = "off",
  height = "100%",
  width = "100%",
  onMount,
  beforeMount,
  markers,
  markerOwner = "hub",
  options,
  className,
  style,
  "aria-label": ariaLabel,
}: CodeEditorProps) {
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<MonacoNs.editor.IStandaloneCodeEditor | null>(null);
  const themeRegistered = useRef(false);

  const effectiveTheme = theme ?? LANG_TO_THEME[language] ?? "hub-dark";

  const applyMarkers = (ms: CodeEditorMarker[] | undefined) => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;
    const model = editor.getModel();
    if (!model) return;
    if (!ms || ms.length === 0) {
      monaco.editor.setModelMarkers(model, markerOwner, []);
      return;
    }
    monaco.editor.setModelMarkers(
      model,
      markerOwner,
      ms.map((m) => ({
        severity: SEVERITY_TO_MARKER[m.severity](monaco),
        message: m.message,
        startLineNumber: m.startLineNumber,
        startColumn: m.startColumn,
        endLineNumber: m.endLineNumber ?? m.startLineNumber,
        endColumn: m.endColumn ?? m.startColumn + 1,
        source: m.source,
      })),
    );
  };

  useEffect(() => {
    applyMarkers(markers);
    // Deliberately depend on markers only; monaco/editor refs don't need deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, markerOwner]);

  const handleMount = (editor: MonacoNs.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    ensureHubDarkTheme(monaco, themeRegistered);
    applyMarkers(markers);
    onMount?.(editor, monaco);
  };

  return (
    <div
      className={className}
      aria-label={ariaLabel}
      style={{
        width,
        height,
        minHeight: 0,
        background: t.color.bg.editor,
        ...style,
      }}
    >
      <Editor
        value={value}
        onChange={(v) => onChange?.(v ?? "")}
        language={language}
        path={path}
        theme={effectiveTheme}
        beforeMount={(monaco) => {
          // Регистрируем hub-dark заранее — для c#-редакторов wfm-dark
          // регистрируется через beforeMount consumer-а.
          ensureHubDarkTheme(monaco, themeRegistered);
          beforeMount?.(monaco);
        }}
        onMount={handleMount}
        options={{
          readOnly: readOnly,
          minimap: { enabled: minimap },
          folding,
          wordWrap,
          fontFamily: "Consolas, 'Courier New', monospace",
          fontSize: 14,
          lineNumbers: "on",
          renderLineHighlight: "line",
          scrollBeyondLastLine: false,
          scrollbar: {
            useShadows: false,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          formatOnType: true,
          formatOnPaste: true,
          smoothScrolling: true,
          ...options,
        }}
      />
    </div>
  );
}
