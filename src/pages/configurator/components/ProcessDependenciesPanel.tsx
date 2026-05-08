import { useState, useEffect, useCallback } from "react";
import type { HubWsApi } from "@/lib/ws-api";
import type {
  DependencyItem,
  WfmProcessAssemblyGetDependenciesResult,
  ProcessModel,
} from "@/lib/ws-api-models";
import { Network, Terminal, Zap, GitBranch, Search, ExternalLink } from "lucide-react";
import { t as tok } from "@/lib/design-tokens";

interface ProcessDependenciesPanelProps {
  api: HubWsApi;
  processName: string;
  onOpenProcess?: (typeName: string) => void;
}

const TYPE_MAP: Record<string, "crud" | "commands" | "events" | "subs"> = {
  CRUD: "crud",
  Commands: "commands",
  Events: "events",
  SubProcesses: "subs",
};

const SECTION_CONFIG: {
  key: keyof WfmProcessAssemblyGetDependenciesResult;
  label: string;
  icon: React.ReactNode;
  columns: string[];
  actionLabel?: string;
  nameField: "Model" | "CommandName" | "EventName" | "ProcessTypeName";
}[] = [
  {
    key: "CRUD",
    label: "CRUD Models",
    icon: <Network size={14} />,
    columns: ["Model", "Action", "Stage"],
    actionLabel: "Find Usages",
    nameField: "Model" as const,
  },
  {
    key: "Commands",
    label: "Commands",
    icon: <Terminal size={14} />,
    columns: ["Command", "Stage"],
    actionLabel: "Find Usages",
    nameField: "CommandName" as const,
  },
  {
    key: "Events",
    label: "Events",
    icon: <Zap size={14} />,
    columns: ["Event", "Stage"],
    actionLabel: "Find Usages",
    nameField: "EventName" as const,
  },
  {
    key: "SubProcesses",
    label: "Sub-Processes",
    icon: <GitBranch size={14} />,
    columns: ["Process", "Stage"],
    actionLabel: "Find Usages",
    nameField: "ProcessTypeName" as const,
  },
];

export function ProcessDependenciesPanel({ api, processName, onOpenProcess }: ProcessDependenciesPanelProps) {
  const [deps, setDeps] = useState<WfmProcessAssemblyGetDependenciesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<ProcessModel[] | null>(null);
  const [searchingFor, setSearchingFor] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getProcessDependencies({ Name: processName })
      .then((res) => {
        if (!cancelled) setDeps(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [api, processName]);

  const handleFindUsages = useCallback(
    async (type: "crud" | "commands" | "events" | "subs", name: string) => {
      setSearchLoading(true);
      setSearchingFor(name);
      try {
        const res = await api.searchProcessesByDependency({ DepType: type, DepName: name });
        setSearchResults(res.Processes ?? []);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [api],
  );

  const clearSearch = useCallback(() => {
    setSearchResults(null);
    setSearchingFor(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: tok.color.text.muted, fontSize: 13 }}>
        Loading dependencies…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "#f44336", fontSize: 13 }}>
        {error}
      </div>
    );
  }

  if (!deps) return null;

  const totalCount = deps.CRUD.length + deps.Commands.length + deps.Events.length + deps.SubProcesses.length;

  if (totalCount === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: tok.color.text.muted, fontSize: 13 }}>
        No dependencies found in this process.
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: tok.color.bg.panel }}>
      {/* Left: dependency list */}
      <div className="flex-1 overflow-auto" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: tok.color.text.primary }}>
          Dependencies of {processName}
        </h2>

        {SECTION_CONFIG.map((section) => {
          const items = deps[section.key] as DependencyItem[];
          if (items.length === 0) return null;

          return (
            <div key={section.key} style={{ marginBottom: 24 }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                {section.icon}
                <span style={{ fontSize: 13, fontWeight: 600, color: tok.color.text.primary }}>
                  {section.label}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: tok.color.text.muted,
                    background: tok.color.bg.sidebar,
                    padding: "1px 6px",
                    borderRadius: 10,
                  }}
                >
                  {items.length}
                </span>
              </div>

              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tok.color.border.default}` }}>
                    {section.columns.map((c) => (
                      <th key={c} style={{ textAlign: "left", padding: "6px 8px", color: tok.color.text.muted, fontWeight: 500 }}>
                        {c}
                      </th>
                    ))}
                    <th style={{ width: 100, padding: "6px 8px" }} />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const name = item[section.nameField];
                    if (!name) return null;
                    return (
                      <tr
                        key={`${name}-${item.StageName}-${idx}`}
                        style={{ borderBottom: `1px solid ${tok.color.border.subtle}` }}
                      >
                        <td style={{ padding: "6px 8px", color: tok.color.text.primary, fontWeight: 500 }}>
                          {name}
                        </td>
                        {section.key === "CRUD" && (
                          <td style={{ padding: "6px 8px", color: tok.color.text.muted }}>
                            {item.Action ?? "—"}
                          </td>
                        )}
                        <td style={{ padding: "6px 8px", color: tok.color.text.muted }}>
                          {item.StageName}
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <button
                            onClick={() => handleFindUsages(TYPE_MAP[section.key], name)}
                            className="flex items-center gap-1"
                            style={{
                              fontSize: 11,
                              color: tok.color.accent,
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                            }}
                            title={`Find usages of ${name}`}
                          >
                            <Search size={11} />
                            {section.actionLabel}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Right: find usages results */}
      {(searchResults !== null || searchLoading) && (
        <div
          style={{
            width: 320,
            borderLeft: `1px solid ${tok.color.border.default}`,
            background: tok.color.bg.sidebar,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{
              padding: "10px 12px",
              borderBottom: `1px solid ${tok.color.border.default}`,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: tok.color.text.primary }}>
              Find Usages: {searchingFor}
            </span>
            <button
              onClick={clearSearch}
              style={{
                fontSize: 11,
                color: tok.color.text.muted,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-auto" style={{ padding: 8 }}>
            {searchLoading ? (
              <div style={{ fontSize: 12, color: tok.color.text.muted, padding: 12 }}>Searching…</div>
            ) : searchResults && searchResults.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {searchResults.map((p) => (
                  <button
                    key={p.TypeName}
                    onClick={() => onOpenProcess?.(p.TypeName)}
                    className="flex items-center gap-2"
                    style={{
                      textAlign: "left",
                      padding: "6px 8px",
                      borderRadius: 4,
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      color: tok.color.text.primary,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = tok.color.bg.hover;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "none";
                    }}
                  >
                    <ExternalLink size={11} style={{ color: tok.color.text.muted, flexShrink: 0 }} />
                    <span className="truncate" style={{ flex: 1 }}>
                      {p.Name ?? p.TypeName}
                    </span>
                    {p.Draft && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "#ff9800",
                          background: "#fff3e0",
                          padding: "1px 4px",
                          borderRadius: 3,
                          flexShrink: 0,
                        }}
                      >
                        draft
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: tok.color.text.muted, padding: 12 }}>
                No processes found using <strong>{searchingFor}</strong>.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
