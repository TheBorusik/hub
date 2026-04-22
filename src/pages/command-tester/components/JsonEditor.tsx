import { useId } from "react";
import { EditorPanel, type EditorAction } from "@/components/ui/EditorPanel";
import type { CodeEditorMarker } from "@/components/ui/CodeEditor";

/**
 * JSON-редактор с опциональным заголовком-label.
 *
 * Тонкая обёртка над `<EditorPanel>`:
 *   - язык всегда `json`, таб 2 пробела;
 *   - если `label` не передан — заголовка нет (borderless);
 *   - любые actions прокидываются напрямую в `EditorPanel`.
 *
 * Используется как для компактных инлайновых JSON-панелей (CRUD, Viewer,
 * Command Tester Request/Response), так и для редактируемых форм.
 */
export interface JsonEditorProps {
  value: unknown;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  minimap?: boolean;
  /** Заголовок панели. Если не задан — panel header не рендерится. */
  label?: string;
  /** Иконка слева от заголовка (например, chevron для collapsible). */
  icon?: React.ReactNode;
  /** Клик по заголовку (например, toggle collapse). */
  onHeaderClick?: () => void;
  /** Уникальный путь модели Monaco — чтобы не смешивать модели между редакторами. */
  path?: string;
  /** Доп. действия в правой части заголовка. */
  actions?: EditorAction[];
  /** Бейдж рядом с заголовком (например, счётчик ошибок). */
  badge?: React.ReactNode;
  /** Состояние (dirty/saving/...); только для визуала. */
  state?: {
    dirty?: boolean;
    saving?: boolean;
    validating?: boolean;
  };
  /** Маркеры Monaco (для подсветки ошибок). */
  markers?: CodeEditorMarker[];
  variant?: "default" | "compact" | "borderless";
}

function toSafeString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

export function JsonEditor({
  value,
  onChange,
  readOnly = false,
  minimap = false,
  label,
  icon,
  onHeaderClick,
  path,
  actions,
  badge,
  state,
  markers,
  variant = "default",
}: JsonEditorProps) {
  const uid = useId();
  const modelPath = path ?? `inmemory://jsoneditor/${uid}`;

  return (
    <EditorPanel
      title={label}
      icon={icon}
      onHeaderClick={onHeaderClick}
      language="json"
      value={toSafeString(value)}
      onChange={onChange}
      readOnly={readOnly}
      path={modelPath}
      actions={actions}
      badge={badge}
      state={state}
      markers={markers}
      variant={variant}
      showHeader={!!label}
      options={{
        tabSize: 2,
        minimap: { enabled: minimap },
      }}
      style={{ height: "100%" }}
    />
  );
}
