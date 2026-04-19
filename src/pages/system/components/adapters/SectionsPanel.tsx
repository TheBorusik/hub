import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Plus, Trash2, Search, X, Folder, Save, Lock, Unlock } from "lucide-react";
import { Group, Panel } from "react-resizable-panels";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { useContourApi } from "@/lib/ws-api";
import { BuildRulesEditor, BuildRulesToggleButton, BUILD_RULES_TEMPLATE } from "./BuildRulesEditor";
import type { ConfigSection } from "../../types";
import { PanelToolbar } from "@/components/ui/PanelToolbar";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { IconButton } from "@/components/ui/Button/IconButton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { t as tok } from "@/lib/design-tokens";

type Overlay =
  | { type: "none" }
  | { type: "createSection" };

export function SectionsPanel() {
  const api = useContourApi();
  const confirm = useConfirm();
  const [sections, setSections] = useState<ConfigSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [overlay, setOverlay] = useState<Overlay>({ type: "none" });

  const [editedJson, setEditedJson] = useState("");
  const [editedBuildRules, setEditedBuildRules] = useState("");
  const [editedBuildTable, setEditedBuildTable] = useState("");
  const [saving, setSaving] = useState(false);
  const originalJsonRef = useRef("");
  const originalBuildRulesRef = useRef("");
  const originalBuildTableRef = useRef("");

  const loadSections = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const res = await api.getBaseSections();
      const list = (res as Record<string, unknown>).ConfigurationSections;
      setSections(Array.isArray(list) ? (list as ConfigSection[]) : []);
    } catch { setSections([]); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { loadSections(); }, [loadSections]);

  const selectedSection = sections.find((s) => s.SectionId === selectedId) ?? null;

  useEffect(() => {
    if (selectedSection) {
      const json = tryFormatJson(selectedSection.JsonData ?? "{}");
      const rules = tryFormatJson(selectedSection.BuildRules ?? "");
      const table = typeof selectedSection.BuildTable === "string" ? selectedSection.BuildTable : (selectedSection.BuildTable ? "true" : "");
      setEditedJson(json);
      setEditedBuildRules(rules);
      setEditedBuildTable(table);
      originalJsonRef.current = json;
      originalBuildRulesRef.current = rules;
      originalBuildTableRef.current = table;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSection?.SectionId]);

  const isDirty = editedJson !== originalJsonRef.current
    || editedBuildRules !== originalBuildRulesRef.current
    || editedBuildTable !== originalBuildTableRef.current;

  const hasBuildRules = !!(selectedSection && (selectedSection.BuildRules || editedBuildRules));

  const handleCreateBuildRules = () => {
    setEditedBuildRules(BUILD_RULES_TEMPLATE);
  };

  const handleRemoveBuildRules = () => {
    setEditedBuildRules("");
    setEditedBuildTable("");
  };

  const handleSave = async () => {
    if (!api || !selectedSection || !isDirty) return;
    let parsedJson: unknown;
    try { parsedJson = JSON.parse(editedJson); } catch {
      alert("Invalid JSON in section data");
      return;
    }
    let parsedRules: unknown = null;
    if (editedBuildRules.trim()) {
      try { parsedRules = JSON.parse(editedBuildRules); } catch {
        alert("Invalid JSON in Build Rules");
        return;
      }
    }
    setSaving(true);
    try {
      await api.updateSection({
        SectionId: selectedSection.SectionId,
        Name: selectedSection.Name,
        DisplayName: selectedSection.DisplayName ?? null,
        Inherited: selectedSection.Inherited ?? null,
        JsonData: parsedJson,
        BuildRules: parsedRules,
        BuildTable: editedBuildTable.trim() || null,
      });
      originalJsonRef.current = editedJson;
      originalBuildRulesRef.current = editedBuildRules;
      originalBuildTableRef.current = editedBuildTable;
      await loadSections();
    } finally { setSaving(false); }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && isDirty && selectedSection) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, selectedSection, editedJson, editedBuildRules, editedBuildTable]);

  const handleToggleLock = async () => {
    if (!api || !selectedSection) return;
    const newLocked = !selectedSection.Locked;
    await api.updateSection({
      SectionId: selectedSection.SectionId,
      Name: selectedSection.Name,
      DisplayName: selectedSection.DisplayName ?? null,
      Inherited: selectedSection.Inherited ?? null,
      JsonData: selectedSection.JsonData ? (typeof selectedSection.JsonData === "string" ? JSON.parse(selectedSection.JsonData) : selectedSection.JsonData) : {},
      Locked: newLocked,
    });
    await loadSections();
  };

  const handleDelete = async (s: ConfigSection) => {
    if (!api) return;
    const ok = await confirm({
      title: "Delete Base Section",
      message: `Delete base section "${s.Name}"?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    await api.deleteSection(s.SectionId);
    if (selectedId === s.SectionId) setSelectedId(null);
    loadSections();
  };

  const lowerFilter = filter.toLowerCase();
  const filtered = lowerFilter
    ? sections.filter((s) => s.Name.toLowerCase().includes(lowerFilter) || (s.DisplayName ?? "").toLowerCase().includes(lowerFilter) || String(s.SectionId).includes(lowerFilter))
    : sections;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ position: "relative" }}>
      <Group direction="horizontal" id="base-sections-layout">
        {/* Left: section list */}
        <Panel defaultSize="260px" minSize="160px" maxSize="40%" groupResizeBehavior="preserve-pixel-size">
          <div className="flex flex-col h-full" style={{ background: tok.color.bg.sidebar }}>
            <PanelToolbar
              dense
              left={
                <>
                  <IconButton
                    size="xs"
                    label="Refresh"
                    icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
                    onClick={loadSections}
                    disabled={loading}
                  />
                  <IconButton
                    size="xs"
                    label="Add Base Section"
                    icon={<Plus size={14} />}
                    onClick={() => setOverlay({ type: "createSection" })}
                  />
                </>
              }
              right={
                <span style={{ fontSize: 10, fontWeight: 600, color: tok.color.text.muted, textTransform: "uppercase" }}>
                  Base Sections
                </span>
              }
            />
            <div className="shrink-0" style={{ padding: "4px 8px", borderBottom: `1px solid ${tok.color.border.default}` }}>
              <div
                className="flex items-center gap-1"
                style={{
                  background: tok.color.bg.panel,
                  border: `1px solid ${tok.color.border.default}`,
                  borderRadius: tok.radius.sm,
                  padding: "0 6px",
                  height: 24,
                }}
              >
                <Search size={12} style={{ flexShrink: 0, color: tok.color.text.muted }} />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search section..."
                  style={{
                    flex: 1,
                    background: "none",
                    border: "none",
                    color: tok.color.text.primary,
                    fontSize: tok.font.size.xs,
                    outline: "none",
                    height: "100%",
                  }}
                />
                {filter && (
                  <IconButton size="xs" label="Clear" icon={<X size={12} />} onClick={() => setFilter("")} />
                )}
              </div>
            </div>
            {/* List */}
            <div className="flex-1 overflow-auto">
              {filtered.map((s) => {
                const isSel = s.SectionId === selectedId;
                return (
                  <div key={s.SectionId} className="flex items-center group"
                    onClick={() => setSelectedId(s.SectionId)}
                    style={{ height: 26, padding: "0 10px", cursor: "pointer", fontSize: 12, gap: 6, color: isSel ? "var(--color-text)" : "var(--color-text-muted)", backgroundColor: isSel ? "rgba(255,255,255,0.07)" : "transparent", fontWeight: isSel ? 500 : 400 }}
                    onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {s.Locked ? <Lock size={12} style={{ flexShrink: 0, color: "#F6511D" }} /> : <Folder size={12} style={{ flexShrink: 0, opacity: 0.6 }} />}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{s.Name}</span>
                    {s.BuildTable && <span style={{ fontSize: 9, background: "rgba(255,255,255,0.08)", color: "var(--color-text-muted)", borderRadius: 3, padding: "0 3px", lineHeight: "16px", flexShrink: 0 }}>BT</span>}
                    <button className="hidden group-hover:inline-flex tree-action-btn" onClick={(e) => { e.stopPropagation(); handleDelete(s); }} style={{ color: "#F44336" }} title="Delete"><Trash2 size={11} /></button>
                  </div>
                );
              })}
              {filtered.length === 0 && !loading && (
                <EmptyState dense title={filter ? "No matches" : "No base sections"} />
              )}
              {loading && sections.length === 0 && <EmptyState dense title="Loading..." />}
            </div>
          </div>
        </Panel>

        <ResizeHandle />

        {/* Right: editor area */}
        <Panel minSize="30%">
          <div className="flex flex-col h-full" style={{ background: "#1e1e1e" }}>
            {selectedSection ? (<>
              <PanelHeader
                icon={<Folder size={12} style={{ color: tok.color.text.muted }} />}
                title={
                  <span>
                    {selectedSection.Name}
                    {isDirty && <span style={{ color: tok.color.text.muted, marginLeft: 4, fontWeight: 400 }}>• modified</span>}
                  </span>
                }
                hint={`ID: ${selectedSection.SectionId}${selectedSection.Inherited ? ` · Inherited: ${selectedSection.Inherited}` : ""}`}
                actions={
                  <>
                    <BuildRulesToggleButton hasBuildRules={hasBuildRules} onCreateBuildRules={handleCreateBuildRules} />
                    <IconButton
                      size="xs"
                      label={selectedSection.Locked ? "Unlock" : "Lock"}
                      icon={selectedSection.Locked ? <Lock size={14} style={{ color: "#F6511D" }} /> : <Unlock size={14} />}
                      onClick={handleToggleLock}
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
                      onClick={() => handleDelete(selectedSection)}
                    />
                  </>
                }
              />

              {/* Editors */}
              <div className="flex-1" style={{ minHeight: 0 }}>
                <BuildRulesEditor
                  sectionId={selectedSection.SectionId}
                  editedJson={editedJson} onJsonChange={setEditedJson}
                  editedBuildRules={editedBuildRules} onBuildRulesChange={setEditedBuildRules}
                  editedBuildTable={editedBuildTable} onBuildTableChange={setEditedBuildTable}
                  hasBuildRules={hasBuildRules}
                  onRemoveBuildRules={handleRemoveBuildRules}
                  pathPrefix="base-section"
                />
              </div>
            </>) : (
              <EmptyState
                icon={<Folder size={40} />}
                title="Select a base section to edit"
                hint="Choose a section from the left panel"
              />
            )}
          </div>
        </Panel>
      </Group>

      <CreateBaseSectionModal
        open={overlay.type === "createSection"}
        api={api}
        baseSections={sections}
        onClose={() => { setOverlay({ type: "none" }); loadSections(); }}
      />
    </div>
  );
}

/* ===== Helpers ===== */

function tryFormatJson(raw: unknown): string {
  if (raw == null || raw === "") return "";
  if (typeof raw !== "string") { try { return JSON.stringify(raw, null, 2); } catch { return "{}"; } }
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
}

/* ===== Modals ===== */

function CreateBaseSectionModal({ open, api, baseSections, onClose }: {
  open: boolean;
  api: ReturnType<typeof useContourApi>;
  baseSections: ConfigSection[];
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inheritedId, setInheritedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setDisplayName("");
      setInheritedId(null);
      setSubmitting(false);
    }
  }, [open]);

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
          jsonData = typeof base.JsonData === "string" ? JSON.parse(base.JsonData) : base.JsonData;
        }
      }
      await api.createSection({
        Name: name.trim(),
        DisplayName: displayName.trim() || null,
        Inherited: inheritedId,
        JsonData: jsonData,
      });
      onClose();
    } finally { setSubmitting(false); }
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" aria-label="Add section">
      <Modal.Header title="Add Section" icon={<Plus size={16} style={{ color: tok.color.text.muted }} />} />
      <Modal.Body>
        <div className="flex flex-col gap-3">
          <label style={labelStyle}>
            Inherited
            <select
              value={inheritedId ?? ""}
              onChange={(e) => handleInheritedChange(e.target.value ? Number(e.target.value) : null)}
              style={{ ...inputStyle, height: 28, cursor: "pointer" }}
            >
              <option value="">NO INHERITED</option>
              {baseSections.map((s) => (
                <option key={s.SectionId} value={s.SectionId}>
                  {s.Name}{s.DisplayName ? ` — ${s.DisplayName}` : ""} (ID: {s.SectionId})
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Name*
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Name*" />
          </label>
          <label style={labelStyle}>
            Display Name
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} placeholder="Display Name" />
          </label>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button size="sm" variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button size="sm" variant="primary" onClick={handleCreate} disabled={submitting || !name.trim()}>
          {submitting ? "Creating..." : "Create"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ===== Styles ===== */

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-text-muted)" };
const inputStyle: React.CSSProperties = { background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 12, padding: "4px 8px", height: 24, borderRadius: 3, outline: "none" };
