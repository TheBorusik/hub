import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Search, Server, Settings, X } from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import type { AdapterConfiguration, AdapterType } from "../../types";

export interface PickedConfig {
  configurationId: number;
  name: string;
  adapterType: string;
}

export interface ConfigPickerProps {
  api: ReturnType<typeof useContourApi>;
  onPick: (c: PickedConfig | null) => void;
  picked: PickedConfig | null;
}

/**
 * Дерево «AdapterType → Configuration» с поиском — используется в
 * `UpsertConfigOverlay` для CLONE / INHERITED базы.
 *
 * Загрузка ленивая: список конфигов по типу подтягивается при раскрытии
 * (или если активен фильтр и есть совпадение с именем типа).
 */
export function ConfigPicker({ api, onPick, picked }: ConfigPickerProps) {
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
      } catch {
        if (!cancelled) setAdapterTypes([]);
      } finally {
        if (!cancelled) setLoadingTypes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const loadConfigsFor = async (at: string) => {
    if (!api) return;
    setLoadingConfigs((p) => new Set(p).add(at));
    try {
      const res = await api.getAdapterConfigurations(at);
      const list = (res as Record<string, unknown>).Configurations;
      setConfigsByType((prev) => ({
        ...prev,
        [at]: Array.isArray(list) ? (list as AdapterConfiguration[]) : [],
      }));
    } catch {
      setConfigsByType((prev) => ({ ...prev, [at]: [] }));
    } finally {
      setLoadingConfigs((p) => {
        const n = new Set(p);
        n.delete(at);
        return n;
      });
    }
  };

  const toggleType = (at: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(at)) {
        n.delete(at);
      } else {
        n.add(at);
        if (!configsByType[at]) loadConfigsFor(at);
      }
      return n;
    });
  };

  const lf = search.toLowerCase();
  const filtered = adapterTypes.filter((t) => {
    if (!lf) return true;
    if (t.AdapterType.toLowerCase().includes(lf)) return true;
    const cfgs = configsByType[t.AdapterType] ?? [];
    return cfgs.some(
      (c) => c.Name.toLowerCase().includes(lf) || String(c.ConfigurationId).includes(lf),
    );
  });

  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 4,
        background: "var(--color-input-bg)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "4px 6px", borderBottom: "1px solid var(--color-border)" }}>
        <div
          className="flex items-center gap-1"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 3,
            padding: "0 6px",
            height: 24,
          }}
        >
          <Search size={11} style={{ opacity: 0.4, flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search configurations..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              color: "var(--color-text)",
              fontSize: 11,
              outline: "none",
              height: "100%",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="toolbar-btn" style={{ padding: 0 }}>
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {loadingTypes && (
          <div style={{ padding: 8, fontSize: 11, color: "var(--color-text-muted)" }}>Loading...</div>
        )}
        {!loadingTypes && filtered.length === 0 && (
          <div style={{ padding: 8, fontSize: 11, color: "var(--color-text-muted)" }}>
            {search ? "No matches" : "No adapter types"}
          </div>
        )}
        {filtered.map((t) => {
          const isExp = expanded.has(t.AdapterType) || !!lf;
          const cfgs = configsByType[t.AdapterType] ?? [];
          const isLoadingCfg = loadingConfigs.has(t.AdapterType);
          const needsLoad = !configsByType[t.AdapterType] && !isLoadingCfg;

          if (lf && needsLoad) loadConfigsFor(t.AdapterType);

          const matchedCfgs = lf
            ? cfgs.filter(
                (c) =>
                  c.Name.toLowerCase().includes(lf) ||
                  String(c.ConfigurationId).includes(lf) ||
                  t.AdapterType.toLowerCase().includes(lf),
              )
            : cfgs;

          return (
            <div key={t.AdapterType}>
              <div
                className="flex items-center gap-1"
                onClick={() => toggleType(t.AdapterType)}
                style={{
                  height: 24,
                  padding: "0 6px",
                  cursor: "pointer",
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {isExp ? (
                  <ChevronDown size={12} style={{ opacity: 0.5 }} />
                ) : (
                  <ChevronRight size={12} style={{ opacity: 0.5 }} />
                )}
                <Server size={11} style={{ color: "#5CADD5", opacity: 0.7 }} />
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.AdapterType}
                </span>
                {cfgs.length > 0 && (
                  <span style={{ fontSize: 9, opacity: 0.5 }}>{cfgs.length}</span>
                )}
              </div>
              {isExp && (
                <>
                  {isLoadingCfg && cfgs.length === 0 && (
                    <div
                      style={{
                        padding: "2px 0 2px 32px",
                        fontSize: 10,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      Loading...
                    </div>
                  )}
                  {!isLoadingCfg && matchedCfgs.length === 0 && cfgs.length === 0 && (
                    <div
                      style={{
                        padding: "2px 0 2px 32px",
                        fontSize: 10,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      No configs
                    </div>
                  )}
                  {matchedCfgs.map((c) => {
                    const isPicked = picked?.configurationId === c.ConfigurationId;
                    return (
                      <div
                        key={c.ConfigurationId}
                        className="flex items-center gap-1"
                        onClick={() =>
                          onPick(
                            isPicked
                              ? null
                              : {
                                  configurationId: c.ConfigurationId,
                                  name: c.Name,
                                  adapterType: t.AdapterType,
                                },
                          )
                        }
                        style={{
                          height: 22,
                          padding: "0 8px 0 32px",
                          cursor: "pointer",
                          fontSize: 11,
                          color: isPicked ? "#fff" : "var(--color-text-muted)",
                          backgroundColor: isPicked ? "rgba(14,99,156,0.5)" : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isPicked)
                            e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isPicked) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <Settings
                          size={10}
                          style={{
                            opacity: 0.6,
                            flexShrink: 0,
                            color: c.Enabled ? "#4CAF50" : "#9E9E9E",
                          }}
                        />
                        <span
                          style={{
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.Name}
                        </span>
                        <span style={{ fontSize: 9, opacity: 0.5, flexShrink: 0 }}>
                          ID: {c.ConfigurationId}
                        </span>
                        {isPicked && (
                          <span
                            style={{ fontSize: 9, color: "#4CAF50", flexShrink: 0, marginLeft: 4 }}
                          >
                            &#10003;
                          </span>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>

      {picked && (
        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            padding: "4px 8px",
            fontSize: 11,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <span style={{ color: "var(--color-text-muted)" }}>Selected:</span>
          <span style={{ color: "var(--color-text)", fontWeight: 500 }}>{picked.name}</span>
          <span style={{ color: "var(--color-text-muted)", fontSize: 9 }}>
            ({picked.adapterType}, ID: {picked.configurationId})
          </span>
          <button
            onClick={() => onPick(null)}
            className="toolbar-btn"
            style={{ marginLeft: "auto", padding: 0 }}
          >
            <X size={10} />
          </button>
        </div>
      )}
    </div>
  );
}
