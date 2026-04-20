import { useMemo } from "react";
import {
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Search,
  FileCode2,
  Loader2,
} from "lucide-react";
import type { WebGlobalModel } from "@/lib/ws-api-models";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { IconButton } from "@/components/ui/Button";
import { EmptyState as UIEmptyState } from "@/components/ui/EmptyState";
import { VirtualList } from "@/components/ui/VirtualList";
import { GLOBAL_MODEL_CATEGORIES, modelKey } from "../lib/global-models";

interface GlobalModelsSidebarProps {
  models: WebGlobalModel[];
  loading: boolean;
  filter: string;
  onFilterChange: (value: string) => void;
  collapsed: Record<string, boolean>;
  onToggleCollapsed: (category: string) => void;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  /** Снимки «оригинального» кода для dirty-точки в списке. */
  originalCodeSnap: Record<string, string>;
  onRefresh: () => void;
  onAdd: () => void;
}

/**
 * Левый сайдбар Global Models: заголовок c Refresh/Add, поле фильтра и
 * виртуализированный accordion по категориям (`MODEL` / `HELPER` / `CRUD` /
 * прочие). Раскрытые категории показывают модели — по клику выбираются.
 *
 * Состояние (filter, collapsed, selected) хранится в родителе
 * `GlobalModelsPanel`, сайдбар — чисто презентационный.
 */
export function GlobalModelsSidebar({
  models,
  loading,
  filter,
  onFilterChange,
  collapsed,
  onToggleCollapsed,
  selectedKey,
  onSelect,
  originalCodeSnap,
  onRefresh,
  onAdd,
}: GlobalModelsSidebarProps) {
  const grouped = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const byCat = new Map<string, WebGlobalModel[]>();
    for (const m of models) {
      if (f && !m.TypeName.toLowerCase().includes(f)) continue;
      const arr = byCat.get(m.Category) ?? [];
      arr.push(m);
      byCat.set(m.Category, arr);
    }
    const knownOrder = GLOBAL_MODEL_CATEGORIES as readonly string[];
    const allCats = Array.from(byCat.keys());
    const ordered = [
      ...knownOrder.filter((c) => byCat.has(c)),
      ...allCats.filter((c) => !knownOrder.includes(c)).sort(),
    ];
    return ordered.map((cat) => ({
      Category: cat,
      Models: (byCat.get(cat) ?? []).slice().sort((a, b) => a.TypeName.localeCompare(b.TypeName)),
    }));
  }, [models, filter]);

  type FlatItem =
    | { kind: "header"; category: string; count: number; collapsed: boolean }
    | { kind: "model"; model: WebGlobalModel };
  const flatItems = useMemo<FlatItem[]>(() => {
    const out: FlatItem[] = [];
    for (const g of grouped) {
      const isCollapsed = collapsed[g.Category] === true;
      out.push({ kind: "header", category: g.Category, count: g.Models.length, collapsed: isCollapsed });
      if (!isCollapsed) {
        for (const m of g.Models) {
          out.push({ kind: "model", model: m });
        }
      }
    }
    return out;
  }, [grouped, collapsed]);

  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        width: 260,
        borderRight: "1px solid var(--color-border)",
        background: "var(--color-sidebar)",
        minHeight: 0,
      }}
    >
      <PanelHeader
        title="Global Models"
        actions={
          <>
            <IconButton
              icon={loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              label="Refresh"
              size="xs"
              onClick={onRefresh}
              disabled={loading}
            />
            <IconButton
              icon={<Plus size={12} />}
              label="Add global model"
              size="xs"
              onClick={onAdd}
            />
          </>
        }
      />

      <div
        className="shrink-0"
        style={{ padding: "6px 8px", borderBottom: "1px solid var(--color-border)" }}
      >
        <div style={{ position: "relative" }}>
          <Search
            size={12}
            style={{
              position: "absolute",
              left: 6,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            style={{
              width: "100%",
              background: "var(--color-surface-400)",
              border: "1px solid var(--color-border)",
              borderRadius: 3,
              padding: "3px 6px 3px 22px",
              fontSize: 12,
              color: "var(--color-text-primary)",
              outline: "none",
            }}
          />
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="flex-1 overflow-auto" style={{ fontSize: 12 }}>
          <UIEmptyState
            dense
            title={loading ? "Loading…" : "No models"}
            hint={loading ? undefined : "Add a new class or change the filter"}
          />
        </div>
      ) : (
        <VirtualList
          items={flatItems}
          itemHeight={24}
          overscan={10}
          className="flex-1"
          style={{ fontSize: 12 }}
          aria-label="Global models"
          getKey={(it, i) =>
            it.kind === "header"
              ? `h:${it.category}`
              : `m:${modelKey(it.model)}:${i}`
          }
          renderItem={(it) => {
            if (it.kind === "header") {
              return (
                <button
                  className="flex items-center w-full ui-tree-row"
                  onClick={() => onToggleCollapsed(it.category)}
                  style={{
                    height: "100%",
                    padding: "0 6px",
                    background: "transparent",
                    border: "none",
                    color: "var(--color-text-primary)",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  {it.collapsed ? (
                    <ChevronRight size={14} style={{ flexShrink: 0, opacity: 0.6, marginRight: 2 }} />
                  ) : (
                    <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.6, marginRight: 2 }} />
                  )}
                  {it.collapsed ? (
                    <Folder size={13} style={{ flexShrink: 0, color: "#dcb67a", marginRight: 6 }} />
                  ) : (
                    <FolderOpen size={13} style={{ flexShrink: 0, color: "#dcb67a", marginRight: 6 }} />
                  )}
                  <span style={{ flex: 1, textAlign: "left" }}>{it.category}</span>
                  <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>{it.count}</span>
                </button>
              );
            }
            const m = it.model;
            const k = modelKey(m);
            const isSelected = k === selectedKey;
            const dirty = (originalCodeSnap[k] ?? "") !== (m.Code ?? "");
            return (
              <div
                className="flex items-center ui-tree-row"
                data-selected={isSelected ? "true" : undefined}
                style={{
                  height: "100%",
                  padding: "0 6px 0 30px",
                  cursor: "pointer",
                  color: isSelected ? "#fff" : "var(--color-text-primary)",
                  fontFamily: "'Consolas','Courier New',monospace",
                }}
                onClick={() => onSelect(k)}
              >
                <FileCode2
                  size={12}
                  style={{
                    flexShrink: 0,
                    color: isSelected ? "#fff" : "var(--color-text-muted)",
                    marginRight: 5,
                  }}
                />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}
                >
                  {m.TypeName}
                </span>
                {dirty && (
                  <span
                    title="Unsaved changes"
                    style={{
                      marginLeft: 6,
                      color: isSelected ? "#fff" : "var(--color-accent)",
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    ●
                  </span>
                )}
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
