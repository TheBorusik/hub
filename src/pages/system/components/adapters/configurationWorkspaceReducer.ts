import type { AdapterConfiguration } from "../../types";
import type { OpenTab } from "./ConfigTabContent";

/**
 * Состояние «рабочей области» Configuration: открытые конфигурации, активная вкладка,
 * dirty-флаги, выбранная секция по id конфигурации (отдельно от вкладок — чтобы смена
 * секции не пересоздавала массив `openTabs` и не трогала остальные вкладки).
 */
export interface ConfigurationWorkspaceState {
  openTabs: OpenTab[];
  activeTabId: number | null;
  dirtyTabs: Set<number>;
  /** Выбранная секция для каждого открытого configId; отсутствие ключа трактуем как null. */
  sectionSelection: Record<number, number | null>;
}

export const configurationWorkspaceInitialState: ConfigurationWorkspaceState = {
  openTabs: [],
  activeTabId: null,
  dirtyTabs: new Set(),
  sectionSelection: {},
};

export type ConfigurationWorkspaceAction =
  | { type: "TAB_OPEN_OR_FOCUS"; config: AdapterConfiguration }
  | { type: "TAB_CLOSE"; configId: number }
  | { type: "TAB_SELECT"; configId: number }
  | { type: "TAB_SECTION"; configId: number; sectionId: number | null }
  | { type: "TAB_DIRTY"; configId: number; dirty: boolean };

export function configurationWorkspaceReducer(
  state: ConfigurationWorkspaceState,
  action: ConfigurationWorkspaceAction,
): ConfigurationWorkspaceState {
  switch (action.type) {
    case "TAB_OPEN_OR_FOCUS": {
      const { config } = action;
      const id = config.ConfigurationId;
      const exists = state.openTabs.some((t) => t.config.ConfigurationId === id);
      if (exists) {
        return { ...state, activeTabId: id };
      }
      return {
        ...state,
        openTabs: [...state.openTabs, { config }],
        activeTabId: id,
      };
    }
    case "TAB_CLOSE": {
      const { configId } = action;
      const idx = state.openTabs.findIndex((t) => t.config.ConfigurationId === configId);
      if (idx < 0) return state;
      const openTabs = state.openTabs.filter((t) => t.config.ConfigurationId !== configId);
      let activeTabId = state.activeTabId;
      if (state.activeTabId === configId) {
        activeTabId =
          openTabs.length === 0
            ? null
            : openTabs[Math.min(idx, openTabs.length - 1)]?.config.ConfigurationId ?? null;
      }
      const dirtyTabs = new Set(state.dirtyTabs);
      dirtyTabs.delete(configId);
      const sectionSelection = { ...state.sectionSelection };
      delete sectionSelection[configId];
      return { ...state, openTabs, activeTabId, dirtyTabs, sectionSelection };
    }
    case "TAB_SELECT": {
      const { configId } = action;
      if (!state.openTabs.some((t) => t.config.ConfigurationId === configId)) return state;
      return { ...state, activeTabId: configId };
    }
    case "TAB_SECTION": {
      const { configId, sectionId } = action;
      return {
        ...state,
        sectionSelection: { ...state.sectionSelection, [configId]: sectionId },
      };
    }
    case "TAB_DIRTY": {
      const { configId, dirty } = action;
      const dirtyTabs = new Set(state.dirtyTabs);
      if (dirty) dirtyTabs.add(configId);
      else dirtyTabs.delete(configId);
      return { ...state, dirtyTabs };
    }
    default:
      return state;
  }
}
