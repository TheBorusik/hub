import { useState, useCallback, useRef } from "react";
import { Group, Panel, usePanelRef } from "react-resizable-panels";
import {
  Play,
  Square,
  Save,
  Plus,
  List,
  X,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { AdapterPanel } from "./components/AdapterPanel";
import { JsonEditor } from "./components/JsonEditor";
import { TestCasesPanel, AddTestCasePanel } from "./components/TestCasesPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { SidePanel } from "@/components/layout/SidePanel";
import { useContourApi } from "@/lib/ws-api";
import type {
  SelectedCommand,
  TestCaseModel,
  SessionFields,
} from "./types";

type OverlayMode = "none" | "add" | "settings";

interface CommandTab {
  id: string;
  command: SelectedCommand;
  requestJson: string;
  dataJson: string;
  responseJson: string;
  caseName: string;
  cases: TestCaseModel[];
  duration: string;
  sending: boolean;
}

export function CommandTesterPage() {
  const api = useContourApi();

  const [tabs, setTabs] = useState<CommandTab[]>([]);
  const requestDataRef = usePanelRef();
  const [requestDataCollapsed, setRequestDataCollapsed] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayMode>("none");
  const [showTestCases, setShowTestCases] = useState(false);

  const [ttl, setTtl] = useState("00:00:15");
  const [createNewSession, setCreateNewSession] = useState(true);
  const [resultModeView, setResultModeView] = useState(false);
  const [addApiMethod, setAddApiMethod] = useState(true);
  const [sessionFields, setSessionFields] = useState<SessionFields>({});

  const abortRef = useRef<AbortController | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  const updateTab = useCallback(
    (tabId: string, patch: Partial<CommandTab>) => {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, ...patch } : t)));
    },
    [],
  );

  const convertSessionFields = useCallback(
    (fields: SessionFields) =>
      Object.values(fields).reduce<Record<string, unknown>>((acc, f) => {
        if (f.type === "A") {
          acc[f.name] = /^\d+$/.test(f.value) ? Number(f.value) : f.value;
        } else if (f.type === "N") {
          acc[f.name] = Number(f.value);
        } else {
          acc[f.name] = f.value;
        }
        return acc;
      }, {}),
    [],
  );

  const buildDataJson = useCallback(
    (cmd: SelectedCommand, fields: SessionFields, session: boolean, currentTtl: string) =>
      JSON.stringify(
        {
          ...cmd.data,
          SessionFields: convertSessionFields(fields),
          CreateNewSession: session,
          Ttl: currentTtl,
        },
        null,
        2,
      ),
    [convertSessionFields],
  );

  const getSessionFieldsForCommand = useCallback(
    (commandName: string, autoApi: boolean, fields: SessionFields): SessionFields => {
      if (!autoApi || !commandName.includes("|")) {
        const next = { ...fields };
        delete next["ApiMethod"];
        return next;
      }
      return {
        ...fields,
        ApiMethod: {
          name: "ApiMethod",
          value: commandName.substring(0, commandName.indexOf("|")),
          type: "A",
        },
      };
    },
    [],
  );

  const loadTestCases = useCallback(
    async (cmd: SelectedCommand): Promise<TestCaseModel[]> => {
      if (!api) return [{ Name: "DEFAULT", Case: JSON.parse(cmd.json || "{}") }];
      try {
        const data = await api.getCommandTestCases(cmd.data.CommandName);
        const serverCases = data.TestCases ?? [];
        return [...serverCases, { Name: "DEFAULT", Case: JSON.parse(cmd.json || "{}") }];
      } catch {
        return [{ Name: "DEFAULT", Case: JSON.parse(cmd.json || "{}") }];
      }
    },
    [api],
  );

  const handleSelectCommand = useCallback(
    async (cmd: SelectedCommand) => {
      const existing = tabs.find((t) => t.command.key === cmd.key);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }

      const fields = getSessionFieldsForCommand(cmd.data.CommandName, addApiMethod, sessionFields);
      const cases = await loadTestCases(cmd);
      const id = cmd.key;

      const newTab: CommandTab = {
        id,
        command: cmd,
        requestJson: cmd.currentJson ?? cmd.json,
        dataJson: buildDataJson(cmd, fields, createNewSession, ttl),
        responseJson: "",
        caseName: "CURRENT",
        cases,
        duration: "",
        sending: false,
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(id);
      setOverlay("none");
    },
    [tabs, addApiMethod, sessionFields, createNewSession, ttl, buildDataJson, getSessionFieldsForCommand, loadTestCases],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== tabId);
        if (activeTabId === tabId) {
          const idx = prev.findIndex((t) => t.id === tabId);
          const newActive = next[Math.min(idx, next.length - 1)]?.id ?? null;
          setActiveTabId(newActive);
        }
        return next;
      });
    },
    [activeTabId],
  );

  const handleSend = useCallback(async () => {
    if (!api || !activeTab) return;
    const tabId = activeTab.id;
    updateTab(tabId, { sending: true, responseJson: "", duration: "" });
    const start = performance.now();

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      let parsedData: Record<string, unknown>;
      try {
        parsedData = JSON.parse(activeTab.dataJson);
      } catch {
        updateTab(tabId, {
          responseJson: JSON.stringify({ error: "Invalid data JSON" }, null, 2),
          sending: false,
        });
        return;
      }

      const response = await api.sendRawCommand(
        parsedData,
        activeTab.requestJson,
        String(parsedData.Ttl ?? ttl),
      );

      if (abort.signal.aborted) return;

      const elapsed = performance.now() - start;
      const result = resultModeView ? response : response?.CommandResult ?? response;
      updateTab(tabId, {
        responseJson: JSON.stringify(result, null, 2),
        duration: formatDuration(elapsed),
        sending: false,
      });
    } catch (err: unknown) {
      if (abort.signal.aborted) return;
      const elapsed = performance.now() - start;
      updateTab(tabId, {
        responseJson: JSON.stringify(err, null, 2),
        duration: formatDuration(elapsed),
        sending: false,
      });
    } finally {
      abortRef.current = null;
    }
  }, [api, activeTab, ttl, resultModeView, updateTab]);

  const handleCancel = () => {
    abortRef.current?.abort();
    if (activeTab) updateTab(activeTab.id, { sending: false });
  };

  const handleSelectTestCase = (tc: TestCaseModel) => {
    if (!activeTab) return;
    updateTab(activeTab.id, {
      requestJson: JSON.stringify(tc.Case, null, 2),
      caseName: tc.Name === "DEFAULT" ? "CURRENT" : tc.Name,
    });
  };

  const handleAddTestCase = useCallback(
    async (name: string, description: string) => {
      if (!api || !activeTab) return;
      try {
        await api.addCommandTestCase(
          activeTab.command.data.CommandName,
          name,
          description,
          activeTab.requestJson,
        );
        const cases = await loadTestCases(activeTab.command);
        updateTab(activeTab.id, { caseName: name, cases });
        setOverlay("none");
      } catch { /* ignore */ }
    },
    [api, activeTab, loadTestCases, updateTab],
  );

  const handleSaveTestCase = useCallback(async () => {
    if (!api || !activeTab) return;
    const { caseName } = activeTab;
    if (!caseName || caseName === "DEFAULT" || caseName === "CURRENT") return;
    try {
      await api.addCommandTestCase(activeTab.command.data.CommandName, caseName, "", activeTab.requestJson);
      const cases = await loadTestCases(activeTab.command);
      updateTab(activeTab.id, { cases });
    } catch { /* ignore */ }
  }, [api, activeTab, loadTestCases, updateTab]);

  const handleRemoveTestCase = useCallback(
    async (tc: TestCaseModel) => {
      if (!api || !activeTab) return;
      try {
        await api.removeCommandTestCase(activeTab.command.data.CommandName, tc.Name);
        const cases = await loadTestCases(activeTab.command);
        updateTab(activeTab.id, { cases });
      } catch { /* ignore */ }
    },
    [api, activeTab, loadTestCases, updateTab],
  );

  const handleSessionFieldsChange = (fields: SessionFields) => {
    setSessionFields(fields);
    if (activeTab) {
      updateTab(activeTab.id, {
        dataJson: buildDataJson(activeTab.command, fields, createNewSession, ttl),
      });
    }
  };

  const handleTtlChange = (v: string) => {
    setTtl(v);
    if (activeTab) updateTab(activeTab.id, { dataJson: buildDataJson(activeTab.command, sessionFields, createNewSession, v) });
  };

  const handleCreateNewSessionChange = (v: boolean) => {
    setCreateNewSession(v);
    if (activeTab) updateTab(activeTab.id, { dataJson: buildDataJson(activeTab.command, sessionFields, v, ttl) });
  };

  const handleResultModeViewChange = (v: boolean) => setResultModeView(v);
  const handleAddApiMethodChange = (v: boolean) => {
    setAddApiMethod(v);
    if (activeTab) {
      const fields = getSessionFieldsForCommand(activeTab.command.data.CommandName, v, sessionFields);
      setSessionFields(fields);
      updateTab(activeTab.id, { dataJson: buildDataJson(activeTab.command, fields, createNewSession, ttl) });
    }
  };

  const canSave = activeTab
    ? activeTab.caseName !== "DEFAULT" && activeTab.caseName !== "CURRENT" && activeTab.caseName !== ""
    : false;

  return (
    <div className="flex h-full overflow-hidden" style={{ position: "relative" }}>
      <Group orientation="horizontal" id="cmd-tester-main" style={{ flex: 1 }}>
        {/* Side Panel: Adapter Tree */}
        <Panel id="side" defaultSize="300px" minSize="170px" maxSize="50%" groupResizeBehavior="preserve-pixel-size">
          <SidePanel title="CMD TESTER">
            <AdapterPanel
              onSelectCommand={handleSelectCommand}
              onSettingsClick={() => setOverlay(overlay === "settings" ? "none" : "settings")}
            />
          </SidePanel>
        </Panel>

        <ResizeHandle />

        {/* Editor Area */}
        <Panel id="editor" minSize="30%">
          <div className="flex flex-col h-full overflow-hidden">
            {/* Editor Tabs */}
            <div
              className="flex items-center shrink-0 select-none overflow-x-auto bg-tab-inactive"
              style={{ height: 35, borderBottom: "1px solid var(--color-border)" }}
            >
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const label = tab.command.data.CommandName || tab.command.label;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className="flex items-center shrink-0 cursor-pointer border-none"
                    style={{
                      height: 35,
                      padding: "0 10px",
                      gap: 6,
                      fontSize: 13,
                      background: isActive ? "var(--color-tab-active)" : "transparent",
                      color: isActive ? "var(--color-text-active)" : "var(--color-text-muted)",
                      borderRight: "1px solid var(--color-border)",
                      ...(isActive ? { borderBottom: "1px solid var(--color-tab-active)" } : {}),
                    }}
                    title={tab.command.data.CommandName}
                  >
                    {tab.sending && (
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-warning)" }} className="animate-pulse shrink-0" />
                    )}
                    <span className="truncate" style={{ maxWidth: 200 }}>{label}</span>
                    <span
                      onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                      className="flex items-center justify-center shrink-0 toolbar-btn"
                      style={{ width: 20, height: 20, padding: 2 }}
                    >
                      <X size={16} />
                    </span>
                  </button>
                );
              })}
              {tabs.length === 0 && (
                <span style={{ padding: "0 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
                  Select a command from the tree
                </span>
              )}

              {activeTab && (
                <div className="flex items-center ml-auto shrink-0" style={{ paddingRight: 8, gap: 4 }}>
                  {activeTab.duration && (
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginRight: 4 }}>
                      {activeTab.duration}
                    </span>
                  )}
                  {activeTab.sending ? (
                    <button onClick={handleCancel} className="toolbar-btn" title="Cancel" style={{ color: "#f48771" }}>
                      <Square size={16} />
                    </button>
                  ) : (
                    <button onClick={handleSend} className="toolbar-btn" title="Send (Ctrl+Enter)" style={{ color: "#89d185" }}>
                      <Play size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Editor Content */}
            {activeTab ? (
              <div className="flex-1 overflow-hidden">
                <Group orientation="horizontal" id="cmd-tester-editors">
                  {/* Request Side */}
                  <Panel defaultSize={50} minSize={20}>
                    <Group orientation="vertical" id="cmd-tester-request">
                      <Panel defaultSize={70} minSize={20}>
                        <div className="h-full relative">
                          {/* Test case actions toolbar */}
                          <div
                            className="absolute top-0 right-[12px] z-10 flex items-center select-none"
                            style={{ gap: 2, padding: "2px 4px", background: "var(--color-sidebar)", borderRadius: "0 0 4px 4px" }}
                          >
                            <span style={{ fontSize: 12, color: "var(--color-accent)", marginRight: 4 }}>{activeTab.caseName}</span>
                            <button onClick={() => setOverlay(overlay === "add" ? "none" : "add")} className="toolbar-btn" title="Add test case">
                              <Plus size={16} />
                            </button>
                            <button onClick={handleSaveTestCase} disabled={!canSave} className="toolbar-btn" title="Save test case">
                              <Save size={16} />
                            </button>
                            <button onClick={() => setShowTestCases(!showTestCases)} className="toolbar-btn" title="Test cases">
                              <List size={16} />
                            </button>
                          </div>
                          <JsonEditor
                            value={activeTab.requestJson}
                            onChange={(v) => updateTab(activeTab.id, { requestJson: v })}
                            label="Request Body"
                          />
                        </div>
                      </Panel>

                      <ResizeHandle direction="vertical" />

                      <Panel
                        id="request-data"
                        panelRef={requestDataRef}
                        collapsible
                        collapsedSize="26px"
                        defaultSize={30}
                        minSize="26px"
                        onResize={() => {
                          setRequestDataCollapsed(requestDataRef.current?.isCollapsed() ?? false);
                        }}
                      >
                        <div className="flex flex-col h-full overflow-hidden">
                          <button
                            className="flex items-center shrink-0 select-none cursor-pointer"
                            onClick={() => {
                              if (requestDataRef.current?.isCollapsed()) {
                                requestDataRef.current.expand();
                              } else {
                                requestDataRef.current?.collapse();
                              }
                            }}
                            style={{
                              height: 26, padding: "0 12px", gap: 4, fontSize: 11, fontWeight: 600,
                              color: "var(--color-text-muted)", background: "var(--color-sidebar)",
                              borderBottom: "1px solid var(--color-border)", border: "none", borderTop: "none",
                              textTransform: "uppercase", letterSpacing: "0.04em",
                            }}
                          >
                            {requestDataCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            Request Data
                          </button>
                          {!requestDataCollapsed && (
                            <div className="flex-1 min-h-0">
                              <JsonEditor value={activeTab.dataJson} onChange={(v) => updateTab(activeTab.id, { dataJson: v })} />
                            </div>
                          )}
                        </div>
                      </Panel>
                    </Group>
                  </Panel>

                  <ResizeHandle />

                  {/* Response */}
                  <Panel defaultSize={50} minSize={20}>
                    <JsonEditor
                      value={activeTab.responseJson}
                      readOnly
                      minimap
                      label={activeTab.duration ? `Response (${activeTab.duration})` : "Response"}
                    />
                  </Panel>
                </Group>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center" style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                Select a command from the tree to open it
              </div>
            )}
          </div>
        </Panel>

        {/* Test Cases side panel */}
        {showTestCases && activeTab && (<>
          <ResizeHandle />
          <Panel id="test-cases" defaultSize="260px" minSize="180px" maxSize="35%" groupResizeBehavior="preserve-pixel-size">
            <TestCasesPanel
              cases={activeTab.cases}
              onSelect={handleSelectTestCase}
              onRemove={handleRemoveTestCase}
              onClose={() => setShowTestCases(false)}
            />
          </Panel>
        </>)}
      </Group>

      {/* Add Test Case overlay */}
      {overlay === "add" && activeTab && (
        <div
          className="absolute inset-0 flex items-start justify-center z-30 overflow-auto"
          style={{ paddingTop: 32, background: "rgba(0,0,0,0.3)" }}
          onClick={() => setOverlay("none")}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <AddTestCasePanel
              json={activeTab.requestJson}
              onAdd={handleAddTestCase}
              onClose={() => setOverlay("none")}
            />
          </div>
        </div>
      )}

      {/* Settings slide-out overlay */}
      {overlay === "settings" && (
        <div
          style={{ position: "absolute", inset: 0, zIndex: 40, display: "flex" }}
          onClick={() => setOverlay("none")}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-full overflow-auto"
            style={{ flexShrink: 0 }}
          >
            <SettingsPanel
              ttl={ttl}
              onTtlChange={handleTtlChange}
              createNewSession={createNewSession}
              onCreateNewSessionChange={handleCreateNewSessionChange}
              resultModeView={resultModeView}
              onResultModeViewChange={handleResultModeViewChange}
              addApiMethod={addApiMethod}
              onAddApiMethodChange={handleAddApiMethodChange}
              sessionFields={sessionFields}
              onSessionFieldsChange={handleSessionFieldsChange}
              onClose={() => setOverlay("none")}
            />
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.25)" }} />
        </div>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  const totalSec = ms / 1000;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const msRem = Math.floor(ms % 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(msRem).padStart(3, "0")}`;
}
