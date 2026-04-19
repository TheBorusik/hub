import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";
import { t } from "@/lib/design-tokens";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useHotkey } from "@/hooks/useHotkey";
import { Kbd } from "@/components/ui/Kbd";

export interface ContextMenuItem {
  id: string;
  label?: ReactNode;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  /** Разделитель — рендерится как `<hr>`, остальные поля игнорируются. */
  separator?: boolean;
  submenu?: ContextMenuItem[];
  onClick?: () => void;
}

interface OpenState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

interface ContextMenuContextValue {
  open: (e: { clientX: number; clientY: number } | MouseEvent, items: ContextMenuItem[]) => void;
  close: () => void;
}

const Ctx = createContext<ContextMenuContextValue | null>(null);

/**
 * Провайдер единственного portal-менеджера контекстного меню. Подключить в
 * корне приложения (App.tsx) — тогда любой компонент через `useContextMenu()`
 * может открыть меню правым кликом / длинным тапом.
 */
export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OpenState | null>(null);

  const open = useCallback<ContextMenuContextValue["open"]>((e, items) => {
    setState({ x: e.clientX, y: e.clientY, items });
  }, []);
  const close = useCallback(() => setState(null), []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {state && <ContextMenuPopup x={state.x} y={state.y} items={state.items} onClose={close} />}
    </Ctx.Provider>
  );
}

export function useContextMenu(): ContextMenuContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // noop-fallback — если провайдер не смонтирован (например, в storybook).
    return {
      open: () => {},
      close: () => {},
    };
  }
  return ctx;
}

interface PopupProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

function clampPosition(x: number, y: number, w: number, h: number) {
  const maxX = window.innerWidth - w - 4;
  const maxY = window.innerHeight - h - 4;
  return {
    x: Math.max(4, Math.min(x, maxX)),
    y: Math.max(4, Math.min(y, maxY)),
  };
}

function ContextMenuPopup({ x, y, items, onClose }: PopupProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x, y });

  useClickOutside(rootRef, onClose, true);
  useHotkey("escape", onClose, { preventDefault: false });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    setPos(clampPosition(x, y, w, h));
  }, [x, y, items]);

  return createPortal(
    <div
      ref={rootRef}
      role="menu"
      style={{
        position: "fixed",
        top: pos.y,
        left: pos.x,
        minWidth: 200,
        background: t.color.bg.panel,
        border: `1px solid ${t.color.border.default}`,
        borderRadius: t.radius.md,
        boxShadow: t.shadow.elev1,
        padding: `${t.space[1]} 0`,
        zIndex: t.z.contextMenu,
        color: t.color.text.primary,
        fontSize: t.font.size.sm,
      }}
    >
      {items.map((it, i) => {
        if (it.separator) {
          return (
            <hr
              key={`sep-${i}`}
              style={{
                margin: `${t.space[1]} 0`,
                border: "none",
                borderTop: `1px solid ${t.color.border.default}`,
              }}
            />
          );
        }
        return (
          <ContextMenuRow
            key={it.id}
            item={it}
            onClose={onClose}
          />
        );
      })}
    </div>,
    document.body,
  );
}

interface RowProps {
  item: ContextMenuItem;
  onClose: () => void;
}

function ContextMenuRow({ item, onClose }: RowProps) {
  const [hovered, setHovered] = useState(false);
  const [subPos, setSubPos] = useState<{ top: number; left: number } | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const hasSub = !!(item.submenu && item.submenu.length > 0);

  useEffect(() => {
    if (!hovered || !hasSub) {
      setSubPos(null);
      return;
    }
    const el = rowRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSubPos({ top: r.top, left: r.right });
  }, [hovered, hasSub]);

  const click = () => {
    if (item.disabled) return;
    if (hasSub) return;
    item.onClick?.();
    onClose();
  };

  return (
    <div
      ref={rowRef}
      role="menuitem"
      aria-disabled={item.disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={click}
      style={{
        display: "flex",
        alignItems: "center",
        gap: t.space[3],
        padding: `${t.space[2]} ${t.space[5]}`,
        cursor: item.disabled ? "default" : "pointer",
        background: hovered && !item.disabled ? t.color.bg.hoverStrong : "transparent",
        color: item.disabled
          ? t.color.text.muted
          : item.danger
            ? t.color.text.danger
            : t.color.text.primary,
        opacity: item.disabled ? 0.5 : 1,
      }}
    >
      <span style={{ width: 14, display: "inline-flex", flexShrink: 0 }}>{item.icon}</span>
      <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {item.label}
      </span>
      {item.shortcut && <Kbd>{item.shortcut}</Kbd>}
      {hasSub && <ChevronRight size={12} style={{ color: t.color.text.muted }} />}
      {hasSub && subPos && hovered &&
        createPortal(
          <div
            role="menu"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              position: "fixed",
              top: subPos.top,
              left: subPos.left,
              minWidth: 180,
              background: t.color.bg.panel,
              border: `1px solid ${t.color.border.default}`,
              borderRadius: t.radius.md,
              boxShadow: t.shadow.elev1,
              padding: `${t.space[1]} 0`,
              zIndex: t.z.contextMenu,
            }}
          >
            {item.submenu!.map((sub, j) =>
              sub.separator ? (
                <hr
                  key={`sep-${j}`}
                  style={{
                    margin: `${t.space[1]} 0`,
                    border: "none",
                    borderTop: `1px solid ${t.color.border.default}`,
                  }}
                />
              ) : (
                <ContextMenuRow key={sub.id} item={sub} onClose={onClose} />
              ),
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
