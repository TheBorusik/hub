import { useCallback, useEffect, useState } from "react";
import type { HubWsApi } from "@/lib/ws-api";
import type { AdapterConfiguration, AdapterType, ConfigSection } from "../../../types";

type WsApi = HubWsApi | null;

export interface AdapterConfigData {
  types: AdapterType[];
  loading: boolean;
  expandedTypes: Set<string>;
  typeConfigs: Record<string, AdapterConfiguration[]>;
  loadingConfigs: Set<string>;
  configSections: Record<string, ConfigSection[]>;
  loadingSections: Set<string>;
  setExpandedTypes: React.Dispatch<React.SetStateAction<Set<string>>>;
  loadTypes: () => Promise<void>;
  loadConfigs: (adapterType: string) => Promise<void>;
  loadSections: (configId: string) => Promise<void>;
}

/**
 * Загрузка данных дерева типов / конфигураций / секций из адаптерного API
 * с кэшем в локальном state. Lazy-загрузка: configs подгружаются при
 * раскрытии типа, sections — при открытии вкладки.
 */
export function useAdapterConfigData(api: WsApi): AdapterConfigData {
  const [types, setTypes] = useState<AdapterType[]>([]);
  const [loading, setLoading] = useState(false);

  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [typeConfigs, setTypeConfigs] = useState<Record<string, AdapterConfiguration[]>>({});
  const [loadingConfigs, setLoadingConfigs] = useState<Set<string>>(new Set());

  const [configSections, setConfigSections] = useState<Record<string, ConfigSection[]>>({});
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set());

  const loadTypes = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.getAdapterTypes({});
      setTypes(Array.isArray(res.AdapterTypes) ? res.AdapterTypes : []);
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
      const res = await api.getAdapterConfigurations({ AdapterType: adapterType });
      const list = res.Configurations;
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

  const loadSections = useCallback(async (configId: string) => {
    if (!api) return;
    setLoadingSections((p) => new Set(p).add(configId));
    try {
      const res = await api.getSections({ ConfigurationId: configId });
      const list = res.ConfigurationSections;
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

  return {
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
  };
}
