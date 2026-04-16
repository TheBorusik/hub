import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, FolderPlus, KeyRound, ChevronsUpDown, ChevronsDownUp, Search, ChevronRight, ChevronDown, Folder, Key, Pencil, Trash2 } from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import { PermissionDialog } from "./PermissionDialog";
import type { PermissionTreeNode } from "../../types";

type Overlay =
  | { type: "none" }
  | { type: "addCatalog"; editing: PermissionTreeNode | null }
  | { type: "addPermission"; editing: PermissionTreeNode | null }
  | { type: "confirm"; title: string; onConfirm: () => void };

export function PermissionsPanel() {
  const api = useContourApi();
  const [tree, setTree] = useState<PermissionTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(true);
  const [overlay, setOverlay] = useState<Overlay>({ type: "none" });

  const load = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.getPermissionTree();
      const list = (res as Record<string, unknown>).PermissionTree;
      setTree(Array.isArray(list) ? (list as PermissionTreeNode[]) : []);
    } catch { setTree([]); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const collectIds = useCallback((nodes: PermissionTreeNode[]): string[] => {
    const ids: string[] = [];
    for (const n of nodes) {
      const id = nodeId(n);
      ids.push(id);
      if (n.PermissionTree?.length) ids.push(...collectIds(n.PermissionTree));
    }
    return ids;
  }, []);

  useEffect(() => {
    if (allExpanded && tree.length > 0) {
      setExpanded(new Set(collectIds(tree)));
    }
  }, [tree, allExpanded, collectIds]);

  const expandAll = () => { setExpanded(new Set(collectIds(tree))); setAllExpanded(true); };
  const collapseAll = () => { setExpanded(new Set()); setAllExpanded(false); };

  const toggleNode = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filterMatch = useCallback((node: PermissionTreeNode, q: string): boolean => {
    if (node.Name.toLowerCase().includes(q) || (node.Description ?? "").toLowerCase().includes(q)) return true;
    if (node.PermissionTree?.some((c) => filterMatch(c, q))) return true;
    return false;
  }, []);

  const filteredTree = useMemo(() => {
    if (!filter) return tree;
    const q = filter.toLowerCase();
    const filterNodes = (nodes: PermissionTreeNode[]): PermissionTreeNode[] =>
      nodes
        .filter((n) => filterMatch(n, q))
        .map((n) => ({
          ...n,
          PermissionTree: n.PermissionTree ? filterNodes(n.PermissionTree) : undefined,
        }));
    return filterNodes(tree);
  }, [tree, filter, filterMatch]);

  const handleDelete = (node: PermissionTreeNode) => {
    if (!api) return;
    const isCatalog = node.Type === "catalog";
    setOverlay({
      type: "confirm",
      title: `Delete ${isCatalog ? "catalog" : "permission"} "${node.Name}"?`,
      onConfirm: async () => {
        if (isCatalog && node.CatalogId != null) {
          await api.removePermissionCatalog(node.CatalogId);
        } else if (node.PermissionId != null) {
          await api.removePermission(node.PermissionId);
        }
        setOverlay({ type: "none" });
        load();
      },
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ position: "relative" }}>
      <div className="flex items-center gap-2 shrink-0" style={{ height: 35, padding: "0 12px", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={load} disabled={loading} className="toolbar-btn" title="Refresh">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
        <button onClick={() => setOverlay({ type: "addCatalog", editing: null })} className="toolbar-btn" title="Add Catalog">
          <FolderPlus size={14} />
        </button>
        <button onClick={() => setOverlay({ type: "addPermission", editing: null })} className="toolbar-btn" title="Add Permission">
          <KeyRound size={14} />
        </button>
        <button onClick={expandAll} className="toolbar-btn" title="Expand All">
          <ChevronsUpDown size={14} />
        </button>
        <button onClick={collapseAll} className="toolbar-btn" title="Collapse All">
          <ChevronsDownUp size={14} />
        </button>
        <div className="flex items-center gap-1" style={{ marginLeft: "auto" }}>
          <Search size={14} style={{ color: "var(--color-text-muted)" }} />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter..." style={searchStyle} />
        </div>
      </div>

      <div className="flex-1 overflow-auto" style={{ padding: "4px 0" }}>
        {filteredTree.map((node) => (
          <PermTreeNode
            key={nodeId(node)}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={toggleNode}
            onEdit={(n) => setOverlay({ type: n.Type === "catalog" ? "addCatalog" : "addPermission", editing: n })}
            onDelete={handleDelete}
          />
        ))}
        {filteredTree.length === 0 && !loading && (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 24, fontSize: 12 }}>
            No permissions found
          </div>
        )}
      </div>

      {(overlay.type === "addCatalog" || overlay.type === "addPermission") && api && (
        <PermissionDialog
          mode={overlay.type === "addCatalog" ? "catalog" : "permission"}
          editing={overlay.editing}
          api={api}
          onClose={() => setOverlay({ type: "none" })}
          onDone={() => { setOverlay({ type: "none" }); load(); }}
        />
      )}

      {overlay.type === "confirm" && (
        <ConfirmOverlay title={overlay.title} onConfirm={overlay.onConfirm} onCancel={() => setOverlay({ type: "none" })} />
      )}
    </div>
  );
}

let _permNodeCounter = 0;
const _nodeKeyCache = new WeakMap<PermissionTreeNode, string>();

function nodeId(node: PermissionTreeNode): string {
  const cached = _nodeKeyCache.get(node);
  if (cached) return cached;
  let id: string;
  if (node.Type === "catalog" && node.CatalogId != null) {
    id = `cat-${node.CatalogId}`;
  } else if (node.PermissionId != null) {
    id = `perm-${node.PermissionId}`;
  } else {
    id = `node-${node.Name}-${++_permNodeCounter}`;
  }
  _nodeKeyCache.set(node, id);
  return id;
}

interface PermTreeNodeProps {
  node: PermissionTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (node: PermissionTreeNode) => void;
  onDelete: (node: PermissionTreeNode) => void;
}

function PermTreeNode({ node, depth, expanded, onToggle, onEdit, onDelete }: PermTreeNodeProps) {
  const id = nodeId(node);
  const hasChildren = node.PermissionTree && node.PermissionTree.length > 0;
  const isExpanded = expanded.has(id);
  const isCatalog = node.Type === "catalog";

  return (
    <>
      <div
        className="group flex items-center gap-1"
        style={{
          height: 24,
          paddingLeft: depth * 16 + 8,
          paddingRight: 8,
          fontSize: 12,
          cursor: hasChildren ? "pointer" : "default",
          userSelect: "none",
        }}
        onClick={() => hasChildren && onToggle(id)}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.6 }} /> : <ChevronRight size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}
        {isCatalog ? (
          <Folder size={14} style={{ flexShrink: 0, color: "#dcb67a" }} />
        ) : (
          <Key size={14} style={{ flexShrink: 0, color: "#5CADD5" }} />
        )}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text)" }}>
          {node.Name}
        </span>
        {node.PermissionId != null && (
          <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginRight: 4 }}>#{node.PermissionId}</span>
        )}
        <button onClick={(e) => { e.stopPropagation(); onEdit(node); }} className="toolbar-btn" style={actionBtn} title="Edit"><Pencil size={11} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(node); }} className="toolbar-btn" style={actionBtn} title="Delete"><Trash2 size={11} /></button>
      </div>
      {hasChildren && isExpanded && node.PermissionTree!.map((child) => (
        <PermTreeNode
          key={nodeId(child)}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

function ConfirmOverlay({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <div style={overlayBg}>
      <div style={dialogStyle}>
        <p style={{ fontSize: 13, marginBottom: 16 }}>{title}</p>
        <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
          <button onClick={async () => { setSubmitting(true); await onConfirm(); setSubmitting(false); }} disabled={submitting} style={dangerBtnStyle}>{submitting ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

const actionBtn: React.CSSProperties = { opacity: 0.5 };
const searchStyle: React.CSSProperties = { background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 12, padding: "2px 6px", height: 22, width: 160, borderRadius: 3, outline: "none" };
const overlayBg: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 20, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60 };
const dialogStyle: React.CSSProperties = { backgroundColor: "var(--color-sidebar)", border: "1px solid var(--color-border)", borderRadius: 6, padding: 20, minWidth: 340, maxWidth: "80%", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const cancelBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: 3, cursor: "pointer" };
const dangerBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "#c53030", border: "none", color: "#fff", borderRadius: 3, cursor: "pointer" };
