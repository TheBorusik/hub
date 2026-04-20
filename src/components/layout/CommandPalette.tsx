import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { t } from "@/lib/design-tokens";
import { useHotkey } from "@/hooks/useHotkey";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useCommandList } from "@/lib/commands";
import { commandRegistry } from "@/lib/commands";
import type { Command, CommandContext } from "@/lib/commands";
import { Kbd } from "@/components/ui/Kbd";
import { EmptyState } from "@/components/ui/EmptyState";

export interface CommandPaletteProps {
  /** Сигнал-контекст для команды (например, активная секция). */
  context?: CommandContext;
}

function fuzzyScore(query: string, text: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const s = text.toLowerCase();
  if (s.includes(q)) return 10 - (s.indexOf(q) / s.length);
  // character-in-order match
  let qi = 0;
  for (let i = 0; i < s.length && qi < q.length; i++) {
    if (s[i] === q[qi]) qi++;
  }
  return qi === q.length ? 1 : 0;
}

/**
 * Command Palette (Ctrl/Cmd+Shift+P). Skeleton-реализация: открывается
 * хоткеем, читает команды из `commandRegistry`, ищет fuzzy-матчем по
 * title/category/description. Подключается в приложение в следующем блоке
 * (Block B), одновременно с регистрацией «первых» команд.
 */
export function CommandPalette({ context }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const commands = useCommandList();

  useHotkey(["mod+shift+p"], () => {
    setOpen((v) => {
      const next = !v;
      if (next) {
        setQuery("");
        setActive(0);
      }
      return next;
    });
  }, {
    ignoreWhenTyping: false,
  });

  useHotkey("escape", () => setOpen(false), {
    enabled: open,
    preventDefault: false,
  });

  useClickOutside(rootRef, () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim();
    const items = commands.filter((c) => c.visible !== false);
    if (!q) return items;
    return items
      .map((c) => {
        const haystack = [c.title, c.category ?? "", c.description ?? ""].join(" ");
        const score = fuzzyScore(q, haystack);
        return { c, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.c);
  }, [commands, deferredQuery]);

  // При изменении query сбрасываем «активный индекс» прямо из onChange —
  // без setState-в-effect.
  const clampedActive = active >= filtered.length ? 0 : active;

  const run = (cmd: Command) => {
    setOpen(false);
    queueMicrotask(() => commandRegistry.run(cmd.id, context));
  };

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: t.z.commandPalette,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "10vh 16px 16px",
        background: t.color.bg.backdrop,
      }}
    >
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          width: 560,
          maxWidth: "95vw",
          background: t.color.bg.panel,
          border: `1px solid ${t.color.border.default}`,
          borderRadius: t.radius.lg,
          boxShadow: t.shadow.elev2,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: t.space[3],
            padding: `${t.space[3]} ${t.space[5]}`,
            borderBottom: `1px solid ${t.color.border.default}`,
          }}
        >
          <Search size={14} color={t.color.text.muted} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const cmd = filtered[clampedActive];
                if (cmd) run(cmd);
              }
            }}
            placeholder="Type a command..."
            style={{
              flex: 1,
              height: 28,
              border: "none",
              background: "transparent",
              color: t.color.text.primary,
              fontSize: t.font.size.md,
              outline: "none",
            }}
          />
        </div>

        <div
          style={{
            maxHeight: "60vh",
            overflow: "auto",
            padding: `${t.space[2]} 0`,
          }}
        >
          {filtered.length === 0 && (
            <EmptyState title="No commands" hint="Try another query" dense />
          )}
          {filtered.map((c, i) => {
            const isActive = i === clampedActive;
            const kb = typeof c.keybinding === "string"
              ? c.keybinding
              : Array.isArray(c.keybinding) ? c.keybinding[0] : undefined;
            return (
              <button
                key={c.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => run(c)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: t.space[3],
                  width: "100%",
                  padding: `${t.space[2]} ${t.space[5]}`,
                  background: isActive ? t.color.bg.selected : "transparent",
                  border: "none",
                  color: t.color.text.primary,
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: t.font.size.sm,
                }}
              >
                {c.icon && <span style={{ display: "inline-flex", color: t.color.text.muted }}>{c.icon}</span>}
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.title}
                  </span>
                  {c.description && (
                    <span style={{ fontSize: t.font.size.xs, color: t.color.text.muted }}>
                      {c.description}
                    </span>
                  )}
                </span>
                {c.category && (
                  <span style={{ fontSize: t.font.size.xs, color: t.color.text.muted }}>{c.category}</span>
                )}
                {kb && <Kbd>{kb}</Kbd>}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
