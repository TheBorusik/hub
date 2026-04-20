import { useCallback, useMemo, useReducer, useState } from "react";
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
import { useAdapterConfigData } from "./lib/useAdapterConfigData";
import { useAdapterConfigActions } from "./lib/useAdapterConfigActions";

/** Стабильная ссылка для memo (`?? []` каждый раз новый массив). */
const EMPTY_CONFIG_SECTIONS: ConfigSection[] = [];

type Overlay =
  | { type: "none" }
  | { type: "upsertType"; editing: AdapterType | null }
  | { type: "upsertConfig"; editing: AdapterConfiguration | null; adapterType: string }
  | { type: "createSection"; configId: number };

/**
 * System → Configuration: дерево типов/конфигураций слева, справа — вкладки
 * открытых конфигураций и редактор секций. Состояние вкладок —
 * `configurationWorkspaceReducer`. Загрузка/CRUD — два кастомных хука:
 * `useAdapterConfigData` и `useAdapterConfigActions`.
 */
export function ConfigurationPanel() {
  const api = useContourApi();
  const confirm = useConfirm();

  const [workspace, dispatchWorkspace] = useReducer(
    configurationWorkspaceReducer,
    configurationWorkspaceInitialState,
  );
  const { openTabs, activeTabId, dirtyTabs, sectionSelection } = workspace;

  const data = useAdapterConfigData(api);
  const {
    types,
    loading,
    expandedTypes,
    typeConfigs,
    loadingConfigs,
    configSections,
    loadingSections,
    setExpandedTypes,
    loadTypes,
    loadConfigs,
    loadSections,
  } = data;

  const [filter, setFilter] = useState("");
  const [overlay, setOverlay] = useState<Overlay>({ type: "none" });

  const activeTab = openTabs.find((t) => t.config.ConfigurationId === activeTabId) ?? null;
  const openTabIds = useMemo(
    () => new Set(openTabs.map((t) => t.config.ConfigurationId)),
    [openTabs],
  );

  const actions = useAdapterConfigActions({
    api,
    confirm,
    loadTypes,
    loadConfigs,
    loadSections,
    onConfigDeleted: useCallback(
      (configId) => dispatchWorkspace({ type: "TAB_CLOSE", configId }),
      [],
    ),
    onSectionDeleted: useCallback(
      (configId) => dispatchWorkspace({ type: "TAB_SECTION", configId, sectionId: null }),
      [],
    ),
    onSectionSaved: useCallback(
      (configId) => dispatchWorkspace({ type: "TAB_DIRTY", configId, dirty: false }),
      [],
    ),
  });

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
            onDeleteType={actions.handleDeleteType}
            onToggleType={toggleType}
            onAddConfig={(adapterType) =>
              setOverlay({ type: "upsertConfig", editing: null, adapterType })
            }
            onEditConfig={(c) =>
              setOverlay({ type: "upsertConfig", editing: c, adapterType: c.AdapterType })
            }
            onDeleteConfig={actions.handleDeleteConfig}
            onOpenConfig={openConfig}
            onCloneConfig={actions.handleClone}
            onSetDefault={actions.handleSetDefault}
            onToggleEnabled={actions.handleToggleEnabled}
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
                          onSaveSection={actions.handleSaveSection}
                          onDeleteSection={actions.handleDeleteSection}
                          onToggleLock={actions.handleToggleLock}
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
