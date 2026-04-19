import { Fragment, useCallback, useMemo, useState } from "react";
import {
  RotateCcw, ChevronRight, ChevronDown,
  Braces, FileJson, AlertTriangle,
  UnfoldVertical, FoldVertical, Code2,
} from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { t as tok } from "@/lib/design-tokens";
import type { ProcessDetail, StageNode, StageData, ViewerTab } from "../types";
import { STAGE_COLORS, getStageContextButtons } from "../types";

// Border-radius per stage type — повторяем схему из старой админки
// (styles.scss → .stage-CRUD / .stage-Command / ...), чтобы каждый тип
// стейджа визуально отличался формой индекс-бейджа.
const STAGE_SHAPE: Record<string, string> = {
  StartProcess: "4px 10px 4px 4px",
  Start: "4px 10px 4px 4px",
  CRUD: "14px 3px 3px 14px",
  Command: "14px",
  Transform: "3px 14px 14px 3px",
  Event: "6px",
  SubStart: "10px 3px 10px 3px",
  Final: "14px 3px 3px 14px",
  Obsolete: "6px",
};

interface ProcessDetailPanelProps {
  detail: ProcessDetail;
  tab: ViewerTab;
  onViewJson: (data: unknown, title: string) => void;
  onViewStageContext: (processId: number, stageIndex: number, subject: string, label: string) => void;
  onRestart: (stageIndex: number) => void;
  onRestartWithData: (stageIndex: number) => void;
  /**
   * Открыть исходники этого процесса в Configurator. Опционально — если
   * передано, в хедере появляется кнопка «Edit Process». Навигация между
   * секциями идёт через `NavigationProvider`, поэтому ProcessDetailPanel
   * остаётся «тупым» компонентом и не знает про navigation-шину.
   */
  onEditProcess?: (processName: string) => void;
}

interface FlatRow {
  key: string;
  stage: StageData;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

export function ProcessDetailPanel({
  detail,
  tab,
  onViewJson,
  onViewStageContext,
  onRestart,
  onRestartWithData,
  onEditProcess,
}: ProcessDetailPanelProps) {
  const isManual = tab === "manual";

  const formatTime = (ts: string | null | undefined) => {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString("ru-RU");
    } catch {
      return ts;
    }
  };

  // Модель раскрытия — через множество СВЁРНУТЫХ ключей.
  // По умолчанию всё раскрыто (пустое множество). Так expandAll/
  // collapseAll работают O(1)/O(N) без обхода отдельных node-state.
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(() => new Set());

  const allCollapsibleKeys = useMemo(() => {
    const keys: string[] = [];
    const walk = (nodes: StageNode[]) => {
      for (const n of nodes) {
        if (n.Data && n.Children && n.Children.length > 0) {
          keys.push(stageKey(n.Data));
          walk(n.Children);
        }
      }
    };
    walk(detail.Stages ?? []);
    return keys;
  }, [detail.Stages]);

  const expandAll = useCallback(() => setCollapsedKeys(new Set()), []);
  const collapseAll = useCallback(() => setCollapsedKeys(new Set(allCollapsibleKeys)), [allCollapsibleKeys]);
  const toggleKey = useCallback((key: string) => setCollapsedKeys((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  }), []);

  // Плоский список видимых строк для одного общего CSS-grid-контейнера:
  // так колонки (Name | Elapsed | Buttons | Actions) выравниваются по
  // всем уровням вложенности, а индент делается паддингом внутри
  // первой ячейки.
  const rows = useMemo<FlatRow[]>(() => {
    const out: FlatRow[] = [];
    const walk = (nodes: StageNode[], depth: number) => {
      for (const n of nodes) {
        if (!n.Data) continue;
        const key = stageKey(n.Data);
        const hasChildren = !!(n.Children && n.Children.length > 0);
        const expanded = hasChildren && !collapsedKeys.has(key);
        out.push({ key, stage: n.Data, depth, hasChildren, expanded });
        if (hasChildren && expanded) walk(n.Children, depth + 1);
      }
    };
    walk(detail.Stages ?? [], 0);
    return out;
  }, [detail.Stages, collapsedKeys]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0" style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{detail.Name}</span>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>#{detail.ProcessId}</span>
          {detail.Version && <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>v{detail.Version}</span>}
          <span
            style={{
              marginLeft: 4,
              fontSize: 11,
              padding: "1px 6px",
              borderRadius: 3,
              background: statusBg(detail.Status),
              color: statusFg(detail.Status),
              fontWeight: 500,
            }}
          >
            {detail.Status}
          </span>
          {onEditProcess && (
            <Button
              onClick={() => onEditProcess(detail.Name)}
              title="Open this process in Configurator"
              size="sm"
              variant="secondary"
              icon={<Code2 size={12} />}
              style={{ marginLeft: "auto", color: tok.color.text.link }}
            >
              Edit Process
            </Button>
          )}
        </div>
        <div className="flex items-center flex-wrap" style={{ gap: 10, fontSize: 11, color: "var(--color-text-muted)" }}>
          <span>Register: {formatTime(detail.RegisterTimestamp)}</span>
          {detail.EndTimestamp && <span>End: {formatTime(detail.EndTimestamp)}</span>}
          {detail.WfmElapsed && <span>Elapsed: {detail.WfmElapsed}</span>}
        </div>
      </div>

      {/* Top-level JSON buttons + expand/collapse */}
      <PanelToolbar
        dense
        left={
          <>
            {[
              { label: "Context", data: detail.Context },
              { label: "Init Object", data: detail.InitObject },
              { label: "Init Session", data: detail.InitSession },
              { label: "Session", data: detail.Session },
            ].filter((b) => b.data != null).map((b) => (
              <Button
                key={b.label}
                onClick={() => onViewJson(b.data, `${detail.Name} — ${b.label}`)}
                size="sm"
                variant="secondary"
                icon={<Braces size={11} />}
                style={{ color: tok.color.text.link }}
              >
                {b.label}
              </Button>
            ))}
            {detail.ManualControlCause != null && (
              <Button
                onClick={() => onViewJson(detail.ManualControlCause, `${detail.Name} — ManualControlCause`)}
                size="sm"
                variant="secondary"
                icon={<AlertTriangle size={11} />}
                style={{ color: "#FCA6ED", borderColor: "rgba(252,166,237,0.4)" }}
              >
                ManualCause
              </Button>
            )}
          </>
        }
        right={
          <>
            <IconButton icon={<UnfoldVertical size={13} />} label="Expand all" onClick={expandAll} size="sm" />
            <IconButton icon={<FoldVertical size={13} />} label="Collapse all" onClick={collapseAll} size="sm" />
          </>
        }
      />

      {/* Stage table (flat grid) */}
      <div className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <EmptyState dense title="No stages loaded" hint="Process has no visible stages yet." />
        ) : (
          <div
            style={{
              display: "grid",
              // col1 = Name area (chevron + badge + title) — растягивается по контенту, но с min
              // col2 = Elapsed — max-content, будет выровнен по самому широкому значению
              // col3 = Context/Diff buttons — забирает остаток ширины
              // col4 = Manual actions — по содержимому
              gridTemplateColumns: "minmax(240px, auto) max-content minmax(0, 1fr) max-content",
              alignItems: "stretch",
            }}
          >
            {rows.map((row) => (
              <StageRowCells
                key={row.key}
                row={row}
                processId={detail.ProcessId}
                isManual={isManual}
                onToggle={() => toggleKey(row.key)}
                onViewStageContext={onViewStageContext}
                onRestart={onRestart}
                onRestartWithData={onRestartWithData}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StageRowCells({
  row,
  processId,
  isManual,
  onToggle,
  onViewStageContext,
  onRestart,
  onRestartWithData,
}: {
  row: FlatRow;
  processId: number;
  isManual: boolean;
  onToggle: () => void;
  onViewStageContext: (processId: number, stageIndex: number, subject: string, label: string) => void;
  onRestart: (stageIndex: number) => void;
  onRestartWithData: (stageIndex: number) => void;
}) {
  const { stage, depth, hasChildren, expanded } = row;
  const color = STAGE_COLORS[stage.Type] ?? "#888";
  const contextButtons = getStageContextButtons(stage);
  const shapeRadius = STAGE_SHAPE[stage.Type] ?? "6px";

  // Базовый стиль ячейки: единый для всех 4 колонок, чтобы рамка-разделитель
  // и фон применялись согласованно по всей «строке» в CSS-grid.
  const cellBase: React.CSSProperties = {
    background: depth > 0 ? "rgba(255,255,255,0.02)" : "transparent",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    minHeight: 30,
    display: "flex",
    alignItems: "center",
    paddingTop: 2,
    paddingBottom: 2,
  };

  return (
    <Fragment>
      {/* Col 1: chevron + indent + badge + name */}
      <div style={{ ...cellBase, paddingLeft: 8 + depth * 18, paddingRight: 10, gap: 8 }}>
        {hasChildren ? (
          <button
            onClick={onToggle}
            className="tree-action-btn"
            style={{ width: 16, height: 16, flexShrink: 0 }}
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <span style={{ width: 16, flexShrink: 0 }} />
        )}
        <span
          style={{
            minWidth: 32,
            height: 22,
            padding: "0 6px",
            borderRadius: shapeRadius,
            background: color,
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          }}
          title={`${stage.Type} — Stage ${stage.Index}`}
        >
          {stage.Index}
        </span>
        <span
          className="truncate"
          style={{ fontSize: 13, minWidth: 0, flex: "1 1 auto" }}
          title={stage.Name ? `Name: ${stage.Name}` : undefined}
        >
          {stage.DisplayName || stage.Name}
        </span>
      </div>

      {/* Col 2: elapsed (right-aligned monospace) */}
      <div
        style={{
          ...cellBase,
          paddingLeft: 8,
          paddingRight: 14,
          justifyContent: "flex-end",
          fontSize: 11,
          color: "var(--color-text-muted)",
          fontFamily: "var(--font-mono, monospace)",
          whiteSpace: "nowrap",
        }}
      >
        {stage.Elapsed || ""}
      </div>

      {/* Col 3: context/diff buttons */}
      <div
        style={{
          ...cellBase,
          paddingLeft: 0,
          paddingRight: 10,
          gap: 3,
          minWidth: 0,
          overflow: "hidden",
          flexWrap: "wrap",
        }}
      >
        {contextButtons.map((btn) => (
          <button
            key={`${btn.label}-${btn.stageIndex}`}
            onClick={() => onViewStageContext(processId, btn.stageIndex, btn.subject, `${stage.DisplayName || stage.Name} — ${btn.label}`)}
            className="toolbar-btn"
            style={{
              padding: "1px 6px",
              fontSize: 10.5,
              background: btn.danger ? "rgba(246,81,29,0.2)" : "transparent",
              border: btn.danger ? "1px solid rgba(246,81,29,0.6)" : "1px solid var(--color-border)",
              color: btn.danger ? "#F6511D" : "var(--color-text-muted)",
              fontWeight: btn.danger ? 600 : 400,
              whiteSpace: "nowrap",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Col 4: manual restart actions (только в Manual-tab) */}
      <div style={{ ...cellBase, paddingLeft: 4, paddingRight: 12, gap: 2, justifyContent: "flex-end" }}>
        {isManual && (
          <>
            <button
              onClick={() => onRestart(stage.StageIndex)}
              className="toolbar-btn"
              title="Restart from this stage"
              style={{ color: "#0FD334" }}
            >
              <RotateCcw size={12} />
            </button>
            <button
              onClick={() => onRestartWithData(stage.StageIndex)}
              className="toolbar-btn"
              title="Restart with new data"
              style={{ color: "#5CADD5" }}
            >
              <FileJson size={12} />
            </button>
          </>
        )}
      </div>
    </Fragment>
  );
}

// --- helpers ---

function stageKey(s: StageData): string {
  return `${s.Index}:${s.StageIndex}:${s.Name}`;
}

function statusBg(status: string): string {
  switch (status) {
    case "Completed": return "rgba(76,175,80,0.2)";
    case "ManualControl": return "rgba(252,166,237,0.2)";
    case "Idle": return "rgba(92,173,213,0.2)";
    case "Failed": return "rgba(246,81,29,0.2)";
    default: return "rgba(255,255,255,0.08)";
  }
}

function statusFg(status: string): string {
  switch (status) {
    case "Completed": return "#4CAF50";
    case "ManualControl": return "#FCA6ED";
    case "Idle": return "#5CADD5";
    case "Failed": return "#F6511D";
    default: return "var(--color-text-muted)";
  }
}
