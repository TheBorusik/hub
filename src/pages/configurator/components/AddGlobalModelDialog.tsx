import { useCallback, useState, type CSSProperties } from "react";
import type { HubWsApi } from "@/lib/ws-api";
import { useToast } from "@/providers/ToastProvider";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormRow } from "@/components/ui/FormRow";
import { t } from "@/lib/design-tokens";
import { GLOBAL_MODEL_CATEGORIES } from "../lib/global-models";

interface AddGlobalModelDialogProps {
  api: HubWsApi;
  /** Множество ключей `Category::TypeName` уже существующих моделей — для дубль-чека. */
  existingNames: Set<string>;
  onClose: () => void;
  onAdded: (m: { Category: string; TypeName: string }) => void;
}

/**
 * Диалог создания новой глобальной модели (MODEL / HELPER / CRUD).
 * Валидация: C#-идентификатор + отсутствие дубля в выбранной категории.
 * Enter — создать, Esc — закрыть. Поверх <Modal>: focus-trap, return focus,
 * единый backdrop/z-index.
 */
export function AddGlobalModelDialog({
  api,
  existingNames,
  onClose,
  onAdded,
}: AddGlobalModelDialogProps) {
  const toast = useToast();
  const [category, setCategory] = useState<string>("MODEL");
  const [typeName, setTypeName] = useState("");
  const [saving, setSaving] = useState(false);

  const trimmed = typeName.trim();
  const isValidId = /^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed);
  const duplicate = isValidId && existingNames.has(`${category}::${trimmed}`);
  const canSave = isValidId && !duplicate && !saving;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.addGlobalModel({ Category: category, TypeName: trimmed, Code: "" }, true);
      onAdded({ Category: category, TypeName: trimmed });
    } catch (e) {
      toast.push("error", "Add failed", { detail: String(e) });
      setSaving(false);
    }
  }, [api, canSave, category, onAdded, toast, trimmed]);

  const inputStyle: CSSProperties = {
    width: "100%",
    background: t.color.bg.editor,
    border: `1px solid ${t.color.border.default}`,
    borderRadius: t.radius.sm,
    padding: `${t.space[2]} ${t.space[4]}`,
    fontSize: t.font.size.xs,
    color: t.color.text.primary,
    outline: "none",
  };

  const typeNameError = trimmed && !isValidId
    ? "Must be a valid C# identifier (letters/digits/underscore, cannot start with a digit)"
    : duplicate
      ? `"${trimmed}" already exists in ${category}`
      : undefined;

  return (
    <Modal open onClose={onClose} size="sm" aria-label="Add Global Model">
      <Modal.Header title="Add Global Model" />
      <Modal.Body>
        <div style={{ display: "flex", flexDirection: "column", gap: t.space[5] }}>
          <FormRow label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              {GLOBAL_MODEL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Type Name" error={typeNameError}>
            <input
              autoFocus
              style={inputStyle}
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="e.g. DateHelper"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSave) {
                  e.preventDefault();
                  void handleSave();
                }
              }}
            />
          </FormRow>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button size="sm" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={!canSave}
          busy={saving}
          onClick={() => { void handleSave(); }}
        >
          {saving ? "Adding..." : "Add"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
