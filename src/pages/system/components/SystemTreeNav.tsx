import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Shield,
  Users,
  Heart,
  Settings2,
  Layers,
  Table2,
  AlertCircle,
  Terminal,
  Zap,
  FileWarning,
  MoreHorizontal,
} from "lucide-react";
import { TreeView, type TreeNode } from "@/components/ui/TreeView";
import type { SystemView } from "../types";

interface ItemMeta {
  view?: SystemView;
}

function leaf(id: string, label: string, Icon: typeof Activity, view: SystemView): TreeNode<ItemMeta> {
  return {
    id,
    label,
    icon: <Icon size={14} style={{ flexShrink: 0, opacity: 0.8 }} />,
    meta: { view },
  };
}

function group(id: string, label: string, Icon: typeof Activity, children: TreeNode<ItemMeta>[]): TreeNode<ItemMeta> {
  return {
    id,
    label,
    icon: <Icon size={14} style={{ flexShrink: 0, opacity: 0.8 }} />,
    children,
  };
}

const TREE: TreeNode<ItemMeta>[] = [
  group("adapters", "Adapters", Activity, [
    leaf("status", "Status", Heart, "status"),
    leaf("configuration", "Configuration", Settings2, "configuration"),
    leaf("base-sections", "Base Sections", Layers, "base-sections"),
    leaf("table-data", "Table Data", Table2, "table-data"),
  ]),
  group("errors", "Errors", AlertTriangle, [
    leaf("errors-wfm", "WFM", AlertCircle, "errors-wfm"),
    leaf("errors-command", "Command", Terminal, "errors-command"),
    leaf("errors-event", "Event", Zap, "errors-event"),
    leaf("errors-result", "Result", FileWarning, "errors-result"),
    leaf("errors-other", "Other", MoreHorizontal, "errors-other"),
  ]),
  leaf("permissions", "Permissions", Shield, "permissions"),
  leaf("roles", "Roles", Users, "roles"),
];

// Рекурсивно находим id-узла по его view.
function findIdByView(nodes: TreeNode<ItemMeta>[], view: SystemView): string | null {
  for (const n of nodes) {
    if (n.meta?.view === view) return n.id;
    if (n.children) {
      const hit = findIdByView(n.children, view);
      if (hit) return hit;
    }
  }
  return null;
}

interface SystemTreeNavProps {
  activeView: SystemView;
  onSelect: (view: SystemView) => void;
}

export function SystemTreeNav({ activeView, onSelect }: SystemTreeNavProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["adapters", "errors"]));
  const selectedId = useMemo(() => findIdByView(TREE, activeView), [activeView]);

  return (
    <div style={{ padding: "4px 0" }}>
      <TreeView<ItemMeta>
        nodes={TREE}
        selectedId={selectedId}
        expandedIds={expanded}
        onToggleExpand={(id, next) => {
          setExpanded((prev) => {
            const s = new Set(prev);
            if (next) s.add(id);
            else s.delete(id);
            return s;
          });
        }}
        onSelect={(node) => {
          if (node.meta?.view) onSelect(node.meta.view);
          else setExpanded((prev) => {
            const s = new Set(prev);
            if (s.has(node.id)) s.delete(node.id);
            else s.add(node.id);
            return s;
          });
        }}
        indent={16}
        rowHeight={22}
        aria-label="System navigation"
      />
    </div>
  );
}
