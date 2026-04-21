import { useId } from "react";
import { EditorPanel } from "@/components/ui/EditorPanel";
import { t as tok } from "@/lib/design-tokens";

/**
 * JSON-редактор с опциональным label-заголовком. 
 * 
 * Новая версия использует унифицированный EditorPanel компонент.
 * Сохраняет обратную совместимость со старым API.
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
  /** Дополнительные действия в тулбаре */
  actions?: Array<{
    id: string;
    icon: React.ReactNode;
    label?: string;
    title: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    hotkey?: string;
  }>;
  /** Состояние редактора */
  state?: {
    dirty?: boolean;
    saving?: boolean;
    validating?: boolean;
  };
  /** Маркеры ошибок/предупреждений */
  markers?: Array<{
    message: string;
    severity: "error" | "warning" | "info";
    startLineNumber: number;
    startColumn: number;
    endLineNumber?: number;
    endColumn?: number;
    source?: string;
  }>;
  /** Вариант отображения */
  variant?: "default" | "compact" | "borderless";
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
  actions = [],
  state = {},
  markers = [],
  variant = "default",
}: JsonEditorProps) {
  const uid = useId();
  const modelPath = customPath ?? `inmemory://jsoneditor/${uid}`;
  const safeValue = toSafeString(value);

  // Преобразуем действия в формат EditorPanel
  const editorActions = actions.map(action => ({
    id: action.id,
    icon: action.icon,
    label: action.label,
    title: action.title,
    onClick: action.onClick,
    disabled: action.disabled,
    loading: action.loading,
    hotkey: action.hotkey,
    variant: "secondary" as const,
  }));

  // Определяем опции редактора
  const editorOptions = {
    tabSize: 2,
    padding: { top: variant === "compact" ? 4 : 8 },
    minimap: { enabled: minimap },
    wordWrap: "on" as const,
  };

  return (
    <EditorPanel
      title={label || "JSON Editor"}
      value={safeValue}
      onChange={onChange}
      language="json"
      readOnly={readOnly}
      path={modelPath}
      actions={editorActions}
      state={state}
      markers={markers}
      variant={variant}
      showHeader={!!label}
      showToolbar={actions.length > 0 || state.dirty || markers.length > 0}
      options={editorOptions}
      style={{ height: "100%" }}
    />
  );
}

/**
 * Старая версия JsonEditor для обратной совместимости.
 * @deprecated Используйте новый JsonEditor с EditorPanel
 */
export function LegacyJsonEditor({
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
        <EditorPanel
          title={label || "JSON Editor"}
          value={safeValue}
          onChange={onChange}
          language="json"
          readOnly={readOnly}
          path={modelPath}
          variant="borderless"
          showHeader={false}
          showToolbar={false}
          options={{
            tabSize: 2,
            padding: { top: 8 },
            minimap: { enabled: minimap },
            wordWrap: "on",
          }}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
