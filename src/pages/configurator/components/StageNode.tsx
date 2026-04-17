import { memo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { MoreVertical, Move } from "lucide-react";
import type { WebLine } from "@/lib/ws-api-models";

export interface StageNodeData {
  stageName: string;
  displayName: string;
  type: string;
  color: string;
  isStartup?: boolean;
  returnStages?: string[];
  lines?: Record<string, WebLine>;
  /**
   * Имя подпроцесса (`Properties.ProcessName`) для стейджей типа SubStart/SubDefinition.
   * Используется пунктом меню "Edit Sub Process" для перехода/создания.
   */
  subProcessName?: string;
  onConfigure?: (name: string) => void;
  onSetStartup?: (name: string) => void;
  onClone?: (name: string) => void;
  onDelete?: (name: string) => void;
  onLineSettings?: (name: string) => void;
  onOpenSubProcess?: (processName: string) => void;
  [key: string]: unknown;
}

export type StageNodeType = Node<StageNodeData, "stage">;

const BORDER_RADIUS: Record<string, string> = {
  Final: "25px 4px 4px 25px",
  EndDefinition: "25px 4px 4px 25px",
  SubStart: "15px 4px 15px 4px",
  SubDefinition: "15px 4px 15px 4px",
  Event: "10px",
  EventDefinition: "10px",
  Command: "25px",
  CommandDefinition: "25px",
  CRUD: "25px",
  CRUDDefinition: "25px",
  Transform: "4px 25px 25px 4px",
  TransformDefinition: "4px 25px 25px 4px",
  Start: "4px",
};


const StageNode = memo(function StageNode({ data, selected }: NodeProps<StageNodeType>) {
  const borderRadius = BORDER_RADIUS[data.type] ?? "4px";
  const label = data.displayName || data.stageName;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);


  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ x: rect.left, y: rect.bottom + 2 });
    }
    setMenuOpen((v) => !v);
  }, []);

  const hasLines = data.returnStages && data.returnStages.length > 0;

  return (
    <div
      style={{
        background: "var(--color-sidebar, #1e1e1e)",
        border: `3px solid ${selected ? "var(--color-accent)" : data.color}`,
        borderRadius,
        height: 35,
        display: "flex",
        alignItems: "center",
        boxShadow: selected
          ? "0 0 0 2px rgba(14,99,156,0.4)"
          : `0 3px 1px -2px ${data.color}33, 0 2px 2px ${data.color}24, 0 1px 5px ${data.color}1f`,
        boxSizing: "border-box",
        fontSize: 10,
        lineHeight: "16px",
        cursor: "pointer",
        padding: "0 4px",
        position: "relative",
      }}
    >
      <button
        ref={btnRef}
        className="stage-menu-btn"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 2,
          display: "flex",
          alignItems: "center",
          color: data.color,
          opacity: 0.6,
          flexShrink: 0,
        }}
        title="Stage context"
        onClick={handleMenuClick}
      >
        <MoreVertical size={14} />
      </button>

      {/* Context menu — rendered in portal with backdrop overlay */}
      {menuOpen && createPortal(
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9999 }}
            onMouseDown={() => setMenuOpen(false)}
          />
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPos.y,
              left: menuPos.x,
              background: "var(--color-sidebar)",
              border: "1px solid var(--color-border)",
              borderRadius: 4,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              minWidth: 180,
              zIndex: 10000,
            }}
          >
          <button
            style={ctxItemStyle}
            onMouseDown={(e) => { e.stopPropagation(); setMenuOpen(false); data.onConfigure?.(data.stageName); }}
          >
            Configure Stage
          </button>
          {(data.type === "SubDefinition" || data.type === "SubStart") && (
            <button
              style={{ ...ctxItemStyle, opacity: data.subProcessName ? 1 : 0.4 }}
              disabled={!data.subProcessName}
              title={data.subProcessName
                ? `Open "${data.subProcessName}" in a new tab (or create if missing)`
                : "Fill in ProcessName in stage editor first"}
              onMouseDown={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                if (data.subProcessName && data.onOpenSubProcess) {
                  data.onOpenSubProcess(data.subProcessName);
                }
              }}
            >
              Edit Sub Process
            </button>
          )}
          <button
            style={{ ...ctxItemStyle, opacity: data.isStartup ? 0.4 : 1 }}
            disabled={data.isStartup}
            onMouseDown={(e) => { e.stopPropagation(); setMenuOpen(false); data.onSetStartup?.(data.stageName); }}
          >
            Set Startup Stage
          </button>
          <button
            style={ctxItemStyle}
            onMouseDown={(e) => { e.stopPropagation(); setMenuOpen(false); data.onClone?.(data.stageName); }}
          >
            Clone Stage
          </button>
          {hasLines && (
            <button
              style={ctxItemStyle}
              onMouseDown={(e) => { e.stopPropagation(); setMenuOpen(false); data.onLineSettings?.(data.stageName); }}
            >
              Line Settings...
            </button>
          )}

          <button
            style={{ ...ctxItemStyle, color: "#f44336", opacity: data.isStartup ? 0.4 : 1 }}
            disabled={data.isStartup}
            onMouseDown={(e) => { e.stopPropagation(); setMenuOpen(false); data.onDelete?.(data.stageName); }}
          >
            Delete Stage
          </button>
          </div>
        </>,
        document.body,
      )}

      <span style={{
        flex: 1,
        fontWeight: 600,
        color: "var(--color-text-primary)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        padding: "0 4px",
      }}>
        {label}
      </span>

      <div
        className="custom-drag-handle"
        style={{
          cursor: "move",
          padding: 2,
          display: "flex",
          alignItems: "center",
          color: "var(--color-text-muted)",
          opacity: 0.3,
          flexShrink: 0,
        }}
      >
        <Move size={12} />
      </div>

      <Handle id="top" type="target" position={Position.Top} style={{ background: data.color, width: 6, height: 6, border: "none", top: -3 }} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={{ background: data.color, width: 6, height: 6, border: "none", bottom: -3 }} />
      <Handle id="left-in" type="target" position={Position.Left} style={{ background: data.color, width: 6, height: 6, border: "none", left: -3 }} />
      <Handle id="right-in" type="target" position={Position.Right} style={{ background: data.color, width: 6, height: 6, border: "none", right: -3 }} />
      <Handle id="bottom-in" type="target" position={Position.Bottom} style={{ background: data.color, width: 6, height: 6, border: "none", bottom: -3 }} />
      <Handle id="left-out" type="source" position={Position.Left} style={{ background: data.color, width: 6, height: 6, border: "none", left: -3 }} />
      <Handle id="right-out" type="source" position={Position.Right} style={{ background: data.color, width: 6, height: 6, border: "none", right: -3 }} />
      <Handle id="top-out" type="source" position={Position.Top} style={{ background: data.color, width: 6, height: 6, border: "none", top: -3 }} />
    </div>
  );
});

const ctxItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  padding: "6px 10px",
  fontSize: 12,
  color: "var(--color-text-primary)",
  background: "none",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
};

export default StageNode;
