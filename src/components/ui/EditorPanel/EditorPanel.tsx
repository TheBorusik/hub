import { Loader2 } from "lucide-react";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { Button } from "@/components/ui/Button";
import { StatusDot } from "@/components/ui/StatusDot";
import { t } from "@/lib/design-tokens";
import type { EditorPanelProps, EditorAction } from "./types";

/**
 * Унифицированный компонент-панель редактора кода.
 *
 * Состоит из (опционального) заголовка `<PanelHeader>` и `<CodeEditor>` под ним.
 * Заголовок и actions — в ОДНОЙ строке: actions прокидываются в
 * `PanelHeader.actions`. Никаких отдельных toolbar-ов.
 *
 * EditorPanel не изобретает никаких «стандартных» actions — всё, что
 * появляется справа в заголовке, приходит от consumer'а через `actions` prop.
 * Это предотвращает дубли (например, две кнопки Format), когда родитель
 * тоже присылает свой Format.
 *
 * Проблемы/ошибки не рендерятся встроенной панелью — подсвечиваются
 * маркерами прямо в Monaco; глобальный список проблем живёт в
 * `ProblemsProvider` (см. `publishCompileProblems`).
 */
export function EditorPanel({
  title,
  icon,
  badge,
  hint,
  actions = [],
  value,
  onChange,
  language,
  state = {},
  markers = [],
  markerOwner = "editor-panel",
  variant = "default",
  showHeader = true,
  readOnly = false,
  path,
  theme,
  options,
  onMount,
  beforeMount,
  className,
  style,
  "aria-label": ariaLabel,
}: EditorPanelProps) {
  const headerContent = showHeader && title ? (
    <PanelHeader
      title={title}
      icon={icon}
      badge={badge}
      hint={hint}
      actions={renderHeaderActions(actions, state)}
      size={variant === "compact" ? "sm" : "sm"}
      variant={variant === "borderless" ? "plain" : "subtle"}
    />
  ) : null;

  return (
    <div
      className={className}
      aria-label={ariaLabel}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: t.color.bg.editor,
        ...style,
      }}
    >
      {headerContent}

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <CodeEditor
          path={path}
          language={language}
          value={value}
          onChange={onChange}
          theme={theme}
          markers={markers}
          markerOwner={markerOwner}
          readOnly={readOnly}
          beforeMount={beforeMount}
          onMount={onMount}
          options={{
            fontSize: variant === "compact" ? 12 : 13,
            wordWrap: language === "json" ? "on" : "off",
            minimap: { enabled: variant === "default" },
            folding: variant !== "compact",
            ...options,
          }}
          height="100%"
          width="100%"
        />
      </div>
    </div>
  );
}

/**
 * Рендер actions для правой части PanelHeader: dot-индикатор dirty
 * (если нет визуала в самом заголовке) + набор <Button>-ов.
 */
function renderHeaderActions(
  actions: EditorAction[],
  state: { dirty?: boolean },
): React.ReactNode {
  if (actions.length === 0 && !state.dirty) return undefined;

  return (
    <>
      {state.dirty && <StatusDot tone="accent" size={8} title="Unsaved changes" />}
      {actions.map((action) => {
        const icon = action.loading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          action.icon
        );
        const title = action.hotkey ? `${action.title} (${action.hotkey})` : action.title;
        return (
          <Button
            key={action.id}
            size="sm"
            variant={action.variant ?? "secondary"}
            icon={icon}
            onClick={action.onClick}
            disabled={action.disabled}
            title={title}
          >
            {action.label}
          </Button>
        );
      })}
    </>
  );
}
