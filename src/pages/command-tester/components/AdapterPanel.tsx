import { useState, useMemo, useCallback, useEffect } from "react";
import { RefreshCw, Settings } from "lucide-react";
import { AdapterTree } from "./AdapterTree";
import { useContourApi } from "@/lib/ws-api";
import type { TreeNode, SelectedCommand } from "../types";

interface AdapterPanelProps {
  onSelectCommand: (cmd: SelectedCommand) => void;
  onSettingsClick?: () => void;
}

export function AdapterPanel({ onSelectCommand, onSettingsClick }: AdapterPanelProps) {
  const api = useContourApi();
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const loadAdapters = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const data = await api.getAdaptersInfo();
      setNodes(data.Adapters as unknown as TreeNode[]);
    } catch (err) {
      console.error("Failed to load adapters:", err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadAdapters();
  }, [loadAdapters]);

  const filteredNodes = useMemo(() => {
    if (!filter || filter.length < 3) return nodes;
    return filterTree(nodes, filter);
  }, [nodes, filter]);

  const handleExpand = (node: TreeNode) => {
    const next = [...nodes];
    const keys = node.key.split("-");
    const target = keys
      .slice(1)
      .reduce<TreeNode>(
        (n, k) => n.nodes?.[Number(k)] ?? ({} as TreeNode),
        next[Number(keys[0])],
      );
    target.expanded = !target.expanded;
    setNodes(next);
  };

  const handleSelect = (node: TreeNode) => {
    setSelectedKey(node.key);
    onSelectCommand({
      key: node.key,
      label: node.label,
      data: node.data ?? {
        Level: "",
        AdapterName: "",
        AdapterType: "",
        CommandName: node.label,
      },
      json: node.currentJson ?? node.json ?? "{}",
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex items-center shrink-0 border-b border-border"
        style={{ padding: "6px 8px", gap: 6 }}
      >
        {onSettingsClick && (
          <button onClick={onSettingsClick} className="toolbar-btn" title="Settings">
            <Settings size={16} />
          </button>
        )}
        <input
          type="text"
          placeholder="Filter (3+ chars, + = AND, | = adapter|cmd)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1"
          style={{ fontSize: 12 }}
        />
        <button onClick={loadAdapters} disabled={loading} className="toolbar-btn" title="Reload">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <AdapterTree
          nodes={filteredNodes}
          selectedKey={selectedKey}
          onExpand={handleExpand}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}

function filterTree(nodes: TreeNode[], filter: string): TreeNode[] {
  const result: TreeNode[] = [];
  const [adapterFilter, commandFilter] = filter.split("|");
  const filterParts = filter.split("+");

  for (const nameNode of nodes) {
    const name: TreeNode = { ...nameNode, nodes: [], expanded: true };

    for (const typeNode of nameNode.nodes ?? []) {
      const type: TreeNode = { ...typeNode, nodes: [], expanded: true };

      for (const levelNode of typeNode.nodes ?? []) {
        const level: TreeNode = { ...levelNode, nodes: [], expanded: true };

        const matched =
          levelNode.nodes?.filter((cmd) => {
            if (adapterFilter && commandFilter !== undefined) {
              return (
                type.label.toLowerCase().includes(adapterFilter.toLowerCase()) &&
                cmd.label.toLowerCase().includes(commandFilter.toLowerCase())
              );
            }
            return filterParts.every((p) =>
              cmd.label.toLowerCase().includes(p.toLowerCase()),
            );
          }) ?? [];

        if (matched.length) {
          level.nodes = matched;
          type.nodes!.push(level);
        }
      }

      if (type.nodes!.length) name.nodes!.push(type);
    }

    if (name.nodes!.length) result.push(name);
  }

  return result;
}
