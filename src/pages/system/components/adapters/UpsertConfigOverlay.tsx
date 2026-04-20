import { useState } from "react";
import { Plus } from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/design-tokens";
import type { AdapterConfiguration } from "../../types";
import { ConfigPicker, type PickedConfig } from "./ConfigPicker";
import { inputStyle, labelStyle } from "./lib/adapter-dialog-styles";

export type BaseOption = "NO" | "FRONT" | "BACK" | "CLONE" | "INHERITED";

export interface UpsertConfigOverlayProps {
  editing: AdapterConfiguration | null;
  adapterType: string;
  api: ReturnType<typeof useContourApi>;
  onClose: () => void;
}

/**
 * Диалог создания / редактирования `AdapterConfiguration`.
 *
 * В режиме «создать» доступен выбор **Base**:
 * - `NO` — просто новый конфиг (`createAdapterConfiguration`);
 * - `FRONT` / `BACK` — создание через Base-конфиги (FPH / BPH);
 * - `CLONE` / `INHERITED` — копирование с указанием исходной конфигурации
 *   через `<ConfigPicker>` (требуется выбрать `pickedConfig`, иначе `Save`
 *   заблокирован).
 *
 * В режиме «редактировать» шлётся `updateAdapterConfiguration` с теми же
 * полями, что и при создании без base — без изменения `AdapterType`.
 */
export function UpsertConfigOverlay({
  editing, adapterType, api, onClose,
}: UpsertConfigOverlayProps) {
  const isEditing = !!editing;
  const [name, setName] = useState(editing?.Name ?? "");
  const [desc, setDesc] = useState(editing?.Description ?? "");
  const [enabled, setEnabled] = useState(editing?.Enabled ?? true);
  const [exp, setExp] = useState(editing?.Exported ?? false);

  const [base, setBase] = useState<BaseOption>("NO");
  const [pickedConfig, setPickedConfig] = useState<PickedConfig | null>(null);
  const [condition, setCondition] = useState(false);
  const [host, setHost] = useState("");
  const [isContainerised, setIsContainerised] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const showClonePicker = base === "CLONE" || base === "INHERITED";

  const handleSave = async () => {
    if (!api || !name.trim()) return;
    if (showClonePicker && !pickedConfig) return;
    setSubmitting(true);
    try {
      if (isEditing) {
        await api.updateAdapterConfiguration({
          ConfigurationId: editing.ConfigurationId,
          AdapterType: adapterType,
          Name: name.trim(),
          Description: desc,
          Enabled: enabled,
          Exported: exp,
        });
      } else {
        const payload: Record<string, unknown> = {
          AdapterType: adapterType,
          Name: name.trim(),
          Description: desc,
          Exported: false,
          IsDefault: false,
        };
        if (showClonePicker && pickedConfig) {
          payload.CloningConfigurationId = pickedConfig.configurationId;
        }
        switch (base) {
          case "NO":
            await api.createAdapterConfiguration(payload);
            break;
          case "FRONT":
            await api.createBaseFrontConfiguration(payload);
            break;
          case "BACK":
            await api.createBaseBackConfiguration(payload);
            break;
          case "CLONE":
            await api.cloneConfiguration(payload);
            break;
          case "INHERITED":
            await api.cloneInheritedConfiguration(payload);
            break;
        }
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const canSave = name.trim().length > 0 && (!showClonePicker || !!pickedConfig);

  return (
    <Modal open onClose={onClose} size="md" style={{ width: 500, maxWidth: "min(500px, 94vw)" }}>
      <Modal.Header
        title={isEditing ? "Edit Configuration" : "Add Adapter Configuration"}
        icon={
          !isEditing ? (
            <Plus size={16} style={{ color: t.color.text.muted }} />
          ) : undefined
        }
      />
      <Modal.Body>
        <div className="flex flex-col" style={{ gap: t.space[3] }}>
          <label style={labelStyle}>
            Name{!isEditing && "*"}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              autoFocus
              placeholder="Name*"
            />
          </label>

          <label style={labelStyle}>
            Description
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={inputStyle}
              placeholder="Description"
            />
          </label>

          {isEditing ? (
            <>
              <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: t.space[2] }}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />{" "}
                Enabled
              </label>
              <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: t.space[2] }}>
                <input
                  type="checkbox"
                  checked={exp}
                  onChange={(e) => setExp(e.target.checked)}
                />{" "}
                Exported
              </label>
            </>
          ) : (
            <>
              <label style={labelStyle}>
                Base
                <select
                  value={base}
                  onChange={(e) => {
                    setBase(e.target.value as BaseOption);
                    setPickedConfig(null);
                  }}
                  style={{ ...inputStyle, height: 28, cursor: "pointer" }}
                >
                  <option value="NO">NO BASE</option>
                  <option value="FRONT">FRONT</option>
                  <option value="BACK">BACK</option>
                  <option value="CLONE">CLONE</option>
                  <option value="INHERITED">CLONE INHERITED</option>
                </select>
              </label>

              {showClonePicker && (
                <div style={{ display: "flex", flexDirection: "column", gap: t.space[1] }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    Clone from Configuration{" "}
                    {!pickedConfig && (
                      <span style={{ color: t.color.warning }}>*</span>
                    )}
                  </span>
                  <ConfigPicker api={api} picked={pickedConfig} onPick={setPickedConfig} />
                </div>
              )}

              <label
                style={{
                  ...labelStyle,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: t.space[2],
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={condition}
                  onChange={(e) => setCondition(e.target.checked)}
                />{" "}
                Condition
              </label>

              {condition && (
                <>
                  <label style={labelStyle}>
                    Host
                    <input
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      style={inputStyle}
                      placeholder="Host"
                    />
                  </label>
                  <label
                    style={{
                      ...labelStyle,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: t.space[2],
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isContainerised}
                      onChange={(e) => setIsContainerised(e.target.checked)}
                    />{" "}
                    Is Containerised
                  </label>
                </>
              )}
            </>
          )}
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
          disabled={submitting || !canSave}
          busy={submitting}
        >
          {submitting
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
              ? "Save"
              : "Create"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
