import { useState } from "react";
import { Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CodeEditor } from "@/components/ui/CodeEditor";

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
        <CodeEditor
          value={value}
          onChange={setValue}
          language="csharp"
          path={`inmemory://model/${title}`}
          wordWrap="on"
          options={{
            fontSize: 13,
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
