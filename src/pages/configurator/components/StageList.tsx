import type { ProcessStage } from "@/lib/ws-api-models";

const STAGE_TYPE_COLORS: Record<string, string> = {
  Start: "#5CADD5",
  CRUDDefinition: "seagreen",
  CommandDefinition: "#0FD334",
  TransformDefinition: "#0F8B8D",
  EventDefinition: "#FCA6ED",
  SubDefinition: "#0089ED",
  EndDefinition: "#F6511D",
};

function stageColor(type: string): string {
  return STAGE_TYPE_COLORS[type] ?? "#888";
}

function shortType(type: string): string {
  return type.replace("Definition", "");
}

interface StageListProps {
  stages: Record<string, ProcessStage>;
  selected: string | null;
  onSelect: (name: string) => void;
}

export function StageList({ stages, selected, onSelect }: StageListProps) {
  const entries = Object.entries(stages ?? {});

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--color-sidebar)" }}>
      <div
        className="shrink-0 select-none uppercase tracking-wider"
        style={{
          padding: "8px 12px",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--color-text-muted)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        Stages ({entries.length})
      </div>
      <div className="flex-1 overflow-auto">
        {entries.map(([name, stage]) => (
          <div
            key={name}
            className="flex items-center select-none ui-tree-row"
            data-selected={name === selected ? "true" : undefined}
            style={{
              padding: "4px 8px",
              cursor: "pointer",
              borderLeft: `3px solid ${stageColor(stage.Type)}`,
            }}
            onClick={() => onSelect(name)}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12,
                color: "var(--color-text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {name}
              </div>
              <div className="flex items-center gap-2" style={{ marginTop: 1 }}>
                <span style={{ fontSize: 10, color: stageColor(stage.Type), fontWeight: 600 }}>
                  {shortType(stage.Type)}
                </span>
                {stage.DisplayName && (
                  <span style={{ fontSize: 10, color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {stage.DisplayName}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
