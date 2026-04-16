import { X } from "lucide-react";
import { JsonEditor } from "@/pages/command-tester/components/JsonEditor";

interface JsonViewerDialogProps {
  title: string;
  value: unknown;
  onClose: () => void;
}

export function JsonViewerDialog({ title, value, onClose }: JsonViewerDialogProps) {
  const json = typeof value === "string" ? value : JSON.stringify(value, null, 2);

  return (
    <div
      className="flex flex-col bg-sidebar border border-border"
      style={{
        width: "60vw",
        height: "70vh",
        minWidth: 400,
        minHeight: 250,
        maxWidth: "90vw",
        maxHeight: "90vh",
        padding: 20,
        gap: 10,
        resize: "both",
        overflow: "hidden",
      }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        <button
          onClick={onClose}
          className="toolbar-btn"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 border border-border min-h-0">
        <JsonEditor value={json} readOnly />
      </div>
    </div>
  );
}
