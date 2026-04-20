import { useState, useMemo, useRef, useEffect, useCallback, type RefObject } from "react";
import { Modal } from "@/components/ui/Modal";
import { t } from "@/lib/design-tokens";

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

/**
 * Quick-picker (VS Code-style command/stage palette). Поверх <Modal>:
 * focus-trap, Esc, единый backdrop/z-index из дизайн-токенов.
 *
 * Кастомный layout (без header/footer/body padding) — render-as-children,
 * только input + filtered list внутри <Modal>.
 */
export function QuickPickDialog({ items, placeholder, initialQuery, onClose }: QuickPickDialogProps) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = `${it.label} ${it.description ?? ""} ${it.detail ?? ""} ${it.searchHay ?? ""}`.toLowerCase();
      let idx = 0;
      for (const ch of q) {
        idx = hay.indexOf(ch, idx);
        if (idx === -1) return false;
        idx++;
      }
      return true;
    });
  }, [items, query]);

  const effectiveIdx = selectedIdx >= filtered.length ? 0 : selectedIdx;

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${effectiveIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [effectiveIdx]);

  const executeItem = useCallback((item: QuickPickItem) => {
    item.action();
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
      const picked = filtered[effectiveIdx];
      if (picked) executeItem(picked);
      return;
    }
  }, [filtered, effectiveIdx, executeItem]);

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      initialFocus={inputRef as RefObject<HTMLElement | null>}
      aria-label={placeholder ?? "Quick pick"}
      style={{ alignSelf: "flex-start", marginTop: "12vh", width: 560 }}
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Type to filter..."}
        style={{
          padding: `${t.space[5]} ${t.space[6]}`,
          fontSize: t.font.size.md,
          background: t.color.bg.editor,
          border: "none",
          borderBottom: `1px solid ${t.color.border.default}`,
          color: t.color.text.primary,
          outline: "none",
        }}
      />
      <div
        ref={listRef}
        style={{ maxHeight: 360, overflowY: "auto" }}
        role="listbox"
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: `${t.space[5]} ${t.space[6]}`,
              fontSize: t.font.size.xs,
              color: t.color.text.muted,
            }}
          >
            No matches
          </div>
        ) : (
          filtered.map((it, idx) => {
            const active = idx === effectiveIdx;
            return (
              <div
                key={it.id}
                data-idx={idx}
                role="option"
                aria-selected={active}
                onMouseDown={(e) => { e.preventDefault(); executeItem(it); }}
                onMouseMove={() => {
                  if (selectedIdx !== idx) setSelectedIdx(idx);
                }}
                style={{
                  padding: `${t.space[3]} ${t.space[6]}`,
                  fontSize: t.font.size.xs,
                  cursor: "pointer",
                  background: active ? t.color.bg.selected : "transparent",
                  color: t.color.text.primary,
                  display: "flex",
                  alignItems: "center",
                  gap: t.space[4],
                }}
              >
                {it.iconColor && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: t.radius.full,
                      background: it.iconColor,
                      flexShrink: 0,
                    }}
                  />
                )}
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {it.label}
                  {it.description && (
                    <span
                      style={{
                        color: t.color.text.muted,
                        marginLeft: t.space[3],
                        fontSize: t.font.size.xs,
                      }}
                    >
                      {it.description}
                    </span>
                  )}
                </span>
                {it.detail && (
                  <span
                    style={{
                      fontSize: t.font.size.xs,
                      color: t.color.text.muted,
                      background: t.color.bg.panel,
                      padding: `1px ${t.space[3]}`,
                      borderRadius: t.radius.sm,
                      flexShrink: 0,
                    }}
                  >
                    {it.detail}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
