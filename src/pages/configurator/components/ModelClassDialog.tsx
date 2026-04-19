import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ModelClassDialogProps {
  title: string;
  body: string;
  onSave: (body: string) => void;
  onClose: () => void;
}

export function ModelClassDialog({ title, body, onSave, onClose }: ModelClassDialogProps) {
  const [value, setValue] = useState(body);

  return (
    <Modal open onClose={onClose} size="xl" aria-label={title}>
      <Modal.Header title={title} />
      <Modal.Body padded={false} style={{ height: "65vh", padding: 0 }}>
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
      </Modal.Body>
      <Modal.Footer>
        <Button size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button size="sm" variant="primary" icon={<Save size={14} />} onClick={() => onSave(value)}>Save</Button>
      </Modal.Footer>
    </Modal>
  );
}
