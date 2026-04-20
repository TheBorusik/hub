import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, FileCode2, RefreshCw } from "lucide-react";
import { t } from "@/lib/design-tokens";
import { useHotkey } from "@/hooks/useHotkey";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useContourApi } from "@/lib/ws-api";
import { useNavigation } from "@/providers/NavigationProvider";
import type { ProcessModel } from "@/lib/ws-api-models";
import { EmptyState } from "@/components/ui/EmptyState";
import { Kbd } from "@/components/ui/Kbd";

/**
 * Quick Open (Ctrl/Cmd+P). VS Code-style быстрый поиск по имени процесса.
 * В отличие от `CommandPalette` (Ctrl+Shift+P — список действий),
 * ищет доменные сущности: процессы, доступные в текущем контуре.
 *
 * Источник данных — `api.getProcessTree()` / `getProcessModels()`; результат
 * кэшируется в state этого инстанса. Один инстанс на контур (рендерится в
 * `ContourPanel`), т.к. API-подключение контур-локальное.
 *
 * Выбор → `navigateTo("configurator", openProcessInConfigurator)` — дальше
 * `ConfiguratorPage` подхватит intent и откроет таб. Это повторяет путь,
 * по которому уже ходит Viewer → Configurator («Edit» из панели процессов).
 */
export function QuickOpen() {
  const api = useContourApi();
  const { navigateTo } = useNavigation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [active, setActive] = useState(0);
  const [models, setModels] = useState<ProcessModel[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useHotkey(["mod+p"], () => setOpen((v) => !v), {
    // Нужно ignoreWhenTyping=false, чтобы Ctrl+P работал поверх фокуса
    // в редакторах/инпутах тоже — иначе из Monaco не откроешь.
    ignoreWhenTyping: false,
    preventDefault: true,
  });

  useHotkey("escape", () => setOpen(false), {
    enabled: open,
    preventDefault: false,
  });

  useClickOutside(rootRef, () => setOpen(false), open);

  // Загрузка каталога при первом открытии.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    // Focus чуть позже: после того как inputRef замаунчен.
    queueMicrotask(() => inputRef.current?.focus());
    if (models !== null || loading) return;
    if (!api) return;
    setLoading(true);
    setError(null);
    api.getProcessTree()
      .then((res) => setModels(res.ProcessModels ?? []))
      .catch(() => {
        // Fallback на getProcessModels (как и в ConfiguratorPage).
        return api.getProcessModels()
          .then((r) => setModels(r.Models ?? []))
          .catch((e) => {
            setError(e instanceof Error ? e.message : String(e));
            setModels([]);
          });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reload = () => {
    if (!api || loading) return;
    setLoading(true);
    setError(null);
    api.getProcessTree()
      .then((res) => setModels(res.ProcessModels ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  const filtered = useMemo(() => {
    const all = models ?? [];
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return all.slice(0, 200);
    const scored: Array<{ m: ProcessModel; score: number }> = [];
    for (const m of all) {
      const name = (m.Name ?? m.TypeName ?? "").toLowerCase();
      const typeName = (m.TypeName ?? "").toLowerCase();
      let score = 0;
      if (name.includes(q)) score = 20 - Math.min(15, name.indexOf(q));
      else if (typeName.includes(q)) score = 10 - Math.min(8, typeName.indexOf(q));
      else {
        // char-in-order по name
        let qi = 0;
        for (let i = 0; i < name.length && qi < q.length; i++) {
          if (name[i] === q[qi]) qi++;
        }
        if (qi === q.length) score = 1;
      }
      if (score > 0) scored.push({ m, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 200).map((x) => x.m);
  }, [models, deferredQuery]);

  useEffect(() => {
    setActive(0);
  }, [deferredQuery]);

  // Прокрутка активного в view.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (m: ProcessModel) => {
    setOpen(false);
    const name = m.Name ?? m.TypeName;
    if (!name) return;
    navigateTo("configurator", { kind: "openProcessInConfigurator", processName: name });
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
        aria-label="Quick Open"
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
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const m = filtered[active];
                if (m) run(m);
              }
            }}
            placeholder="Go to process by name…"
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
          <button
            className="ui-icon-btn"
            title="Reload catalog"
            onClick={reload}
            disabled={loading || !api}
            style={{
              background: "transparent",
              border: "none",
              color: t.color.text.muted,
              cursor: loading ? "default" : "pointer",
              padding: 4,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div
          ref={listRef}
          style={{
            maxHeight: "60vh",
            overflow: "auto",
            padding: `${t.space[2]} 0`,
          }}
        >
          {loading && models === null && (
            <div style={{ padding: t.space[5], color: t.color.text.muted, fontSize: t.font.size.sm }}>
              Loading process catalog…
            </div>
          )}
          {error && (
            <div style={{ padding: t.space[5], color: t.color.text.danger, fontSize: t.font.size.sm }}>
              {error}
            </div>
          )}
          {!loading && !error && models !== null && filtered.length === 0 && (
            <EmptyState dense title="No processes" hint={query ? "Try another query" : "Catalog is empty"} />
          )}
          {filtered.map((m, i) => {
            const isActive = i === active;
            const name = m.Name ?? m.TypeName ?? "";
            const typeName = m.TypeName ?? "";
            const sameText = name === typeName;
            return (
              <button
                key={`${typeName}|${name}|${i}`}
                type="button"
                data-idx={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(m)}
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
                <FileCode2 size={14} color={t.color.text.muted} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {name}
                  </span>
                  {!sameText && typeName && (
                    <span style={{ fontSize: t.font.size.xs, color: t.color.text.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {typeName}
                    </span>
                  )}
                </span>
                {m.Action && (
                  <span style={{ fontSize: t.font.size.xs, color: t.color.text.muted, flexShrink: 0 }}>{m.Action}</span>
                )}
                {m.Draft && (
                  <span
                    title="Draft"
                    style={{
                      fontSize: 9,
                      padding: "0 4px",
                      borderRadius: 2,
                      background: "#ef6c00",
                      color: "#fff",
                      fontWeight: 700,
                      lineHeight: "14px",
                    }}
                  >
                    D
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: t.space[3],
            padding: `${t.space[2]} ${t.space[5]}`,
            borderTop: `1px solid ${t.color.border.default}`,
            fontSize: t.font.size.xs,
            color: t.color.text.muted,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Kbd>↑↓</Kbd> to navigate
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Kbd>Enter</Kbd> to open
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Kbd>Esc</Kbd> to close
          </span>
          <span style={{ marginLeft: "auto" }}>{filtered.length} / {models?.length ?? 0}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
