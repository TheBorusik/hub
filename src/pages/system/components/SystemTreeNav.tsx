import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Shield,
  Users,
  ChevronRight,
  ChevronDown,
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
import type { SystemView } from "../types";

interface TreeItem {
  id: string;
  label: string;
  icon: React.ElementType;
  view?: SystemView;
  children?: TreeItem[];
}

const TREE: TreeItem[] = [
  {
    id: "adapters",
    label: "Adapters",
    icon: Activity,
    children: [
      { id: "status", label: "Status", icon: Heart, view: "status" },
      { id: "configuration", label: "Configuration", icon: Settings2, view: "configuration" },
      { id: "base-sections", label: "Base Sections", icon: Layers, view: "base-sections" },
      { id: "table-data", label: "Table Data", icon: Table2, view: "table-data" },
    ],
  },
  {
    id: "errors",
    label: "Errors",
    icon: AlertTriangle,
    children: [
      { id: "errors-wfm", label: "WFM", icon: AlertCircle, view: "errors-wfm" },
      { id: "errors-command", label: "Command", icon: Terminal, view: "errors-command" },
      { id: "errors-event", label: "Event", icon: Zap, view: "errors-event" },
      { id: "errors-result", label: "Result", icon: FileWarning, view: "errors-result" },
      { id: "errors-other", label: "Other", icon: MoreHorizontal, view: "errors-other" },
    ],
  },
  { id: "permissions", label: "Permissions", icon: Shield, view: "permissions" },
  { id: "roles", label: "Roles", icon: Users, view: "roles" },
];

interface SystemTreeNavProps {
  activeView: SystemView;
  onSelect: (view: SystemView) => void;
}

export function SystemTreeNav({ activeView, onSelect }: SystemTreeNavProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    adapters: true,
    errors: true,
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{ padding: "4px 0" }}>
      {TREE.map((item) => (
        <TreeNode
          key={item.id}
          item={item}
          depth={0}
          activeView={activeView}
          expanded={expanded}
          onToggle={toggleExpand}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface TreeNodeProps {
  item: TreeItem;
  depth: number;
  activeView: SystemView;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (view: SystemView) => void;
}

function TreeNode({ item, depth, activeView, expanded, onToggle, onSelect }: TreeNodeProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expanded[item.id] ?? false;
  const isActive = item.view === activeView;
  const Icon = item.icon;

  const handleClick = () => {
    if (hasChildren) {
      onToggle(item.id);
    } else if (item.view) {
      onSelect(item.view);
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          height: 22,
          paddingLeft: depth * 16 + 8,
          paddingRight: 8,
          cursor: "pointer",
          fontSize: 13,
          color: isActive ? "var(--color-text)" : "var(--color-text-muted)",
          backgroundColor: isActive ? "rgba(255,255,255,0.06)" : "transparent",
          fontWeight: hasChildren ? 600 : 400,
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
          ) : (
            <ChevronRight size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
          )
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}
        <Icon size={14} style={{ flexShrink: 0, opacity: 0.8 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.label}
        </span>
      </div>
      {hasChildren && isExpanded &&
        item.children!.map((child) => (
          <TreeNode
            key={child.id}
            item={child}
            depth={depth + 1}
            activeView={activeView}
            expanded={expanded}
            onToggle={onToggle}
            onSelect={onSelect}
          />
        ))}
    </>
  );
}
