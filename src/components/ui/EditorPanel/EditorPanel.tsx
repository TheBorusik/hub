import { useMemo } from "react";
import { Save, FileCheck, Wand2, GitCommitHorizontal, AlertCircle, Loader2 } from "lucide-react";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { Button } from "@/components/ui/Button";
import { CountBadge } from "@/components/ui/CountBadge";
import { StatusDot } from "@/components/ui/StatusDot";
import { t } from "@/lib/design-tokens";
import type { EditorPanelProps, EditorAction, ProblemsPanelProps } from "./types";

/**
 * Встроенная панель проблем/ошибок
 */
function ProblemsPanel({
  markers,
  title = "Problems",
  maxHeight = 140,
  onProblemClick,
}: ProblemsPanelProps) {
  if (!markers || markers.length === 0) return null;

  const errorCount = markers.filter(m => m.severity === "error").length;
  const warningCount = markers.filter(m => m.severity === "warning").length;
  const infoCount = markers.filter(m => m.severity === "info").length;

  const badgeContent = useMemo(() => {
    const parts = [];
    if (errorCount > 0) parts.push(`${errorCount} error${errorCount !== 1 ? 's' : ''}`);
    if (warningCount > 0) parts.push(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
    if (infoCount > 0) parts.push(`${infoCount} info${infoCount !== 1 ? 's' : ''}`);
    return parts.join(", ");
  }, [errorCount, warningCount, infoCount]);

  const getSeverityIconColor = (severity: string) => {
    switch (severity) {
      case "error": return "#f48771";
      case "warning": return "#e3b341";
      case "info": return "#3794ff";
      default: return t.color.text.muted;
    }
  };

  return (
    <div
      className="shrink-0"
      style={{
        maxHeight,
        overflowY: "auto",
        borderTop: `1px solid ${t.color.border.default}`,
        background: t.color.bg.sidebar,
        fontSize: t.font.size.xs,
      }}
    >
      <PanelHeader
        title={title}
        icon={<AlertCircle size={12} style={{ color: t.color.danger }} />}
        badge={<CountBadge value={markers.length} tone="danger" />}
        hint={badgeContent}
      />
      {markers.map((marker, i) => (
        <button
          key={i}
          onClick={() => onProblemClick?.(marker)}
          className="flex items-start w-full"
          style={{
            padding: "3px 10px",
            background: "transparent",
            border: "none",
            color: t.color.text.primary,
            cursor: "pointer",
            textAlign: "left",
            gap: 6,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = t.color.bg.hover)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <AlertCircle
            size={12}
            style={{ 
              color: getSeverityIconColor(marker.severity), 
              flexShrink: 0, 
              marginTop: 2 
            }}
          />
          <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {marker.message}
          </span>
          <span style={{ color: t.color.text.muted, whiteSpace: "nowrap" }}>
            [{marker.startLineNumber}:{marker.startColumn}]
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Преобразует EditorAction в кнопки для тулбара
 */
function renderActions(actions: EditorAction[] = []) {
  return actions.map((action) => {
    const icon = action.loading ? (
      <Loader2 size={13} className="animate-spin" />
    ) : (
      action.icon
    );

    return (
      <Button
        key={action.id}
        size="sm"
        variant={action.variant || "secondary"}
        icon={icon}
        onClick={action.onClick}
        disabled={action.disabled}
        title={action.title + (action.hotkey ? ` (${action.hotkey})` : "")}
      >
        {action.label}
      </Button>
    );
  });
}

/**
 * Унифицированный компонент панели редактора кода
 * 
 * Объединяет:
 * - Заголовок панели (PanelHeader)
 * - Тулбар с действиями (PanelToolbar)
 * - Редактор кода (CodeEditor)
 * - Панель проблем (опционально)
 * 
 * Поддерживает все варианты использования из разных секций приложения:
 * - Configurator (CSharpEditor)
 * - Command Tester (JsonEditor)
 * - System (BuildRulesEditor)
 * - Global Models (GlobalModelEditor)
 */
export function EditorPanel({
  title,
  icon,
  badge,
  hint,
  actions,
  value,
  onChange,
  language,
  state = {},
  markers = [],
  variant = "default",
  showHeader = true,
  showToolbar = true,
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
  // Определяем стандартные действия на основе состояния
  const standardActions = useMemo<EditorAction[]>(() => {
    const baseActions: EditorAction[] = [];

    // Действие сохранения (если есть обработчик)
    if (onChange && !readOnly) {
      baseActions.push({
        id: "save",
        icon: <Save size={13} />,
        label: "Save",
        title: "Save changes",
        onClick: () => {}, // Будет заменено внешним обработчиком
        disabled: !state.dirty || state.saving,
        loading: state.saving,
        hotkey: "Ctrl+S",
        variant: state.dirty ? "primary" : "secondary",
      });
    }

    // Действие валидации (если есть маркеры)
    if (markers.length > 0) {
      baseActions.push({
        id: "validate",
        icon: <FileCheck size={13} />,
        label: "Validate",
        title: "Validate code",
        onClick: () => {},
        disabled: state.validating,
        loading: state.validating,
        hotkey: "Ctrl+Shift+V",
      });
    }

    // Действие форматирования (для редактируемых языков)
    if (["csharp", "javascript", "typescript", "json"].includes(language) && !readOnly) {
      baseActions.push({
        id: "format",
        icon: <Wand2 size={13} />,
        label: "Format",
        title: "Format code",
        onClick: () => {},
        disabled: state.formatting,
        loading: state.formatting,
        hotkey: "Shift+Alt+F",
      });
    }

    // Действие коммита (если есть состояние committing)
    if (state.committing !== undefined) {
      baseActions.push({
        id: "commit",
        icon: <GitCommitHorizontal size={13} />,
        label: "Commit",
        title: "Commit changes",
        onClick: () => {},
        disabled: state.committing,
        loading: state.committing,
        hotkey: "Ctrl+Shift+C",
      });
    }

    return baseActions;
  }, [language, markers.length, onChange, readOnly, state]);

  // Объединяем стандартные действия с пользовательскими
  const allActions = useMemo(() => {
    if (!actions || actions.length === 0) return standardActions;
    return [...standardActions, ...actions];
  }, [standardActions, actions]);

  // Определяем содержимое заголовка
  const headerContent = useMemo(() => {
    if (!showHeader) return null;

    const headerProps = {
      title,
      icon,
      badge,
      hint,
      actions: undefined, // Действия будут в тулбаре
      size: (variant === "compact" ? "sm" : "md") as "sm" | "md",
      variant: (variant === "borderless" ? "plain" : "subtle") as "plain" | "subtle",
    };

    // Для compact варианта показываем статус точки изменений в заголовке
    if (variant === "compact" && state.dirty) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: t.space[2] }}>
          <PanelHeader {...headerProps} />
          <StatusDot tone="accent" size={8} title="Unsaved changes" />
        </div>
      );
    }

    return <PanelHeader {...headerProps} />;
  }, [title, icon, badge, hint, showHeader, variant, state.dirty]);

  // Определяем содержимое тулбара
  const toolbarContent = useMemo(() => {
    if (!showToolbar) return null;

    const leftContent = (
      <span style={{ 
        display: "inline-flex", 
        alignItems: "center", 
        gap: t.space[3], 
        minWidth: 0 
      }}>
        {state.dirty && variant !== "compact" && (
          <StatusDot tone="accent" size={10} title="Unsaved changes" />
        )}
        {hint && variant === "default" && (
          <span style={{ 
            fontSize: t.font.size.xs, 
            color: t.color.text.muted,
            fontFamily: "'Consolas','Courier New',monospace",
          }}>
            {hint}
          </span>
        )}
      </span>
    );

    return (
      <PanelToolbar
        dense={variant === "compact"}
        bordered={variant !== "borderless"}
        left={leftContent}
        right={allActions.length > 0 ? renderActions(allActions) : undefined}
      />
    );
  }, [showToolbar, variant, state.dirty, hint, allActions]);

  // Определяем опции редактора
  const editorOptions = useMemo(() => ({
    readOnly,
    fontSize: variant === "compact" ? 12 : 14,
    padding: { top: variant === "compact" ? 4 : 6 },
    wordWrap: language === "json" ? "on" as const : "off" as const,
    minimap: { enabled: variant === "default" },
    folding: variant === "default",
    ...options,
  }), [language, readOnly, variant, options]);

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
      {toolbarContent}
      
      <div className="flex-1 min-h-0">
        <CodeEditor
          path={path}
          language={language}
          value={value}
          onChange={onChange}
          theme={theme}
          markers={markers}
          readOnly={readOnly}
          beforeMount={beforeMount}
          onMount={onMount}
          options={editorOptions}
          height="100%"
          width="100%"
        />
      </div>

      {markers.length > 0 && variant === "default" && (
        <ProblemsPanel
          markers={markers}
          onProblemClick={(marker) => {
            // TODO: Реализовать переход к строке через ref редактора
            console.log("Jump to line:", marker.startLineNumber, marker.startColumn);
          }}
        />
      )}
    </div>
  );
}