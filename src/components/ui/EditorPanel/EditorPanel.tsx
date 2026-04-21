import { Loader2 } from "lucide-react";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/Button/IconButton";
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
  onHeaderClick,
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
      onClick={onHeaderClick}
      // Хидер редактора совпадает по фону с Monaco editor — чтобы
      // визуально не было «второго цветового слоя» между заголовком и кодом.
      // (ВС Code делает то же самое для editor panels.)
      style={{ background: t.color.bg.editor }}
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
 * + набор кнопок.
 *
 * Action без `label` рендерится как <IconButton> (только иконка +
 * hover-подложка, без border — как toolbar-кнопки в VS Code).
 * Action с `label` — как <Button> с текстом (Save / Validate / ...).
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

        // Без label — ghost icon button (одна иконка, без рамки).
        if (!action.label) {
          const ibVariant =
            action.variant === "danger" ? "danger" :
            action.variant === "primary" ? "primary" : "ghost";
          return (
            <IconButton
              key={action.id}
              size="xs"
              variant={ibVariant}
              icon={icon}
              label={title}
              onClick={action.onClick}
              disabled={action.disabled}
            />
          );
        }

        // С label — text button.
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
