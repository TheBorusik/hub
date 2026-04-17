import { useState, useEffect, useRef } from "react";
import { DiffEditor, type Monaco } from "@monaco-editor/react";
import { Loader2, GitCommitHorizontal, FileEdit } from "lucide-react";
import type { HubWsApi } from "@/lib/ws-api";
import type { WebProcess } from "@/lib/ws-api-models";
import { setupWfmCSharp } from "../monaco/wfm-csharp";

interface DiffViewProps {
  api: HubWsApi;
  process: WebProcess;
}

export function DiffView({ api, process }: DiffViewProps) {
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");
  const [loading, setLoading] = useState(true);
  const [originalExists, setOriginalExists] = useState(true);
  const [originInfo, setOriginInfo] = useState<string>("git");
  const lastRequested = useRef<string | null>(null);

  useEffect(() => {
    const key = process.TypeName;
    if (lastRequested.current === key) return;
    lastRequested.current = key;

    setLoading(true);
    (async () => {
      try {
        const [src, code] = await Promise.all([
          api.getProcessSource(process.TypeName, undefined, "git").catch(() => ({
            SourceCs: "",
            Origin: "git" as string | undefined,
            Exists: false,
          })),
          api.getProcessCode(process),
        ]);

        setOriginal(src.SourceCs ?? "");
        setOriginalExists(!!src.Exists);
        setOriginInfo(src.Origin ?? "git");
        setModified(code.Code ?? "");
      } catch {
        setOriginal("");
        setModified("");
      } finally {
        setLoading(false);
      }
    })();
  }, [api, process]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: "var(--color-text-muted)" }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center shrink-0"
        style={{
          padding: "4px 12px",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-sidebar)",
          fontSize: 11,
          color: "var(--color-text-muted)",
          gap: 8,
        }}
      >
        <span className="flex items-center gap-1">
          <GitCommitHorizontal size={12} />
          {originalExists ? (
            <>Committed ({originInfo})</>
          ) : (
            <span style={{ color: "var(--color-warning, #d19a66)" }}>No committed version (new draft)</span>
          )}
        </span>
        <span style={{ margin: "0 8px" }}>↔</span>
        <span className="flex items-center gap-1">
          <FileEdit size={12} />
          Current draft
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <DiffEditor
          original={original}
          modified={modified}
          language="csharp"
          theme="wfm-dark"
          onMount={(_, monaco: Monaco) => { setupWfmCSharp(monaco); }}
          options={{
            fontSize: 13,
            fontFamily: "Consolas, 'Courier New', monospace",
            readOnly: true,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            renderSideBySide: true,
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  );
}
