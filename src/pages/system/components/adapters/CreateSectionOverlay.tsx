import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useContourApi } from "@/lib/ws-api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/design-tokens";
import type { ConfigSection } from "../../types";
import { inputStyle, labelStyle } from "./lib/adapter-dialog-styles";

export interface CreateSectionOverlayProps {
  configId: number;
  api: ReturnType<typeof useContourApi>;
  onClose: () => void;
}

/**
 * Диалог создания новой секции в рамках конфигурации. Если выбрана
 * inherited base-секция — заполняет Name / DisplayName / JsonData из неё
 * как стартовое значение.
 *
 * Рендерится через UI-kit `<Modal>` (portal, focus-trap, backdrop).
 */
export function CreateSectionOverlay({ configId, api, onClose }: CreateSectionOverlayProps) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inheritedId, setInheritedId] = useState<number | null>(null);
  const [baseSections, setBaseSections] = useState<ConfigSection[]>([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getBaseSections();
        const list =
          (res as Record<string, unknown>).ConfigurationSections ??
          (res as Record<string, unknown>).Sections;
        if (!cancelled) setBaseSections(Array.isArray(list) ? (list as ConfigSection[]) : []);
      } catch {
        if (!cancelled) setBaseSections([]);
      } finally {
        if (!cancelled) setLoadingBase(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const handleInheritedChange = (sectionId: number | null) => {
    setInheritedId(sectionId);
    if (sectionId !== null) {
      const base = baseSections.find((s) => s.SectionId === sectionId);
      if (base) {
        setName(base.Name);
        setDisplayName(base.DisplayName ?? "");
      }
    }
  };

  const handleCreate = async () => {
    if (!api || !name.trim()) return;
    setSubmitting(true);
    try {
      let jsonData: unknown = {};
      if (inheritedId !== null) {
        const base = baseSections.find((s) => s.SectionId === inheritedId);
        if (base?.JsonData) {
          jsonData =
            typeof base.JsonData === "string" ? JSON.parse(base.JsonData) : base.JsonData;
        }
      }
      await api.createSection({
        ConfigurationId: configId,
        Name: name.trim(),
        DisplayName: displayName.trim() || null,
        Inherited: inheritedId,
        JsonData: jsonData,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = name.trim().length > 0;

  return (
    <Modal open onClose={onClose} size="sm" style={{ width: 440, maxWidth: "min(440px, 92vw)" }}>
      <Modal.Header
        title="Add Section"
        icon={<Plus size={16} style={{ color: t.color.text.muted }} />}
      />
      <Modal.Body>
        <div className="flex flex-col" style={{ gap: t.space[3] }}>
          <label style={labelStyle}>
            Inherited
            <select
              value={inheritedId ?? ""}
              onChange={(e) =>
                handleInheritedChange(e.target.value ? Number(e.target.value) : null)
              }
              style={{ ...inputStyle, height: 28, cursor: "pointer" }}
              disabled={loadingBase}
            >
              <option value="">{loadingBase ? "Loading..." : "NO INHERITED"}</option>
              {baseSections.map((s) => (
                <option key={s.SectionId} value={s.SectionId}>
                  {s.Name}
                  {s.DisplayName ? ` — ${s.DisplayName}` : ""} (ID: {s.SectionId})
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Name*
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder="Name*"
            />
          </label>
          <label style={labelStyle}>
            Display Name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={inputStyle}
              placeholder="Display Name"
            />
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
          onClick={() => { void handleCreate(); }}
          disabled={submitting || !canSubmit}
          busy={submitting}
        >
          {submitting ? "Creating..." : "Create"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
