import { useEffect, useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";
import { useContourApi } from "@/lib/ws-api";
import type { StageSubject, ViewerTab } from "../types";

const SUBJECTS: StageSubject[] = [
  "Context",
  "ContextDiff",
  "Session",
  "SessionDiff",
  "Result",
  "Command",
  "InitObject",
  "ManualControlCause",
  "Event",
];

const TAB_MAP: Record<ViewerTab, string> = {
  completed: "Completed",
  manual: "Manual",
  idle: "Idle",
};

interface StageContextPanelProps {
  processId: number;
  stageIndex: number;
  viewerTab: ViewerTab;
  activeSubject: StageSubject;
  onSubjectChange: (subject: StageSubject) => void;
}

export function StageContextPanel({
  processId,
  stageIndex,
  viewerTab,
  activeSubject,
  onSubjectChange,
}: StageContextPanelProps) {
  const api = useContourApi();
  const [data, setData] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const loadContext = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const result = await api.getStageContext(processId, stageIndex, activeSubject, TAB_MAP[viewerTab]);
      setData(result.Data != null ? JSON.stringify(result.Data, null, 2) : "null");
    } catch (err) {
      setData(`// Error loading context:\n// ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [api, processId, stageIndex, activeSubject, viewerTab]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Subject tabs */}
      <div
        className="flex items-center shrink-0 overflow-x-auto"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        {SUBJECTS.map((s) => (
          <button
            key={s}
            onClick={() => onSubjectChange(s)}
            className="cursor-pointer border-none shrink-0"
            style={{
              height: 26,
              padding: "0 8px",
              fontSize: 11,
              fontWeight: activeSubject === s ? 600 : 400,
              background: activeSubject === s ? "var(--color-tab-active)" : "transparent",
              color: activeSubject === s ? "var(--color-text-active)" : "var(--color-text-muted)",
              borderBottom: activeSubject === s ? "2px solid var(--color-focus-border)" : "2px solid transparent",
            }}
          >
            {s}
          </button>
        ))}
        {loading && (
          <Loader2 size={14} className="animate-spin" style={{ marginLeft: 6, color: "var(--color-accent)" }} />
        )}
      </div>

      {/* JSON viewer */}
      <div className="flex-1 min-h-0">
        <JsonEditor value={data} readOnly />
      </div>
    </div>
  );
}
