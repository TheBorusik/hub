import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { FileCheck, Wand2, Loader2, AlertCircle, ArrowLeftRight, RefreshCw } from "lucide-react";
import type { HubWsApi } from "@/lib/ws-api";
import type { WebProcess, DiagnosticModel } from "@/lib/ws-api-models";
import { setupWfmCSharp } from "../monaco/wfm-csharp";
import { CodeEditor, type CodeEditorMarker } from "@/components/ui/CodeEditor";

interface CodePreviewProps {
  api: HubWsApi;
  process: WebProcess;
  /**
   * Применить изменения из C#-редактора в модель процесса (обратное направление).
   * Если колбэк передан — вверху появляется кнопка «Apply to Process»,
   * которая парсит код через `WFM.ProcessAssembly.Create` и (при отсутствии ошибок)
   * пробрасывает новый `WebProcess` родителю.
   */
  onApplyToProcess?: (next: WebProcess) => void;
}

/** Нормализация `DiagnosticModel` либо строки в diagnostic. */
function toDiagnostic(e: DiagnosticModel | string): DiagnosticModel {
  if (typeof e === "string") {
    return { Text: e, Message: e, StartLine: 1, EndLine: 1, StartColumn: 1, EndColumn: 1 };
  }
  return e;
}

export function CodePreview({ api, process, onApplyToProcess }: CodePreviewProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<DiagnosticModel[]>([]);
  const [status, setStatus] = useState<"idle" | "valid" | "error" | "saving" | "applying">("idle");
  /** Отразили ли мы текущий код из переданного в пропс `process`. */
  const [codeDirty, setCodeDirty] = useState(false);
  const processName = process.TypeName;
  const lastRequested = useRef<string | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  /**
   * Перезагрузить код из текущего `process`. Сбрасывает dirty-флаг.
   * Вызывается при первом открытии и при нажатии на "Refresh from Process".
   */
  const reloadFromProcess = useCallback(() => {
    setLoading(true);
    api.getProcessCode(process).then((res) => {
      setCode(res.Code ?? "");
      setDiagnostics((res.Errors ?? []).map(toDiagnostic));
      setStatus(res.Errors && res.Errors.length > 0 ? "error" : "idle");
      setCodeDirty(false);
      setLoading(false);
    }).catch((e) => {
      setDiagnostics([{ Text: String(e), Message: String(e), StartLine: 1, EndLine: 1, StartColumn: 1, EndColumn: 1 }]);
      setStatus("error");
      setLoading(false);
    });
  }, [api, process]);

  useEffect(() => {
    const key = processName;
    if (lastRequested.current === key) return;
    lastRequested.current = key;
    reloadFromProcess();
  }, [processName, reloadFromProcess]);

  // Преобразуем WFM-диагностики в формат CodeEditor (единый markerOwner="wfm").
  const codeMarkers = useMemo<CodeEditorMarker[]>(
    () =>
      diagnostics.map((d) => ({
        severity: "error",
        message: d.Message || d.Text,
        startLineNumber: Math.max(1, d.StartLine),
        startColumn: Math.max(1, d.StartColumn),
        endLineNumber: Math.max(1, d.EndLine || d.StartLine),
        endColumn: Math.max(1, d.EndColumn || d.StartColumn + 1),
        source: "wfm",
      })),
    [diagnostics],
  );

  const handleValidate = useCallback(async () => {
    try {
      const res = await api.validateCode(code);
      setDiagnostics((res.Errors ?? []).map(toDiagnostic));
      setStatus(res.Errors && res.Errors.length > 0 ? "error" : "valid");
    } catch (e) {
      setDiagnostics([{ Text: String(e), Message: String(e), StartLine: 1, EndLine: 1, StartColumn: 1, EndColumn: 1 }]);
      setStatus("error");
    }
  }, [api, code]);

  const handleFormat = useCallback(async () => {
    try {
      const res = await api.formatCode(code);
      setCode(res.Code ?? code);
    } catch (e) {
      console.error("Format failed", e);
    }
  }, [api, code]);

  /**
   * «Apply to Process» — обратное направление code → WebProcess.
   *
   * Парсит текущий C# через `WFM.ProcessAssembly.Create` и, если ошибок компиляции нет
   * (или пользователь всё равно хочет применить — пока не спрашиваем), прокидывает
   * разобранный `WebProcess` в родителя через `onApplyToProcess`. Это автоматически
   * приведёт к обновлению диаграммы и форм стейджей.
   *
   * Важно: сам WebData (позиции/линии) здесь не пересчитывается, сервер сохранит
   * существующую раскладку при Create — пользователь может потом запустить
   * автораскладку отдельно, если хочет.
   */
  const handleApply = useCallback(async () => {
    if (!onApplyToProcess) return;
    setStatus("applying");
    try {
      const res = await api.createProcessAssembly(processName, code);
      const errs = (res.Errors ?? []).map(toDiagnostic);
      setDiagnostics(errs);
      if (errs.length > 0) {
        // С ошибками не применяем — пусть пользователь исправит код.
        setStatus("error");
        return;
      }
      if (res.Process) {
        onApplyToProcess(res.Process);
        setCodeDirty(false);
        setStatus("valid");
      } else {
        setStatus("idle");
      }
    } catch (e) {
      setDiagnostics([{ Text: String(e), Message: String(e), StartLine: 1, EndLine: 1, StartColumn: 1, EndColumn: 1 }]);
      setStatus("error");
    }
  }, [api, processName, code, onApplyToProcess]);

  /** Фокусируемся на строке/колонке ошибки. */
  const jumpTo = useCallback((d: DiagnosticModel) => {
    const editor = editorRef.current;
    if (!editor) return;
    const line = Math.max(1, d.StartLine);
    const col = Math.max(1, d.StartColumn);
    editor.revealPositionInCenter({ lineNumber: line, column: col });
    editor.setPosition({ lineNumber: line, column: col });
    editor.focus();
  }, []);

  const statusColor = status === "valid" ? "#4ec9b0" : status === "error" ? "#f14c4c" : "var(--color-text-muted)";
  const errorCount = diagnostics.length;
  const statusLabel = (() => {
    if (status === "valid") return "Valid";
    if (status === "error") return `${errorCount} error${errorCount === 1 ? "" : "s"}`;
    if (status === "saving") return "Saving...";
    if (status === "applying") return "Applying...";
    if (codeDirty) return "Modified";
    return "In sync";
  })();

  const groupedDiagnostics = useMemo(() => {
    return diagnostics.slice().sort((a, b) => {
      if (a.StartLine !== b.StartLine) return a.StartLine - b.StartLine;
      return a.StartColumn - b.StartColumn;
    });
  }, [diagnostics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--color-text-muted)" }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 shrink-0"
        style={{
          padding: "4px 8px",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-sidebar)",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: statusColor,
            marginRight: 4,
          }}
        />
        <span style={{ fontSize: 11, color: codeDirty ? "#ffb74d" : statusColor }}>
          {statusLabel}
        </span>
        <div style={{ flex: 1 }} />
        <button
          className="toolbar-btn"
          title="Refresh code from Process (discard local edits)"
          onClick={reloadFromProcess}
          disabled={loading}
        >
          <RefreshCw size={14} />
        </button>
        <button className="toolbar-btn" title="Validate" onClick={handleValidate}>
          <FileCheck size={14} />
        </button>
        <button className="toolbar-btn" title="Format (Shift+Alt+F)" onClick={handleFormat}>
          <Wand2 size={14} />
        </button>
        {onApplyToProcess && (
          <button
            className="toolbar-btn"
            title="Apply code to Process (parse → update diagram and stages)"
            onClick={handleApply}
            disabled={status === "applying" || status === "saving"}
            style={{
              color: codeDirty ? "#4fc3f7" : undefined,
              background: codeDirty ? "rgba(14,99,156,0.25)" : undefined,
            }}
          >
            <ArrowLeftRight size={14} />
          </button>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <CodeEditor
          path={`inmemory://code/${processName}`}
          language="csharp"
          value={code}
          onChange={(v) => { setCode(v); setStatus("idle"); setCodeDirty(true); }}
          theme="wfm-dark"
          markers={codeMarkers}
          markerOwner="wfm"
          minimap
          beforeMount={setupWfmCSharp}
          onMount={(editor, monaco: Monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
          }}
          options={{
            fontSize: 13,
            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
            padding: { top: 8 },
          }}
        />
      </div>

      {/* Problems panel */}
      {diagnostics.length > 0 && (
        <div style={{
          maxHeight: 180,
          display: "flex",
          flexDirection: "column",
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-sidebar)",
        }}>
          <div
            className="flex items-center shrink-0"
            style={{ padding: "4px 8px", borderBottom: "1px solid var(--color-border)", gap: 6 }}
          >
            <AlertCircle size={12} color="#f14c4c" />
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              PROBLEMS
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: "#f44336", color: "#fff",
              padding: "0 6px", borderRadius: 8,
            }}>
              {errorCount}
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {groupedDiagnostics.map((d, i) => (
              <button
                key={i}
                onClick={() => jumpTo(d)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--color-border)",
                  padding: "4px 8px",
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                  display: "flex",
                  gap: 6,
                  alignItems: "flex-start",
                  fontSize: 11,
                  fontFamily: "Consolas, monospace",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-list-hover, rgba(255,255,255,0.05))")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <AlertCircle size={12} color="#f14c4c" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: "#d4d4d4", flexShrink: 0, minWidth: 60 }}>
                  [{d.StartLine}:{d.StartColumn}]
                </span>
                <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {d.Message || d.Text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
