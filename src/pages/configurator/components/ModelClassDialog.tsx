import { useState } from "react";
import Editor from "@monaco-editor/react";
import { X, Save } from "lucide-react";

interface ModelClassDialogProps {
  title: string;
  body: string;
  onSave: (body: string) => void;
  onClose: () => void;
}

export function ModelClassDialog({ title, body, onSave, onClose }: ModelClassDialogProps) {
  const [value, setValue] = useState(body);

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-sidebar)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          width: "60vw",
          minWidth: 500,
          height: "65vh",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{ padding: "10px 16px", borderBottom: "1px solid var(--color-border)" }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
            {title}
          </span>
          <button className="toolbar-btn" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0">
          <Editor
            path={`inmemory://model/${title}`}
            language="csharp"
            value={value}
            onChange={(v) => setValue(v ?? "")}
            theme="hub-dark"
            options={{
              fontSize: 13,
              fontFamily: "Consolas, 'Courier New', monospace",
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              minimap: { enabled: false },
              automaticLayout: true,
              tabSize: 4,
              wordWrap: "on",
              scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
              padding: { top: 8 },
              acceptSuggestionOnEnter: "smart",
              tabCompletion: "on",
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 shrink-0" style={{ padding: "8px 16px", borderTop: "1px solid var(--color-border)" }}>
          <button className="toolbar-btn" style={{ padding: "4px 12px" }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="toolbar-btn"
            style={{ padding: "4px 12px", background: "#0e639c", color: "#fff", borderRadius: 3 }}
            onClick={() => onSave(value)}
          >
            <Save size={14} />
            <span style={{ marginLeft: 4 }}>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
