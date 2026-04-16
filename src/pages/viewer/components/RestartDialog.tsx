import { useState } from "react";
import { X } from "lucide-react";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";

type RestartMode = "restart" | "restartWithData";

interface RestartDialogProps {
  processId: number;
  stageIndex: number;
  stageName: string;
  mode: RestartMode;
  onSubmit: (data?: unknown) => Promise<void>;
  onClose: () => void;
}

export function RestartDialog({ processId, stageIndex, stageName, mode, onSubmit, onClose }: RestartDialogProps) {
  const [jsonText, setJsonText] = useState("{}");
  const [submitting, setSubmitting] = useState(false);

  const isWithData = mode === "restartWithData";

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (isWithData) {
        await onSubmit(JSON.parse(jsonText));
      } else {
        await onSubmit();
      }
    } catch {
      // error handled upstream
    } finally {
      setSubmitting(false);
    }
  };

  if (!isWithData) {
    return (
      <div
        className="flex flex-col bg-sidebar border border-border"
        style={{ width: 420, padding: 20, gap: 16 }}
      >
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 13, fontWeight: 600 }}>Restart Process</span>
          <button
            onClick={onClose}
            disabled={submitting}
            className="toolbar-btn"
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          Перезапустить процесс <strong>#{processId}</strong> со стейджа
          <br />
          <strong>#{stageIndex} — {stageName}</strong>?
        </div>
        <div className="flex items-center justify-end" style={{ gap: 8 }}>
          <button
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer disabled:opacity-50"
            style={{ padding: "4px 16px", fontSize: 13, background: "transparent", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="cursor-pointer disabled:opacity-50"
            style={{ padding: "4px 16px", fontSize: 13, background: "#0FD334", color: "#000", border: "none", fontWeight: 500 }}
          >
            {submitting ? "Перезапуск..." : "Restart"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-sidebar border border-border"
      style={{
        width: "60vw",
        height: "60vh",
        minWidth: 400,
        minHeight: 300,
        maxWidth: "90vw",
        maxHeight: "90vh",
        padding: 20,
        gap: 14,
        resize: "both",
        overflow: "hidden",
      }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          Restart with New Data — #{processId} stage #{stageIndex} ({stageName})
        </span>
        <button
          onClick={onClose}
          disabled={submitting}
          className="toolbar-btn"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 border border-border min-h-0">
        <JsonEditor value={jsonText} onChange={(v) => setJsonText(v)} />
      </div>

      <div className="flex items-center justify-end" style={{ gap: 8 }}>
        <button
          onClick={onClose}
          disabled={submitting}
          className="cursor-pointer disabled:opacity-50"
          style={{ padding: "4px 16px", fontSize: 13, background: "transparent", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        >
          Отмена
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="cursor-pointer disabled:opacity-50"
          style={{ padding: "4px 16px", fontSize: 13, background: "#5CADD5", color: "#000", border: "none", fontWeight: 500 }}
        >
          {submitting ? "Перезапуск..." : "Restart with Data"}
        </button>
      </div>
    </div>
  );
}
