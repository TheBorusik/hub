import { useState, useMemo, useCallback } from "react";
import {
  ChevronRight, ChevronDown, FolderOpen, Folder,
  RefreshCw, ChevronsUpDown, ChevronsDownUp,
  X, Pencil, PlugZap,
} from "lucide-react";
import type { Catalog, ProcessModel } from "@/lib/ws-api-models";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { IconButton } from "@/components/ui/Button/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { t as tok } from "@/lib/design-tokens";

/* ─── Props ─────────────────────────────────────────── */

interface ProcessTreeProps {
  catalogs: Catalog[];
  actionColors: Record<string, string>;
  loading: boolean;
  selectedTypeName: string | null;
  onRefresh: () => void;
  onOpenProcess: (model: ProcessModel) => void;
  onRemoveDraft: (typeName: string) => void;
  /**
   * Открыть `EditApiDialog` (WFM API permission editor) для процесса.
   * Не обязателен — если не передан, кнопка `API` рядом с `Edit`
   * и соответствующий пункт контекстного меню не рендерятся.
   */
  onOpenApi?: (model: ProcessModel) => void;
}

/* ─── Filter ────────────────────────────────────────── */

const FLAG_NAMES = ["Front", "Back", "Permission", "Source", "Draft"] as const;

function filterCatalog(
  cat: Catalog, text: string, flags: Set<string>, includeTests: boolean,
): Catalog | null {
  const kids: Catalog[] = [];
  for (const c of cat.Catalogs ?? []) {
    const fc = filterCatalog(c, text, flags, includeTests);
    if (fc) kids.push(fc);
  }

  let contents = cat.Contents ?? [];
  if (!includeTests) contents = contents.filter((p) => !p.Name?.endsWith("Test"));
  if (text) {
    const lc = text.toLowerCase();
    contents = contents.filter((p) =>
      (p.Name ?? "").toLowerCase().includes(lc) || (p.TypeName ?? "").toLowerCase().includes(lc),
    );
  }
  if (flags.size > 0) {
    contents = contents.filter((p) => {
      // `flags` — имена булевых флажков фильтра (Draft, Back, Permission, ...);
      // они соответствуют полям `ProcessModel`, но динамический доступ через
      // ключ требует `unknown`-шлюза, чтобы обойти отсутствие index signature.
      const rec = p as unknown as Record<string, unknown>;
      for (const f of flags) if (!rec[f]) return false;
      return true;
    });
  }

  if (kids.length === 0 && contents.length === 0) return null;
  return { Name: cat.Name, Catalogs: kids, Contents: contents };
}

/* ─── Component ─────────────────────────────────────── */

export function ProcessTree({
  catalogs, actionColors, loading, selectedTypeName,
  onRefresh, onOpenProcess, onRemoveDraft, onOpenApi,
}: ProcessTreeProps) {
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeFlags, setActiveFlags] = useState<Set<string>>(new Set());
  const [includeTests, setIncludeTests] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);

  const filtered = useMemo(() => {
    const r: Catalog[] = [];
    for (const c of catalogs) { const fc = filterCatalog(c, filter, activeFlags, includeTests); if (fc) r.push(fc); }
    return r;
  }, [catalogs, filter, activeFlags, includeTests]);

  const totalCount = useMemo(() => {
    let n = 0;
    const w = (c: Catalog) => { n += (c.Contents?.length ?? 0); (c.Catalogs ?? []).forEach(w); };
    filtered.forEach(w);
    return n;
  }, [filtered]);

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const s = new Set(prev);
      if (s.has(path)) s.delete(path); else s.add(path);
      return s;
    });
  }, []);

  const collectPaths = useCallback((cats: Catalog[], pfx = ""): string[] => {
    const walk = (list: Catalog[], prefix: string): string[] => {
      const r: string[] = [];
      for (const c of list) {
        const p = prefix ? `${prefix}.${c.Name}` : c.Name;
        r.push(p);
        r.push(...walk(c.Catalogs ?? [], p));
      }
      return r;
    };
    return walk(cats, pfx);
  }, []);

  const handleToggleAll = useCallback(() => {
    if (allExpanded) setExpanded(new Set()); else setExpanded(new Set(collectPaths(filtered)));
    setAllExpanded(!allExpanded);
  }, [allExpanded, filtered, collectPaths]);

  const toggleFlag = (f: string) => {
    setActiveFlags((prev) => {
      const s = new Set(prev);
      if (s.has(f)) s.delete(f); else s.add(f);
      return s;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter + actions */}
      <PanelToolbar
        dense
        left={
          <input
            type="text"
            placeholder="Filter processes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1"
            style={{ fontSize: tok.font.size.xs, minWidth: 120 }}
          />
        }
        right={
          <>
            <IconButton
              size="xs"
              label="Refresh"
              icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
              onClick={onRefresh}
              disabled={loading}
            />
            <IconButton
              size="xs"
              label={allExpanded ? "Collapse all" : "Expand all"}
              icon={allExpanded ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
              onClick={handleToggleAll}
            />
          </>
        }
      />

      {/* Flags */}
      <div className="flex flex-wrap items-center gap-1 shrink-0" style={{ padding: "2px 8px", borderBottom: `1px solid ${tok.color.border.default}` }}>
        {FLAG_NAMES.map((flag) => (
          <button
            key={flag}
            onClick={() => toggleFlag(flag)}
            style={{
              fontSize: 9, padding: "0 4px", lineHeight: "16px", borderRadius: tok.radius.sm,
              border: `1px solid ${tok.color.border.default}`,
              background: activeFlags.has(flag) ? "rgba(14,99,156,0.3)" : "transparent",
              color: activeFlags.has(flag) ? tok.color.accent : tok.color.text.muted,
              cursor: "pointer",
            }}
          >
            {flag}
          </button>
        ))}
        <label style={{ fontSize: 9, color: tok.color.text.muted, display: "flex", alignItems: "center", gap: 2, marginLeft: 2 }}>
          <input type="checkbox" checked={includeTests} onChange={(e) => setIncludeTests(e.target.checked)} style={{ width: 10, height: 10 }} />
          Tests
        </label>
        <span style={{ marginLeft: "auto", fontSize: 9, color: tok.color.text.muted }}>{totalCount}</span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto" style={{ padding: "2px 0" }}>
        {filtered.map((cat) => (
          <CatalogNode
            key={cat.Name} catalog={cat} path={cat.Name} depth={0}
            expanded={expanded} selectedTypeName={selectedTypeName} actionColors={actionColors}
            onToggle={toggleExpand} onOpenProcess={onOpenProcess} onRemoveDraft={onRemoveDraft}
            onOpenApi={onOpenApi}
          />
        ))}
        {filtered.length === 0 && !loading && (
          <EmptyState dense title="No processes found" />
        )}
      </div>
    </div>
  );
}

/* ─── Catalog (folder) ──────────────────────────────── */

interface CatalogNodeProps {
  catalog: Catalog;
  path: string;
  depth: number;
  expanded: Set<string>;
  selectedTypeName: string | null;
  actionColors: Record<string, string>;
  onToggle: (path: string) => void;
  onOpenProcess: (model: ProcessModel) => void;
  onRemoveDraft: (typeName: string) => void;
  onOpenApi?: (model: ProcessModel) => void;
}

function CatalogNode({
  catalog, path, depth, expanded, selectedTypeName, actionColors,
  onToggle, onOpenProcess, onRemoveDraft, onOpenApi,
}: CatalogNodeProps) {
  const isOpen = expanded.has(path);

  return (
    <div>
      <div
        className="flex items-center select-none ui-tree-row"
        style={{
          height: 24,
          paddingLeft: depth * 14 + 8,
          paddingRight: 8,
          cursor: "pointer",
        }}
        onClick={() => onToggle(path)}
      >
        {isOpen
          ? <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.5, marginRight: 2 }} />
          : <ChevronRight size={14} style={{ flexShrink: 0, opacity: 0.5, marginRight: 2 }} />}
        {isOpen
          ? <FolderOpen size={14} style={{ flexShrink: 0, color: "#dcb67a", marginRight: 6 }} />
          : <Folder size={14} style={{ flexShrink: 0, color: "#dcb67a", marginRight: 6 }} />}
        <span style={{ fontWeight: 600, fontSize: 12, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {catalog.Name}
        </span>
      </div>

      {isOpen && (
        <>
          {(catalog.Catalogs ?? []).map((child) => (
            <CatalogNode
              key={child.Name} catalog={child} path={`${path}.${child.Name}`} depth={depth + 1}
              expanded={expanded} selectedTypeName={selectedTypeName} actionColors={actionColors}
              onToggle={onToggle} onOpenProcess={onOpenProcess} onRemoveDraft={onRemoveDraft}
              onOpenApi={onOpenApi}
            />
          ))}
          {(catalog.Contents ?? []).length > 0 && (
            <div>
              {(catalog.Contents ?? []).map((p) => (
                <ProcessRow
                  key={p.TypeName} model={p} depth={depth + 1}
                  isSelected={selectedTypeName === p.TypeName}
                  actionColor={actionColors[p.Action] ?? "#546e7a"}
                  onOpen={onOpenProcess} onRemoveDraft={onRemoveDraft}
                  onOpenApi={onOpenApi}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Process row ───────────────────────────────────── */

interface ProcessRowProps {
  model: ProcessModel;
  depth: number;
  isSelected: boolean;
  actionColor: string;
  onOpen: (model: ProcessModel) => void;
  onRemoveDraft: (typeName: string) => void;
  onOpenApi?: (model: ProcessModel) => void;
}

function ProcessRow({ model, depth, isSelected, actionColor, onOpen, onRemoveDraft, onOpenApi }: ProcessRowProps) {
  type MenuId = "open" | "edit-api" | "copy-name" | "copy-typename" | "remove-draft";
  const items: ContextMenuItem<MenuId>[] = [
    { id: "open", label: "Open" },
    ...(onOpenApi
      ? ([{ id: "edit-api", label: "Edit API…" }] as ContextMenuItem<MenuId>[])
      : []),
    { kind: "separator" },
    { id: "copy-name", label: "Copy name" },
    { id: "copy-typename", label: "Copy TypeName" },
    ...(model.Draft
      ? ([{ kind: "separator" }, { id: "remove-draft", label: "Remove draft", danger: true }] as ContextMenuItem<MenuId>[])
      : []),
  ];
  const onMenuSelect = (id: MenuId) => {
    switch (id) {
      case "open":
        onOpen(model);
        break;
      case "edit-api":
        onOpenApi?.(model);
        break;
      case "copy-name":
        navigator.clipboard?.writeText(model.Name ?? model.TypeName ?? "");
        break;
      case "copy-typename":
        navigator.clipboard?.writeText(model.TypeName ?? "");
        break;
      case "remove-draft":
        onRemoveDraft(model.TypeName);
        break;
    }
  };
  return (
    <ContextMenu<MenuId> items={items} onSelect={onMenuSelect}>
    <div
      className="flex items-center select-none ui-tree-row"
      data-selected={isSelected ? "true" : undefined}
      style={{
        height: 24,
        paddingLeft: depth * 14 + 8 + 20,
        paddingRight: 6,
        cursor: "pointer",
      }}
      onClick={() => onOpen(model)}
    >
      {/* Action badge */}
      <span style={{
        fontSize: 9,
        padding: "1px 5px",
        borderRadius: 3,
        background: actionColor,
        color: "#fff",
        fontWeight: 600,
        whiteSpace: "nowrap",
        flexShrink: 0,
        marginRight: 6,
        lineHeight: "14px",
        maxWidth: 90,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {model.Action ?? "—"}
      </span>

      {/* Name */}
      <span style={{
        color: "#bbdefb",
        fontWeight: 500,
        fontSize: 11,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        minWidth: 0,
        flex: "1 1 auto",
      }}>
        {model.Name ?? model.TypeName}
      </span>

      {/* Compact badges */}
      <div className="flex items-center shrink-0" style={{ marginLeft: 4, gap: 2 }}>
        {model.Front && <MiniTag text="F" bg="#2e7d32" title="Front" />}
        {model.Back && <MiniTag text="B" bg="#7d582e" title="Back" />}
        {model.Permission && <MiniTag text="P" bg="#7d3a2e" title="Permission" />}
        {model.Source && <MiniTag text="S" bg="#2e527d" title="Source" />}
        {model.Draft && (
          <span
            style={{
              fontSize: 8, padding: "0 3px", borderRadius: 2,
              background: "#ef6c00", color: "#fff", fontWeight: 700,
              lineHeight: "14px", cursor: "pointer", display: "inline-flex",
              alignItems: "center",
            }}
            onClick={(e) => { e.stopPropagation(); onRemoveDraft(model.TypeName); }}
            title="Remove draft"
          >
            D<X size={8} style={{ marginLeft: 1 }} />
          </span>
        )}
      </div>

      {/* API + Edit — видны только при hover строки (как row-actions в VS Code Explorer) */}
      <span className="ui-row-actions" style={{ marginLeft: 4, flexShrink: 0 }}>
        {onOpenApi && (
          <button
            className="tree-action-btn"
            title="Edit API · Roles / Command / Result DTO"
            aria-label="Edit API"
            onClick={(e) => { e.stopPropagation(); onOpenApi(model); }}
          >
            <PlugZap size={11} />
          </button>
        )}
        <button
          className="tree-action-btn"
          title="Edit"
          aria-label="Edit"
          onClick={(e) => { e.stopPropagation(); onOpen(model); }}
        >
          <Pencil size={11} />
        </button>
      </span>
    </div>
    </ContextMenu>
  );
}

/* ─── Tiny badge for flags ──────────────────────────── */

function MiniTag({ text, bg, title }: { text: string; bg: string; title: string }) {
  return (
    <span
      title={title}
      style={{
        fontSize: 8, fontWeight: 700, padding: "0 3px",
        borderRadius: 2, background: bg, color: "#e8f5e9",
        lineHeight: "14px", display: "inline-block",
      }}
    >
      {text}
    </span>
  );
}
