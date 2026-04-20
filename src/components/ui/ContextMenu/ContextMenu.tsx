import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import { t } from "@/lib/design-tokens";

export type ContextMenuItem<ID extends string = string> =
  | {
      kind?: "item";
      id: ID;
      label: string;
      icon?: React.ReactNode;
      shortcut?: string;
      disabled?: boolean;
      danger?: boolean;
    }
  | { kind: "separator"; id?: string };

interface ContextMenuProps<ID extends string = string> {
  items: ContextMenuItem<ID>[];
  onSelect: (id: ID) => void;
  children: ReactElement;
}

/**
 * Примитив контекстного меню в стиле VS Code.
 * Оборачивает единственный child и перехватывает на нём `contextmenu`;
 * меню рендерится через портал в `document.body`.
 */
export function ContextMenu<ID extends string = string>({
  items,
  onSelect,
  children,
}: ContextMenuProps<ID>) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setPos(null), []);

  const handleContextMenu = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setPos({ x: e.clientX, y: e.clientY });
    },
    []
  );

  // Закрываем меню по клику вне, Esc, resize, scroll, blur.
  useEffect(() => {
    if (!pos) return;
    const onDocDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onScroll = () => close();
    const onResize = () => close();
    const onBlur = () => close();
    document.addEventListener("mousedown", onDocDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("mousedown", onDocDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("blur", onBlur);
    };
  }, [pos, close]);

  // Подстраиваем позицию, чтобы не вылезло за экран.
  useLayoutEffect(() => {
    if (!pos || !menuRef.current) return;
    const el = menuRef.current;
    const rect = el.getBoundingClientRect();
    const pad = 4;
    let { x, y } = pos;
    if (x + rect.width + pad > window.innerWidth) x = Math.max(pad, window.innerWidth - rect.width - pad);
    if (y + rect.height + pad > window.innerHeight) y = Math.max(pad, window.innerHeight - rect.height - pad);
    if (x !== pos.x || y !== pos.y) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
  }, [pos]);

  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<{ onContextMenu?: (e: ReactMouseEvent) => void }>, {
        onContextMenu: handleContextMenu,
      })
    : children;

  return (
    <>
      {child}
      {pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="ui-context-menu"
            style={{
              position: "fixed",
              left: pos.x,
              top: pos.y,
              zIndex: 10000,
              minWidth: 180,
              padding: 4,
              background: t.color.bg.elevated,
              border: `1px solid ${t.color.border.default}`,
              borderRadius: t.radius.md,
              boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
              fontSize: t.font.size.xs,
              color: t.color.text.primary,
              userSelect: "none",
            }}
          >
            {items.map((it, i) => {
              if (it.kind === "separator") {
                return (
                  <div
                    key={`sep-${i}`}
                    role="separator"
                    style={{
                      height: 1,
                      margin: "4px 6px",
                      background: t.color.border.default,
                      opacity: 0.6,
                    }}
                  />
                );
              }
              const disabled = !!it.disabled;
              return (
                <div
                  key={it.id}
                  role="menuitem"
                  aria-disabled={disabled}
                  className="ui-context-menu-item"
                  data-danger={it.danger ? "true" : undefined}
                  data-disabled={disabled ? "true" : undefined}
                  onClick={() => {
                    if (disabled) return;
                    close();
                    onSelect(it.id as ID);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: t.space[2],
                    padding: `${t.space[1]} ${t.space[2]}`,
                    borderRadius: t.radius.sm,
                    cursor: disabled ? "default" : "pointer",
                    opacity: disabled ? 0.45 : 1,
                    color: it.danger ? "#f48771" : undefined,
                    whiteSpace: "nowrap",
                  }}
                >
                  {it.icon ? (
                    <span style={{ width: 14, display: "inline-flex", alignItems: "center", flexShrink: 0, opacity: 0.85 }}>
                      {it.icon}
                    </span>
                  ) : (
                    <span style={{ width: 14, flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1 }}>{it.label}</span>
                  {it.shortcut && (
                    <span style={{ marginLeft: t.space[4], opacity: 0.55, fontSize: 11 }}>
                      {it.shortcut}
                    </span>
                  )}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

export type { ContextMenuProps };
