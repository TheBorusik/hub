import { X } from "lucide-react";
import { useContours } from "@/providers/ContourProvider";

export function TabBar() {
  const { contours, activeContourId, setActiveContour, removeContour } =
    useContours();

  return (
    <div
      className="flex items-center bg-titlebar select-none overflow-x-auto"
      style={{ height: 35, borderBottom: "1px solid var(--color-border)" }}
    >
      {contours.map((c) => {
        const isActive = c.id === activeContourId;
        return (
          <button
            key={c.id}
            onClick={() => setActiveContour(c.id)}
            className="flex items-center gap-2 shrink-0 cursor-pointer transition-colors border-none"
            style={{
              height: 35,
              padding: "0 12px",
              fontSize: 13,
              background: isActive ? "var(--color-tab-active)" : "transparent",
              color: isActive ? "var(--color-text-active)" : "var(--color-text-muted)",
              borderRight: "1px solid var(--color-border)",
              ...(isActive ? { borderBottom: "1px solid var(--color-tab-active)" } : {}),
            }}
          >
            <span>{c.name}</span>
            {!c.isSystem && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  removeContour(c.id);
                }}
                className="flex items-center justify-center toolbar-btn"
                style={{ width: 20, height: 20 }}
              >
                <X size={16} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
