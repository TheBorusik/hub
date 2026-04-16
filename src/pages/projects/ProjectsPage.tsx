import { useState } from "react";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import { useContours, type ContourConfig } from "@/providers/ContourProvider";

export function ProjectsPage() {
  const { contours, addContour, removeContour, setActiveContour } =
    useContours();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const projectContours = contours.filter((c) => !c.isSystem);

  return (
    <div style={{ padding: 20 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 14, fontWeight: 600 }}>Projects</h1>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center cursor-pointer"
          style={{
            gap: 6,
            padding: "4px 12px",
            fontSize: 13,
            background: "var(--color-accent)",
            color: "#ffffff",
            border: "none",
          }}
        >
          <Plus size={16} />
          Add Contour
        </button>
      </div>

      {projectContours.length === 0 ? (
        <div style={{ padding: "40px 0", fontSize: 13, color: "var(--color-text-muted)", textAlign: "center" }}>
          No project contours configured. Click "Add Contour" to connect to a project.
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 8 }}>
          {projectContours.map((c) => (
            <ContourCard
              key={c.id}
              contour={c}
              onOpen={() => setActiveContour(c.id)}
              onRemove={() => removeContour(c.id)}
            />
          ))}
        </div>
      )}

      {showAddDialog && (
        <AddContourDialog
          onAdd={(config) => {
            addContour(config);
            setShowAddDialog(false);
          }}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}

function ContourCard({
  contour,
  onOpen,
  onRemove,
}: {
  contour: ContourConfig;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: 12, background: "var(--color-sidebar)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex flex-col" style={{ gap: 4 }}>
        <span style={{ fontSize: 13 }}>{contour.name}</span>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{contour.wsUrl}</span>
        {contour.description && (
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {contour.description}
          </span>
        )}
      </div>
      <div className="flex items-center" style={{ gap: 6 }}>
        <button
          onClick={onOpen}
          className="toolbar-btn"
          style={{ gap: 4, padding: "4px 8px", fontSize: 12, color: "var(--color-accent)" }}
          title="Open in tab"
        >
          <ExternalLink size={14} />
          Open
        </button>
        <button
          onClick={onRemove}
          className="toolbar-btn"
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function AddContourDialog({
  onAdd,
  onClose,
}: {
  onAdd: (config: Omit<ContourConfig, "id">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [wsUrl, setWsUrl] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !wsUrl.trim()) return;
    onAdd({ name: name.trim(), wsUrl: wsUrl.trim(), description: description.trim() || undefined });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col"
        style={{ width: 400, padding: 20, gap: 10, background: "var(--color-sidebar)", border: "1px solid var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Add Contour</h2>
        <input
          type="text"
          placeholder="Name (e.g. SportMax DEV)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <input
          type="text"
          placeholder="WS URL (e.g. wss://sportmax-dev:5000/ws)"
          value={wsUrl}
          onChange={(e) => setWsUrl(e.target.value)}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex justify-end" style={{ gap: 8, marginTop: 8 }}>
          <button
            onClick={onClose}
            className="cursor-pointer"
            style={{ padding: "4px 12px", fontSize: 13, background: "transparent", border: "1px solid var(--color-border)", color: "inherit" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="cursor-pointer"
            style={{ padding: "4px 12px", fontSize: 13, background: "var(--color-accent)", color: "#ffffff", border: "none" }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
