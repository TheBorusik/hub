import type { CSSProperties, ReactNode } from "react";
import { X } from "lucide-react";
import { t } from "@/lib/design-tokens";

export interface MassActionBarProps {
  /** Количество выбранных элементов. Если 0 — компонент ничего не рендерит. */
  selectedCount: number;
  /** Форма слова «процессов / записей / ошибок» и т.п. */
  noun?: string;
  /** Группа кнопок действий справа. */
  actions: ReactNode;
  /** Сбросить выделение. */
  onClear: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Полоска массовых действий, появляющаяся при выделении ≥ 1 элемента в
 * списке. Заменяет ручную mass-bar-вёрстку в `ProcessListPanel`,
 * `ErrorsTable`, `PermissionsPanel`.
 */
export function MassActionBar({
  selectedCount,
  noun = "selected",
  actions,
  onClear,
  className,
  style,
}: MassActionBarProps) {
  if (selectedCount <= 0) return null;
  return (
    <div
      role="toolbar"
      aria-label={`${selectedCount} ${noun} — bulk actions`}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: t.space[3],
        padding: `${t.space[2]} ${t.space[4]}`,
        background: t.color.bg.accentSoft,
        borderTop: `1px solid ${t.color.border.default}`,
        borderBottom: `1px solid ${t.color.border.default}`,
        fontSize: t.font.size.xs,
        color: t.color.text.primary,
        ...style,
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong>{selectedCount}</strong> {noun}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: t.space[2] }}>
        {actions}
      </span>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        title="Clear selection"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          background: "transparent",
          border: "none",
          color: t.color.text.muted,
          cursor: "pointer",
          borderRadius: t.radius.md,
          flexShrink: 0,
        }}
      >
        <X size={12} />
      </button>
    </div>
  );
}
