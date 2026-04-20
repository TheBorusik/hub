import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
  applyNodeChanges,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type NodeChange,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, ShieldCheck, Loader2 } from "lucide-react";
import type { WebProcess, ProcessStage } from "@/lib/ws-api-models";
import type { HubWsApi } from "@/lib/ws-api";
import StageNode, { type StageNodeData } from "./StageNode";
import { AddStageDialog } from "./AddStageDialog";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { LineSettingsDialog } from "./LineSettingsDialog";
import { recomputeReturnStages } from "../utils/recomputeReturnStages";

import { STAGE_TYPE_COLORS } from "../lib/stage-colors";



const nodeTypes = { stage: StageNode };

interface ProcessDiagramProps {
  process: WebProcess;
  onProcessUpdate: (process: WebProcess) => void;
  onSelectStage: (name: string) => void;
  api?: HubWsApi;
  onSave?: () => void;
  onShowModel?: (model: "InitObject" | "Context" | "ProcessResult") => void;
  /** Запуск серверной валидации процесса. Кнопка внизу диаграммы. */
  onValidate?: () => Promise<void> | void;
  /** Идёт ли в данный момент валидация — для состояния кнопки. */
  validating?: boolean;
  /** Перейти в подпроцесс (по `Name` из `Properties.ProcessName`) — для SubStart. */
  onOpenSubProcess?: (processName: string) => void;
}

interface BuildNodesCallbacks {
  onConfigure?: (name: string) => void;
  onSetStartup?: (name: string) => void;
  onClone?: (name: string) => void;
  onDelete?: (name: string) => void;
  onLineSettings?: (name: string) => void;
  onOpenSubProcess?: (processName: string) => void;
}

function buildNodes(process: WebProcess, callbacks?: BuildNodesCallbacks): Node<StageNodeData>[] {
  const stages = process.Stages ?? {};
  const webStages = process.WebData?.Stages ?? {};

  return Object.keys(stages).map((name, idx) => {
    const stage = stages[name];
    const ws = webStages[name];
    const color = ws?.Color || STAGE_TYPE_COLORS[stage.Type] || "#888";
    const pos = ws?.Position ?? { x: (idx % 5) * 200 + 50, y: Math.floor(idx / 5) * 150 + 50 };

    // Для SubStart/SubDefinition протаскиваем имя подпроцесса в ноду —
    // по нему контекстное меню сможет открыть подпроцесс.
    const subProcessName = (stage.Properties?.ProcessName ?? "").trim() || undefined;

    return {
      id: name,
      type: "stage",
      position: { x: pos.x, y: pos.y },
      dragHandle: ".custom-drag-handle",
      data: {
        stageName: name,
        displayName: stage.DisplayName ?? "",
        type: stage.Type,
        color,
        isStartup: process.Startup === name,
        returnStages: stage.ReturnStages ?? [],
        lines: ws?.Lines ?? {},
        subProcessName,
        ...callbacks,
      },
    };
  });
}

function mapHandle(pos: string | undefined, direction: "out" | "in"): string | undefined {
  const p = (pos ?? "").toLowerCase();
  if (direction === "out") {
    if (p === "left") return "left-out";
    if (p === "right") return "right-out";
    if (p === "top") return "top-out";
    return "bottom";
  }
  if (p === "left") return "left-in";
  if (p === "right") return "right-in";
  if (p === "bottom") return "bottom-in";
  return "top";
}

function reverseMapHandle(handleId: string | null | undefined): string {
  if (!handleId) return "auto";
  if (handleId.startsWith("left")) return "left";
  if (handleId.startsWith("right")) return "right";
  if (handleId.startsWith("top")) return "top";
  if (handleId.startsWith("bottom")) return "bottom";
  return "auto";
}

function buildEdges(process: WebProcess): Edge[] {
  const stages = process.Stages ?? {};
  const webStages = process.WebData?.Stages ?? {};
  const es: Edge[] = [];
  const added = new Set<string>();

  for (const name of Object.keys(stages)) {
    const stage = stages[name];
    const stageColor = webStages[name]?.Color ?? STAGE_TYPE_COLORS[stage.Type] ?? "#888";

    for (const target of stage.ReturnStages ?? []) {
      if (!stages[target]) continue;
      const key = `${name}->${target}`;
      if (added.has(key)) continue;
      added.add(key);

      const lineInfo = webStages[name]?.Lines?.[target];
      es.push({
        id: key,
        source: name,
        target,
        sourceHandle: mapHandle(lineInfo?.LineOut, "out"),
        targetHandle: mapHandle(lineInfo?.LineIn, "in"),
        type: "smoothstep",
        animated: lineInfo?.Dash ?? false,
        style: { stroke: stageColor, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color: stageColor },
      });
    }

    const wsLines = webStages[name]?.Lines ?? {};
    for (const target of Object.keys(wsLines)) {
      if (!stages[target]) continue;
      const key = `${name}->${target}`;
      if (added.has(key)) continue;
      added.add(key);

      const lineInfo = wsLines[target];
      es.push({
        id: key,
        source: name,
        target,
        sourceHandle: mapHandle(lineInfo?.LineOut, "out"),
        targetHandle: mapHandle(lineInfo?.LineIn, "in"),
        type: "smoothstep",
        animated: lineInfo?.Dash ?? false,
        style: { stroke: stageColor, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color: stageColor },
      });
    }
  }

  return es;
}

function DiagramInner({ process, onProcessUpdate, onSelectStage, onValidate, validating, onOpenSubProcess }: ProcessDiagramProps) {
  const { fitView } = useReactFlow();
  const confirm = useConfirm();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [cloneSource, setCloneSource] = useState<string | null>(null);
  const [lineSettingsTarget, setLineSettingsTarget] = useState<string | null>(null);

  const handleSetStartup = useCallback((name: string) => {
    onProcessUpdate({ ...process, Startup: name });
  }, [process, onProcessUpdate]);

  const doDeleteStage = useCallback((name: string) => {
    const newStages = { ...(process.Stages ?? {}) };
    delete newStages[name];
    const newWebStages = { ...(process.WebData?.Stages ?? {}) };
    delete newWebStages[name];
    onProcessUpdate(recomputeReturnStages({
      ...process,
      Stages: newStages,
      WebData: process.WebData ? { ...process.WebData, Stages: newWebStages } : process.WebData,
    }));
  }, [process, onProcessUpdate]);

  const askDeleteStage = useCallback((name: string) => {
    void confirm({
      title: "Delete Stage",
      message: `Are you sure you want to delete "${name}"?`,
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: () => { doDeleteStage(name); },
    });
  }, [confirm, doDeleteStage]);

  const handleReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    if (newConnection.source !== oldEdge.source || newConnection.target !== oldEdge.target) return;
    const sourceStage = oldEdge.source;
    const targetStage = oldEdge.target;
    if (!sourceStage || !targetStage) return;

    const newLineOut = reverseMapHandle(newConnection.sourceHandle);
    const newLineIn = reverseMapHandle(newConnection.targetHandle);

    const webStages = { ...(process.WebData?.Stages ?? {}) };
    const ws = { ...(webStages[sourceStage] ?? { Position: { x: 0, y: 0 }, Color: "#888", Lines: {} }) };
    const lines = { ...(ws.Lines ?? {}) };
    const line = { ...(lines[targetStage] ?? { LineIn: "top", LineOut: "auto" }) };
    line.LineOut = newLineOut;
    line.LineIn = newLineIn;
    lines[targetStage] = line;
    ws.Lines = lines;
    webStages[sourceStage] = ws;
    onProcessUpdate({
      ...process,
      WebData: process.WebData ? { ...process.WebData, Stages: webStages } : { Stages: webStages },
    });
  }, [process, onProcessUpdate]);

  const handleLineUpdate = useCallback((stageName: string, targetName: string, field: string, value: string | boolean) => {
    const webStages = { ...(process.WebData?.Stages ?? {}) };
    const ws = { ...(webStages[stageName] ?? { Position: { x: 0, y: 0 }, Color: "#888", Lines: {} }) };
    const lines = { ...(ws.Lines ?? {}) };
    const line = { ...(lines[targetName] ?? { LineIn: "top", LineOut: "auto" }) };
    (line as Record<string, unknown>)[field] = value;
    lines[targetName] = line;
    ws.Lines = lines;
    webStages[stageName] = ws;
    onProcessUpdate({
      ...process,
      WebData: process.WebData ? { ...process.WebData, Stages: webStages } : { Stages: webStages },
    });
  }, [process, onProcessUpdate]);

  const addNewStage = useCallback((type: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || process.Stages?.[trimmed]) return;
    const newStage: ProcessStage = {
      Type: type === "Final" ? "EndDefinition" : type === "SubStart" ? "SubDefinition" : `${type}Definition`,
      DisplayName: trimmed, Name: trimmed, GetData: "", GetNextStage: "", GetErrorNextStage: "", ReturnStages: [], Properties: {},
    };
    const ct = Object.keys(process.Stages ?? {}).length;
    const newWebStage = { Position: { x: (ct % 5) * 200 + 50, y: Math.floor(ct / 5) * 150 + 50 }, Color: STAGE_TYPE_COLORS[newStage.Type] ?? "#888", Lines: {} };
    onProcessUpdate(recomputeReturnStages({
      ...process,
      Stages: { ...(process.Stages ?? {}), [trimmed]: newStage },
      WebData: process.WebData
        ? { ...process.WebData, Stages: { ...(process.WebData.Stages ?? {}), [trimmed]: newWebStage } }
        : { Stages: { [trimmed]: newWebStage } },
    }));
    setShowAddDialog(false);
  }, [process, onProcessUpdate]);

  const cloneStage = useCallback((sourceName: string, newName: string) => {
    const stages = process.Stages ?? {};
    const source = stages[sourceName];
    if (!source) return;
    const trimmed = newName.trim();
    if (!trimmed || stages[trimmed]) return;
    const cloned: ProcessStage = { ...source, Name: trimmed, DisplayName: source.DisplayName || trimmed };
    const ws = process.WebData?.Stages?.[sourceName];
    const clonedWeb = ws
      ? { ...ws, Position: { x: (ws.Position?.x ?? 0) + 50, y: (ws.Position?.y ?? 0) + 50 } }
      : { Position: { x: 100, y: 100 }, Color: STAGE_TYPE_COLORS[source.Type] ?? "#888", Lines: {} };
    onProcessUpdate(recomputeReturnStages({
      ...process,
      Stages: { ...stages, [trimmed]: cloned },
      WebData: process.WebData
        ? { ...process.WebData, Stages: { ...(process.WebData.Stages ?? {}), [trimmed]: clonedWeb } }
        : { Stages: { [trimmed]: clonedWeb } },
    }));
    setShowAddDialog(false);
    setCloneSource(null);
  }, [process, onProcessUpdate]);

  const nodeCallbacks = useMemo<BuildNodesCallbacks>(() => ({
    onConfigure: onSelectStage,
    onSetStartup: handleSetStartup,
    onClone: (name: string) => { setCloneSource(name); setShowAddDialog(true); },
    onDelete: askDeleteStage,
    onLineSettings: (name: string) => setLineSettingsTarget(name),
    onOpenSubProcess,
  }), [onSelectStage, handleSetStartup, onOpenSubProcess, askDeleteStage]);

  const edges = useMemo(() => buildEdges(process), [process]);
  const [nodes, setNodes] = useState<Node<StageNodeData>[]>(() => buildNodes(process, nodeCallbacks));

  useEffect(() => { setNodes(buildNodes(process, nodeCallbacks)); }, [process, nodeCallbacks]);
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.3, duration: 200 }), 150);
    return () => clearTimeout(t);
  }, [process.TypeName, fitView]);

  const onNodesChange: OnNodesChange<Node<StageNodeData>> = useCallback(
    (changes: NodeChange<Node<StageNodeData>>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      const drags = changes.filter((c): c is Extract<typeof c, { type: "position" }> => c.type === "position" && c.dragging === false && c.position != null);
      if (drags.length > 0) {
        const upd = { ...(process.WebData?.Stages ?? {}) };
        for (const ch of drags) {
          if (!ch.position) continue;
          upd[ch.id] = { ...(upd[ch.id] ?? { Position: { x: 0, y: 0 }, Color: "#888", Lines: {} }), Position: { x: Math.round(ch.position.x), y: Math.round(ch.position.y) } };
        }
        onProcessUpdate({ ...process, WebData: process.WebData ? { ...process.WebData, Stages: upd } : { Stages: upd } });
      }
    },
    [process, onProcessUpdate],
  );

  const stageNames = Object.keys(process.Stages ?? {});

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onReconnect={handleReconnect}
        onNodeClick={useCallback((_: React.MouseEvent, node: Node) => onSelectStage(node.id), [onSelectStage])}
        fitView fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.1} maxZoom={3}
        defaultEdgeOptions={{ type: "smoothstep", reconnectable: true }}
      >
        <Background gap={20} size={1} color="rgba(255,255,255,0.04)" />
        <Controls showInteractive={false} />
      </ReactFlow>

      <button
        title="Add Stage"
        style={{
          position: "absolute", bottom: 12, right: 12, width: 36, height: 36,
          borderRadius: "50%", background: "var(--color-accent)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", zIndex: 10,
        }}
        onClick={() => { setCloneSource(null); setShowAddDialog(true); }}
      >
        <Plus size={20} />
      </button>

      {/* Validate Process — sticky bar внизу диаграммы. */}
      {onValidate && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 12,
            transform: "translateX(-50%)",
            zIndex: 10,
          }}
        >
          <button
            title="Validate Process"
            onClick={() => { void onValidate(); }}
            disabled={validating}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px",
              fontSize: 12, fontWeight: 500,
              background: "var(--color-sidebar)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
              borderRadius: 4,
              cursor: validating ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              opacity: validating ? 0.6 : 1,
            }}
          >
            {validating
              ? <Loader2 size={14} className="animate-spin" />
              : <ShieldCheck size={14} color="#4ec9b0" />}
            <span>{validating ? "Validating..." : "Validate Process"}</span>
          </button>
        </div>
      )}

      {showAddDialog && (
        <AddStageDialog
          existingNames={stageNames}
          cloneSource={cloneSource}
          onAdd={addNewStage}
          onClone={cloneStage}
          onCancel={() => { setShowAddDialog(false); setCloneSource(null); }}
        />
      )}

      {lineSettingsTarget && (
        <LineSettingsDialog
          stageName={lineSettingsTarget}
          stageDisplayName={process.Stages?.[lineSettingsTarget]?.DisplayName}
          lines={process.WebData?.Stages?.[lineSettingsTarget]?.Lines ?? {}}
          onLineUpdate={handleLineUpdate}
          onClose={() => setLineSettingsTarget(null)}
        />
      )}
    </div>
  );
}

export function ProcessDiagram(props: ProcessDiagramProps) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlowProvider>
        <DiagramInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
