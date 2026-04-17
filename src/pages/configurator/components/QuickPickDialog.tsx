import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export interface QuickPickItem {
  id: string;
  label: string;
  description?: string;
  detail?: string;
  iconColor?: string;
  /** Для фильтрации — дополнительные строки, помимо label/description. */
  searchHay?: string;
  action: () => void;
}

interface QuickPickDialogProps {
  items: QuickPickItem[];
  placeholder?: string;
  initialQuery?: string;
  onClose: () => void;
}

export function QuickPickDialog({ items, placeholder, initialQuery, onClose }: QuickPickDialogProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = `${it.label} ${it.description ?? ""} ${it.detail ?? ""} ${it.searchHay ?? ""}`.toLowerCase();
      // Лёгкий fuzzy: все символы query должны встречаться по порядку.
      let idx = 0;
      for (const ch of q) {
        idx = hay.indexOf(ch, idx);
        if (idx === -1) return false;
        idx++;
      }
      return true;
    });
  }, [items, query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const executeItem = useCallback((item: QuickPickItem) => {
    item.action();
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const picked = filtered[selectedIdx];
      if (picked) executeItem(picked);
      return;
    }
  }, [filtered, selectedIdx, onClose, executeItem]);

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10001,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh", background: "rgba(0,0,0,0.3)",
      }}
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-sidebar)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
          width: 560, maxWidth: "90vw",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Type to filter..."}
          style={{
            padding: "10px 12px",
            fontSize: 13,
            background: "var(--color-editor)",
            border: "none",
            borderBottom: "1px solid var(--color-border)",
            color: "var(--color-text-primary)",
            outline: "none",
          }}
        />
        <div
          ref={listRef}
          style={{ maxHeight: 360, overflowY: "auto" }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--color-text-muted)" }}>
              No matches
            </div>
          ) : (
            filtered.map((it, idx) => {
              const active = idx === selectedIdx;
              return (
                <div
                  key={it.id}
                  data-idx={idx}
                  onMouseDown={(e) => { e.preventDefault(); executeItem(it); }}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                    background: active ? "var(--color-surface-500, #094771)" : "transparent",
                    color: "var(--color-text-primary)",
                    display: "flex", alignItems: "center", gap: 8,
                  }}
                >
                  {it.iconColor && (
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: it.iconColor, flexShrink: 0,
                    }} />
                  )}
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.label}
                    {it.description && (
                      <span style={{ color: "var(--color-text-muted)", marginLeft: 6, fontSize: 11 }}>
                        {it.description}
                      </span>
                    )}
                  </span>
                  {it.detail && (
                    <span style={{
                      fontSize: 10, color: "var(--color-text-muted)",
                      background: "var(--color-surface-400)", padding: "1px 6px",
                      borderRadius: 3, flexShrink: 0,
                    }}>
                      {it.detail}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
