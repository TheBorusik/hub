import { useRef, useCallback, useId } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";

let themeRegistered = false;

function ensureTheme(monaco: Parameters<OnMount>[1]) {
  if (themeRegistered) return;
  monaco.editor.defineTheme("hub-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1e1e1e",
    },
  });
  themeRegistered = true;
}

loader.init().then((monaco) => ensureTheme(monaco));

function toSafeString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

interface JsonEditorProps {
  value: string;
  readOnly?: boolean;
  minimap?: boolean;
  onChange?: (value: string) => void;
  label?: string;
  height?: string;
  path?: string;
}

export function JsonEditor({
  value,
  readOnly = false,
  minimap = false,
  onChange,
  label,
  path: customPath,
}: JsonEditorProps) {
  const uid = useId();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const modelPath = customPath ?? `inmemory://jsoneditor/${uid}`;
  const safeValue = toSafeString(value);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    ensureTheme(monaco);
  }, []);

  const handleChange = useCallback(
    (val: string | undefined) => {
      onChange?.(val ?? "");
    },
    [onChange],
  );

  return (
    <div className="flex flex-col h-full">
      {label && (
        <div
          className="select-none shrink-0"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-text-muted)",
            padding: "4px 12px",
            background: "var(--color-sidebar)",
            borderBottom: "1px solid var(--color-border)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <Editor
          path={modelPath}
          language="json"
          value={safeValue}
          onChange={handleChange}
          onMount={handleMount}
          theme="hub-dark"
          options={{
            readOnly,
            fontSize: 14,
            fontFamily: "Consolas, 'Courier New', monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            minimap: { enabled: minimap },
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  );
}
