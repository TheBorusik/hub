import { useState, useMemo, useCallback, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import type { CrudModel } from "../types";

interface ModelListPanelProps {
  onSelectModel: (model: CrudModel) => void;
  selectedModelName: string | null;
}

export function ModelListPanel({ onSelectModel, selectedModelName }: ModelListPanelProps) {
  const api = useContourApi();
  const [models, setModels] = useState<CrudModel[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const loadModels = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.getCrudModels();
      const list = (res.Models ?? []) as CrudModel[];
      list.sort((a, b) => a.Name.localeCompare(b.Name));
      setModels(list);
    } catch (err) {
      console.error("Failed to load CRUD models:", err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const filtered = useMemo(() => {
    if (!filter || filter.length < 2) return models;
    const lf = filter.toLowerCase();
    return models.filter((m) => m.Name.toLowerCase().includes(lf));
  }, [models, filter]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex items-center shrink-0 border-b border-border"
        style={{ padding: "6px 8px", gap: 6 }}
      >
        <input
          type="text"
          placeholder="Filter models..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1"
          style={{ fontSize: 12 }}
        />
        <button
          onClick={loadModels}
          disabled={loading}
          className="toolbar-btn shrink-0"
          title="Reload models"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ paddingTop: 2 }}>
        {filtered.length === 0 && !loading && (
          <div style={{ padding: 12, fontSize: 13, color: "var(--color-text-muted)", textAlign: "center" }}>
            {models.length === 0 ? "No models loaded" : "No matches"}
          </div>
        )}
        {filtered.map((model) => {
          const isActive = model.Name === selectedModelName;
          return (
            <div
              key={model.Name}
              onClick={() => onSelectModel(model)}
              className="flex items-center cursor-pointer truncate"
              style={{
                height: 22,
                paddingLeft: 12,
                paddingRight: 8,
                fontSize: 13,
                background: isActive ? "rgba(0,122,204,0.2)" : "transparent",
                ...(isActive ? { outline: "1px solid var(--color-focus-border)" } : {}),
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? "rgba(0,122,204,0.2)" : "transparent"; }}
            >
              <span className="truncate">{model.Name}</span>
              <span style={{ marginLeft: "auto", paddingLeft: 8, fontSize: 11, color: "var(--color-text-muted)", opacity: 0.6, flexShrink: 0 }}>
                {model.ServiceType}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
