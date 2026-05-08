import { useState, useCallback, useEffect } from "react";
import type { HubWsApi } from "@/lib/ws-api";
import type { ProcessModel, CRUDModelInfo, AdapterCommandInfo } from "@/lib/ws-api-models";
import { Network, Terminal, Zap, GitBranch, ExternalLink, Search } from "lucide-react";
import { t as tok } from "@/lib/design-tokens";
import { AutocompleteInput } from "./AutocompleteInput";

interface GlobalDependencySearchPanelProps {
  api: HubWsApi;
  crudModels: CRUDModelInfo[];
  commands: AdapterCommandInfo[];
  allModels: ProcessModel[];
  onOpenProcess: (name: string) => void;
  /** Внешний триггер поиска (например, из Context Menu). */
  trigger?: { depType: "crud" | "commands" | "events" | "subs"; depName: string } | null;
}

const DEP_TYPES: {
  id: "crud" | "commands" | "events" | "subs";
  label: string;
  icon: React.ReactNode;
  inputLabel: string;
  placeholder: string;
}[] = [
  { id: "crud", label: "CRUD Model", icon: <Network size={13} />, inputLabel: "CRUD Model", placeholder: "Search CRUD model…" },
  { id: "commands", label: "Command", icon: <Terminal size={13} />, inputLabel: "Command Name", placeholder: "Search command…" },
  { id: "events", label: "Event", icon: <Zap size={13} />, inputLabel: "Event Name", placeholder: "Type event name…" },
  { id: "subs", label: "Sub-Process", icon: <GitBranch size={13} />, inputLabel: "Sub-Process", placeholder: "Search process…" },
];

export function GlobalDependencySearchPanel({
  api,
  crudModels,
  commands,
  allModels,
  onOpenProcess,
  trigger,
}: GlobalDependencySearchPanelProps) {
  const [depType, setDepType] = useState<"crud" | "commands" | "events" | "subs">("crud");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProcessModel[] | null>(null);
  const [loading, setLoading] = useState(false);

  const currentConfig = DEP_TYPES.find((t) => t.id === depType)!;

  const options =
    depType === "crud"
      ? crudModels.map((m) => m.Model).filter((v, i, a) => v && a.indexOf(v) === i)
      : depType === "commands"
        ? commands.map((c) => c.Name).filter((v, i, a) => v && a.indexOf(v) === i)
        : depType === "subs"
          ? allModels.map((m) => m.Name ?? m.TypeName).filter((v, i, a) => v && a.indexOf(v) === i)
          : [];

  const doSearch = useCallback(
    async (type: "crud" | "commands" | "events" | "subs", name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setLoading(true);
      try {
        const res = await api.searchProcessesByDependency({ DepType: type, DepName: trimmed });
        setResults(res.Processes ?? []);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  // Внешний триггер (Context Menu / Command Palette)
  useEffect(() => {
    if (!trigger) return;
    setDepType(trigger.depType);
    setQuery(trigger.depName);
    doSearch(trigger.depType, trigger.depName);
  }, [trigger, doSearch]);

  const handleSearchClick = useCallback(() => {
    doSearch(depType, query);
  }, [doSearch, depType, query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearchClick();
      }
    },
    [handleSearchClick],
  );

  return (
    <div className="flex flex-col h-full" style={{ background: tok.color.bg.sidebar }}>
      {/* Type selector */}
      <div className="flex flex-wrap gap-1" style={{ padding: "8px 10px", borderBottom: `1px solid ${tok.color.border.default}` }}>
        {DEP_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => { setDepType(t.id); setResults(null); setQuery(""); }}
            className="flex items-center gap-1"
            style={{
              padding: "3px 8px",
              borderRadius: 4,
              border: "none",
              fontSize: 11,
              cursor: "pointer",
              background: depType === t.id ? tok.color.bg.selected : "transparent",
              color: depType === t.id ? tok.color.text.active : tok.color.text.muted,
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Search input + button */}
      <div style={{ padding: "10px 10px", borderBottom: `1px solid ${tok.color.border.default}` }}>
        <AutocompleteInput
          label={currentConfig.inputLabel}
          value={query}
          onChange={setQuery}
          options={options}
          placeholder={currentConfig.placeholder}
        />
        <button
          onClick={handleSearchClick}
          disabled={!query.trim() || loading}
          className="flex items-center justify-center gap-1 w-full"
          onKeyDown={handleKeyDown}
          style={{
            marginTop: 8,
            padding: "5px 10px",
            borderRadius: 4,
            border: "none",
            fontSize: 12,
            fontWeight: 600,
            cursor: query.trim() && !loading ? "pointer" : "not-allowed",
            background: query.trim() && !loading ? tok.color.accent : tok.color.bg.panel,
            color: query.trim() && !loading ? "#fff" : tok.color.text.muted,
          }}
        >
          <Search size={12} />
          Search
        </button>
        {loading && (
          <div style={{ fontSize: 11, color: tok.color.text.muted, marginTop: 6 }}>
            Searching…
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto" style={{ padding: "6px 8px" }}>
        {results === null ? (
          <div style={{ fontSize: 11, color: tok.color.text.muted, padding: 12, textAlign: "center" }}>
            Select a dependency type, enter a name, and click Search to find usages across all processes.
          </div>
        ) : results.length === 0 ? (
          <div style={{ fontSize: 11, color: tok.color.text.muted, padding: 12, textAlign: "center" }}>
            No processes found.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 10, color: tok.color.text.muted, padding: "2px 4px" }}>
              {results.length} process{results.length === 1 ? "" : "es"} found
            </div>
            {results.map((p) => (
              <button
                key={p.TypeName}
                onClick={() => onOpenProcess(p.TypeName)}
                className="flex items-center gap-2"
                style={{
                  textAlign: "left",
                  padding: "5px 6px",
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
        )}
      </div>
    </div>
  );
}
