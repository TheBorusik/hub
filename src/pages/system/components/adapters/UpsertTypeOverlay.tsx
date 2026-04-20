import { useState } from "react";
import { useContourApi } from "@/lib/ws-api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { AdapterType } from "../../types";
import { t } from "@/lib/design-tokens";
import { inputStyle, labelStyle } from "./lib/adapter-dialog-styles";

export interface UpsertTypeOverlayProps {
  editing: AdapterType | null;
  api: ReturnType<typeof useContourApi>;
  onClose: () => void;
}

/**
 * Диалог создания / редактирования `AdapterType` (корневой узел дерева).
 * При редактировании `AdapterType` нельзя менять — поле только на чтение,
 * потому что это бизнес-ключ.
 */
export function UpsertTypeOverlay({ editing, api, onClose }: UpsertTypeOverlayProps) {
  const [name, setName] = useState(editing?.AdapterType ?? "");
  const [maxInst, setMaxInst] = useState(String(editing?.MaxInstances ?? 1));
  const [exported, setExported] = useState(editing?.Exported ?? false);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!api || !name.trim()) return;
    setSubmitting(true);
    try {
      await api.upsertAdapterType({
        AdapterType: name.trim(),
        MaxInstances: Number(maxInst),
        Exported: exported,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} size="sm" style={{ width: 400, maxWidth: "min(400px, 92vw)" }}>
      <Modal.Header title={editing ? "Edit Adapter Type" : "Add Adapter Type"} />
      <Modal.Body>
        <div className="flex flex-col" style={{ gap: t.space[2] }}>
          <label style={labelStyle}>
            AdapterType
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!!editing}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            MaxInstances
            <input
              type="number"
              value={maxInst}
              onChange={(e) => setMaxInst(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: t.space[2] }}>
            <input
              type="checkbox"
              checked={exported}
              onChange={(e) => setExported(e.target.checked)}
            />{" "}
            Exported
          </label>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="button"
          onClick={() => { void handleSave(); }}
          disabled={submitting}
          busy={submitting}
        >
          {submitting ? "Saving..." : "Save"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
