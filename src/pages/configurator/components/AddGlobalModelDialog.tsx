import { useCallback, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { HubWsApi } from "@/lib/ws-api";
import { useToast } from "@/providers/ToastProvider";
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
 * Enter — создать, Esc — закрыть.
 *
 * После успешного Add родитель (`GlobalModelsPanel`) перезагружает список
 * и выбирает новую запись.
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
    background: "var(--color-surface-400)",
    border: "1px solid var(--color-border)",
    borderRadius: 3,
    padding: "4px 8px",
    fontSize: 12,
    color: "var(--color-text-primary)",
    outline: "none",
  };

  return createPortal(
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
      onMouseDown={onClose}
    >
      <div
        style={{
          background: "var(--color-sidebar)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          width: 420,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between shrink-0"
          style={{ padding: "8px 14px", borderBottom: "1px solid var(--color-border)" }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
            Add Global Model
          </span>
          <button className="toolbar-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label
              style={{
                fontSize: 11,
                color: "var(--color-text-muted)",
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Category
            </label>
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
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                color: "var(--color-text-muted)",
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Type Name
            </label>
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
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  onClose();
                }
              }}
            />
            {trimmed && !isValidId && (
              <div style={{ fontSize: 11, color: "#f48771", marginTop: 4 }}>
                Must be a valid C# identifier (letters/digits/underscore, cannot start with a digit)
              </div>
            )}
            {duplicate && (
              <div style={{ fontSize: 11, color: "#f48771", marginTop: 4 }}>
                "{trimmed}" already exists in {category}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 shrink-0"
          style={{ padding: "8px 14px", borderTop: "1px solid var(--color-border)" }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "4px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-primary)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: "4px 14px",
              fontSize: 12,
              borderRadius: 3,
              border: "none",
              background: canSave ? "var(--color-accent)" : "var(--color-surface-400)",
              color: "#fff",
              cursor: canSave ? "pointer" : "not-allowed",
              opacity: canSave ? 1 : 0.6,
            }}
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
