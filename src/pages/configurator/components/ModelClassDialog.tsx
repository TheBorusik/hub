import { useState } from "react";
import { Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EditorPanel } from "@/components/ui/EditorPanel";

interface ModelClassDialogProps {
  title: string;
  body: string;
  onSave: (body: string) => void;
  onClose: () => void;
}

export function ModelClassDialog({ title, body, onSave, onClose }: ModelClassDialogProps) {
  const [value, setValue] = useState(body);

  return (
    <Modal open onClose={onClose} size="xl" aria-label={title} style={{ height: "75vh" }}>
      <Modal.Header title={title} />
      <Modal.Body padded={false}>
        <EditorPanel
          showHeader={false}
          language="csharp"
          value={value}
          onChange={setValue}
          path={`inmemory://model/${title}`}
          options={{
            fontSize: 13,
            padding: { top: 8 },
            acceptSuggestionOnEnter: "smart",
            tabCompletion: "on",
            wordWrap: "on",
            minimap: { enabled: false },
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
