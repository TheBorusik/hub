import { useState, useEffect, useCallback, useMemo, useRef, memo, useDeferredValue } from "react";
import {
  RefreshCw, FolderPlus, KeyRound, ChevronsUpDown, ChevronsDownUp,
  Search, ChevronRight, ChevronDown, Folder, FolderOpen,
  Pencil, Trash2, Plus, GripVertical,
} from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import { PermissionDialog } from "./PermissionDialog";
import type { PermissionTreeNode } from "../../types";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { IconButton } from "@/components/ui/Button/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { VirtualList } from "@/components/ui/VirtualList";
import { t as tok } from "@/lib/design-tokens";

function isCatalogNode(n: PermissionTreeNode): boolean {
  return n.Type?.toLowerCase() === "catalog";
}

type Overlay =
  | { type: "none" }
  | { type: "addCatalog"; editing: PermissionTreeNode | null; parentCatalogId?: number }
  | { type: "addPermission"; editing: PermissionTreeNode | null; catalogId?: number };

export function PermissionsPanel() {
  const api = useContourApi();
  const confirm = useConfirm();
  const [tree, setTree] = useState<PermissionTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const deferredFilter = useDeferredValue(filter);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>({ type: "none" });
  const [draggedNode, setDraggedNode] = useState<PermissionTreeNode | null>(null);
  const draggedNodeRef = useRef<PermissionTreeNode | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

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

  const expandAll = useCallback(() => { setExpanded(new Set(collectIds(tree))); setAllExpanded(true); }, [collectIds, tree]);
  const collapseAll = useCallback(() => { setExpanded(new Set()); setAllExpanded(false); }, []);

  const toggleNode = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const visibleIds = useMemo<Set<string> | null>(() => {
    if (!deferredFilter) return null;
    const q = deferredFilter.toLowerCase();
    const result = new Set<string>();

    const markVisible = (nodes: PermissionTreeNode[]): boolean => {
      let anyMatch = false;
      for (const n of nodes) {
        const id = nodeId(n);
        const nameMatch = n.Name.toLowerCase().includes(q) || (n.Description ?? "").toLowerCase().includes(q);
        const childMatch = n.PermissionTree?.length ? markVisible(n.PermissionTree) : false;
        if (nameMatch || childMatch) {
          result.add(id);
          anyMatch = true;
        }
      }
      return anyMatch;
    };
    markVisible(tree);
    return result;
  }, [tree, deferredFilter]);

  const isFiltering = filter !== deferredFilter;

  const handleDelete = useCallback(async (node: PermissionTreeNode) => {
    if (!api) return;
    const isCat = isCatalogNode(node);
    const ok = await confirm({
      title: `Delete ${isCat ? "catalog" : "permission"}`,
      message: `Delete ${isCat ? "catalog" : "permission"} "${node.Name}"?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    if (isCat && node.CatalogId != null) {
      await api.removePermissionCatalog(node.CatalogId);
    } else if (node.PermissionId != null) {
      await api.removePermission(node.PermissionId);
    }
    load();
  }, [api, confirm, load]);

  const startDrag = useCallback((node: PermissionTreeNode) => {
    draggedNodeRef.current = node;
    setDraggedNode(node);
  }, []);

  const endDrag = useCallback(() => {
    draggedNodeRef.current = null;
    setDraggedNode(null);
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback(async (targetCatalogId: number | null) => {
    const dragged = draggedNodeRef.current;
    if (!api || !dragged) return;
    const isCat = isCatalogNode(dragged);
    try {
      if (isCat && dragged.CatalogId != null) {
        await api.upsertPermissionCatalog({
          CatalogId: dragged.CatalogId,
          Name: dragged.Name,
          Description: dragged.Description ?? "",
          ParentId: targetCatalogId,
        });
      } else if (dragged.PermissionId != null) {
        await api.upsertPermission({
          PermissionId: dragged.PermissionId,
          StrId: dragged.StrId ?? undefined,
          Name: dragged.Name,
          Description: dragged.Description ?? "",
          CatalogId: targetCatalogId,
          PermissionSettings: dragged.PermissionSettings ?? undefined,
        });
      }
      load();
    } catch { /* ignore */ }
    endDrag();
  }, [api, load, endDrag]);

  const onEdit = useCallback((n: PermissionTreeNode) => {
    setOverlay({ type: isCatalogNode(n) ? "addCatalog" : "addPermission", editing: n });
  }, []);

  const onAddCatalog = useCallback((parentId: number) => {
    setOverlay({ type: "addCatalog", editing: null, parentCatalogId: parentId });
  }, []);

  const onAddPermission = useCallback((catId: number) => {
    setOverlay({ type: "addPermission", editing: null, catalogId: catId });
  }, []);

  const handleDropTargetChange = useCallback((id: string | null) => setDropTargetId(id), []);

  /** Плоский список видимых узлов для VirtualList. Повторяет логику рекурсивного
   *  рендера (`expanded` / `visibleIds` / `hasChildren`), но в одном проходе. */
  const flatNodes = useMemo(() => {
    const out: { node: PermissionTreeNode; depth: number; id: string }[] = [];
    const walk = (nodes: PermissionTreeNode[], depth: number) => {
      for (const n of nodes) {
        const id = nodeId(n);
        if (visibleIds !== null && !visibleIds.has(id)) continue;
        out.push({ node: n, depth, id });
        const hasChildren = n.PermissionTree && n.PermissionTree.length > 0;
        // При фильтрации — раскрываем всё, как и раньше.
        const isExpanded = visibleIds !== null ? true : expanded.has(id);
        if (hasChildren && isExpanded) walk(n.PermissionTree!, depth + 1);
      }
    };
    walk(tree, 0);
    return out;
  }, [tree, expanded, visibleIds]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ position: "relative" }}>
      <PanelToolbar
        dense
        left={
          <>
            <IconButton
              size="xs"
              label="Refresh"
              icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
              onClick={load}
              disabled={loading}
            />
            <IconButton
              size="xs"
              label="Add Catalog"
              icon={<FolderPlus size={14} />}
              onClick={() => setOverlay({ type: "addCatalog", editing: null })}
            />
            <IconButton
              size="xs"
              label="Add Permission"
              icon={<KeyRound size={14} />}
              onClick={() => setOverlay({ type: "addPermission", editing: null })}
            />
            <IconButton size="xs" label="Expand All" icon={<ChevronsUpDown size={14} />} onClick={expandAll} />
            <IconButton size="xs" label="Collapse All" icon={<ChevronsDownUp size={14} />} onClick={collapseAll} />
          </>
        }
        right={
          <div className="flex items-center gap-1">
            <Search size={14} style={{ color: tok.color.text.muted }} />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter..." style={searchStyle} />
            {isFiltering && <span style={{ fontSize: 9, color: tok.color.text.muted }}>...</span>}
          </div>
        }
      />

      <DropRootZone
        isOver={dropTargetId === "ROOT"}
        onDragOver={() => setDropTargetId("ROOT")}
        onDragLeave={() => setDropTargetId(null)}
        onDrop={() => handleDrop(null)}
      />

      {flatNodes.length === 0 ? (
        <div className="flex-1 overflow-auto" style={{ padding: "4px 0" }}>
          {visibleIds?.size === 0 && !loading && (
            <EmptyState dense title="Ничего не найдено" />
          )}
          {!deferredFilter && tree.length === 0 && !loading && (
            <EmptyState dense title="Нет permissions" />
          )}
        </div>
      ) : (
        <VirtualList
          items={flatNodes}
          itemHeight={26}
          overscan={8}
          className="flex-1"
          style={{ padding: "4px 0", opacity: isFiltering ? 0.6 : 1, transition: "opacity 100ms" }}
          aria-label="Permissions"
          getKey={(it) => it.id}
          renderItem={(it) => (
            <PermTreeRow
              node={it.node}
              depth={it.depth}
              isExpanded={visibleIds !== null ? true : expanded.has(it.id)}
              onToggle={toggleNode}
              onEdit={onEdit}
              onDelete={handleDelete}
              onAddCatalog={onAddCatalog}
              onAddPermission={onAddPermission}
              draggedNode={draggedNode}
              dropTargetId={dropTargetId}
              onDragStart={startDrag}
              onDragEnd={endDrag}
              onDropTargetChange={handleDropTargetChange}
              onDrop={handleDrop}
            />
          )}
        />
      )}

      {(overlay.type === "addCatalog" || overlay.type === "addPermission") && api && (
        <PermissionDialog
          mode={overlay.type === "addCatalog" ? "catalog" : "permission"}
          editing={overlay.editing}
          parentCatalogId={overlay.type === "addCatalog" ? overlay.parentCatalogId : undefined}
          catalogId={overlay.type === "addPermission" ? overlay.catalogId : undefined}
          api={api}
          onClose={() => setOverlay({ type: "none" })}
          onDone={() => { setOverlay({ type: "none" }); load(); }}
        />
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
  if (isCatalogNode(node) && node.CatalogId != null) {
    id = `cat-${node.CatalogId}`;
  } else if (node.PermissionId != null) {
    id = `perm-${node.PermissionId}`;
  } else {
    id = `node-${node.Name}-${++_permNodeCounter}`;
  }
  _nodeKeyCache.set(node, id);
  return id;
}

interface PermTreeRowProps {
  node: PermissionTreeNode;
  depth: number;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onEdit: (node: PermissionTreeNode) => void;
  onDelete: (node: PermissionTreeNode) => void;
  onAddCatalog: (parentCatalogId: number) => void;
  onAddPermission: (catalogId: number) => void;
  draggedNode: PermissionTreeNode | null;
  dropTargetId: string | null;
  onDragStart: (node: PermissionTreeNode) => void;
  onDragEnd: () => void;
  onDropTargetChange: (id: string | null) => void;
  onDrop: (targetCatalogId: number | null) => void;
}

const PermTreeRow = memo(function PermTreeRow({
  node, depth, isExpanded, onToggle, onEdit, onDelete,
  onAddCatalog, onAddPermission,
  draggedNode, dropTargetId, onDragStart, onDragEnd, onDropTargetChange, onDrop,
}: PermTreeRowProps) {
  const id = nodeId(node);

  const hasChildren = Boolean(node.PermissionTree && node.PermissionTree.length > 0);
  const isCatalog = isCatalogNode(node);
  const isDropTarget = dropTargetId === id && isCatalog;
  const isDragging = draggedNode && nodeId(draggedNode) === id;
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    onDragStart(node);
  }, [id, node, onDragStart]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!isCatalog) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    onDropTargetChange(id);
  }, [isCatalog, id, onDropTargetChange]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    onDropTargetChange(null);
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
  }, [onDropTargetChange]);

  const handleDropOnThis = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    if (isCatalog && node.CatalogId != null) {
      onDrop(node.CatalogId);
    }
  }, [isCatalog, node.CatalogId, onDrop]);

  useEffect(() => {
    if (isDropTarget && !isExpanded && hasChildren && !hoverTimerRef.current) {
      hoverTimerRef.current = setTimeout(() => { onToggle(id); hoverTimerRef.current = null; }, 800);
    }
    if (!isDropTarget && hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, [isDropTarget, isExpanded, hasChildren, id, onToggle]);

  return (
    <div
      className="group flex items-center gap-1 ui-tree-row"
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropOnThis}
      style={{
        height: "100%",
        paddingLeft: depth * 16 + 8,
        paddingRight: 8,
        fontSize: 12,
        cursor: hasChildren ? "pointer" : "default",
        userSelect: "none",
        opacity: isDragging ? 0.4 : 1,
        backgroundColor: isDropTarget ? "rgba(14,99,156,0.25)" : undefined,
        borderTop: isDropTarget ? "2px solid #0e639c" : "2px solid transparent",
        transition: "background-color 120ms",
      }}
      onClick={() => hasChildren && onToggle(id)}
    >
        <span
          draggable
          onDragStart={handleDragStart}
          style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, cursor: "grab", padding: "2px 0" }}
        >
          <GripVertical size={10} style={{ opacity: 0.25 }} />
        </span>

        {hasChildren ? (
          isExpanded ? <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.6 }} /> : <ChevronRight size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}

        {isCatalog ? (
          isExpanded && hasChildren
            ? <FolderOpen size={14} style={{ flexShrink: 0, color: "#dcb67a" }} />
            : <Folder size={14} style={{ flexShrink: 0, color: "#dcb67a" }} />
        ) : (
          <KeyRound size={14} style={{ flexShrink: 0, color: "#5CADD5" }} />
        )}

        <span style={{
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: isCatalog ? "#dcb67a" : "var(--color-text)",
          fontWeight: isCatalog ? 500 : 400,
        }}>
          {node.Name}
        </span>

        {node.PermissionId != null && (
          <span style={{ fontSize: 9, color: "var(--color-text-muted)", background: "rgba(255,255,255,0.06)", borderRadius: 3, padding: "0 4px", lineHeight: "16px", flexShrink: 0 }}>
            #{node.PermissionId}
          </span>
        )}

        {node.PermissionSettings?.ConfirmationRequired && (
          <span style={{ fontSize: 9, color: "#F59E0B", background: "rgba(245,158,11,0.1)", borderRadius: 3, padding: "0 3px", lineHeight: "16px", flexShrink: 0 }} title="Confirmation Required">
            CR
          </span>
        )}

        <div className="flex items-center gap-0" style={{ flexShrink: 0 }}>
          {isCatalog && node.CatalogId != null && (<>
            <button onClick={(e) => { e.stopPropagation(); onAddCatalog(node.CatalogId!); }} className="tree-action-btn" title="Add Catalog"><FolderPlus size={11} /></button>
            <button onClick={(e) => { e.stopPropagation(); onAddPermission(node.CatalogId!); }} className="tree-action-btn" title="Add Permission"><Plus size={11} /></button>
          </>)}
          <button onClick={(e) => { e.stopPropagation(); onEdit(node); }} className="tree-action-btn" title="Edit"><Pencil size={11} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(node); }} className="tree-action-btn" style={{ color: "#F44336" }} title="Delete"><Trash2 size={11} /></button>
        </div>
    </div>
  );
}, (prev, next) => {
  const id = nodeId(prev.node);
  if (prev.node !== next.node) return false;
  if (prev.depth !== next.depth) return false;
  if (prev.isExpanded !== next.isExpanded) return false;

  const prevDrop = prev.dropTargetId === id;
  const nextDrop = next.dropTargetId === id;
  if (prevDrop !== nextDrop) return false;
  const prevDrag = prev.draggedNode ? nodeId(prev.draggedNode) === id : false;
  const nextDrag = next.draggedNode ? nodeId(next.draggedNode) === id : false;
  if (prevDrag !== nextDrag) return false;
  if (prev.onToggle !== next.onToggle) return false;
  if (prev.onEdit !== next.onEdit) return false;
  if (prev.onDelete !== next.onDelete) return false;
  if (prev.onAddCatalog !== next.onAddCatalog) return false;
  if (prev.onAddPermission !== next.onAddPermission) return false;
  if (prev.onDragStart !== next.onDragStart) return false;
  if (prev.onDragEnd !== next.onDragEnd) return false;
  if (prev.onDropTargetChange !== next.onDropTargetChange) return false;
  if (prev.onDrop !== next.onDrop) return false;
  return true;
});

function DropRootZone({ isOver, onDragOver, onDragLeave, onDrop }: {
  isOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      style={{
        height: 28, display: "flex", alignItems: "center", gap: 6,
        padding: "0 12px", fontSize: 11, color: "var(--color-text-muted)",
        background: isOver ? "rgba(14,99,156,0.2)" : "rgba(255,255,255,0.02)",
        borderBottom: "1px dashed var(--color-border)",
        transition: "background 120ms",
      }}
    >
      <Folder size={12} style={{ opacity: 0.4 }} />
      Drop here to move to root
    </div>
  );
}

const searchStyle: React.CSSProperties = { background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 12, padding: "2px 6px", height: 22, width: 160, borderRadius: 3, outline: "none" };
