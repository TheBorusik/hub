import { useCallback } from "react";
import type { HubWsApi } from "@/lib/ws-api";
import type { ObserverConfigBuildRuleDto } from "@/lib/ws-api-models";
import type { ConfirmFn } from "@/components/ui/ConfirmDialog";
import type { AdapterConfiguration, AdapterType, ConfigSection } from "../../../types";

type WsApi = HubWsApi | null;

interface UseAdapterConfigActionsArgs {
  api: WsApi;
  confirm: ConfirmFn;
  loadTypes: () => Promise<void>;
  loadConfigs: (adapterType: string) => Promise<void>;
  loadSections: (configId: string) => Promise<void>;
  /** Закрывает таб удалённой конфигурации в воркспейсе. */
  onConfigDeleted: (configId: string) => void;
  /** Сбрасывает выделенную секцию во вкладке. */
  onSectionDeleted: (configId: string) => void;
  /** Сбрасывает dirty-флаг вкладки после сохранения. */
  onSectionSaved: (configId: string) => void;
}

export interface AdapterConfigActions {
  handleDeleteType: (t: AdapterType) => Promise<void>;
  handleDeleteConfig: (c: AdapterConfiguration) => Promise<void>;
  handleSetDefault: (c: AdapterConfiguration) => Promise<void>;
  handleToggleEnabled: (c: AdapterConfiguration) => Promise<void>;
  handleClone: (c: AdapterConfiguration) => Promise<void>;
  handleDeleteSection: (section: ConfigSection, configId: string) => Promise<void>;
  handleSaveSection: (
    configId: string,
    section: ConfigSection,
    editedJson: string,
    editedBuildRules?: string,
    editedBuildTable?: string,
  ) => Promise<void>;
  handleToggleLock: (section: ConfigSection, configId: string) => Promise<void>;
}

/**
 * CRUD-обёртки над adapter API: confirm + вызов + reload + воркспейс-side-effects.
 * Отделено от `ConfigurationPanel` чтобы не раздувать оркестратор.
 */
export function useAdapterConfigActions({
  api,
  confirm,
  loadTypes,
  loadConfigs,
  loadSections,
  onConfigDeleted,
  onSectionDeleted,
  onSectionSaved,
}: UseAdapterConfigActionsArgs): AdapterConfigActions {
  const handleDeleteType = useCallback(async (t: AdapterType) => {
    if (!api) return;
    const ok = await confirm({
      title: "Delete Adapter Type",
      message: `Delete adapter type "${t.AdapterType}"?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    await api.deleteAdapterType({ AdapterType: t.AdapterType });
    loadTypes();
  }, [api, confirm, loadTypes]);

  const handleDeleteConfig = useCallback(async (c: AdapterConfiguration) => {
    if (!api) return;
    const ok = await confirm({
      title: "Delete Configuration",
      message: `Delete configuration "${c.Name}"?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    await api.deleteAdapterConfiguration({ ConfigurationId: c.ConfigurationId });
    onConfigDeleted(c.ConfigurationId);
    loadConfigs(c.AdapterType);
  }, [api, confirm, loadConfigs, onConfigDeleted]);

  const handleSetDefault = useCallback(async (c: AdapterConfiguration) => {
    if (!api) return;
    await api.setDefaultConfiguration({ ConfigurationId: c.ConfigurationId });
    loadConfigs(c.AdapterType);
  }, [api, loadConfigs]);

  const handleToggleEnabled = useCallback(async (c: AdapterConfiguration) => {
    if (!api) return;
    await api.updateAdapterConfiguration({
      ConfigurationId: c.ConfigurationId,
      AdapterType: c.AdapterType,
      Name: c.Name,
      Description: c.Description,
      Enabled: !c.Enabled,
      Exported: c.Exported,
      IsDefault: c.IsDefault,
    });
    loadConfigs(c.AdapterType);
  }, [api, loadConfigs]);

  const handleClone = useCallback(async (c: AdapterConfiguration) => {
    if (!api) return;
    await api.cloneConfiguration({
      CloningConfigurationId: c.ConfigurationId,
      AdapterType: c.AdapterType,
      Name: `${c.Name}_clone`,
      Description: c.Description,
      Enabled: c.Enabled,
    });
    loadConfigs(c.AdapterType);
  }, [api, loadConfigs]);

  const handleDeleteSection = useCallback(
    async (section: ConfigSection, configId: string) => {
      if (!api) return;
      const ok = await confirm({
        title: "Delete Section",
        message: `Delete section "${section.DisplayName || section.Name}"?`,
        confirmLabel: "Delete",
        tone: "danger",
      });
      if (!ok) return;
      await api.deleteSection({ SectionId: section.SectionId });
      await loadSections(configId);
      onSectionDeleted(configId);
    },
    [api, confirm, loadSections, onSectionDeleted],
  );

  const handleSaveSection = useCallback(
    async (
      configId: string,
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
        DisplayName: section.DisplayName,
        Inherited: section.Inherited,
        JsonData: parsedJson,
        BuildRules: (parsedRules ?? undefined) as ObserverConfigBuildRuleDto | undefined,
        BuildTable: editedBuildTable?.trim() || undefined,
        Locked: section.Locked ?? false,
        LastModifyTimeStamp: section.ModifyTimeStamp ?? null,
      });
      await loadSections(configId);
      onSectionSaved(configId);
    },
    [api, loadSections, onSectionSaved],
  );

  const handleToggleLock = useCallback(
    async (section: ConfigSection, configId: string) => {
      if (!api) return;
      let rules: ObserverConfigBuildRuleDto | undefined;
      if (section.BuildRules) {
        rules =
          typeof section.BuildRules === "string"
            ? (JSON.parse(section.BuildRules) as ObserverConfigBuildRuleDto)
            : (section.BuildRules as ObserverConfigBuildRuleDto);
      }
      await api.updateSection({
        SectionId: section.SectionId,
        Name: section.Name,
        DisplayName: section.DisplayName,
        Inherited: section.Inherited,
        JsonData: section.JsonData
          ? typeof section.JsonData === "string"
            ? JSON.parse(section.JsonData as string)
            : section.JsonData
          : {},
        BuildRules: rules,
        BuildTable: typeof section.BuildTable === "string" ? section.BuildTable : undefined,
        Locked: !section.Locked,
        LastModifyTimeStamp: section.ModifyTimeStamp ?? null,
      });
      await loadSections(configId);
    },
    [api, loadSections],
  );

  return {
    handleDeleteType,
    handleDeleteConfig,
    handleSetDefault,
    handleToggleEnabled,
    handleClone,
    handleDeleteSection,
    handleSaveSection,
    handleToggleLock,
  };
}
