import { useId } from "react";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { t as tok } from "@/lib/design-tokens";

/**
 * JSON-редактор с опциональным label-заголовком. С Block C это тонкая
 * обёртка над общим `<CodeEditor>`: единая тема, единые маркеры, единый
 * MonacoProvider в корне приложения (без повторной инициализации).
 */
interface JsonEditorProps {
  value: string;
  readOnly?: boolean;
  minimap?: boolean;
  onChange?: (value: string) => void;
  label?: string;
  height?: string;
  /** Путь модели Monaco — чтобы не мешать модели разных редакторов. */
  path?: string;
}

function toSafeString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
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
  const modelPath = customPath ?? `inmemory://jsoneditor/${uid}`;
  const safeValue = toSafeString(value);

  return (
    <div className="flex flex-col h-full">
      {label && (
        <div
          className="select-none shrink-0"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: tok.color.text.muted,
            padding: "4px 12px",
            background: tok.color.bg.sidebar,
            borderBottom: `1px solid ${tok.color.border.default}`,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <CodeEditor
          value={safeValue}
          onChange={onChange}
          language="json"
          readOnly={readOnly}
          path={modelPath}
          minimap={minimap}
          wordWrap="on"
          options={{
            tabSize: 2,
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  );
}
