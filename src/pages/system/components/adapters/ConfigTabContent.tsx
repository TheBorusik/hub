import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel } from "react-resizable-panels";
import {
  Folder, Lock, Plus, Save, Trash2, Unlock,
} from "lucide-react";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { IconButton } from "@/components/ui/Button/IconButton";
import { t as tok } from "@/lib/design-tokens";
import { useAutoSaveLayout } from "@/hooks/useAutoSaveLayout";
import {
  BuildRulesEditor,
  BuildRulesToggleButton,
  BUILD_RULES_TEMPLATE,
} from "./BuildRulesEditor";
import type { AdapterConfiguration, ConfigSection } from "../../types";
import { Placeholder } from "./lib/Placeholder";
import { tryFormatJson } from "./lib/adapter-dialog-styles";

/** Открытая вкладка конфигурации (без выбранной секции — она в `sectionSelection` в редьюсере). */
export interface OpenTab {
  config: AdapterConfiguration;
}

export interface ConfigTabContentProps {
  tab: OpenTab;
  selectedSectionId: number | null;
  /** true — эта вкладка сейчас видимая, только она обрабатывает Ctrl+S. */
  isActive: boolean;
  sections: ConfigSection[];
  isLoadingSections: boolean;
  onSelectSection: (configId: number, sectionId: number | null) => void;
  onAddSection: (configId: number) => void;
  onSaveSection: (
    configId: number,
    section: ConfigSection,
    editedJson: string,
    editedBuildRules?: string,
    editedBuildTable?: string,
  ) => Promise<void>;
  onDeleteSection: (section: ConfigSection, configId: number) => void;
  onToggleLock: (section: ConfigSection, configId: number) => Promise<void>;
  onDirtyChange: (configId: number, dirty: boolean) => void;
}

/**
 * Правая сторона вкладки конфигурации: слева — список секций, справа —
 * редактор (JSON / BuildRules / BuildTable через `BuildRulesEditor`).
 *
 * Держит локальный dirty-стейт (JSON/BuildRules/BuildTable) и пробрасывает
 * его вверх через `onDirtyChange`. Ctrl+S работает только когда
 * `isActive === true` — иначе при нескольких открытых вкладках сохранение
 * сработало бы во всех сразу.
 */
function ConfigTabContentInner({
  tab,
  selectedSectionId,
  isActive,
  sections,
  isLoadingSections,
  onSelectSection,
  onAddSection,
  onSaveSection,
  onDeleteSection,
  onToggleLock,
  onDirtyChange,
}: ConfigTabContentProps) {
  const configId = tab.config.ConfigurationId;
  const selectedSection = sections.find((s) => s.SectionId === selectedSectionId) ?? null;
  const [editedJson, setEditedJson] = useState("");
  const [editedBuildRules, setEditedBuildRules] = useState("");
  const [editedBuildTable, setEditedBuildTable] = useState("");
  const [saving, setSaving] = useState(false);
  const originalJsonRef = useRef("");
  const originalBuildRulesRef = useRef("");
  const originalBuildTableRef = useRef("");

  // rrp v4: autoSaveId нет — сохраняем layout сами per-tab.
  const layoutProps = useAutoSaveLayout(`tab-sections-${tab.config.ConfigurationId}`);

  useEffect(() => {
    if (!selectedSection) return;
    const json = tryFormatJson(selectedSection.JsonData ?? "{}");
    const rules = tryFormatJson(selectedSection.BuildRules ?? "");
    const table =
      typeof selectedSection.BuildTable === "string"
        ? selectedSection.BuildTable
        : selectedSection.BuildTable
          ? "true"
          : "";
    setEditedJson(json);
    setEditedBuildRules(rules);
    setEditedBuildTable(table);
    originalJsonRef.current = json;
    originalBuildRulesRef.current = rules;
    originalBuildTableRef.current = table;
    onDirtyChange(configId, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSection?.SectionId, configId]);

  const isDirty =
    editedJson !== originalJsonRef.current ||
    editedBuildRules !== originalBuildRulesRef.current ||
    editedBuildTable !== originalBuildTableRef.current;

  const hasBuildRules = !!(selectedSection && (selectedSection.BuildRules || editedBuildRules));

  const handleJsonChange = (val: string) => {
    setEditedJson(val);
    onDirtyChange(
      configId,
      val !== originalJsonRef.current ||
        editedBuildRules !== originalBuildRulesRef.current ||
        editedBuildTable !== originalBuildTableRef.current,
    );
  };
  const handleBuildRulesChange = (val: string) => {
    setEditedBuildRules(val);
    onDirtyChange(
      configId,
      editedJson !== originalJsonRef.current ||
        val !== originalBuildRulesRef.current ||
        editedBuildTable !== originalBuildTableRef.current,
    );
  };
  const handleBuildTableChange = (val: string) => {
    setEditedBuildTable(val);
    onDirtyChange(
      configId,
      editedJson !== originalJsonRef.current ||
        editedBuildRules !== originalBuildRulesRef.current ||
        val !== originalBuildTableRef.current,
    );
  };

  const handleCreateBuildRules = () => {
    setEditedBuildRules(BUILD_RULES_TEMPLATE);
    onDirtyChange(configId, true);
  };
  const handleRemoveBuildRules = () => {
    setEditedBuildRules("");
    setEditedBuildTable("");
    onDirtyChange(configId, true);
  };

  const handleSave = useCallback(async () => {
    if (!selectedSection || !isDirty) return;
    setSaving(true);
    try {
      await onSaveSection(
        configId,
        selectedSection,
        editedJson,
        editedBuildRules,
        editedBuildTable,
      );
      originalJsonRef.current = editedJson;
      originalBuildRulesRef.current = editedBuildRules;
      originalBuildTableRef.current = editedBuildTable;
      onDirtyChange(configId, false);
    } finally {
      setSaving(false);
    }
  }, [
    selectedSection,
    isDirty,
    editedJson,
    editedBuildRules,
    editedBuildTable,
    onSaveSection,
    onDirtyChange,
    configId,
  ]);

  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && isDirty && selectedSection) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isActive, isDirty, selectedSection, handleSave]);

  return (
    <Group
      orientation="horizontal"
      id={`tab-sections-${tab.config.ConfigurationId}`}
      {...layoutProps}
    >
      <Panel defaultSize="220px" minSize="140px" maxSize="40%" groupResizeBehavior="preserve-pixel-size">
        <div
          className="flex flex-col h-full"
          style={{ background: "var(--color-sidebar)", borderRight: "1px solid var(--color-border)" }}
        >
          <div
            className="flex items-center shrink-0"
            style={{ padding: "6px 10px", borderBottom: "1px solid var(--color-border)" }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                flex: 1,
              }}
            >
              Sections
              {sections.length > 0 && (
                <span style={{ fontWeight: 400, marginLeft: 6 }}>{sections.length}</span>
              )}
            </span>
            <button
              onClick={() => onAddSection(configId)}
              className="toolbar-btn"
              title="Add Section"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {isLoadingSections && sections.length === 0 && (
              <div style={{ padding: 10, fontSize: 12, color: "var(--color-text-muted)" }}>Loading...</div>
            )}
            {!isLoadingSections && sections.length === 0 && (
              <div style={{ padding: 10, fontSize: 12, color: "var(--color-text-muted)" }}>No sections</div>
            )}
            {sections.map((s) => {
              const isSel = s.SectionId === selectedSectionId;
              return (
                <div
                  key={s.SectionId}
                  className="flex items-center group adapter-tree-row"
                  data-selected={isSel ? "true" : undefined}
                  onClick={() => onSelectSection(configId, s.SectionId)}
                  style={{
                    height: 26,
                    padding: "0 10px",
                    cursor: "pointer",
                    fontSize: 12,
                    gap: 6,
                    color: isSel ? "var(--color-text)" : "var(--color-text-muted)",
                    fontWeight: isSel ? 500 : 400,
                  }}
                >
                  {s.Locked ? (
                    <Lock size={12} style={{ flexShrink: 0, color: "#F6511D" }} />
                  ) : (
                    <Folder size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
                  )}
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {s.DisplayName || s.Name}
                  </span>
                  {s.BuildTable && (
                    <span
                      style={{
                        fontSize: 9,
                        background: "rgba(255,255,255,0.08)",
                        color: "var(--color-text-muted)",
                        borderRadius: 3,
                        padding: "0 3px",
                        lineHeight: "16px",
                        flexShrink: 0,
                      }}
                    >
                      BT
                    </span>
                  )}
                  <button
                    className="hidden group-hover:inline-flex tree-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSection(s, configId);
                    }}
                    style={{ color: "#F44336" }}
                    title="Delete Section"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <ResizeHandle />

      <Panel minSize="30%">
        <div className="flex flex-col h-full" style={{ background: "#1e1e1e" }}>
          {selectedSection ? (
            <>
              <PanelHeader
                icon={<Folder size={12} style={{ color: tok.color.text.muted }} />}
                title={
                  <span>
                    {selectedSection.DisplayName || selectedSection.Name}
                    {isDirty && (
                      <span style={{ color: tok.color.text.muted, marginLeft: 4, fontWeight: 400 }}>
                        • modified
                      </span>
                    )}
                  </span>
                }
                hint={`ID: ${selectedSection.SectionId}${selectedSection.Inherited ? " · Inherited" : ""}`}
                actions={
                  <>
                    <BuildRulesToggleButton
                      hasBuildRules={hasBuildRules}
                      onCreateBuildRules={handleCreateBuildRules}
                    />
                    <IconButton
                      size="xs"
                      label={selectedSection.Locked ? "Unlock" : "Lock"}
                      icon={
                        selectedSection.Locked ? (
                          <Lock size={14} style={{ color: "#F6511D" }} />
                        ) : (
                          <Unlock size={14} />
                        )
                      }
                      onClick={() => onToggleLock(selectedSection, configId)}
                    />
                    <IconButton
                      size="xs"
                      label="Save (Ctrl+S)"
                      icon={<Save size={14} style={{ color: isDirty ? "#4CAF50" : undefined }} />}
                      onClick={handleSave}
                      disabled={!isDirty || saving}
                    />
                    <IconButton
                      size="xs"
                      label="Delete Section"
                      icon={<Trash2 size={14} style={{ color: "#F44336" }} />}
                      onClick={() => onDeleteSection(selectedSection, configId)}
                    />
                  </>
                }
              />
              <div className="flex-1" style={{ minHeight: 0 }}>
                {/*
                  Только активная вкладка держит Monaco: иначе при нескольких
                  открытых конфигурациях каждая тянет полный JsonEditor → лаги UI.
                  Строки редактора живут в state выше; при возврате на вкладку
                  редактор монтируется заново.
                */}
                {isActive ? (
                  <BuildRulesEditor
                    sectionId={selectedSection.SectionId}
                    editedJson={editedJson}
                    onJsonChange={handleJsonChange}
                    editedBuildRules={editedBuildRules}
                    onBuildRulesChange={handleBuildRulesChange}
                    editedBuildTable={editedBuildTable}
                    onBuildTableChange={handleBuildTableChange}
                    hasBuildRules={hasBuildRules}
                    onRemoveBuildRules={handleRemoveBuildRules}
                    pathPrefix="config-section"
                  />
                ) : (
                  <div style={{ flex: 1, minHeight: 0, background: "#1e1e1e" }} aria-hidden />
                )}
              </div>
            </>
          ) : (
            <Placeholder text="Select a section to view its configuration" />
          )}
        </div>
      </Panel>
    </Group>
  );
}

export const ConfigTabContent = memo(ConfigTabContentInner);
