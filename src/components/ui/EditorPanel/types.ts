import type { CSSProperties, ReactNode } from "react";
import type { Monaco } from "@monaco-editor/react";
import type * as MonacoNs from "monaco-editor";
import type { CodeEditorLanguage, CodeEditorMarker } from "@/components/ui/CodeEditor";

/**
 * Состояние редактора (грязный, сохраняется, валидируется и пр.).
 *
 * Используется **только для визуальной подсветки** (dot у заголовка,
 * disabled состояние у actions, если consumer захочет на него смотреть).
 * На сами actions EditorPanel не реагирует — их формирует consumer.
 */
export interface EditorState {
  /** Есть несохранённые изменения. Добавляет dot в заголовок. */
  dirty?: boolean;
  /** Идёт сохранение — на усмотрение consumer'а, EditorPanel ничего не делает. */
  saving?: boolean;
  /** Идёт валидация — аналогично. */
  validating?: boolean;
  /** Идёт форматирование — аналогично. */
  formatting?: boolean;
}

/**
 * Действие в правой части заголовка / тулбара редактора.
 *
 * Принципы:
 *   - EditorPanel не добавляет никаких «стандартных» actions сам —
 *     только то, что consumer передал в `actions`.
 *   - `id` уникален внутри списка; используется для React key.
 *   - `label` опционален — если не указан, рендерится только иконка
 *     (<IconButton>-style, как в панелях VS Code).
 */
export interface EditorAction {
  id: string;
  icon: ReactNode;
  label?: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  /** Показывает spinner вместо иконки. */
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Показать hotkey в title / tooltip. Чисто информационно. */
  hotkey?: string;
}

export type EditorPanelVariant = "default" | "compact" | "borderless";

export interface EditorPanelProps {
  /** Заголовок панели (если `showHeader=false`, игнорируется). */
  title?: string;
  /** Иконка слева от заголовка. */
  icon?: ReactNode;
  /** Бейдж рядом с заголовком (например, счётчик). */
  badge?: ReactNode;
  /** Подзаголовок справа от заголовка (тихий, monospace). */
  hint?: string;
  /** Actions в правой части заголовка. */
  actions?: EditorAction[];
  /** Уникальные action'ы, которые должны быть слева (редко). */
  leftActions?: EditorAction[];

  /** Содержимое редактора. */
  value: string;
  onChange?: (value: string) => void;
  language: CodeEditorLanguage;

  /** Состояние — только для визуальной подсветки. */
  state?: EditorState;

  /** Маркеры ошибок/предупреждений. */
  markers?: CodeEditorMarker[];
  /** Owner маркеров. default: "editor-panel". */
  markerOwner?: string;

  /** Вариант отображения. default: "default". */
  variant?: EditorPanelVariant;
  /** Показывать ли заголовок. default: true. */
  showHeader?: boolean;
  /** Только для чтения. */
  readOnly?: boolean;
  /** Уникальный путь модели Monaco. */
  path?: string;
  /** Явная тема редактора (если `undefined`, CodeEditor выберет по языку). */
  theme?: string;

  /** Опции Monaco — прокидываются в CodeEditor. */
  options?: MonacoNs.editor.IStandaloneEditorConstructionOptions;

  onMount?: (editor: MonacoNs.editor.IStandaloneCodeEditor, monaco: Monaco) => void;
  beforeMount?: (monaco: Monaco) => void;

  className?: string;
  style?: CSSProperties;
  /** ARIA label для обёртки. */
  "aria-label"?: string;
}
