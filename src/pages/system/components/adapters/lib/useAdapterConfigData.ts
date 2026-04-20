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
  configSections: Record<number, ConfigSection[]>;
  loadingSections: Set<number>;
  setExpandedTypes: React.Dispatch<React.SetStateAction<Set<string>>>;
  loadTypes: () => Promise<void>;
  loadConfigs: (adapterType: string) => Promise<void>;
  loadSections: (configId: number) => Promise<void>;
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

  const [configSections, setConfigSections] = useState<Record<number, ConfigSection[]>>({});
  const [loadingSections, setLoadingSections] = useState<Set<number>>(new Set());

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
