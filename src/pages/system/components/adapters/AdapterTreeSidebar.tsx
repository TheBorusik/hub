import {
  Copy,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { IconButton } from "@/components/ui/Button/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { t as tok } from "@/lib/design-tokens";
import type { AdapterConfiguration, AdapterType } from "../../types";
import { ConfigurationTreeRow } from "./ConfigurationTreeRow";

export interface AdapterTreeSidebarProps {
  types: AdapterType[];
  loading: boolean;
  filter: string;
  onFilterChange: (value: string) => void;

  expandedTypes: Set<string>;
  typeConfigs: Record<string, AdapterConfiguration[]>;
  loadingConfigs: Set<string>;

  openTabIds: Set<number>;
  activeTabId: number | null;
  dirtyTabs: Set<number>;
  treeSelectedType: string | undefined;

  onRefresh: () => void;
  onAddType: () => void;
  onEditType: (t: AdapterType) => void;
  onDeleteType: (t: AdapterType) => void;

  onToggleType: (adapterType: string) => void;

  onAddConfig: (adapterType: string) => void;
  onEditConfig: (c: AdapterConfiguration) => void;
  onDeleteConfig: (c: AdapterConfiguration) => void;
  onOpenConfig: (c: AdapterConfiguration) => void;
  onCloneConfig: (c: AdapterConfiguration) => void;
  onSetDefault: (c: AdapterConfiguration) => void;
  onToggleEnabled: (c: AdapterConfiguration) => void;
}

/**
 * Левая панель `ConfigurationPanel`:
 * - toolbar (refresh, add type, add configuration для выбранного типа)
 * - фильтр
 * - двухуровневое дерево Adapter Type → Configuration
 *
 * Не использует `<TreeView>` из UI-kit: здесь нужны per-row `visibleActions`,
 * dot-indicator для грязных/открытых вкладок, и loading-плейсхолдеры на уровне
 * раскрытого типа. Если эти фичи уедут в UI-kit — этот компонент можно будет
 * упростить.
 */
export function AdapterTreeSidebar({
  types,
  loading,
  filter,
  onFilterChange,
  expandedTypes,
  typeConfigs,
  loadingConfigs,
  openTabIds,
  activeTabId,
  dirtyTabs,
  treeSelectedType,
  onRefresh,
  onAddType,
  onEditType,
  onDeleteType,
  onToggleType,
  onAddConfig,
  onEditConfig,
  onDeleteConfig,
  onOpenConfig,
  onCloneConfig,
  onSetDefault,
  onToggleEnabled,
}: AdapterTreeSidebarProps) {
  const lowerFilter = filter.toLowerCase();

  const filteredTypes = lowerFilter
    ? types.filter((t) => {
        if (t.AdapterType.toLowerCase().includes(lowerFilter)) return true;
        const configs = typeConfigs[t.AdapterType] ?? [];
        return configs.some(
          (c) =>
            c.Name.toLowerCase().includes(lowerFilter) ||
            (c.Description ?? "").toLowerCase().includes(lowerFilter),
        );
      })
    : types;

  return (
    <div className="flex flex-col h-full" style={{ background: tok.color.bg.sidebar }}>
      <PanelToolbar
        dense
        left={
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
              label="Add Adapter Type"
              icon={<Plus size={14} />}
              onClick={onAddType}
            />
            {treeSelectedType && (
              <IconButton
                size="xs"
                label={`Add Configuration to ${treeSelectedType}`}
                icon={
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    <Settings size={13} style={{ marginRight: -3 }} />
                    <Plus size={9} />
                  </span>
                }
                onClick={() => onAddConfig(treeSelectedType)}
              />
            )}
          </>
        }
        right={
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: tok.color.text.muted,
              textTransform: "uppercase",
            }}
          >
            Configuration
          </span>
        }
      />
      <div
        className="shrink-0"
        style={{ padding: "4px 8px", borderBottom: "1px solid var(--color-border)" }}
      >
        <div
          className="flex items-center gap-1"
          style={{
            background: "var(--color-input-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: 3,
            padding: "0 6px",
            height: 24,
          }}
        >
          <Search size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
          <input
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Filter..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              color: "var(--color-text)",
              fontSize: 12,
              outline: "none",
              height: "100%",
            }}
          />
          {filter && (
            <button
              onClick={() => onFilterChange("")}
              className="toolbar-btn"
              style={{ padding: 0 }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {filteredTypes.map((t) => {
          const isTypeExp = expandedTypes.has(t.AdapterType);
          const configs = typeConfigs[t.AdapterType] ?? [];
          const isLoadingCfg = loadingConfigs.has(t.AdapterType);
          return (
            <div key={t.AdapterType}>
              <ConfigurationTreeRow
                depth={0}
                icon={<Server size={14} style={{ opacity: 0.7, color: "#5CADD5" }} />}
                label={t.AdapterType}
                badge={t.Exported ? "E" : undefined}
                expanded={isTypeExp}
                onToggle={() => onToggleType(t.AdapterType)}
                onClick={() => {
                  if (!isTypeExp) onToggleType(t.AdapterType);
                }}
                actions={
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddConfig(t.AdapterType);
                      }}
                      className="tree-action-btn"
                      title="Add Config"
                    >
                      <Plus size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditType(t);
                      }}
                      className="tree-action-btn"
                      title="Edit Type"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteType(t);
                      }}
                      className="tree-action-btn"
                      style={{ color: "#F44336" }}
                      title="Delete Type"
                    >
                      <Trash2 size={11} />
                    </button>
                  </>
                }
              />
              {isTypeExp && (
                <>
                  {isLoadingCfg && configs.length === 0 && (
                    <div
                      style={{
                        padding: "4px 0 4px 40px",
                        fontSize: 11,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      Loading...
                    </div>
                  )}
                  {!isLoadingCfg && configs.length === 0 && (
                    <div
                      style={{
                        padding: "4px 0 4px 40px",
                        fontSize: 11,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      No configurations
                    </div>
                  )}
                  {configs.map((c) => {
                    const isActive = activeTabId === c.ConfigurationId;
                    const isOpen = openTabIds.has(c.ConfigurationId);
                    const isDirty = dirtyTabs.has(c.ConfigurationId);
                    const matchesFilter =
                      !lowerFilter ||
                      c.Name.toLowerCase().includes(lowerFilter) ||
                      (c.Description ?? "").toLowerCase().includes(lowerFilter);
                    if (
                      lowerFilter &&
                      !matchesFilter &&
                      !t.AdapterType.toLowerCase().includes(lowerFilter)
                    )
                      return null;
                    return (
                      <ConfigurationTreeRow
                        key={c.ConfigurationId}
                        depth={1}
                        icon={
                          <span style={{ position: "relative", display: "inline-flex" }}>
                            <Settings
                              size={13}
                              style={{
                                opacity: 0.7,
                                color: c.Enabled ? "#4CAF50" : "#9E9E9E",
                              }}
                            />
                            {c.IsDefault && (
                              <Star
                                size={8}
                                style={{
                                  position: "absolute",
                                  top: -2,
                                  right: -4,
                                  color: "#FFD700",
                                }}
                              />
                            )}
                          </span>
                        }
                        label={c.Name}
                        sublabel={c.Description || undefined}
                        selected={isActive}
                        dotIndicator={(isOpen && !isActive) || isDirty}
                        onClick={() => onOpenConfig(c)}
                        visibleActions={
                          <label
                            className="toggle-switch-sm"
                            title={
                              c.Enabled
                                ? "Enabled — click to disable"
                                : "Disabled — click to enable"
                            }
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={c.Enabled}
                              onChange={() => onToggleEnabled(c)}
                            />
                            <span className="toggle-track" />
                          </label>
                        }
                        actions={
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditConfig(c);
                              }}
                              className="tree-action-btn"
                              title="Edit"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCloneConfig(c);
                              }}
                              className="tree-action-btn"
                              title="Clone"
                            >
                              <Copy size={11} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSetDefault(c);
                              }}
                              className="tree-action-btn"
                              style={{ color: c.IsDefault ? "#FFD700" : undefined }}
                              title="Default"
                            >
                              <Star size={11} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteConfig(c);
                              }}
                              className="tree-action-btn"
                              style={{ color: "#F44336" }}
                              title="Delete"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        }
                      />
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
        {filteredTypes.length === 0 && !loading && (
          <EmptyState dense title={filter ? "No matches" : "No adapter types"} />
        )}
      </div>
    </div>
  );
}
