import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  RefreshCw, Plus, Trash2, Pencil, Copy, Star, Lock, Unlock,
  ChevronRight, ChevronDown, X, Folder, Search, Server, Settings, Save,
} from "lucide-react";
import { Group, Panel } from "react-resizable-panels";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { useContourApi } from "@/lib/ws-api";
import { BuildRulesEditor, BuildRulesToggleButton, BUILD_RULES_TEMPLATE } from "./BuildRulesEditor";
import type { AdapterType, AdapterConfiguration, ConfigSection } from "../../types";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { IconButton } from "@/components/ui/Button/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { t as tok } from "@/lib/design-tokens";

type Overlay =
  | { type: "none" }
  | { type: "upsertType"; editing: AdapterType | null }
  | { type: "upsertConfig"; editing: AdapterConfiguration | null; adapterType: string }
  | { type: "createSection"; configId: number };

interface OpenTab {
  config: AdapterConfiguration;
  selectedSectionId: number | null;
}

export function ConfigurationPanel() {
  const api = useContourApi();
  const confirm = useConfirm();
  const [types, setTypes] = useState<AdapterType[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [typeConfigs, setTypeConfigs] = useState<Record<string, AdapterConfiguration[]>>({});
  const [loadingConfigs, setLoadingConfigs] = useState<Set<string>>(new Set());

  const [configSections, setConfigSections] = useState<Record<number, ConfigSection[]>>({});
  const [loadingSections, setLoadingSections] = useState<Set<number>>(new Set());

  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [dirtyTabs, setDirtyTabs] = useState<Set<number>>(new Set());
  const [overlay, setOverlay] = useState<Overlay>({ type: "none" });

  const activeTab = openTabs.find((t) => t.config.ConfigurationId === activeTabId) ?? null;

  /* ---- data loading ---- */

  const loadTypes = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.getAdapterTypes();
      const list = (res as Record<string, unknown>).AdapterTypes;
      setTypes(Array.isArray(list) ? (list as AdapterType[]) : []);
    } catch { setTypes([]); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { loadTypes(); }, [loadTypes]);

  const loadConfigs = useCallback(async (adapterType: string) => {
    if (!api) return;
    setLoadingConfigs((p) => new Set(p).add(adapterType));
    try {
      const res = await api.getAdapterConfigurations(adapterType);
      const list = (res as Record<string, unknown>).Configurations;
      setTypeConfigs((prev) => ({ ...prev, [adapterType]: Array.isArray(list) ? (list as AdapterConfiguration[]) : [] }));
    } catch {
      setTypeConfigs((prev) => ({ ...prev, [adapterType]: [] }));
    } finally {
      setLoadingConfigs((p) => { const n = new Set(p); n.delete(adapterType); return n; });
    }
  }, [api]);

  const loadSections = useCallback(async (configId: number) => {
    if (!api) return;
    setLoadingSections((p) => new Set(p).add(configId));
    try {
      const res = await api.getSections(configId);
      const list = (res as Record<string, unknown>).Sections ?? (res as Record<string, unknown>).ConfigurationSections;
      setConfigSections((prev) => ({ ...prev, [configId]: Array.isArray(list) ? (list as ConfigSection[]) : [] }));
    } catch {
      setConfigSections((prev) => ({ ...prev, [configId]: [] }));
    } finally {
      setLoadingSections((p) => { const n = new Set(p); n.delete(configId); return n; });
    }
  }, [api]);

  /* ---- tree interactions ---- */

  const toggleType = (adapterType: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(adapterType)) { next.delete(adapterType); } else {
        next.add(adapterType);
        if (!typeConfigs[adapterType]) loadConfigs(adapterType);
      }
      return next;
    });
  };

  const openConfig = (c: AdapterConfiguration) => {
    const existing = openTabs.find((t) => t.config.ConfigurationId === c.ConfigurationId);
    if (existing) {
      setActiveTabId(c.ConfigurationId);
    } else {
      setOpenTabs((prev) => [...prev, { config: c, selectedSectionId: null }]);
      setActiveTabId(c.ConfigurationId);
      if (!configSections[c.ConfigurationId]) loadSections(c.ConfigurationId);
    }
  };

  const closeTab = (configId: number) => {
    setOpenTabs((prev) => {
      const idx = prev.findIndex((t) => t.config.ConfigurationId === configId);
      const next = prev.filter((t) => t.config.ConfigurationId !== configId);
      if (activeTabId === configId) {
        const newActive = next[Math.min(idx, next.length - 1)]?.config.ConfigurationId ?? null;
        setActiveTabId(newActive);
      }
      return next;
    });
    setDirtyTabs((p) => { const n = new Set(p); n.delete(configId); return n; });
  };

  const selectSection = (configId: number, sectionId: number | null) => {
    setOpenTabs((prev) =>
      prev.map((t) => t.config.ConfigurationId === configId ? { ...t, selectedSectionId: sectionId } : t)
    );
  };

  const markDirty = (configId: number, dirty: boolean) => {
    setDirtyTabs((p) => {
      const n = new Set(p);
      if (dirty) n.add(configId); else n.delete(configId);
      return n;
    });
  };

  /* ---- CRUD actions ---- */

  const handleDeleteType = async (t: AdapterType) => {
    if (!api) return;
    const ok = await confirm({
      title: "Delete Adapter Type",
      message: `Delete adapter type "${t.AdapterType}"?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    await api.deleteAdapterType(t.AdapterType);
    loadTypes();
  };

  const handleDeleteConfig = async (c: AdapterConfiguration) => {
    if (!api) return;
    const ok = await confirm({
      title: "Delete Configuration",
      message: `Delete configuration "${c.Name}"?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    await api.deleteAdapterConfiguration(c.ConfigurationId);
    closeTab(c.ConfigurationId);
    loadConfigs(c.AdapterType);
  };

  const handleSetDefault = async (c: AdapterConfiguration) => {
    if (!api) return;
    await api.setDefaultConfiguration(c.ConfigurationId);
    loadConfigs(c.AdapterType);
  };

  const handleToggleEnabled = async (c: AdapterConfiguration) => {
    if (!api) return;
    const newEnabled = !c.Enabled;
    await api.updateAdapterConfiguration({
      ConfigurationId: c.ConfigurationId,
      AdapterType: c.AdapterType,
      Name: c.Name,
      Description: c.Description,
      Enabled: newEnabled,
      Exported: c.Exported,
    });
    loadConfigs(c.AdapterType);
  };

  const handleClone = async (c: AdapterConfiguration) => {
    if (!api) return;
    await api.cloneConfiguration({ CloningConfigurationId: c.ConfigurationId, AdapterType: c.AdapterType, Name: `${c.Name}_clone`, Description: c.Description, Exported: false, IsDefault: false });
    loadConfigs(c.AdapterType);
  };

  const handleDeleteSection = async (section: ConfigSection, configId: number) => {
    if (!api) return;
    const ok = await confirm({
      title: "Delete Section",
      message: `Delete section "${section.DisplayName || section.Name}"?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    await api.deleteSection(section.SectionId);
    loadSections(configId);
    selectSection(configId, null);
  };

  const handleSaveSection = async (section: ConfigSection, editedJson: string, editedBuildRules?: string, editedBuildTable?: string) => {
    if (!api) return;
    let parsedJson: unknown;
    try { parsedJson = JSON.parse(editedJson); } catch {
      alert("Invalid JSON — please fix before saving");
      return;
    }
    let parsedRules: unknown = null;
    if (editedBuildRules && editedBuildRules.trim()) {
      try { parsedRules = JSON.parse(editedBuildRules); } catch {
        alert("Invalid JSON in Build Rules");
        return;
      }
    }
    await api.updateSection({
      SectionId: section.SectionId,
      Name: section.Name,
      DisplayName: section.DisplayName ?? null,
      Inherited: section.Inherited ?? null,
      JsonData: parsedJson,
      BuildRules: parsedRules,
      BuildTable: editedBuildTable?.trim() || null,
    });
    await loadSections(activeTabId!);
    markDirty(activeTabId!, false);
  };

  const handleToggleLock = async (section: ConfigSection) => {
    if (!api) return;
    const newLocked = !section.Locked;
    await api.updateSection({
      SectionId: section.SectionId,
      Name: section.Name,
      DisplayName: section.DisplayName ?? null,
      Inherited: section.Inherited ?? null,
      JsonData: section.JsonData ? (typeof section.JsonData === "string" ? JSON.parse(section.JsonData) : section.JsonData) : {},
      Locked: newLocked,
    });
    if (activeTabId) await loadSections(activeTabId);
  };

  /* ---- filter ---- */

  const lowerFilter = filter.toLowerCase();

  const filteredTypes = useMemo(() => {
    if (!lowerFilter) return types;
    return types.filter((t) => {
      if (t.AdapterType.toLowerCase().includes(lowerFilter)) return true;
      const configs = typeConfigs[t.AdapterType] ?? [];
      return configs.some((c) =>
        c.Name.toLowerCase().includes(lowerFilter) ||
        (c.Description ?? "").toLowerCase().includes(lowerFilter)
      );
    });
  }, [types, typeConfigs, lowerFilter]);

  const treeSelectedType = activeTab?.config.AdapterType ?? undefined;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ position: "relative" }}>
      <Group direction="horizontal" id="config-master-detail">
        {/* === Left: tree === */}
        <Panel defaultSize="280px" minSize="180px" maxSize="45%" groupResizeBehavior="preserve-pixel-size">
          <div className="flex flex-col h-full" style={{ background: tok.color.bg.sidebar }}>
            <PanelToolbar
              dense
              left={
                <>
                  <IconButton
                    size="xs"
                    label="Refresh"
                    icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
                    onClick={loadTypes}
                    disabled={loading}
                  />
                  <IconButton
                    size="xs"
                    label="Add Adapter Type"
                    icon={<Plus size={14} />}
                    onClick={() => setOverlay({ type: "upsertType", editing: null })}
                  />
                  {treeSelectedType && (
                    <IconButton
                      size="xs"
                      label={`Add Configuration to ${treeSelectedType}`}
                      icon={<span style={{ display: "inline-flex", alignItems: "center" }}><Settings size={13} style={{ marginRight: -3 }} /><Plus size={9} /></span>}
                      onClick={() => setOverlay({ type: "upsertConfig", editing: null, adapterType: treeSelectedType })}
                    />
                  )}
                </>
              }
              right={
                <span style={{ fontSize: 10, fontWeight: 600, color: tok.color.text.muted, textTransform: "uppercase" }}>
                  Configuration
                </span>
              }
            />
            <div className="shrink-0" style={{ padding: "4px 8px", borderBottom: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-1" style={{ background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: 3, padding: "0 6px", height: 24 }}>
                <Search size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
                <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter..." style={{ flex: 1, background: "none", border: "none", color: "var(--color-text)", fontSize: 12, outline: "none", height: "100%" }} />
                {filter && <button onClick={() => setFilter("")} className="toolbar-btn" style={{ padding: 0 }}><X size={12} /></button>}
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {filteredTypes.map((t) => {
                const isTypeExp = expandedTypes.has(t.AdapterType);
                const configs = typeConfigs[t.AdapterType] ?? [];
                const isLoadingCfg = loadingConfigs.has(t.AdapterType);
                return (
                  <div key={t.AdapterType}>
                    <TreeRow depth={0} icon={<Server size={14} style={{ opacity: 0.7, color: "#5CADD5" }} />} label={t.AdapterType} badge={t.Exported ? "E" : undefined} expanded={isTypeExp} onToggle={() => toggleType(t.AdapterType)} onClick={() => { if (!isTypeExp) toggleType(t.AdapterType); }}
                      actions={<>
                        <button onClick={(e) => { e.stopPropagation(); setOverlay({ type: "upsertConfig", editing: null, adapterType: t.AdapterType }); }} className="tree-action-btn" title="Add Config"><Plus size={11} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setOverlay({ type: "upsertType", editing: t }); }} className="tree-action-btn" title="Edit Type"><Pencil size={11} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteType(t); }} className="tree-action-btn" style={{ color: "#F44336" }} title="Delete Type"><Trash2 size={11} /></button>
                      </>}
                    />
                    {isTypeExp && (<>
                      {isLoadingCfg && configs.length === 0 && <div style={{ padding: "4px 0 4px 40px", fontSize: 11, color: "var(--color-text-muted)" }}>Loading...</div>}
                      {!isLoadingCfg && configs.length === 0 && <div style={{ padding: "4px 0 4px 40px", fontSize: 11, color: "var(--color-text-muted)" }}>No configurations</div>}
                      {configs.map((c) => {
                        const isActive = activeTabId === c.ConfigurationId;
                        const isOpen = openTabs.some((tab) => tab.config.ConfigurationId === c.ConfigurationId);
                        const isDirty = dirtyTabs.has(c.ConfigurationId);
                        const matchesFilter = !lowerFilter || c.Name.toLowerCase().includes(lowerFilter) || (c.Description ?? "").toLowerCase().includes(lowerFilter);
                        if (lowerFilter && !matchesFilter && !t.AdapterType.toLowerCase().includes(lowerFilter)) return null;
                        return (
                          <TreeRow key={c.ConfigurationId} depth={1}
                            icon={<span style={{ position: "relative", display: "inline-flex" }}><Settings size={13} style={{ opacity: 0.7, color: c.Enabled ? "#4CAF50" : "#9E9E9E" }} />{c.IsDefault && <Star size={8} style={{ position: "absolute", top: -2, right: -4, color: "#FFD700" }} />}</span>}
                            label={c.Name} sublabel={c.Description || undefined} selected={isActive} dotIndicator={(isOpen && !isActive) || isDirty}
                            onClick={() => openConfig(c)}
                            visibleActions={
                              <label className="toggle-switch-sm" title={c.Enabled ? "Enabled — click to disable" : "Disabled — click to enable"} onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={c.Enabled} onChange={() => handleToggleEnabled(c)} />
                                <span className="toggle-track" />
                              </label>
                            }
                            actions={<>
                              <button onClick={(e) => { e.stopPropagation(); setOverlay({ type: "upsertConfig", editing: c, adapterType: t.AdapterType }); }} className="tree-action-btn" title="Edit"><Pencil size={11} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleClone(c); }} className="tree-action-btn" title="Clone"><Copy size={11} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleSetDefault(c); }} className="tree-action-btn" style={{ color: c.IsDefault ? "#FFD700" : undefined }} title="Default"><Star size={11} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteConfig(c); }} className="tree-action-btn" style={{ color: "#F44336" }} title="Delete"><Trash2 size={11} /></button>
                            </>}
                          />
                        );
                      })}
                    </>)}
                  </div>
                );
              })}
              {filteredTypes.length === 0 && !loading && (
                <EmptyState dense title={filter ? "No matches" : "No adapter types"} />
              )}
            </div>
          </div>
        </Panel>

        <ResizeHandle />

        {/* === Right: tabs + content === */}
        <Panel minSize="30%">
          <div className="flex flex-col h-full" style={{ background: "#1e1e1e" }}>
            {openTabs.length === 0 ? (
              <Placeholder text="Click a configuration to open it" />
            ) : (<>
              <div className="flex shrink-0 overflow-x-auto" style={{ borderBottom: "1px solid var(--color-border)", height: 35 }}>
                {openTabs.map((tab) => {
                  const isActive = tab.config.ConfigurationId === activeTabId;
                  const isDirty = dirtyTabs.has(tab.config.ConfigurationId);
                  const tabTitle = `${tab.config.AdapterType}: ${tab.config.Name}`;
                  return (
                    <div key={tab.config.ConfigurationId} className="flex items-center gap-1 shrink-0"
                      title={tabTitle}
                      style={{ height: "100%", padding: "0 4px 0 12px", cursor: "pointer", userSelect: "none", borderRight: "1px solid var(--color-border)", fontSize: 12, color: isActive ? "var(--color-text)" : "var(--color-text-muted)", fontWeight: isActive ? 500 : 400, background: isActive ? "#1e1e1e" : "var(--color-sidebar)", maxWidth: 260 }}
                      onClick={() => setActiveTabId(tab.config.ConfigurationId)}
                    >
                      <Settings size={12} style={{ opacity: 0.6, flexShrink: 0, color: tab.config.Enabled ? "#4CAF50" : "#9E9E9E" }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                        <span style={{ color: "var(--color-text-muted)", marginRight: 4 }}>{tab.config.AdapterType}:</span>
                        <span>{tab.config.Name}{isDirty ? " •" : ""}</span>
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); closeTab(tab.config.ConfigurationId); }} className="toolbar-btn" style={{ padding: 2, opacity: isActive ? 1 : 0.5 }} title="Close">
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
              {/*
                Keep-alive: рендерим ВСЕ открытые вкладки и скрываем неактивные
                через display:none. Monaco-редактор внутри BuildRulesEditor не
                пересоздаётся при переключении таба → переключение мгновенное.
              */}
              <div className="flex-1" style={{ minHeight: 0, position: "relative" }}>
                {openTabs.map((tab) => {
                  const isActive = tab.config.ConfigurationId === activeTabId;
                  return (
                    <div
                      key={tab.config.ConfigurationId}
                      style={{
                        display: isActive ? "flex" : "none",
                        flexDirection: "column",
                        position: "absolute",
                        inset: 0,
                      }}
                    >
                      <ConfigTabContent
                        tab={tab}
                        isActive={isActive}
                        sections={configSections[tab.config.ConfigurationId] ?? []}
                        isLoadingSections={loadingSections.has(tab.config.ConfigurationId)}
                        onSelectSection={(sid) => selectSection(tab.config.ConfigurationId, sid)}
                        onAddSection={() => setOverlay({ type: "createSection", configId: tab.config.ConfigurationId })}
                        onSaveSection={handleSaveSection}
                        onDeleteSection={(s) => handleDeleteSection(s, tab.config.ConfigurationId)}
                        onToggleLock={handleToggleLock}
                        onDirtyChange={(dirty) => markDirty(tab.config.ConfigurationId, dirty)}
                      />
                    </div>
                  );
                })}
              </div>
            </>)}
          </div>
        </Panel>
      </Group>

      {/* Overlays */}
      {overlay.type === "upsertType" && <UpsertTypeOverlay editing={overlay.editing} api={api} onClose={() => { setOverlay({ type: "none" }); loadTypes(); }} />}
      {overlay.type === "upsertConfig" && <UpsertConfigOverlay editing={overlay.editing} adapterType={overlay.adapterType} api={api} onClose={() => { setOverlay({ type: "none" }); loadConfigs(overlay.adapterType); }} />}
      {overlay.type === "createSection" && <CreateSectionOverlay configId={overlay.configId} api={api} onClose={() => { setOverlay({ type: "none" }); loadSections(overlay.configId); }} />}
    </div>
  );
}

/* ===== Tab content: sections list + JSON editor ===== */

function ConfigTabContent({ tab, isActive, sections, isLoadingSections, onSelectSection, onAddSection, onSaveSection, onDeleteSection, onToggleLock, onDirtyChange }: {
  tab: OpenTab;
  /** true — эта вкладка сейчас видимая, только она обрабатывает Ctrl+S. */
  isActive: boolean;
  sections: ConfigSection[];
  isLoadingSections: boolean;
  onSelectSection: (sectionId: number | null) => void;
  onAddSection: () => void;
  onSaveSection: (section: ConfigSection, editedJson: string, editedBuildRules?: string, editedBuildTable?: string) => Promise<void>;
  onDeleteSection: (section: ConfigSection) => void;
  onToggleLock: (section: ConfigSection) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const selectedSection = sections.find((s) => s.SectionId === tab.selectedSectionId) ?? null;
  const [editedJson, setEditedJson] = useState("");
  const [editedBuildRules, setEditedBuildRules] = useState("");
  const [editedBuildTable, setEditedBuildTable] = useState("");
  const [saving, setSaving] = useState(false);
  const originalJsonRef = useRef("");
  const originalBuildRulesRef = useRef("");
  const originalBuildTableRef = useRef("");

  useEffect(() => {
    if (selectedSection) {
      const json = tryFormatJson(selectedSection.JsonData ?? "{}");
      const rules = tryFormatJson(selectedSection.BuildRules ?? "");
      const table = typeof selectedSection.BuildTable === "string" ? selectedSection.BuildTable : (selectedSection.BuildTable ? "true" : "");
      setEditedJson(json);
      setEditedBuildRules(rules);
      setEditedBuildTable(table);
      originalJsonRef.current = json;
      originalBuildRulesRef.current = rules;
      originalBuildTableRef.current = table;
      onDirtyChange(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSection?.SectionId]);

  const isDirty = editedJson !== originalJsonRef.current
    || editedBuildRules !== originalBuildRulesRef.current
    || editedBuildTable !== originalBuildTableRef.current;

  const hasBuildRules = !!(selectedSection && (selectedSection.BuildRules || editedBuildRules));

  const handleJsonChange = (val: string) => {
    setEditedJson(val);
    onDirtyChange(val !== originalJsonRef.current || editedBuildRules !== originalBuildRulesRef.current || editedBuildTable !== originalBuildTableRef.current);
  };
  const handleBuildRulesChange = (val: string) => {
    setEditedBuildRules(val);
    onDirtyChange(editedJson !== originalJsonRef.current || val !== originalBuildRulesRef.current || editedBuildTable !== originalBuildTableRef.current);
  };
  const handleBuildTableChange = (val: string) => {
    setEditedBuildTable(val);
    onDirtyChange(editedJson !== originalJsonRef.current || editedBuildRules !== originalBuildRulesRef.current || val !== originalBuildTableRef.current);
  };

  const handleCreateBuildRules = () => {
    setEditedBuildRules(BUILD_RULES_TEMPLATE);
    onDirtyChange(true);
  };
  const handleRemoveBuildRules = () => {
    setEditedBuildRules("");
    setEditedBuildTable("");
    onDirtyChange(true);
  };

  const handleSave = async () => {
    if (!selectedSection || !isDirty) return;
    setSaving(true);
    try {
      await onSaveSection(selectedSection, editedJson, editedBuildRules, editedBuildTable);
      originalJsonRef.current = editedJson;
      originalBuildRulesRef.current = editedBuildRules;
      originalBuildTableRef.current = editedBuildTable;
      onDirtyChange(false);
    } finally { setSaving(false); }
  };

  useEffect(() => {
    // keep-alive: слушатель работает только для активной вкладки, иначе
    // Ctrl+S сохранил бы во всех открытых табах одновременно.
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && isDirty && selectedSection) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isDirty, selectedSection, editedJson, editedBuildRules, editedBuildTable]);

  return (
    <Group direction="horizontal" id={`tab-sections-${tab.config.ConfigurationId}`}>
      {/* Sections list */}
      <Panel defaultSize="220px" minSize="140px" maxSize="40%" groupResizeBehavior="preserve-pixel-size">
        <div className="flex flex-col h-full" style={{ background: "var(--color-sidebar)", borderRight: "1px solid var(--color-border)" }}>
          <div className="flex items-center shrink-0" style={{ padding: "6px 10px", borderBottom: "1px solid var(--color-border)" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", flex: 1 }}>
              Sections
              {sections.length > 0 && <span style={{ fontWeight: 400, marginLeft: 6 }}>{sections.length}</span>}
            </span>
            <button onClick={onAddSection} className="toolbar-btn" title="Add Section"><Plus size={14} /></button>
          </div>
          <div className="flex-1 overflow-auto">
            {isLoadingSections && sections.length === 0 && <div style={{ padding: 10, fontSize: 12, color: "var(--color-text-muted)" }}>Loading...</div>}
            {!isLoadingSections && sections.length === 0 && <div style={{ padding: 10, fontSize: 12, color: "var(--color-text-muted)" }}>No sections</div>}
            {sections.map((s) => {
              const isSel = s.SectionId === tab.selectedSectionId;
              return (
                <div key={s.SectionId} className="flex items-center group adapter-tree-row"
                  data-selected={isSel ? "true" : undefined}
                  onClick={() => onSelectSection(s.SectionId)}
                  style={{ height: 26, padding: "0 10px", cursor: "pointer", fontSize: 12, gap: 6, color: isSel ? "var(--color-text)" : "var(--color-text-muted)", fontWeight: isSel ? 500 : 400 }}
                >
                  {s.Locked ? <Lock size={12} style={{ flexShrink: 0, color: "#F6511D" }} /> : <Folder size={12} style={{ flexShrink: 0, opacity: 0.6 }} />}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{s.DisplayName || s.Name}</span>
                  {s.BuildTable && <span style={{ fontSize: 9, background: "rgba(255,255,255,0.08)", color: "var(--color-text-muted)", borderRadius: 3, padding: "0 3px", lineHeight: "16px", flexShrink: 0 }}>BT</span>}
                  <button className="hidden group-hover:inline-flex tree-action-btn" onClick={(e) => { e.stopPropagation(); onDeleteSection(s); }} style={{ color: "#F44336" }} title="Delete Section"><Trash2 size={11} /></button>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <ResizeHandle />

      {/* Editor area */}
      <Panel minSize="30%">
        <div className="flex flex-col h-full" style={{ background: "#1e1e1e" }}>
          {selectedSection ? (<>
            <PanelHeader
              icon={<Folder size={12} style={{ color: tok.color.text.muted }} />}
              title={
                <span>
                  {selectedSection.DisplayName || selectedSection.Name}
                  {isDirty && <span style={{ color: tok.color.text.muted, marginLeft: 4, fontWeight: 400 }}>• modified</span>}
                </span>
              }
              hint={`ID: ${selectedSection.SectionId}${selectedSection.Inherited ? " · Inherited" : ""}`}
              actions={
                <>
                  <BuildRulesToggleButton hasBuildRules={hasBuildRules} onCreateBuildRules={handleCreateBuildRules} />
                  <IconButton
                    size="xs"
                    label={selectedSection.Locked ? "Unlock" : "Lock"}
                    icon={selectedSection.Locked ? <Lock size={14} style={{ color: "#F6511D" }} /> : <Unlock size={14} />}
                    onClick={() => onToggleLock(selectedSection)}
                  />
                  <IconButton
                    size="xs"
                    label="Save (Ctrl+S)"
                    icon={<Save size={14} style={{ color: isDirty ? "#4CAF50" : undefined }} />}
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                  />
                  <IconButton
                    size="xs"
                    label="Delete Section"
                    icon={<Trash2 size={14} style={{ color: "#F44336" }} />}
                    onClick={() => onDeleteSection(selectedSection)}
                  />
                </>
              }
            />
            <div className="flex-1" style={{ minHeight: 0 }}>
              <BuildRulesEditor
                sectionId={selectedSection.SectionId}
                editedJson={editedJson} onJsonChange={handleJsonChange}
                editedBuildRules={editedBuildRules} onBuildRulesChange={handleBuildRulesChange}
                editedBuildTable={editedBuildTable} onBuildTableChange={handleBuildTableChange}
                hasBuildRules={hasBuildRules}
                onRemoveBuildRules={handleRemoveBuildRules}
                pathPrefix="config-section"
              />
            </div>
          </>) : (
            <Placeholder text="Select a section to view its configuration" />
          )}
        </div>
      </Panel>
    </Group>
  );
}

/* ===== Tree row ===== */

function TreeRow({ depth, icon, label, sublabel, badge, expanded, selected, dotIndicator, onToggle, onClick, actions, visibleActions }: {
  depth: number; icon: React.ReactNode; label: string; sublabel?: string; badge?: string;
  expanded?: boolean; selected?: boolean; dotIndicator?: boolean;
  onToggle?: () => void; onClick?: () => void; actions?: React.ReactNode; visibleActions?: React.ReactNode;
}) {
  const hasChildren = expanded !== undefined;
  const paddingLeft = 8 + depth * 16;
  return (
    <div className="flex items-center group adapter-tree-row"
      data-selected={selected ? "true" : undefined}
      style={{ height: 26, paddingLeft, paddingRight: 6, cursor: "pointer", userSelect: "none", gap: 4 }}
      onClick={onClick}
    >
      {hasChildren ? (
        <span onClick={(e) => { e.stopPropagation(); onToggle?.(); }} style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, width: 16 }}>
          {expanded ? <ChevronDown size={14} style={{ opacity: 0.6 }} /> : <ChevronRight size={14} style={{ opacity: 0.6 }} />}
        </span>
      ) : <span style={{ width: 16, flexShrink: 0 }} />}
      <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center" }}>{icon}</span>
      <span style={{ fontSize: 12, color: selected ? "var(--color-text)" : "var(--color-text-muted)", fontWeight: selected ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{label}</span>
      {sublabel && <span style={{ fontSize: 10, color: "var(--color-text-muted)", opacity: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{sublabel}</span>}
      {badge && <span style={{ fontSize: 9, background: "rgba(255,255,255,0.1)", color: "var(--color-text-muted)", borderRadius: 3, padding: "0 3px", lineHeight: "16px", flexShrink: 0 }}>{badge}</span>}
      {dotIndicator && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-text-muted)", opacity: 0.4, flexShrink: 0 }} />}
      <div className="hidden group-hover:flex items-center gap-0" style={{ flexShrink: 0 }}>{actions}</div>
      {visibleActions && <div className="flex items-center gap-0" style={{ flexShrink: 0 }}>{visibleActions}</div>}
    </div>
  );
}

/* ===== Helpers ===== */

function Placeholder({ text }: { text: string }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-text-muted)", fontSize: 12 }}>{text}</div>;
}

function tryFormatJson(raw: unknown): string {
  if (raw == null) return "{}";
  if (typeof raw !== "string") { try { return JSON.stringify(raw, null, 2); } catch { return "{}"; } }
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
}

/* ===== Overlays ===== */

function CreateSectionOverlay({ configId, api, onClose }: { configId: number; api: ReturnType<typeof useContourApi>; onClose: () => void }) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inheritedId, setInheritedId] = useState<number | null>(null);
  const [baseSections, setBaseSections] = useState<ConfigSection[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getBaseSections();
        const list = (res as Record<string, unknown>).ConfigurationSections ?? (res as Record<string, unknown>).Sections;
        if (!cancelled) setBaseSections(Array.isArray(list) ? (list as ConfigSection[]) : []);
      } catch { if (!cancelled) setBaseSections([]); }
      finally { if (!cancelled) setLoadingBase(false); }
    })();
    return () => { cancelled = true; };
  }, [api]);

  const handleInheritedChange = (sectionId: number | null) => {
    setInheritedId(sectionId);
    if (sectionId !== null) {
      const base = baseSections.find((s) => s.SectionId === sectionId);
      if (base) {
        setName(base.Name);
        setDisplayName(base.DisplayName ?? "");
      }
    }
  };

  const handleCreate = async () => {
    if (!api || !name.trim()) return;
    setSubmitting(true);
    try {
      let jsonData: unknown = {};
      if (inheritedId !== null) {
        const base = baseSections.find((s) => s.SectionId === inheritedId);
        if (base?.JsonData) {
          jsonData = typeof base.JsonData === "string" ? JSON.parse(base.JsonData) : base.JsonData;
        }
      }
      await api.createSection({
        ConfigurationId: configId,
        Name: name.trim(),
        DisplayName: displayName.trim() || null,
        Inherited: inheritedId,
        JsonData: jsonData,
      });
      onClose();
    } finally { setSubmitting(false); }
  };

  return (
    <div style={overlayBg}><div style={{ ...dialogStyle, width: 440 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-2">
          <Plus size={16} style={{ color: "var(--color-text-muted)" }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Add Section</span>
        </div>
        <button onClick={onClose} className="toolbar-btn"><X size={14} /></button>
      </div>
      <div className="flex flex-col gap-3">
        <label style={labelStyle}>
          Inherited
          <select
            value={inheritedId ?? ""}
            onChange={(e) => handleInheritedChange(e.target.value ? Number(e.target.value) : null)}
            style={{ ...inputStyle, height: 28, cursor: "pointer" }}
            disabled={loadingBase}
          >
            <option value="">{loadingBase ? "Loading..." : "NO INHERITED"}</option>
            {baseSections.map((s) => (
              <option key={s.SectionId} value={s.SectionId}>
                {s.Name}{s.DisplayName ? ` — ${s.DisplayName}` : ""} (ID: {s.SectionId})
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Name*
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Name*" />
        </label>
        <label style={labelStyle}>
          Display Name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} placeholder="Display Name" />
        </label>
      </div>
      <div className="flex gap-2" style={{ justifyContent: "flex-end", marginTop: 20 }}>
        <button onClick={onClose} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
        <button onClick={handleCreate} disabled={submitting || !name.trim()} style={{ ...primaryBtnStyle, opacity: name.trim() ? 1 : 0.5 }}>
          {submitting ? "Creating..." : "Create"}
        </button>
      </div>
    </div></div>
  );
}

function UpsertTypeOverlay({ editing, api, onClose }: { editing: AdapterType | null; api: ReturnType<typeof useContourApi>; onClose: () => void }) {
  const [name, setName] = useState(editing?.AdapterType ?? "");
  const [maxInst, setMaxInst] = useState(String(editing?.MaxInstances ?? 1));
  const [exported, setExported] = useState(editing?.Exported ?? false);
  const [submitting, setSubmitting] = useState(false);
  const handleSave = async () => { if (!api || !name.trim()) return; setSubmitting(true); try { await api.upsertAdapterType({ AdapterType: name.trim(), MaxInstances: Number(maxInst), Exported: exported }); onClose(); } finally { setSubmitting(false); } };
  return (
    <div style={overlayBg}><div style={{ ...dialogStyle, width: 400 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{editing ? "Edit Adapter Type" : "Add Adapter Type"}</span>
        <button onClick={onClose} className="toolbar-btn"><X size={14} /></button>
      </div>
      <div className="flex flex-col gap-2">
        <label style={labelStyle}>AdapterType <input value={name} onChange={(e) => setName(e.target.value)} disabled={!!editing} style={inputStyle} /></label>
        <label style={labelStyle}>MaxInstances <input type="number" value={maxInst} onChange={(e) => setMaxInst(e.target.value)} style={inputStyle} /></label>
        <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" checked={exported} onChange={(e) => setExported(e.target.checked)} /> Exported</label>
      </div>
      <div className="flex gap-2" style={{ justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={onClose} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
        <button onClick={handleSave} disabled={submitting} style={primaryBtnStyle}>{submitting ? "Saving..." : "Save"}</button>
      </div>
    </div></div>
  );
}

type BaseOption = "NO" | "FRONT" | "BACK" | "CLONE" | "INHERITED";

interface PickedConfig { configurationId: number; name: string; adapterType: string }

function ConfigPicker({ api, onPick, picked }: {
  api: ReturnType<typeof useContourApi>;
  onPick: (c: PickedConfig | null) => void;
  picked: PickedConfig | null;
}) {
  const [search, setSearch] = useState("");
  const [adapterTypes, setAdapterTypes] = useState<AdapterType[]>([]);
  const [configsByType, setConfigsByType] = useState<Record<string, AdapterConfiguration[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingConfigs, setLoadingConfigs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getAdapterTypes();
        const list = (res as Record<string, unknown>).AdapterTypes;
        if (!cancelled) setAdapterTypes(Array.isArray(list) ? (list as AdapterType[]) : []);
      } catch { if (!cancelled) setAdapterTypes([]); }
      finally { if (!cancelled) setLoadingTypes(false); }
    })();
    return () => { cancelled = true; };
  }, [api]);

  const toggleType = (at: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(at)) { n.delete(at); } else {
        n.add(at);
        if (!configsByType[at]) loadConfigsFor(at);
      }
      return n;
    });
  };

  const loadConfigsFor = async (at: string) => {
    if (!api) return;
    setLoadingConfigs((p) => new Set(p).add(at));
    try {
      const res = await api.getAdapterConfigurations(at);
      const list = (res as Record<string, unknown>).Configurations;
      setConfigsByType((prev) => ({ ...prev, [at]: Array.isArray(list) ? (list as AdapterConfiguration[]) : [] }));
    } catch {
      setConfigsByType((prev) => ({ ...prev, [at]: [] }));
    } finally {
      setLoadingConfigs((p) => { const n = new Set(p); n.delete(at); return n; });
    }
  };

  const lf = search.toLowerCase();
  const filtered = adapterTypes.filter((t) => {
    if (!lf) return true;
    if (t.AdapterType.toLowerCase().includes(lf)) return true;
    const cfgs = configsByType[t.AdapterType] ?? [];
    return cfgs.some((c) => c.Name.toLowerCase().includes(lf) || String(c.ConfigurationId).includes(lf));
  });

  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: 4, background: "var(--color-input-bg)", overflow: "hidden" }}>
      <div style={{ padding: "4px 6px", borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-1" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 3, padding: "0 6px", height: 24 }}>
          <Search size={11} style={{ opacity: 0.4, flexShrink: 0 }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search configurations..."
            style={{ flex: 1, background: "none", border: "none", color: "var(--color-text)", fontSize: 11, outline: "none", height: "100%" }}
          />
          {search && <button onClick={() => setSearch("")} className="toolbar-btn" style={{ padding: 0 }}><X size={10} /></button>}
        </div>
      </div>

      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {loadingTypes && <div style={{ padding: 8, fontSize: 11, color: "var(--color-text-muted)" }}>Loading...</div>}
        {!loadingTypes && filtered.length === 0 && <div style={{ padding: 8, fontSize: 11, color: "var(--color-text-muted)" }}>{search ? "No matches" : "No adapter types"}</div>}
        {filtered.map((t) => {
          const isExp = expanded.has(t.AdapterType) || !!lf;
          const cfgs = configsByType[t.AdapterType] ?? [];
          const isLoadingCfg = loadingConfigs.has(t.AdapterType);
          const needsLoad = !configsByType[t.AdapterType] && !isLoadingCfg;

          if (lf && needsLoad) loadConfigsFor(t.AdapterType);

          const matchedCfgs = lf
            ? cfgs.filter((c) => c.Name.toLowerCase().includes(lf) || String(c.ConfigurationId).includes(lf) || t.AdapterType.toLowerCase().includes(lf))
            : cfgs;

          return (
            <div key={t.AdapterType}>
              <div
                className="flex items-center gap-1"
                onClick={() => toggleType(t.AdapterType)}
                style={{ height: 24, padding: "0 6px", cursor: "pointer", fontSize: 11, color: "var(--color-text-muted)", fontWeight: 500 }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                {isExp ? <ChevronDown size={12} style={{ opacity: 0.5 }} /> : <ChevronRight size={12} style={{ opacity: 0.5 }} />}
                <Server size={11} style={{ color: "#5CADD5", opacity: 0.7 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.AdapterType}</span>
                {cfgs.length > 0 && <span style={{ fontSize: 9, opacity: 0.5 }}>{cfgs.length}</span>}
              </div>
              {isExp && (<>
                {isLoadingCfg && cfgs.length === 0 && <div style={{ padding: "2px 0 2px 32px", fontSize: 10, color: "var(--color-text-muted)" }}>Loading...</div>}
                {!isLoadingCfg && matchedCfgs.length === 0 && cfgs.length === 0 && <div style={{ padding: "2px 0 2px 32px", fontSize: 10, color: "var(--color-text-muted)" }}>No configs</div>}
                {matchedCfgs.map((c) => {
                  const isPicked = picked?.configurationId === c.ConfigurationId;
                  return (
                    <div
                      key={c.ConfigurationId}
                      className="flex items-center gap-1"
                      onClick={() => onPick(isPicked ? null : { configurationId: c.ConfigurationId, name: c.Name, adapterType: t.AdapterType })}
                      style={{
                        height: 22, padding: "0 8px 0 32px", cursor: "pointer", fontSize: 11,
                        color: isPicked ? "#fff" : "var(--color-text-muted)",
                        backgroundColor: isPicked ? "rgba(14,99,156,0.5)" : "transparent",
                      }}
                      onMouseEnter={(e) => { if (!isPicked) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                      onMouseLeave={(e) => { if (!isPicked) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <Settings size={10} style={{ opacity: 0.6, flexShrink: 0, color: c.Enabled ? "#4CAF50" : "#9E9E9E" }} />
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.Name}</span>
                      <span style={{ fontSize: 9, opacity: 0.5, flexShrink: 0 }}>ID: {c.ConfigurationId}</span>
                      {isPicked && <span style={{ fontSize: 9, color: "#4CAF50", flexShrink: 0, marginLeft: 4 }}>&#10003;</span>}
                    </div>
                  );
                })}
              </>)}
            </div>
          );
        })}
      </div>

      {picked && (
        <div style={{ borderTop: "1px solid var(--color-border)", padding: "4px 8px", fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ color: "var(--color-text-muted)" }}>Selected:</span>
          <span style={{ color: "var(--color-text)", fontWeight: 500 }}>{picked.name}</span>
          <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>({picked.adapterType}, ID: {picked.configurationId})</span>
          <button onClick={() => onPick(null)} className="toolbar-btn" style={{ marginLeft: "auto", padding: 0 }}><X size={10} /></button>
        </div>
      )}
    </div>
  );
}

function UpsertConfigOverlay({ editing, adapterType, api, onClose }: { editing: AdapterConfiguration | null; adapterType: string; api: ReturnType<typeof useContourApi>; onClose: () => void }) {
  const isEditing = !!editing;
  const [name, setName] = useState(editing?.Name ?? "");
  const [desc, setDesc] = useState(editing?.Description ?? "");
  const [enabled, setEnabled] = useState(editing?.Enabled ?? true);
  const [exp, setExp] = useState(editing?.Exported ?? false);

  const [base, setBase] = useState<BaseOption>("NO");
  const [pickedConfig, setPickedConfig] = useState<PickedConfig | null>(null);
  const [condition, setCondition] = useState(false);
  const [host, setHost] = useState("");
  const [isContainerised, setIsContainerised] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const showClonePicker = base === "CLONE" || base === "INHERITED";

  const handleSave = async () => {
    if (!api || !name.trim()) return;
    if (showClonePicker && !pickedConfig) return;
    setSubmitting(true);
    try {
      if (isEditing) {
        await api.updateAdapterConfiguration({
          ConfigurationId: editing.ConfigurationId,
          AdapterType: adapterType,
          Name: name.trim(),
          Description: desc,
          Enabled: enabled,
          Exported: exp,
        });
      } else {
        const payload: Record<string, unknown> = {
          AdapterType: adapterType,
          Name: name.trim(),
          Description: desc,
          Exported: false,
          IsDefault: false,
        };
        if (showClonePicker && pickedConfig) {
          payload.CloningConfigurationId = pickedConfig.configurationId;
        }
        switch (base) {
          case "NO": await api.createAdapterConfiguration(payload); break;
          case "FRONT": await api.createBaseFrontConfiguration(payload); break;
          case "BACK": await api.createBaseBackConfiguration(payload); break;
          case "CLONE": await api.cloneConfiguration(payload); break;
          case "INHERITED": await api.cloneInheritedConfiguration(payload); break;
        }
      }
      onClose();
    } finally { setSubmitting(false); }
  };

  const canSave = name.trim().length > 0 && (!showClonePicker || !!pickedConfig);

  return (
    <div style={overlayBg}><div style={{ ...dialogStyle, width: 500 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-2">
          {!isEditing && <Plus size={16} style={{ color: "var(--color-text-muted)" }} />}
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {isEditing ? "Edit Configuration" : "Add Adapter Configuration"}
          </span>
        </div>
        <button onClick={onClose} className="toolbar-btn"><X size={14} /></button>
      </div>

      <div className="flex flex-col gap-3">
        <label style={labelStyle}>
          Name{!isEditing && "*"}
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} autoFocus placeholder="Name*" />
        </label>

        <label style={labelStyle}>
          Description
          <input value={desc} onChange={(e) => setDesc(e.target.value)} style={inputStyle} placeholder="Description" />
        </label>

        {isEditing ? (<>
          <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled
          </label>
          <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={exp} onChange={(e) => setExp(e.target.checked)} /> Exported
          </label>
        </>) : (<>
          <label style={labelStyle}>
            Base
            <select
              value={base}
              onChange={(e) => { setBase(e.target.value as BaseOption); setPickedConfig(null); }}
              style={{ ...inputStyle, height: 28, cursor: "pointer" }}
            >
              <option value="NO">NO BASE</option>
              <option value="FRONT">FRONT</option>
              <option value="BACK">BACK</option>
              <option value="CLONE">CLONE</option>
              <option value="INHERITED">CLONE INHERITED</option>
            </select>
          </label>

          {showClonePicker && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                Clone from Configuration {!pickedConfig && <span style={{ color: "#F6511D" }}>*</span>}
              </span>
              <ConfigPicker api={api} picked={pickedConfig} onPick={setPickedConfig} />
            </div>
          )}

          <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={condition} onChange={(e) => setCondition(e.target.checked)} /> Condition
          </label>

          {condition && (<>
            <label style={labelStyle}>
              Host
              <input value={host} onChange={(e) => setHost(e.target.value)} style={inputStyle} placeholder="Host" />
            </label>
            <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isContainerised} onChange={(e) => setIsContainerised(e.target.checked)} /> Is Containerised
            </label>
          </>)}
        </>)}
      </div>

      <div className="flex gap-2" style={{ justifyContent: "flex-end", marginTop: 20 }}>
        <button onClick={onClose} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
        <button onClick={handleSave} disabled={submitting || !canSave} style={{ ...primaryBtnStyle, opacity: canSave ? 1 : 0.5 }}>
          {submitting ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save" : "Create")}
        </button>
      </div>
    </div></div>
  );
}

/* ===== Styles ===== */


const overlayBg: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 20, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60 };
const dialogStyle: React.CSSProperties = { backgroundColor: "var(--color-sidebar)", border: "1px solid var(--color-border)", borderRadius: 6, padding: 20, minWidth: 340, maxWidth: "80%", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-text-muted)" };
const inputStyle: React.CSSProperties = { background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 12, padding: "4px 8px", height: 24, borderRadius: 3, outline: "none" };
const cancelBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: 3, cursor: "pointer" };
const primaryBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "#0e639c", border: "none", color: "#fff", borderRadius: 3, cursor: "pointer" };
