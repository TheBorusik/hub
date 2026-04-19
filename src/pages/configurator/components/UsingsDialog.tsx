import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/Button/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { t as tok } from "@/lib/design-tokens";

interface UsingsDialogProps {
  usings: string[];
  onSave: (usings: string[]) => void;
  onClose: () => void;
}

export function UsingsDialog({ usings, onSave, onClose }: UsingsDialogProps) {
  const [items, setItems] = useState<string[]>(usings);
  const [input, setInput] = useState("");

  const addUsing = () => {
    const trimmed = input.trim().replace(/;+$/, "").trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) {
      setInput("");
      return;
    }
    setItems([...items, trimmed]);
    setInput("");
  };

  const removeAt = (i: number) => {
    setItems(items.filter((_, idx) => idx !== i));
  };

  return (
    <Modal open onClose={onClose} size="md" aria-label="Usings">
      <Modal.Header title="Usings" />
      <Modal.Body padded={false}>
        <div style={{ padding: "10px 14px", display: "flex", gap: 6 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addUsing(); }
            }}
            placeholder="e.g. System.Text.RegularExpressions"
            style={{
              flex: 1,
              background: tok.color.bg.panel,
              border: `1px solid ${tok.color.border.default}`,
              padding: "4px 8px",
              color: tok.color.text.primary,
              fontSize: 12,
              fontFamily: "Consolas, monospace",
              borderRadius: tok.radius.sm,
              outline: "none",
            }}
          />
          <IconButton size="sm" label="Add using" icon={<Plus size={14} />} onClick={addUsing} />
        </div>

        <div style={{ padding: "0 14px 10px" }}>
          {items.length === 0 ? (
            <EmptyState dense title="No usings" hint="The process relies only on the default set." />
          ) : (
            items.map((u, i) => (
              <div
                key={`${u}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 6px",
                  borderBottom: `1px solid ${tok.color.border.default}`,
                  fontSize: 12,
                  fontFamily: "Consolas, monospace",
                }}
              >
                <span style={{ color: tok.color.text.muted }}>using</span>
                <span style={{ flex: 1 }}>{u};</span>
                <IconButton
                  size="xs"
                  label="Remove"
                  icon={<Trash2 size={12} style={{ color: "#f44336" }} />}
                  onClick={() => removeAt(i)}
                />
              </div>
            ))
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button size="sm" variant="primary" onClick={() => onSave(items)}>Save</Button>
      </Modal.Footer>
    </Modal>
  );
}
