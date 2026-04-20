import { useMemo } from "react";
import { List, X, Flag } from "lucide-react";
import { t as tok } from "@/lib/design-tokens";
import type { ProcessStage } from "@/lib/ws-api-models";
import { STAGE_TYPE_COLORS, stageTypeLabel } from "../lib/stage-colors";

/**
 * VS Code-style "Outline" для текущего процесса. Показывает все стейджи
 * из `stages` с иконками по типу стейджа; активный стейдж (то, что открыто
 * в редакторе) подсвечен; startup — отмечен флажком.
 *
 * Клик по стейджу → `onOpenStage(name)` — ProcessEditor открывает таб.
 * Клик по header'у `×` — `onCollapse()`; развёртывание делает внешний
 * контрол в ProcessEditor (узкий сайдбар с кнопкой List).
 *
 * Сама панель НЕ хранит состояние collapsed — это внешний контроль.
 */

export interface StagesOutlineProps {
  stages: Record<string, ProcessStage>;
  /** Имя активного стейджа в редакторе (или "__diagram__"). */
  activeStage: string;
  /** Имя startup-стейджа (обычно "Start"). */
  startupStage?: string;
  /** Множество имён стейджей с несохранёнными правками. */
  dirtyStages?: ReadonlySet<string>;
  /** Открыть стейдж в редакторе. */
  onOpenStage: (name: string) => void;
  /** Свернуть панель (полоса с кнопкой List останется). */
  onCollapse: () => void;
}

export function StagesOutline({
  stages,
  activeStage,
  startupStage,
  dirtyStages,
  onOpenStage,
  onCollapse,
}: StagesOutlineProps) {
  const sorted = useMemo(() => {
    // Startup — всегда первым; затем все остальные в порядке добавления.
    const entries = Object.values(stages);
    if (!startupStage) return entries;
    const startIdx = entries.findIndex((s) => s.Name === startupStage);
    if (startIdx <= 0) return entries;
    const arr = entries.slice();
    const [start] = arr.splice(startIdx, 1);
    arr.unshift(start);
    return arr;
  }, [stages, startupStage]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 200,
        flexShrink: 0,
        borderLeft: `1px solid ${tok.color.border.default}`,
        background: tok.color.bg.sidebar,
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center select-none uppercase tracking-wider"
        style={{
          height: 26,
          padding: `0 ${tok.space[3]}`,
          fontSize: 11,
          fontWeight: 600,
          color: tok.color.text.muted,
          letterSpacing: "0.04em",
          borderBottom: `1px solid ${tok.color.border.default}`,
          gap: tok.space[2],
        }}
      >
        <List size={12} />
        <span style={{ flex: 1 }}>Outline</span>
        <button
          className="toolbar-btn"
          title="Hide Outline"
          onClick={onCollapse}
          style={{ padding: 2, display: "inline-flex", alignItems: "center" }}
        >
          <X size={12} />
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: `${tok.space[1]} 0` }}>
        {sorted.length === 0 && (
          <div
            style={{
              padding: tok.space[4],
              fontSize: tok.font.size.xs,
              color: tok.color.text.muted,
            }}
          >
            No stages
          </div>
        )}
        {sorted.map((s) => {
          const isActive = s.Name === activeStage;
          const isStartup = s.Name === startupStage;
          const isDirty = dirtyStages?.has(s.Name) ?? false;
          const typeColor = STAGE_TYPE_COLORS[s.Type] ?? "#888";
          return (
            <div
              key={s.Name}
              role="button"
              tabIndex={0}
              className="ui-tree-row"
              data-selected={isActive ? "true" : undefined}
              onClick={() => onOpenStage(s.Name)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenStage(s.Name);
                }
              }}
              title={`${s.DisplayName || s.Name} · ${stageTypeLabel(s.Type)}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: tok.space[2],
                height: 22,
                paddingLeft: tok.space[3],
                paddingRight: tok.space[2],
                userSelect: "none",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: typeColor,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: tok.font.size.xs,
                  color: isActive ? tok.color.text.primary : tok.color.text.primary,
                }}
              >
                {isDirty ? "● " : ""}
                {s.DisplayName || s.Name}
              </span>
              {isStartup && (
                <Flag
                  size={10}
                  style={{ color: tok.color.accent, flexShrink: 0 }}
                  aria-label="Startup stage"
                />
              )}
              <span
                style={{
                  fontSize: 9,
                  color: tok.color.text.muted,
                  flexShrink: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                {stageTypeLabel(s.Type)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
