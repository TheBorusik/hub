import { useState } from "react";
import {
  RotateCcw, ChevronRight, ChevronDown,
  Braces, FileJson, AlertTriangle,
} from "lucide-react";
import type { ProcessDetail, StageNode, ViewerTab } from "../types";
import { STAGE_COLORS, getStageContextButtons } from "../types";

interface ProcessDetailPanelProps {
  detail: ProcessDetail;
  childProcesses: ProcessDetail[];
  tab: ViewerTab;
  onViewJson: (data: unknown, title: string) => void;
  onViewStageContext: (processId: number, stageIndex: number, subject: string, label: string) => void;
  onRestart: (stageIndex: number) => void;
  onRestartWithData: (stageIndex: number) => void;
}

export function ProcessDetailPanel({
  detail,
  childProcesses,
  tab,
  onViewJson,
  onViewStageContext,
  onRestart,
  onRestartWithData,
}: ProcessDetailPanelProps) {
  const [expandedChildren, setExpandedChildren] = useState(false);
  const isManual = tab === "manual";

  const formatTime = (ts: string | null | undefined) => {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString("ru-RU");
    } catch {
      return ts;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ gap: 0 }}>
      {/* Header */}
      <div className="shrink-0" style={{ padding: "8px 12px", borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{detail.Name}</span>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>#{detail.ProcessId}</span>
          {detail.Version && <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>v{detail.Version}</span>}
        </div>
        <div className="flex items-center flex-wrap" style={{ gap: 10, fontSize: 12 }}>
          <span style={{ color: detail.Status === "ManualControl" ? "#FCA6ED" : detail.Status === "Completed" ? "#4CAF50" : "#5CADD5", fontWeight: 500 }}>
            {detail.Status}
          </span>
          <span style={{ color: "var(--color-text-muted)" }}>
            Register: {formatTime(detail.RegisterTimestamp)}
          </span>
          {detail.EndTimestamp && (
            <span style={{ color: "var(--color-text-muted)" }}>— {formatTime(detail.EndTimestamp)}</span>
          )}
          {detail.WfmElapsed && (
            <span style={{ color: "var(--color-text-muted)" }}>Elapsed: {detail.WfmElapsed}</span>
          )}
        </div>
      </div>

      {/* Top-level JSON buttons */}
      <div className="flex items-center shrink-0 flex-wrap" style={{ padding: "4px 12px", gap: 4, borderBottom: "1px solid var(--color-border)" }}>
        {[
          { label: "Context", data: detail.Context },
          { label: "Init Object", data: detail.InitObject },
          { label: "Init Session", data: detail.InitSession },
          { label: "Session", data: detail.Session },
        ].filter((b) => b.data != null).map((b) => (
          <button
            key={b.label}
            onClick={() => onViewJson(b.data, `${detail.Name} — ${b.label}`)}
            className="toolbar-btn"
            style={{ padding: "2px 8px", fontSize: 11, border: "1px solid var(--color-border)", color: "var(--color-accent)", gap: 4 }}
          >
            <Braces size={11} />
            {b.label}
          </button>
        ))}
        {detail.ManualControlCause != null && (
          <button
            onClick={() => onViewJson(detail.ManualControlCause, `${detail.Name} — ManualControlCause`)}
            className="toolbar-btn"
            style={{ padding: "2px 8px", fontSize: 11, border: "1px solid rgba(252,166,237,0.4)", color: "#FCA6ED", gap: 4 }}
          >
            <AlertTriangle size={11} />
            ManualCause
          </button>
        )}
      </div>

      {/* Children processes */}
      {childProcesses.length > 0 && (
        <div className="shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <button
            onClick={() => setExpandedChildren(!expandedChildren)}
            className="flex items-center cursor-pointer w-full toolbar-btn"
            style={{ padding: "4px 12px", fontSize: 12, fontWeight: 500, color: "var(--color-text-muted)", gap: 4, borderRadius: 0 }}
          >
            {expandedChildren ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Child Processes ({childProcesses.length})
          </button>
          {expandedChildren && (
            <div style={{ padding: "0 12px 6px" }}>
              {childProcesses.map((child) => (
                <div key={child.ProcessId} className="flex items-center" style={{ fontSize: 12, padding: "2px 0", gap: 6, color: "var(--color-text-muted)" }}>
                  <span style={{ fontWeight: 500, color: "var(--color-text)" }}>#{child.ProcessId}</span>
                  <span className="truncate">{child.Name}</span>
                  <span style={{ color: child.Status === "Completed" ? "#4CAF50" : "#FCA6ED" }}>{child.Status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stage tree */}
      <div className="flex-1 overflow-y-auto">
        <div style={{ padding: "6px 0" }}>
          {(detail.Stages ?? []).map((node, i) => (
            <StageTreeNode
              key={node.Data?.StageIndex ?? i}
              node={node}
              depth={0}
              processId={detail.ProcessId}
              isManual={isManual}
              onViewStageContext={onViewStageContext}
              onRestart={onRestart}
              onRestartWithData={onRestartWithData}
            />
          ))}
          {(!detail.Stages || detail.Stages.length === 0) && (
            <div style={{ padding: "12px 16px", fontSize: 12, color: "var(--color-text-muted)" }}>
              No stages loaded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StageTreeNode({
  node,
  depth,
  processId,
  isManual,
  onViewStageContext,
  onRestart,
  onRestartWithData,
}: {
  node: StageNode;
  depth: number;
  processId: number;
  isManual: boolean;
  onViewStageContext: (processId: number, stageIndex: number, subject: string, label: string) => void;
  onRestart: (stageIndex: number) => void;
  onRestartWithData: (stageIndex: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const stage = node.Data;
  if (!stage) return null;

  const hasChildren = node.Children && node.Children.length > 0;
  const color = STAGE_COLORS[stage.Type] ?? "#888";
  const contextButtons = getStageContextButtons(stage);
  const indent = depth * 20;

  return (
    <div>
      <div style={{ paddingLeft: indent, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        {/* Row 1: expand arrow + colored index + name + elapsed + actions */}
        <div className="flex items-center" style={{ padding: "4px 12px", gap: 6 }}>
          {/* Expand/collapse for nodes with children */}
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="tree-action-btn"
              style={{ width: 18, height: 18, flexShrink: 0 }}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span style={{ width: 18, flexShrink: 0 }} />
          )}

          {/* Colored circle with index */}
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: color,
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              textShadow: "0 0 2px rgba(0,0,0,0.5)",
            }}
          >
            {stage.Index}
          </span>

          {/* Display name */}
          <span style={{ fontSize: 13, flex: 1 }}>
            {stage.DisplayName || stage.Name}
          </span>

          {/* Elapsed */}
          {stage.Elapsed && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)", flexShrink: 0 }}>
              {stage.Elapsed}
            </span>
          )}

          {/* Manual restart buttons */}
          {isManual && (
            <div className="flex items-center shrink-0" style={{ gap: 2 }}>
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
            </div>
          )}
        </div>

        {/* Row 2: context buttons */}
        <div className="flex items-center flex-wrap" style={{ gap: 3, padding: "0 12px 4px", paddingLeft: 12 + 18 + 6 + 24 + 6 }}>
          {contextButtons.map((btn) => (
            <button
              key={`${btn.label}-${btn.stageIndex}`}
              onClick={() => onViewStageContext(processId, btn.stageIndex, btn.subject, `${stage.DisplayName || stage.Name} — ${btn.label}`)}
              className="toolbar-btn"
              style={{
                padding: "1px 6px",
                fontSize: 11,
                background: btn.danger ? "rgba(246,81,29,0.2)" : "rgba(255,255,255,0.06)",
                border: btn.danger ? "1px solid rgba(246,81,29,0.6)" : "1px solid var(--color-border)",
                color: btn.danger ? "#F6511D" : "var(--color-text-muted)",
                fontWeight: btn.danger ? 600 : 400,
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Children (sub-stages) */}
      {hasChildren && expanded && (
        <div>
          {node.Children.map((child, i) => (
            <StageTreeNode
              key={child.Data?.StageIndex ?? i}
              node={child}
              depth={depth + 1}
              processId={processId}
              isManual={isManual}
              onViewStageContext={onViewStageContext}
              onRestart={onRestart}
              onRestartWithData={onRestartWithData}
            />
          ))}
        </div>
      )}
    </div>
  );
}
