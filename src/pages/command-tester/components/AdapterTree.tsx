import { ChevronRight, ChevronDown } from "lucide-react";
import type { TreeNode } from "../types";

interface AdapterTreeProps {
  nodes: TreeNode[];
  selectedKey: string;
  onExpand: (node: TreeNode) => void;
  onSelect: (node: TreeNode) => void;
}

export function AdapterTree({ nodes, selectedKey, onExpand, onSelect }: AdapterTreeProps) {
  return (
    <TreeList nodes={nodes} depth={0} selectedKey={selectedKey} onExpand={onExpand} onSelect={onSelect} />
  );
}

interface TreeListProps {
  nodes?: TreeNode[];
  depth: number;
  selectedKey: string;
  onExpand: (node: TreeNode) => void;
  onSelect: (node: TreeNode) => void;
}

function TreeList({ nodes, depth, selectedKey, onExpand, onSelect }: TreeListProps) {
  if (!nodes?.length) return null;
  return (
    <ul className="list-none select-none" style={{ marginLeft: depth > 0 ? 8 : 0 }}>
      {nodes.map((node) => (
        <li key={node.key}>
          <NodeRow
            node={node}
            depth={depth}
            active={node.key === selectedKey}
            onSelect={onSelect}
            onExpand={onExpand}
          />
          {node.expanded && node.nodes && (
            <TreeList
              nodes={node.nodes}
              depth={depth + 1}
              selectedKey={selectedKey}
              onExpand={onExpand}
              onSelect={onSelect}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

const typeColors: Record<string, string> = {
  name: "antiquewhite",
  type: "var(--color-primary)",
  front: "lightgreen",
  back: "burlywood",
  command: "var(--color-text-primary)",
};

function NodeRow({
  node,
  depth,
  active,
  onSelect,
  onExpand,
}: {
  node: TreeNode;
  depth: number;
  active: boolean;
  onSelect: (n: TreeNode) => void;
  onExpand: (n: TreeNode) => void;
}) {
  const isCommand = node.type === "command";
  const handleClick = () => (isCommand ? onSelect(node) : onExpand(node));
  const color = typeColors[node.type] ?? "var(--color-text-primary)";

  return (
    <div
      onClick={handleClick}
      className="flex items-center cursor-pointer"
      style={{
        height: 22,
        paddingLeft: depth * 8 + 4,
        paddingRight: 8,
        fontSize: 13,
        color,
        background: active ? "var(--color-focus-border)" + "33" : "transparent",
        ...(active
          ? { outline: "1px solid var(--color-focus-border)" }
          : {}),
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {!isCommand ? (
        node.expanded
          ? <ChevronDown size={16} className="shrink-0" style={{ color: "var(--color-text-muted)", marginRight: 2 }} />
          : <ChevronRight size={16} className="shrink-0" style={{ color: "var(--color-text-muted)", marginRight: 2 }} />
      ) : (
        <span style={{ width: 18 }} className="shrink-0" />
      )}
      <span className="truncate">{node.label}</span>
    </div>
  );
}
