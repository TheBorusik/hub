import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronDown, Folder, FolderOpen, Search } from "lucide-react";
import type { HubWsApi } from "@/lib/ws-api";
import type { PermissionTreeNode, PermissionSettings } from "../../types";

type Mode = "catalog" | "permission";

interface PermissionDialogProps {
  mode: Mode;
  editing: PermissionTreeNode | null;
  parentCatalogId?: number;
  catalogId?: number;
  api: HubWsApi;
  onClose: () => void;
  onDone: () => void;
}

function isCatalogNode(n: PermissionTreeNode): boolean {
  return n.Type?.toLowerCase() === "catalog";
}

export function PermissionDialog({ mode, editing, parentCatalogId, catalogId: propCatalogId, api, onClose, onDone }: PermissionDialogProps) {
  const [name, setName] = useState(editing?.Name ?? "");
  const [desc, setDesc] = useState(editing?.Description ?? "");
  const [strId, setStrId] = useState(editing?.StrId ?? "");
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(
    editing?.CatalogId ?? (mode === "catalog" ? (parentCatalogId ?? null) : (propCatalogId ?? null))
  );
  const [permId, setPermId] = useState<number | "">(editing?.PermissionId ?? "");
  const [settingsType, setSettingsType] = useState<string>(editing?.PermissionSettings?.Type ?? "Unknown");
  const [confirmRequired, setConfirmRequired] = useState(editing?.PermissionSettings?.ConfirmationRequired ?? false);
  const [apiPath, setApiPath] = useState(editing?.PermissionSettings?.ApiPath?.join(", ") ?? "");
  const [submitting, setSubmitting] = useState(false);

  const isNewPermission = mode === "permission" && !editing;

  useEffect(() => {
    if (isNewPermission && permId === "") {
      api.getPermissionId().then((res) => setPermId(res.Id)).catch(() => {});
    }
  }, [isNewPermission, permId, api]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (mode === "catalog") {
        await api.upsertPermissionCatalog({
          CatalogId: editing?.CatalogId ?? undefined,
          Name: name.trim(),
          Description: desc,
          ParentId: selectedCatalogId ?? undefined,
        });
      } else {
        const settings: PermissionSettings = {
          Type: settingsType as PermissionSettings["Type"],
          ConfirmationRequired: confirmRequired,
          ApiPath: apiPath ? apiPath.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        };
        await api.upsertPermission({
          PermissionId: permId || undefined,
          StrId: strId || undefined,
          Name: name.trim(),
          Description: desc,
          CatalogId: selectedCatalogId ?? undefined,
          PermissionSettings: settings,
        });
      }
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayBg}>
      <div style={{ ...dialogStyle, width: 500 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {editing ? "Edit" : "Add"} {mode === "catalog" ? "Catalog" : "Permission"}
          </span>
          <button onClick={onClose} disabled={submitting} className="toolbar-btn"><X size={14} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <label style={labelStyle}>
            Name*
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} autoFocus placeholder="Name" />
          </label>
          <label style={labelStyle}>
            Description
            <input value={desc} onChange={(e) => setDesc(e.target.value)} style={inputStyle} placeholder="Description" />
          </label>

          {/* Catalog picker */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {mode === "catalog" ? "Parent Catalog" : "Catalog"}
            </span>
            <CatalogPicker
              api={api}
              selectedId={selectedCatalogId}
              onSelect={setSelectedCatalogId}
              excludeCatalogId={mode === "catalog" ? editing?.CatalogId : undefined}
              isCatalogMode={mode === "catalog"}
            />
          </div>

          {mode === "permission" && (<>
            <label style={labelStyle}>
              Permission ID
              <input
                type="number"
                value={permId}
                readOnly
                style={{ ...inputStyle, opacity: 0.6, cursor: "default" }}
                title="Auto-generated, cannot be changed"
              />
            </label>
            <label style={labelStyle}>
              Settings Type
              <select value={settingsType} onChange={(e) => setSettingsType(e.target.value)} style={{ ...inputStyle, height: 28, cursor: "pointer" }}>
                <option value="Unknown">Unknown</option>
                <option value="Api">Api</option>
                <option value="UI">UI</option>
                <option value="Event">Event</option>
              </select>
            </label>
            <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={confirmRequired} onChange={(e) => setConfirmRequired(e.target.checked)} />
              Confirmation Required
            </label>
            <label style={labelStyle}>
              API Path (comma separated)
              <input value={apiPath} onChange={(e) => setApiPath(e.target.value)} style={inputStyle} placeholder="/api/path1, /api/path2" />
            </label>
          </>)}
        </div>

        <div className="flex gap-2" style={{ justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleSave} disabled={submitting || !name.trim()} style={{ ...primaryBtnStyle, opacity: name.trim() ? 1 : 0.5 }}>
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Catalog Picker Tree ===== */

function CatalogPicker({ api, selectedId, onSelect, excludeCatalogId, isCatalogMode }: {
  api: HubWsApi;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  excludeCatalogId?: number;
  isCatalogMode?: boolean;
}) {
  const [tree, setTree] = useState<PermissionTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getPermissionTree();
        const list = (res as Record<string, unknown>).PermissionTree;
        if (!cancelled && Array.isArray(list)) {
          const catalogs = extractCatalogs(list as PermissionTreeNode[]);
          setTree(catalogs);
          if (selectedId != null) {
            const found = findCatalogName(catalogs, selectedId);
            if (found) setSelectedName(found);
          }
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const extractCatalogs = useCallback((nodes: PermissionTreeNode[]): PermissionTreeNode[] => {
    return nodes
      .filter((n) => isCatalogNode(n))
      .map((n) => ({
        ...n,
        PermissionTree: n.PermissionTree ? extractCatalogs(n.PermissionTree) : undefined,
      }));
  }, []);

  const findCatalogName = (nodes: PermissionTreeNode[], id: number): string | null => {
    for (const n of nodes) {
      if (n.CatalogId === id) return n.Name;
      if (n.PermissionTree) {
        const found = findCatalogName(n.PermissionTree, id);
        if (found) return found;
      }
    }
    return null;
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handleSelect = (node: PermissionTreeNode) => {
    if (node.CatalogId === selectedId) {
      onSelect(null);
      setSelectedName(null);
    } else {
      onSelect(node.CatalogId!);
      setSelectedName(node.Name);
    }
  };

  const lf = search.toLowerCase();

  const matchesFilter = (node: PermissionTreeNode): boolean => {
    if (!lf) return true;
    if (node.Name.toLowerCase().includes(lf)) return true;
    if (node.PermissionTree?.some(matchesFilter)) return true;
    return false;
  };

  const renderNodes = (nodes: PermissionTreeNode[], depth: number): React.ReactNode[] => {
    return nodes.filter(matchesFilter).map((node) => {
      if (node.CatalogId === excludeCatalogId) return null;
      const hasChildren = node.PermissionTree && node.PermissionTree.length > 0;
      const isExp = expanded.has(node.CatalogId!) || !!lf;
      const isSel = node.CatalogId === selectedId;

      return (
        <div key={node.CatalogId}>
          <div
            className="flex items-center gap-1"
            onClick={() => handleSelect(node)}
            style={{
              height: 22, paddingLeft: 6 + depth * 14, paddingRight: 6, cursor: "pointer", fontSize: 11,
              color: isSel ? "#fff" : "var(--color-text-muted)",
              backgroundColor: isSel ? "rgba(14,99,156,0.5)" : "transparent",
            }}
            onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.backgroundColor = isSel ? "rgba(14,99,156,0.5)" : "transparent"; }}
          >
            {hasChildren ? (
              <span onClick={(e) => { e.stopPropagation(); toggleExpand(node.CatalogId!); }} style={{ display: "inline-flex", flexShrink: 0 }}>
                {isExp ? <ChevronDown size={12} style={{ opacity: 0.5 }} /> : <ChevronRight size={12} style={{ opacity: 0.5 }} />}
              </span>
            ) : <span style={{ width: 12, flexShrink: 0 }} />}
            {isExp && hasChildren
              ? <FolderOpen size={12} style={{ flexShrink: 0, color: "#dcb67a" }} />
              : <Folder size={12} style={{ flexShrink: 0, color: "#dcb67a" }} />
            }
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.Name}</span>
            {isSel && <span style={{ fontSize: 9, color: "#4CAF50", flexShrink: 0 }}>&#10003;</span>}
          </div>
          {hasChildren && isExp && renderNodes(node.PermissionTree!, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-input-bg)", overflow: "hidden" }}>
      {/* Search */}
      <div style={{ padding: "4px 6px", borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-1" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 3, padding: "0 6px", height: 22 }}>
          <Search size={11} style={{ opacity: 0.4, flexShrink: 0 }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search catalogs..."
            style={{ flex: 1, background: "none", border: "none", color: "var(--color-text)", fontSize: 11, outline: "none", height: "100%" }}
          />
          {search && <button onClick={() => setSearch("")} className="toolbar-btn" style={{ padding: 0 }}><X size={10} /></button>}
        </div>
      </div>

      {/* Tree */}
      <div style={{ maxHeight: 180, overflowY: "auto" }}>
        {/* No parent / root option */}
        <div
          className="flex items-center gap-1"
          onClick={() => { onSelect(null); setSelectedName(null); }}
          style={{
            height: 22, padding: "0 6px", cursor: "pointer", fontSize: 11, fontStyle: "italic",
            color: selectedId === null ? "#fff" : "var(--color-text-muted)",
            backgroundColor: selectedId === null ? "rgba(14,99,156,0.5)" : "transparent",
          }}
          onMouseEnter={(e) => { if (selectedId !== null) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selectedId === null ? "rgba(14,99,156,0.5)" : "transparent"; }}
        >
          <span style={{ width: 12, flexShrink: 0 }} />
          <Folder size={12} style={{ flexShrink: 0, opacity: 0.4 }} />
          <span style={{ flex: 1 }}>{isCatalogMode ? "No parent (root)" : "No catalog"}</span>
          {selectedId === null && <span style={{ fontSize: 9, color: "#4CAF50", flexShrink: 0 }}>&#10003;</span>}
        </div>

        {loading && <div style={{ padding: 8, fontSize: 11, color: "var(--color-text-muted)" }}>Loading...</div>}
        {!loading && renderNodes(tree, 0)}
      </div>

      {/* Selected summary */}
      {selectedId != null && (
        <div style={{ borderTop: "1px solid var(--color-border)", padding: "3px 8px", fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ color: "var(--color-text-muted)" }}>Selected:</span>
          <Folder size={10} style={{ color: "#dcb67a", flexShrink: 0 }} />
          <span style={{ color: "var(--color-text)", fontWeight: 500 }}>{selectedName ?? `ID: ${selectedId}`}</span>
          <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>(ID: {selectedId})</span>
          <button onClick={() => { onSelect(null); setSelectedName(null); }} className="toolbar-btn" style={{ marginLeft: "auto", padding: 0 }}><X size={10} /></button>
        </div>
      )}
    </div>
  );
}

const overlayBg: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 20, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 48 };
const dialogStyle: React.CSSProperties = { backgroundColor: "var(--color-sidebar)", border: "1px solid var(--color-border)", borderRadius: 6, padding: 20, minWidth: 340, maxWidth: "80%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-text-muted)" };
const inputStyle: React.CSSProperties = { background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 12, padding: "4px 8px", height: 24, borderRadius: 3, outline: "none" };
const cancelBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: 3, cursor: "pointer" };
const primaryBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "#0e639c", border: "none", color: "#fff", borderRadius: 3, cursor: "pointer" };
