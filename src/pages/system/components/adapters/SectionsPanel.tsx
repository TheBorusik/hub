import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Plus, Trash2, Search, X, Folder, Save, Lock, Unlock } from "lucide-react";
import { Group, Panel } from "react-resizable-panels";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { useContourApi } from "@/lib/ws-api";
import { BuildRulesEditor, BuildRulesToggleButton, BUILD_RULES_TEMPLATE } from "./BuildRulesEditor";
import type { ConfigSection } from "../../types";

type Overlay =
  | { type: "none" }
  | { type: "createSection" }
  | { type: "confirm"; title: string; onConfirm: () => void };

export function SectionsPanel() {
  const api = useContourApi();
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

  const handleDelete = (s: ConfigSection) => {
    if (!api) return;
    setOverlay({
      type: "confirm",
      title: `Delete base section "${s.Name}"?`,
      onConfirm: async () => {
        await api.deleteSection(s.SectionId);
        setOverlay({ type: "none" });
        if (selectedId === s.SectionId) setSelectedId(null);
        loadSections();
      },
    });
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
          <div className="flex flex-col h-full" style={{ background: "var(--color-sidebar)" }}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 shrink-0" style={{ height: 35, padding: "0 8px", borderBottom: "1px solid var(--color-border)" }}>
              <button onClick={loadSections} disabled={loading} className="toolbar-btn" title="Refresh">
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={() => setOverlay({ type: "createSection" })} className="toolbar-btn" title="Add Base Section">
                <Plus size={14} />
              </button>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Base Sections</span>
            </div>
            {/* Filter */}
            <div className="shrink-0" style={{ padding: "4px 8px", borderBottom: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-1" style={{ background: "var(--color-input-bg)", border: "1px solid var(--color-border)", borderRadius: 3, padding: "0 6px", height: 24 }}>
                <Search size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
                <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search section..." style={{ flex: 1, background: "none", border: "none", color: "var(--color-text)", fontSize: 12, outline: "none", height: "100%" }} />
                {filter && <button onClick={() => setFilter("")} className="toolbar-btn" style={{ padding: 0 }}><X size={12} /></button>}
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
              {filtered.length === 0 && !loading && <div style={{ padding: 16, fontSize: 12, color: "var(--color-text-muted)", textAlign: "center" }}>{filter ? "No matches" : "No base sections"}</div>}
              {loading && sections.length === 0 && <div style={{ padding: 16, fontSize: 12, color: "var(--color-text-muted)", textAlign: "center" }}>Loading...</div>}
            </div>
          </div>
        </Panel>

        <ResizeHandle />

        {/* Right: editor area */}
        <Panel minSize="30%">
          <div className="flex flex-col h-full" style={{ background: "#1e1e1e" }}>
            {selectedSection ? (<>
              {/* Toolbar */}
              <div className="shrink-0 flex items-center gap-2" style={{ padding: "0 12px", height: 32, borderBottom: "1px solid var(--color-border)" }}>
                <Folder size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "var(--color-text)", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedSection.Name}
                  {isDirty && <span style={{ color: "var(--color-text-muted)", marginLeft: 4 }}>• modified</span>}
                </span>
                <span style={{ fontSize: 10, color: "var(--color-text-muted)", flexShrink: 0 }}>
                  ID: {selectedSection.SectionId}
                  {selectedSection.Inherited && ` · Inherited: ${selectedSection.Inherited}`}
                </span>
                <BuildRulesToggleButton hasBuildRules={hasBuildRules} onCreateBuildRules={handleCreateBuildRules} />
                <button onClick={handleToggleLock} className="toolbar-btn" style={{ color: selectedSection.Locked ? "#F6511D" : undefined }} title={selectedSection.Locked ? "Unlock" : "Lock"}>
                  {selectedSection.Locked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                <button onClick={handleSave} disabled={!isDirty || saving} className="toolbar-btn" style={{ color: isDirty ? "#4CAF50" : undefined, opacity: isDirty ? 1 : 0.4 }} title="Save (Ctrl+S)">
                  <Save size={14} />
                </button>
                <button onClick={() => handleDelete(selectedSection)} className="toolbar-btn" style={{ color: "#F44336" }} title="Delete Section">
                  <Trash2 size={14} />
                </button>
              </div>

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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-text-muted)", fontSize: 12 }}>
                Select a base section to edit
              </div>
            )}
          </div>
        </Panel>
      </Group>

      {/* Overlays */}
      {overlay.type === "createSection" && (
        <CreateBaseSectionOverlay api={api} baseSections={sections} onClose={() => { setOverlay({ type: "none" }); loadSections(); }} />
      )}
      {overlay.type === "confirm" && (
        <ConfirmOverlay title={overlay.title} onConfirm={overlay.onConfirm} onCancel={() => setOverlay({ type: "none" })} />
      )}
    </div>
  );
}

/* ===== Helpers ===== */

function tryFormatJson(raw: unknown): string {
  if (raw == null || raw === "") return "";
  if (typeof raw !== "string") { try { return JSON.stringify(raw, null, 2); } catch { return "{}"; } }
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
}

/* ===== Overlays ===== */

function CreateBaseSectionOverlay({ api, baseSections, onClose }: { api: ReturnType<typeof useContourApi>; baseSections: ConfigSection[]; onClose: () => void }) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inheritedId, setInheritedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    <div style={overlayBg}><div style={{ ...dialogStyle, width: 440 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-2">
          <Plus size={16} style={{ color: "var(--color-text-muted)" }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Add Section</span>
        </div>
        <button onClick={onClose} className="toolbar-btn"><X size={14} /></button>
      </div>
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
      <div className="flex gap-2" style={{ justifyContent: "flex-end", marginTop: 20 }}>
        <button onClick={onClose} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
        <button onClick={handleCreate} disabled={submitting || !name.trim()} style={{ ...primaryBtnStyle, opacity: name.trim() ? 1 : 0.5 }}>
          {submitting ? "Creating..." : "Create"}
        </button>
      </div>
    </div></div>
  );
}

function ConfirmOverlay({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <div style={overlayBg}><div style={dialogStyle}>
      <p style={{ fontSize: 13, marginBottom: 16 }}>{title}</p>
      <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
        <button onClick={onCancel} disabled={submitting} style={cancelBtnStyle}>Cancel</button>
        <button onClick={async () => { setSubmitting(true); await onConfirm(); setSubmitting(false); }} disabled={submitting} style={dangerBtnStyle}>{submitting ? "Deleting..." : "Delete"}</button>
      </div>
    </div></div>
  );
}

/* ===== Styles ===== */


const overlayBg: React.CSSProperties = { position: "absolute", inset: 0, zIndex: 20, backgroundColor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60 };
const dialogStyle: React.CSSProperties = { backgroundColor: "var(--color-sidebar)", border: "1px solid var(--color-border)", borderRadius: 6, padding: 20, minWidth: 340, maxWidth: "80%", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--color-text-muted)" };
const inputStyle: React.CSSProperties = { background: "var(--color-input-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", fontSize: 12, padding: "4px 8px", height: 24, borderRadius: 3, outline: "none" };
const cancelBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", borderRadius: 3, cursor: "pointer" };
const primaryBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "#0e639c", border: "none", color: "#fff", borderRadius: 3, cursor: "pointer" };
const dangerBtnStyle: React.CSSProperties = { padding: "4px 12px", fontSize: 12, background: "#c53030", border: "none", color: "#fff", borderRadius: 3, cursor: "pointer" };
