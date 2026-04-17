import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import {
  RefreshCw,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Save,
  FileCheck,
  Wand2,
  GitCommitHorizontal,
  AlertCircle,
  Search,
  FileCode2,
  Loader2,
} from "lucide-react";
import type { HubWsApi } from "@/lib/ws-api";
import type { WebGlobalModel, DiagnosticModel } from "@/lib/ws-api-models";
import { setupWfmCSharp } from "../monaco/wfm-csharp";
import { useToast } from "@/providers/ToastProvider";

interface GlobalModelsPanelProps {
  api: HubWsApi;
}

const CATEGORIES = ["MODEL", "HELPER", "CRUD"] as const;

/** Нормализация `DiagnosticModel` либо строки в diagnostic. */
function toDiagnostic(e: DiagnosticModel | string): DiagnosticModel {
  if (typeof e === "string") {
    return {
      Text: e,
      Message: e,
      StartLine: 1,
      EndLine: 1,
      StartColumn: 1,
      EndColumn: 1,
    };
  }
  return e;
}

/** Ключ модели — Category+TypeName, чтобы различать записи с одинаковыми именами в разных категориях. */
const modelKey = (m: Pick<WebGlobalModel, "Category" | "TypeName">) =>
  `${m.Category}::${m.TypeName}`;

function categoryBadgeColor(cat: string): string {
  switch (cat) {
    case "HELPER":
      return "#dcdcaa";
    case "MODEL":
      return "#9cdcfe";
    case "CRUD":
      return "#ce9178";
    default:
      return "#999";
  }
}

export function GlobalModelsPanel({ api }: GlobalModelsPanelProps) {
  const toast = useToast();
  const [models, setModels] = useState<WebGlobalModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [diagnostics, setDiagnostics] = useState<DiagnosticModel[]>([]);
  const [busy, setBusy] = useState<"idle" | "saving" | "validating" | "formatting" | "committing">("idle");
  const [commitOpen, setCommitOpen] = useState(false);

  // Снимки «оригинального» кода для dirty-трекинга (по ключу Category::TypeName).
  const originalCode = useRef<Record<string, string>>({});
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const load = useCallback(
    async (preserveSelection = false, selectAfterLoad?: { Category: string; TypeName: string }) => {
      setLoading(true);
      try {
        const res = await api.getGlobalModels();
        const list = res.GlobalModels ?? [];
        setModels(list);
        // Обновляем снимки оригинального кода.
        const snaps: Record<string, string> = {};
        for (const m of list) snaps[modelKey(m)] = m.Code ?? "";
        originalCode.current = snaps;

        const explicitKey = selectAfterLoad ? modelKey(selectAfterLoad) : null;
        if (explicitKey && list.some((m) => modelKey(m) === explicitKey)) {
          setSelectedKey(explicitKey);
        } else if (!preserveSelection && !selectedKey && list.length > 0) {
          setSelectedKey(modelKey(list[0]));
        } else if (selectedKey && !list.some((m) => modelKey(m) === selectedKey)) {
          // Выбранная модель пропала (например, после rename) — сбрасываем.
          setSelectedKey(list.length > 0 ? modelKey(list[0]) : null);
        }
      } catch (e) {
        console.error("Failed to load global models", e);
        toast.push("error", "Failed to load global models", { detail: String(e) });
      } finally {
        setLoading(false);
      }
    },
    [api, selectedKey, toast],
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Группировка моделей по Category (в фиксированном порядке: MODEL, HELPER, CRUD, остальные по алфавиту).
  const grouped = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const byCat = new Map<string, WebGlobalModel[]>();
    for (const m of models) {
      if (f && !m.TypeName.toLowerCase().includes(f)) continue;
      const arr = byCat.get(m.Category) ?? [];
      arr.push(m);
      byCat.set(m.Category, arr);
    }
    const knownOrder = CATEGORIES as readonly string[];
    const allCats = Array.from(byCat.keys());
    const ordered = [
      ...knownOrder.filter((c) => byCat.has(c)),
      ...allCats.filter((c) => !knownOrder.includes(c)).sort(),
    ];
    return ordered.map((cat) => ({
      Category: cat,
      Models: (byCat.get(cat) ?? []).slice().sort((a, b) => a.TypeName.localeCompare(b.TypeName)),
    }));
  }, [models, filter]);

  const selected = useMemo(
    () => models.find((m) => modelKey(m) === selectedKey) ?? null,
    [models, selectedKey],
  );

  const isDirty = useMemo(() => {
    if (!selected) return false;
    return (originalCode.current[modelKey(selected)] ?? "") !== (selected.Code ?? "");
  }, [selected]);

  // Обновляем код выбранной модели в стейте (редактирование).
  const updateSelectedCode = useCallback((next: string) => {
    setSelectedKey((curKey) => {
      if (!curKey) return curKey;
      setModels((prev) => prev.map((m) => (modelKey(m) === curKey ? { ...m, Code: next } : m)));
      return curKey;
    });
    // Любая правка сбрасывает подсветку ошибок — они относятся к предыдущему состоянию.
    setDiagnostics([]);
  }, []);

  // Применяем Monaco-маркеры при изменении diagnostics.
  useEffect(() => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;
    const model = editor.getModel();
    if (!model) return;
    const markers: MonacoEditor.IMarkerData[] = diagnostics.map((d) => ({
      severity: monaco.MarkerSeverity.Error,
      message: d.Message || d.Text,
      startLineNumber: Math.max(1, d.StartLine),
      startColumn: Math.max(1, d.StartColumn),
      endLineNumber: Math.max(1, d.EndLine || d.StartLine),
      endColumn: Math.max(1, d.EndColumn || d.StartColumn + 1),
      source: "wfm",
    }));
    monaco.editor.setModelMarkers(model, "wfm-global", markers);
  }, [diagnostics]);

  // Сброс маркеров при смене выбранной модели (подсветка ошибок — только для текущей).
  useEffect(() => {
    setDiagnostics([]);
  }, [selectedKey]);

  const handleValidate = useCallback(async () => {
    if (!selected) return;
    setBusy("validating");
    try {
      const res = await api.validateGlobalModel(selected.Code ?? "");
      setDiagnostics((res.Errors ?? []).map(toDiagnostic));
      if (!res.Errors || res.Errors.length === 0) {
        toast.push("success", "Syntax valid", { duration: 1800 });
      } else {
        toast.push("warning", `${res.Errors.length} error(s)`, { duration: 2500 });
      }
    } catch (e) {
      toast.push("error", "Validation failed", { detail: String(e) });
    } finally {
      setBusy("idle");
    }
  }, [api, selected, toast]);

  const handleFormat = useCallback(async () => {
    if (!selected) return;
    setBusy("formatting");
    try {
      const res = await api.formatCode(selected.Code ?? "");
      updateSelectedCode(res.Code ?? selected.Code ?? "");
    } catch (e) {
      toast.push("error", "Format failed", { detail: String(e) });
    } finally {
      setBusy("idle");
    }
  }, [api, selected, toast, updateSelectedCode]);

  const handleSave = useCallback(async () => {
    if (!selected) return;
    setBusy("saving");
    try {
      const res = await api.addGlobalModel(
        { Category: selected.Category, TypeName: selected.TypeName, Code: selected.Code ?? "" },
        false,
      );
      const errs = (res?.Errors ?? []).map(toDiagnostic);
      setDiagnostics(errs);
      if (errs.length === 0) {
        // Успех — фиксируем снимок как новый оригинал.
        originalCode.current[modelKey(selected)] = selected.Code ?? "";
        toast.push("success", `Saved: ${selected.TypeName}`, { duration: 1800 });
      } else {
        toast.push("warning", `Saved with ${errs.length} error(s)`, { duration: 2500 });
      }
    } catch (e) {
      toast.push("error", "Save failed", { detail: String(e) });
    } finally {
      setBusy("idle");
    }
  }, [api, selected, toast]);

  const handleCommit = useCallback(
    async (message: string) => {
      if (!selected) return;
      setBusy("committing");
      try {
        const res = await api.commitProcessAssembly([selected.TypeName], message);
        toast.push("success", `Committed ${res.CommitHash?.slice(0, 8) ?? ""}`.trim(), {
          detail: (res.Names ?? []).join(", "),
          duration: 2500,
        });
        setCommitOpen(false);
      } catch (e) {
        toast.push("error", "Commit failed", { detail: String(e) });
      } finally {
        setBusy("idle");
      }
    },
    [api, selected, toast],
  );

  // Хоткеи: Ctrl+S сохранить, Shift+Alt+F форматировать.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!selected) return;
      if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        void handleSave();
      } else if (e.shiftKey && e.altKey && (e.key === "f" || e.key === "F" || e.code === "KeyF")) {
        e.preventDefault();
        void handleFormat();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, handleSave, handleFormat]);

  // Переход на строку ошибки из Problems panel.
  const jumpToDiagnostic = useCallback((d: DiagnosticModel) => {
    const editor = editorRef.current;
    if (!editor) return;
    const line = Math.max(1, d.StartLine);
    const col = Math.max(1, d.StartColumn);
    editor.revealPositionInCenter({ lineNumber: line, column: col });
    editor.setPosition({ lineNumber: line, column: col });
    editor.focus();
  }, []);

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      {/* Left: sidebar with accordion list */}
      <div
        className="flex flex-col shrink-0"
        style={{
          width: 260,
          borderRight: "1px solid var(--color-border)",
          background: "var(--color-sidebar)",
          minHeight: 0,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center shrink-0"
          style={{ padding: "6px 8px", borderBottom: "1px solid var(--color-border)" }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            Global Models
          </span>
          <div style={{ flex: 1 }} />
          <button
            className="toolbar-btn"
            title="Refresh"
            onClick={() => void load(true)}
            disabled={loading}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
          <button className="toolbar-btn" title="Add" onClick={() => setShowAdd(true)}>
            <Plus size={14} />
          </button>
        </div>

        {/* Filter */}
        <div
          className="shrink-0"
          style={{ padding: "6px 8px", borderBottom: "1px solid var(--color-border)" }}
        >
          <div style={{ position: "relative" }}>
            <Search
              size={12}
              style={{
                position: "absolute",
                left: 6,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Filter..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                width: "100%",
                background: "var(--color-surface-400)",
                border: "1px solid var(--color-border)",
                borderRadius: 3,
                padding: "3px 6px 3px 22px",
                fontSize: 12,
                color: "var(--color-text-primary)",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Accordion list */}
        <div className="flex-1 overflow-auto" style={{ fontSize: 12 }}>
          {grouped.length === 0 && (
            <div style={{ padding: "10px 12px", color: "var(--color-text-muted)", fontSize: 11 }}>
              {loading ? "Loading..." : "No models"}
            </div>
          )}
          {grouped.map((g) => {
            const isCollapsed = collapsed[g.Category] === true;
            return (
              <div key={g.Category}>
                <button
                  className="flex items-center w-full"
                  onClick={() =>
                    setCollapsed((prev) => ({ ...prev, [g.Category]: !isCollapsed }))
                  }
                  style={{
                    padding: "3px 6px",
                    background: "transparent",
                    border: "none",
                    color: "var(--color-text-primary)",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--color-list-hover)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {isCollapsed ? (
                    <ChevronRight
                      size={14}
                      style={{ flexShrink: 0, opacity: 0.6, marginRight: 2 }}
                    />
                  ) : (
                    <ChevronDown
                      size={14}
                      style={{ flexShrink: 0, opacity: 0.6, marginRight: 2 }}
                    />
                  )}
                  {isCollapsed ? (
                    <Folder
                      size={13}
                      style={{ flexShrink: 0, color: "#dcb67a", marginRight: 6 }}
                    />
                  ) : (
                    <FolderOpen
                      size={13}
                      style={{ flexShrink: 0, color: "#dcb67a", marginRight: 6 }}
                    />
                  )}
                  <span style={{ flex: 1, textAlign: "left" }}>{g.Category}</span>
                  <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>
                    {g.Models.length}
                  </span>
                </button>
                {!isCollapsed &&
                  g.Models.map((m) => {
                    const k = modelKey(m);
                    const isSelected = k === selectedKey;
                    const dirty = (originalCode.current[k] ?? "") !== (m.Code ?? "");
                    return (
                      <div
                        key={k}
                        className="flex items-center"
                        style={{
                          padding: "2px 6px 2px 30px",
                          cursor: "pointer",
                          background: isSelected
                            ? "rgba(14,99,156,0.35)"
                            : "transparent",
                          color: isSelected
                            ? "#fff"
                            : "var(--color-text-primary)",
                          fontFamily: "'Consolas','Courier New',monospace",
                        }}
                        onClick={() => setSelectedKey(k)}
                        onMouseEnter={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.background = "var(--color-list-hover)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected)
                            e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <FileCode2
                          size={12}
                          style={{
                            flexShrink: 0,
                            color: isSelected ? "#fff" : "var(--color-text-muted)",
                            marginRight: 5,
                          }}
                        />
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                          }}
                        >
                          {m.TypeName}
                        </span>
                        {dirty && (
                          <span
                            title="Unsaved changes"
                            style={{
                              marginLeft: 6,
                              color: isSelected ? "#fff" : "var(--color-accent)",
                              fontSize: 14,
                              lineHeight: 1,
                            }}
                          >
                            ●
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: main content */}
      <div className="flex-1 flex flex-col min-w-0" style={{ minHeight: 0 }}>
        {selected ? (
          <>
            {/* Top bar */}
            <div
              className="flex items-center shrink-0"
              style={{
                padding: "4px 10px",
                borderBottom: "1px solid var(--color-border)",
                background: "var(--color-sidebar)",
                gap: 6,
              }}
            >
              <FileCode2 size={14} style={{ color: "var(--color-accent)", flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  fontFamily: "'Consolas','Courier New',monospace",
                }}
              >
                {selected.TypeName}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: "1px 5px",
                  borderRadius: 2,
                  background: categoryBadgeColor(selected.Category),
                  color: "#1e1e1e",
                  fontWeight: 700,
                  lineHeight: "14px",
                  letterSpacing: 0.4,
                  flexShrink: 0,
                }}
              >
                {selected.Category}
              </span>
              {isDirty && (
                <span
                  title="Unsaved changes"
                  style={{ color: "var(--color-accent)", fontSize: 16, lineHeight: 1 }}
                >
                  ●
                </span>
              )}
              <div style={{ flex: 1 }} />
              <button
                className="toolbar-btn"
                title="Validate (Ctrl+Shift+V)"
                onClick={handleValidate}
                disabled={busy !== "idle"}
              >
                {busy === "validating" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <FileCheck size={13} />
                )}
                <span style={{ marginLeft: 4, fontSize: 12 }}>Validate</span>
              </button>
              <button
                className="toolbar-btn"
                title="Format (Shift+Alt+F)"
                onClick={handleFormat}
                disabled={busy !== "idle"}
              >
                {busy === "formatting" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Wand2 size={13} />
                )}
                <span style={{ marginLeft: 4, fontSize: 12 }}>Format</span>
              </button>
              <button
                className="toolbar-btn"
                title="Save (Ctrl+S)"
                onClick={handleSave}
                disabled={busy !== "idle" || !isDirty}
                style={{
                  color: isDirty ? "var(--color-accent)" : undefined,
                  fontWeight: isDirty ? 600 : undefined,
                }}
              >
                {busy === "saving" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                <span style={{ marginLeft: 4, fontSize: 12 }}>Save</span>
              </button>
              <button
                className="toolbar-btn"
                title="Commit"
                onClick={() => setCommitOpen(true)}
                disabled={busy !== "idle"}
              >
                <GitCommitHorizontal size={13} />
                <span style={{ marginLeft: 4, fontSize: 12 }}>Commit</span>
              </button>
            </div>

            {/* Editor */}
            <div className="flex-1 min-h-0" style={{ background: "var(--color-editor)" }}>
              <Editor
                path={`inmemory://global/${selected.Category}/${selected.TypeName}.cs`}
                language="csharp"
                value={selected.Code ?? ""}
                onChange={(v) => updateSelectedCode(v ?? "")}
                theme="hub-dark"
                beforeMount={(m) => setupWfmCSharp(m)}
                onMount={(ed, m) => {
                  editorRef.current = ed;
                  monacoRef.current = m;
                }}
                options={{
                  fontSize: 13,
                  fontFamily: "Consolas, 'Courier New', monospace",
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  minimap: { enabled: false },
                  automaticLayout: true,
                  tabSize: 4,
                  padding: { top: 6 },
                  acceptSuggestionOnEnter: "smart",
                  tabCompletion: "on",
                  renderLineHighlight: "line",
                  smoothScrolling: true,
                }}
              />
            </div>

            {/* Problems panel */}
            {diagnostics.length > 0 && (
              <div
                className="shrink-0"
                style={{
                  maxHeight: 140,
                  overflowY: "auto",
                  borderTop: "1px solid var(--color-border)",
                  background: "var(--color-sidebar)",
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    padding: "4px 10px",
                    fontWeight: 600,
                    color: "var(--color-text-muted)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <AlertCircle size={12} style={{ color: "#f48771" }} />
                  Problems ({diagnostics.length})
                </div>
                {diagnostics.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => jumpToDiagnostic(d)}
                    className="flex items-start w-full"
                    style={{
                      padding: "3px 10px",
                      background: "transparent",
                      border: "none",
                      color: "var(--color-text-primary)",
                      cursor: "pointer",
                      textAlign: "left",
                      gap: 6,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--color-list-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <AlertCircle
                      size={12}
                      style={{ color: "#f48771", flexShrink: 0, marginTop: 2 }}
                    />
                    <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {d.Message || d.Text}
                    </span>
                    <span style={{ color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                      [{d.StartLine}:{d.StartColumn}]
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyState onAdd={() => setShowAdd(true)} />
        )}
      </div>

      {showAdd && (
        <AddGlobalModelDialog
          api={api}
          existingNames={new Set(models.map((m) => modelKey(m)))}
          onClose={() => setShowAdd(false)}
          onAdded={(m) => {
            setShowAdd(false);
            void load(false, m);
          }}
        />
      )}

      {commitOpen && selected && (
        <CommitMessageDialog
          typeName={selected.TypeName}
          busy={busy === "committing"}
          onCancel={() => setCommitOpen(false)}
          onCommit={handleCommit}
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center flex-1"
      style={{ color: "var(--color-text-muted)", gap: 10, padding: 40 }}
    >
      <FileCode2 size={48} style={{ opacity: 0.3 }} />
      <div style={{ fontSize: 14, color: "var(--color-text-primary)" }}>
        Select a class to view details
      </div>
      <div style={{ fontSize: 12 }}>
        Choose a class from the left panel to start editing
      </div>
      <button
        className="toolbar-btn"
        onClick={onAdd}
        style={{
          marginTop: 6,
          padding: "4px 12px",
          border: "1px solid var(--color-border)",
          borderRadius: 3,
        }}
      >
        <Plus size={13} />
        <span style={{ marginLeft: 4, fontSize: 12 }}>Add new class</span>
      </button>
    </div>
  );
}

function AddGlobalModelDialog({
  api,
  existingNames,
  onClose,
  onAdded,
}: {
  api: HubWsApi;
  existingNames: Set<string>;
  onClose: () => void;
  onAdded: (m: { Category: string; TypeName: string }) => void;
}) {
  const toast = useToast();
  const [category, setCategory] = useState<string>("MODEL");
  const [typeName, setTypeName] = useState("");
  const [saving, setSaving] = useState(false);

  const trimmed = typeName.trim();
  const isValidId = /^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed);
  const duplicate = isValidId && existingNames.has(`${category}::${trimmed}`);
  const canSave = isValidId && !duplicate && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.addGlobalModel({ Category: category, TypeName: trimmed, Code: "" }, true);
      onAdded({ Category: category, TypeName: trimmed });
    } catch (e) {
      toast.push("error", "Add failed", { detail: String(e) });
      setSaving(false);
    }
  }, [api, canSave, category, onAdded, toast, trimmed]);

  const inputStyle: CSSProperties = {
    width: "100%",
    background: "var(--color-surface-400)",
    border: "1px solid var(--color-border)",
    borderRadius: 3,
    padding: "4px 8px",
    fontSize: 12,
    color: "var(--color-text-primary)",
    outline: "none",
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          background: "var(--color-sidebar)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          width: 420,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between shrink-0"
          style={{ padding: "8px 14px", borderBottom: "1px solid var(--color-border)" }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
            Add Global Model
          </span>
          <button className="toolbar-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label
              style={{
                fontSize: 11,
                color: "var(--color-text-muted)",
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                color: "var(--color-text-muted)",
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Type Name
            </label>
            <input
              autoFocus
              style={inputStyle}
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="e.g. DateHelper"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) {
                  e.preventDefault();
                  void handleSave();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  onClose();
                }
              }}
            />
            {trimmed && !isValidId && (
              <div style={{ fontSize: 11, color: "#f48771", marginTop: 4 }}>
                Must be a valid C# identifier (letters/digits/underscore, cannot start with a digit)
              </div>
            )}
            {duplicate && (
              <div style={{ fontSize: 11, color: "#f48771", marginTop: 4 }}>
                "{trimmed}" already exists in {category}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 shrink-0"
          style={{ padding: "8px 14px", borderTop: "1px solid var(--color-border)" }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "4px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-primary)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: "4px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "none",
              background: canSave ? "var(--color-accent)" : "var(--color-surface-400)",
              color: "#fff",
              cursor: canSave ? "pointer" : "not-allowed",
              opacity: canSave ? 1 : 0.6,
            }}
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CommitMessageDialog({
  typeName,
  busy,
  onCancel,
  onCommit,
}: {
  typeName: string;
  busy: boolean;
  onCancel: () => void;
  onCommit: (message: string) => void;
}) {
  const [message, setMessage] = useState(`Update ${typeName}`);
  const canCommit = message.trim().length > 0 && !busy;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onMouseDown={onCancel}
    >
      <div
        style={{
          background: "var(--color-sidebar)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          width: 420,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between shrink-0"
          style={{ padding: "8px 14px", borderBottom: "1px solid var(--color-border)" }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
            Commit {typeName}
          </span>
          <button className="toolbar-btn" onClick={onCancel}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: "12px 14px" }}>
          <label
            style={{
              fontSize: 11,
              color: "var(--color-text-muted)",
              fontWeight: 600,
              display: "block",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            Commit message
          </label>
          <input
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCommit) {
                e.preventDefault();
                onCommit(message.trim());
              } else if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
              }
            }}
            style={{
              width: "100%",
              background: "var(--color-surface-400)",
              border: "1px solid var(--color-border)",
              borderRadius: 3,
              padding: "5px 8px",
              fontSize: 12,
              color: "var(--color-text-primary)",
              outline: "none",
            }}
          />
        </div>
        <div
          className="flex items-center justify-end gap-2 shrink-0"
          style={{ padding: "8px 14px", borderTop: "1px solid var(--color-border)" }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "4px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-primary)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onCommit(message.trim())}
            disabled={!canCommit}
            style={{
              padding: "4px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "none",
              background: canCommit ? "#1bb61b" : "var(--color-surface-400)",
              color: "#fff",
              cursor: canCommit ? "pointer" : "not-allowed",
              opacity: canCommit ? 1 : 0.6,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <GitCommitHorizontal size={13} />
            {busy ? "Committing..." : "Commit"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
