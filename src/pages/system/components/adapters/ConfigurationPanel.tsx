import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { Group, Panel } from "react-resizable-panels";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { useContourApi } from "@/lib/ws-api";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { AdapterConfiguration, AdapterType, ConfigSection } from "../../types";
import { AdapterTreeSidebar } from "./AdapterTreeSidebar";
import { ConfigTabContent } from "./ConfigTabContent";
import { ConfigurationTabsBar } from "./ConfigurationTabsBar";
import {
  configurationWorkspaceInitialState,
  configurationWorkspaceReducer,
} from "./configurationWorkspaceReducer";
import { CreateSectionOverlay } from "./CreateSectionOverlay";
import { UpsertTypeOverlay } from "./UpsertTypeOverlay";
import { UpsertConfigOverlay } from "./UpsertConfigOverlay";
import { Placeholder } from "./lib/Placeholder";

/** Стабильная ссылка для memo (`?? []` каждый раз новый массив). */
const EMPTY_CONFIG_SECTIONS: ConfigSection[] = [];

type Overlay =
  | { type: "none" }
  | { type: "upsertType"; editing: AdapterType | null }
  | { type: "upsertConfig"; editing: AdapterConfiguration | null; adapterType: string }
  | { type: "createSection"; configId: number };

/**
 * System → Configuration: дерево типов/конфигураций слева, справа — вкладки открытых
 * конфигураций и редактор секций. Состояние вкладок — в `configurationWorkspaceReducer`;
 * загрузка данных — локальные `useCallback` + API.
 */
export function ConfigurationPanel() {
  const api = useContourApi();
  const confirm = useConfirm();

  const [workspace, dispatchWorkspace] = useReducer(
    configurationWorkspaceReducer,
    configurationWorkspaceInitialState,
  );
  const { openTabs, activeTabId, dirtyTabs, sectionSelection } = workspace;

  const [types, setTypes] = useState<AdapterType[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [typeConfigs, setTypeConfigs] = useState<Record<string, AdapterConfiguration[]>>({});
  const [loadingConfigs, setLoadingConfigs] = useState<Set<string>>(new Set());

  const [configSections, setConfigSections] = useState<Record<number, ConfigSection[]>>({});
  const [loadingSections, setLoadingSections] = useState<Set<number>>(new Set());

  const [overlay, setOverlay] = useState<Overlay>({ type: "none" });

  const activeTab = openTabs.find((t) => t.config.ConfigurationId === activeTabId) ?? null;
  const openTabIds = useMemo(
    () => new Set(openTabs.map((t) => t.config.ConfigurationId)),
    [openTabs],
  );

  const loadTypes = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.getAdapterTypes();
      const list = (res as Record<string, unknown>).AdapterTypes;
      setTypes(Array.isArray(list) ? (list as AdapterType[]) : []);
    } catch {
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  const loadConfigs = useCallback(async (adapterType: string) => {
    if (!api) return;
    setLoadingConfigs((p) => new Set(p).add(adapterType));
    try {
      const res = await api.getAdapterConfigurations(adapterType);
      const list = (res as Record<string, unknown>).Configurations;
      setTypeConfigs((prev) => ({
        ...prev,
        [adapterType]: Array.isArray(list) ? (list as AdapterConfiguration[]) : [],
      }));
    } catch {
      setTypeConfigs((prev) => ({ ...prev, [adapterType]: [] }));
    } finally {
      setLoadingConfigs((p) => {
        const n = new Set(p);
        n.delete(adapterType);
        return n;
      });
    }
  }, [api]);

  const loadSections = useCallback(async (configId: number) => {
    if (!api) return;
    setLoadingSections((p) => new Set(p).add(configId));
    try {
      const res = await api.getSections(configId);
      const list =
        (res as Record<string, unknown>).Sections ??
        (res as Record<string, unknown>).ConfigurationSections;
      setConfigSections((prev) => ({
        ...prev,
        [configId]: Array.isArray(list) ? (list as ConfigSection[]) : [],
      }));
    } catch {
      setConfigSections((prev) => ({ ...prev, [configId]: [] }));
    } finally {
      setLoadingSections((p) => {
        const n = new Set(p);
        n.delete(configId);
        return n;
      });
    }
  }, [api]);

  const toggleType = (adapterType: string) => {
    const wasExpanded = expandedTypes.has(adapterType);
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (wasExpanded) next.delete(adapterType);
      else next.add(adapterType);
      return next;
    });
    if (!wasExpanded && typeConfigs[adapterType] === undefined) {
      void loadConfigs(adapterType);
    }
  };

  const openConfig = (c: AdapterConfiguration) => {
    const alreadyOpen = openTabs.some((t) => t.config.ConfigurationId === c.ConfigurationId);
    dispatchWorkspace({ type: "TAB_OPEN_OR_FOCUS", config: c });
    if (!alreadyOpen && configSections[c.ConfigurationId] === undefined) {
      void loadSections(c.ConfigurationId);
    }
  };

  const closeTab = useCallback((configId: number) => {
    dispatchWorkspace({ type: "TAB_CLOSE", configId });
  }, []);

  const handleTabBarSelect = useCallback((id: number) => {
    dispatchWorkspace({ type: "TAB_SELECT", configId: id });
  }, []);

  const handleWorkspaceSection = useCallback((configId: number, sectionId: number | null) => {
    dispatchWorkspace({ type: "TAB_SECTION", configId, sectionId });
  }, []);

  const handleWorkspaceDirty = useCallback((configId: number, dirty: boolean) => {
    dispatchWorkspace({ type: "TAB_DIRTY", configId, dirty });
  }, []);

  const handleTabAddSection = useCallback((configId: number) => {
    setOverlay({ type: "createSection", configId });
  }, []);

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
    dispatchWorkspace({ type: "TAB_CLOSE", configId: c.ConfigurationId });
    loadConfigs(c.AdapterType);
  };

  const handleSetDefault = async (c: AdapterConfiguration) => {
    if (!api) return;
    await api.setDefaultConfiguration(c.ConfigurationId);
    loadConfigs(c.AdapterType);
  };

  const handleToggleEnabled = async (c: AdapterConfiguration) => {
    if (!api) return;
    await api.updateAdapterConfiguration({
      ConfigurationId: c.ConfigurationId,
      AdapterType: c.AdapterType,
      Name: c.Name,
      Description: c.Description,
      Enabled: !c.Enabled,
      Exported: c.Exported,
    });
    loadConfigs(c.AdapterType);
  };

  const handleClone = async (c: AdapterConfiguration) => {
    if (!api) return;
    await api.cloneConfiguration({
      CloningConfigurationId: c.ConfigurationId,
      AdapterType: c.AdapterType,
      Name: `${c.Name}_clone`,
      Description: c.Description,
      Exported: false,
      IsDefault: false,
    });
    loadConfigs(c.AdapterType);
  };

  const handleDeleteSection = useCallback(
    async (section: ConfigSection, configId: number) => {
      if (!api) return;
      const ok = await confirm({
        title: "Delete Section",
        message: `Delete section "${section.DisplayName || section.Name}"?`,
        confirmLabel: "Delete",
        tone: "danger",
      });
      if (!ok) return;
      await api.deleteSection(section.SectionId);
      await loadSections(configId);
      dispatchWorkspace({ type: "TAB_SECTION", configId, sectionId: null });
    },
    [api, confirm, loadSections],
  );

  const handleSaveSection = useCallback(
    async (
      configId: number,
      section: ConfigSection,
      editedJson: string,
      editedBuildRules?: string,
      editedBuildTable?: string,
    ) => {
      if (!api) return;
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(editedJson);
      } catch {
        alert("Invalid JSON — please fix before saving");
        return;
      }
      let parsedRules: unknown = null;
      if (editedBuildRules && editedBuildRules.trim()) {
        try {
          parsedRules = JSON.parse(editedBuildRules);
        } catch {
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
      await loadSections(configId);
      dispatchWorkspace({ type: "TAB_DIRTY", configId, dirty: false });
    },
    [api, loadSections],
  );

  const handleToggleLock = useCallback(
    async (section: ConfigSection, configId: number) => {
      if (!api) return;
      await api.updateSection({
        SectionId: section.SectionId,
        Name: section.Name,
        DisplayName: section.DisplayName ?? null,
        Inherited: section.Inherited ?? null,
        JsonData: section.JsonData
          ? typeof section.JsonData === "string"
            ? JSON.parse(section.JsonData)
            : section.JsonData
          : {},
        Locked: !section.Locked,
      });
      await loadSections(configId);
    },
    [api, loadSections],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ position: "relative" }}>
      <Group orientation="horizontal" id="config-master-detail">
        <Panel
          defaultSize="280px"
          minSize="180px"
          maxSize="45%"
          groupResizeBehavior="preserve-pixel-size"
        >
          <AdapterTreeSidebar
            types={types}
            loading={loading}
            filter={filter}
            onFilterChange={setFilter}
            expandedTypes={expandedTypes}
            typeConfigs={typeConfigs}
            loadingConfigs={loadingConfigs}
            openTabIds={openTabIds}
            activeTabId={activeTabId}
            dirtyTabs={dirtyTabs}
            treeSelectedType={activeTab?.config.AdapterType}
            onRefresh={loadTypes}
            onAddType={() => setOverlay({ type: "upsertType", editing: null })}
            onEditType={(t) => setOverlay({ type: "upsertType", editing: t })}
            onDeleteType={handleDeleteType}
            onToggleType={toggleType}
            onAddConfig={(adapterType) =>
              setOverlay({ type: "upsertConfig", editing: null, adapterType })
            }
            onEditConfig={(c) =>
              setOverlay({ type: "upsertConfig", editing: c, adapterType: c.AdapterType })
            }
            onDeleteConfig={handleDeleteConfig}
            onOpenConfig={openConfig}
            onCloneConfig={handleClone}
            onSetDefault={handleSetDefault}
            onToggleEnabled={handleToggleEnabled}
          />
        </Panel>

        <ResizeHandle />

        <Panel minSize="30%">
          <div className="flex flex-col h-full" style={{ background: "#1e1e1e" }}>
            {openTabs.length === 0 ? (
              <Placeholder text="Click a configuration to open it" />
            ) : (
              <>
                <ConfigurationTabsBar
                  tabs={openTabs}
                  activeTabId={activeTabId}
                  dirtyTabs={dirtyTabs}
                  onSelect={handleTabBarSelect}
                  onClose={closeTab}
                />
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
                          selectedSectionId={
                            sectionSelection[tab.config.ConfigurationId] ?? null
                          }
                          isActive={isActive}
                          sections={
                            configSections[tab.config.ConfigurationId] ?? EMPTY_CONFIG_SECTIONS
                          }
                          isLoadingSections={loadingSections.has(tab.config.ConfigurationId)}
                          onSelectSection={handleWorkspaceSection}
                          onAddSection={handleTabAddSection}
                          onSaveSection={handleSaveSection}
                          onDeleteSection={handleDeleteSection}
                          onToggleLock={handleToggleLock}
                          onDirtyChange={handleWorkspaceDirty}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Panel>
      </Group>

      {overlay.type === "upsertType" && (
        <UpsertTypeOverlay
          editing={overlay.editing}
          api={api}
          onClose={() => {
            setOverlay({ type: "none" });
            loadTypes();
          }}
        />
      )}
      {overlay.type === "upsertConfig" && (
        <UpsertConfigOverlay
          editing={overlay.editing}
          adapterType={overlay.adapterType}
          api={api}
          onClose={() => {
            setOverlay({ type: "none" });
            loadConfigs(overlay.adapterType);
          }}
        />
      )}
      {overlay.type === "createSection" && (
        <CreateSectionOverlay
          configId={overlay.configId}
          api={api}
          onClose={() => {
            setOverlay({ type: "none" });
            loadSections(overlay.configId);
          }}
        />
      )}
    </div>
  );
}
