import { useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Info as InfoIcon, Filter, X } from "lucide-react";
import { t } from "@/lib/design-tokens";
import { Panel } from "@/components/ui/Panel";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { IconButton } from "@/components/ui/Button";
import { CountBadge } from "@/components/ui/CountBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProblems, type Problem, type ProblemSeverity } from "@/providers/ProblemsProvider";

const ICON: Record<ProblemSeverity, React.ReactElement> = {
  error: <AlertCircle size={12} color={t.color.danger} />,
  warning: <AlertTriangle size={12} color={t.color.warning} />,
  info: <InfoIcon size={12} color={t.color.info} />,
};

interface Filters {
  error: boolean;
  warning: boolean;
  info: boolean;
}

/**
 * Problems panel (skeleton) — читает problems из ProblemsProvider и рендерит
 * сгруппированный список «проблемных» мест. В Block A компонент готов, но
 * ещё не подключён в ChromeBottomBar — это делается в Block B вместе с
 * регистрацией источников (compile errors, runtime errors, validation).
 */
export function ProblemsPanel({ onClose }: { onClose?: () => void } = {}) {
  const { problems } = useProblems();
  const [filters, setFilters] = useState<Filters>({ error: true, warning: true, info: true });

  const filtered = useMemo(
    () => problems.filter((p) => filters[p.severity]),
    [problems, filters],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, Problem[]>();
    for (const p of filtered) {
      const key = p.resource ?? "(no resource)";
      const arr = groups.get(key) ?? [];
      arr.push(p);
      groups.set(key, arr);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const errorCount = problems.filter((p) => p.severity === "error").length;
  const warningCount = problems.filter((p) => p.severity === "warning").length;
  const infoCount = problems.filter((p) => p.severity === "info").length;

  return (
    <Panel
      header={
        <PanelHeader
          title="Problems"
          badge={<CountBadge value={filtered.length} tone="muted" />}
          actions={
            onClose && (
              <IconButton icon={<X size={12} />} label="Close Problems" onClick={onClose} size="xs" />
            )
          }
        />
      }
      toolbar={
        <PanelToolbar
          dense
          left={
            <span style={{ display: "inline-flex", alignItems: "center", gap: t.space[2] }}>
              <Filter size={11} color={t.color.text.muted} />
              <FilterChip
                label="Errors"
                count={errorCount}
                active={filters.error}
                tone="danger"
                onToggle={() => setFilters((f) => ({ ...f, error: !f.error }))}
              />
              <FilterChip
                label="Warnings"
                count={warningCount}
                active={filters.warning}
                tone="warning"
                onToggle={() => setFilters((f) => ({ ...f, warning: !f.warning }))}
              />
              <FilterChip
                label="Info"
                count={infoCount}
                active={filters.info}
                tone="info"
                onToggle={() => setFilters((f) => ({ ...f, info: !f.info }))}
              />
            </span>
          }
        />
      }
    >
      {filtered.length === 0 ? (
        <EmptyState title="No problems" hint="All clear ✓" dense />
      ) : (
        <div>
          {grouped.map(([resource, list]) => (
            <div key={resource}>
              <div
                style={{
                  padding: `${t.space[2]} ${t.space[4]}`,
                  background: t.color.bg.sidebar,
                  color: t.color.text.muted,
                  fontSize: t.font.size.xs,
                  borderBottom: `1px solid ${t.color.border.default}`,
                }}
              >
                {resource}
                <span style={{ marginLeft: t.space[2] }}>
                  <CountBadge value={list.length} />
                </span>
              </div>
              {list.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => p.onReveal?.()}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: t.space[3],
                    width: "100%",
                    padding: `${t.space[2]} ${t.space[5]}`,
                    background: "transparent",
                    border: "none",
                    color: t.color.text.primary,
                    textAlign: "left",
                    cursor: p.onReveal ? "pointer" : "default",
                    fontSize: t.font.size.xs,
                  }}
                >
                  <span style={{ display: "inline-flex", flexShrink: 0, marginTop: 2 }}>
                    {ICON[p.severity]}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {p.message}
                    </span>
                    <span style={{ color: t.color.text.muted, display: "block", marginTop: 1 }}>
                      {p.source}
                      {p.line != null && `, line ${p.line}`}
                      {p.column != null && `:${p.column}`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

interface FilterChipProps {
  label: string;
  count: number;
  active: boolean;
  tone: "danger" | "warning" | "info";
  onToggle: () => void;
}

function FilterChip({ label, count, active, tone, onToggle }: FilterChipProps) {
  const bg =
    tone === "danger"
      ? t.color.bg.dangerSoft
      : tone === "warning"
        ? t.color.bg.warningSoft
        : t.color.bg.infoSoft;
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: t.space[1],
        padding: "2px 6px",
        borderRadius: t.radius.sm,
        border: `1px solid ${active ? t.color.border.default : "transparent"}`,
        background: active ? bg : "transparent",
        color: active ? t.color.text.primary : t.color.text.muted,
        fontSize: t.font.size.xs,
        cursor: "pointer",
        opacity: active ? 1 : 0.7,
      }}
    >
      <span>{label}</span>
      <CountBadge value={count} tone={active ? tone : "muted"} hideZero={false} />
    </button>
  );
}
