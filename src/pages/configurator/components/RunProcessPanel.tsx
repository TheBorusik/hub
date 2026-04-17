import { useState, useCallback } from "react";
import { Play, Loader2, Trash2, ExternalLink } from "lucide-react";
import { Group, Panel } from "react-resizable-panels";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";
import type { HubWsApi } from "@/lib/ws-api";
import { useNavigation } from "@/providers/NavigationProvider";
import type { ViewerTab } from "@/pages/viewer/types";

interface RunEntry {
  id: number;
  timestamp: string;
  result: unknown;
  error?: string;
  elapsed: number;
  /** `ProcessId` из `CommandResult` — для навигации в Viewer. */
  processId?: number;
  /** Какой список в Viewer открыть — completed / manual. */
  viewerTab?: ViewerTab;
}

interface RunProcessPanelProps {
  api: HubWsApi;
  processName: string;
}

/**
 * Вытащить `ProcessId` из ответа `WFM.Execute`.
 *
 * Канонический путь — `Payload.CommandResultContext.ContextInfo.ProcessId`
 * (SAL кладёт туда id процесса, сам `CommandResult` содержит только
 * доменный `Result`). Дополнительно смотрим в плоские варианты на случай
 * других обёрток (`ProcessId` прямо на корне или внутри `CommandResult`).
 */
function extractProcessId(payload: Record<string, unknown> | null | undefined): number | undefined {
  if (!payload) return undefined;
  const toNum = (v: unknown): number | undefined => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v && !Number.isNaN(Number(v))) return Number(v);
    return undefined;
  };

  const ctx = payload.CommandResultContext as Record<string, unknown> | undefined;
  const info = ctx?.ContextInfo as Record<string, unknown> | undefined;
  return toNum(info?.ProcessId)
    ?? toNum(payload.ProcessId)
    ?? toNum((payload.CommandResult as Record<string, unknown> | undefined)?.ProcessId);
}

let runCounter = 0;

export function RunProcessPanel({ api, processName }: RunProcessPanelProps) {
  const { navigateTo } = useNavigation();
  const [initData, setInitData] = useState("{}");
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<RunEntry[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunEntry | null>(null);

  const handleRun = useCallback(async () => {
    setRunning(true);
    const start = Date.now();
    try {
      let parsed: unknown = {};
      try { parsed = JSON.parse(initData); } catch { /* use empty */ }
      const raw = await api.executeProcess(processName, parsed);
      const wrapper = raw as Record<string, unknown> | null;
      const commandResult = (wrapper?.CommandResult ?? wrapper) as Record<string, unknown> | null;
      const processResult = commandResult?.ProcessResult ?? commandResult?.Result ?? commandResult;
      const errorField = (commandResult?.Error ?? commandResult?.ErrorMessage) as unknown;
      const isErr = commandResult?.ResultCode && commandResult.ResultCode !== "Ok" && commandResult.ResultCode !== "Success";
      const processId = extractProcessId(wrapper);
      // Куда открывать результат в Viewer:
      //   - `Error.Code === "PROCESS_MANUAL_CONTROL"` → процесс встал в
      //     manualcontrol, ищем в «Manual»;
      //   - иначе, если есть `ManualControlCause` прямо в CommandResult /
      //     ContextInfo — тоже «Manual»;
      //   - в остальных случаях — «Completed» (в т.ч. для других ошибок:
      //     провалившийся процесс всё равно сохранён в Completed).
      const ctxInfo = (wrapper?.CommandResultContext as Record<string, unknown> | undefined)
        ?.ContextInfo as Record<string, unknown> | undefined;
      const errObj = commandResult?.Error as Record<string, unknown> | null | undefined;
      const isManualByCode = errObj && typeof errObj.Code === "string"
        && errObj.Code === "PROCESS_MANUAL_CONTROL";
      const manualField = (commandResult && "ManualControlCause" in commandResult ? commandResult.ManualControlCause : null)
        ?? (ctxInfo && "ManualControlCause" in ctxInfo ? ctxInfo.ManualControlCause : null);
      const viewerTab: ViewerTab = (isManualByCode || manualField != null) ? "manual" : "completed";
      const entry: RunEntry = {
        id: ++runCounter,
        timestamp: new Date().toLocaleTimeString(),
        result: processResult ?? wrapper,
        error: isErr && errorField ? (typeof errorField === "string" ? errorField : JSON.stringify(errorField)) : undefined,
        elapsed: Date.now() - start,
        processId,
        viewerTab,
      };
      setHistory((prev) => [entry, ...prev]);
      setSelectedRun(entry);
    } catch (e) {
      const entry: RunEntry = {
        id: ++runCounter,
        timestamp: new Date().toLocaleTimeString(),
        result: null,
        error: String(e),
        elapsed: Date.now() - start,
      };
      setHistory((prev) => [entry, ...prev]);
      setSelectedRun(entry);
    } finally {
      setRunning(false);
    }
  }, [api, processName, initData]);

  const openInViewer = useCallback((run: RunEntry) => {
    if (!run.processId) return;
    navigateTo("viewer", {
      kind: "openProcessInViewer",
      processId: run.processId,
      name: processName,
      tab: run.viewerTab ?? "completed",
    });
  }, [navigateTo, processName]);

  const clearHistory = () => { setHistory([]); setSelectedRun(null); };

  const resultText = selectedRun
    ? selectedRun.error
      ? `Error: ${selectedRun.error}`
      : JSON.stringify(selectedRun.result, null, 2)
    : "";

  return (
    <Group orientation="vertical" id="run-process">
      <Panel defaultSize="40%" minSize="20%">
        <div className="flex flex-col h-full">
          <div
            className="flex items-center gap-2 shrink-0"
            style={{
              padding: "6px 12px",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-sidebar)",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
              Run: {processName}
            </span>
            <div style={{ flex: 1 }} />
            <button
              className="toolbar-btn"
              style={{
                padding: "3px 10px",
                background: running ? undefined : "#0e639c",
                color: running ? undefined : "#fff",
                borderRadius: 3,
              }}
              onClick={handleRun}
              disabled={running}
            >
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              <span style={{ marginLeft: 4, fontSize: 12 }}>{running ? "Running..." : "Run"}</span>
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <JsonEditor
              value={initData}
              onChange={setInitData}
              label="InitialData"
            />
          </div>
        </div>
      </Panel>
      <ResizeHandle direction="vertical" />
      <Panel minSize="20%">
        <div className="flex flex-col h-full">
          <div
            className="flex items-center gap-2 shrink-0"
            style={{
              padding: "4px 12px",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-sidebar)",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
              Result
            </span>
            {selectedRun && (
              <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
                {selectedRun.timestamp} • {selectedRun.elapsed}ms
                {selectedRun.processId ? ` • #${selectedRun.processId}` : ""}
              </span>
            )}
            <div style={{ flex: 1 }} />
            {selectedRun?.processId && (
              <button
                className="toolbar-btn"
                title="Open this process in Viewer"
                onClick={() => openInViewer(selectedRun)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", fontSize: 11,
                  border: "1px solid var(--color-border)", borderRadius: 3,
                  color: "var(--color-accent)",
                }}
              >
                <ExternalLink size={12} />
                Open in Viewer
              </button>
            )}
            {history.length > 0 && (
              <>
                <select
                  style={{
                    fontSize: 11,
                    background: "var(--color-surface-400)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 3,
                    color: "var(--color-text-primary)",
                    padding: "2px 4px",
                  }}
                  value={selectedRun?.id ?? ""}
                  onChange={(e) => {
                    const run = history.find((r) => r.id === Number(e.target.value));
                    if (run) setSelectedRun(run);
                  }}
                >
                  {history.map((r) => (
                    <option key={r.id} value={r.id}>
                      #{r.id} {r.timestamp} {r.error ? "ERR" : "OK"} ({r.elapsed}ms)
                    </option>
                  ))}
                </select>
                <button className="toolbar-btn" title="Clear history" onClick={clearHistory}>
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <JsonEditor
              value={resultText}
              readOnly
              label=""
            />
          </div>
        </div>
      </Panel>
    </Group>
  );
}
