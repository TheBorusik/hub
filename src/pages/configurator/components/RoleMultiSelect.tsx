import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Check, Search } from "lucide-react";
import { t } from "@/lib/design-tokens";
import type { ApiRoleInfo } from "@/lib/ws-api-models";

export interface RoleMultiSelectProps {
  /** Выбранные `RoleId`. */
  value: number[];
  /** Все доступные роли (обычно приходят с сервера). */
  options: ApiRoleInfo[];
  onChange: (value: number[]) => void;
  /** Визуально пометить поле как невалидное (поверх подсветки из FormRow). */
  invalid?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** aria-label на открывающей кнопке. */
  "aria-label"?: string;
}

/**
 * Мульти-выбор ролей (для `EditApiDialog` и любого похожего сценария).
 *
 * Паттерны VS Code:
 *   - chips с крестиком — как сегменты в Search include/exclude;
 *   - dropdown-picker с checkbox'ами — как Quick Open / Problems filters;
 *   - incremental filter сверху с `/`-иконкой;
 *   - клавиатура: ↑/↓ для навигации, Enter/Space — toggle, Esc — close;
 *   - закрытие по click-outside, scroll, resize, blur окна;
 *   - портал в `document.body`, auto-flip над триггером если не влезает снизу.
 */
export function RoleMultiSelect({
  value,
  options,
  onChange,
  invalid,
  placeholder = "Select roles…",
  disabled,
  "aria-label": ariaLabel,
}: RoleMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; flip: boolean } | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const selected = useMemo(
    () => options.filter((r) => selectedSet.has(r.RoleId)),
    [options, selectedSet],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((r) => {
      const hay = `${r.Name} ${r.Description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  const effectiveActive = activeIdx >= filtered.length ? 0 : activeIdx;

  const close = useCallback(() => setOpen(false), []);

  const toggleRole = useCallback(
    (roleId: number) => {
      if (selectedSet.has(roleId)) {
        onChange(value.filter((id) => id !== roleId));
      } else {
        onChange([...value, roleId]);
      }
    },
    [onChange, selectedSet, value],
  );

  const removeRole = useCallback(
    (roleId: number) => {
      onChange(value.filter((id) => id !== roleId));
    },
    [onChange, value],
  );

  // Позиционирование dropdown — с auto-flip когда ниже не хватает места.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const maxMenuHeight = 280;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const flip = spaceBelow < maxMenuHeight && spaceAbove > spaceBelow;
    setPos({
      left: rect.left,
      top: flip ? rect.top - gap : rect.bottom + gap,
      width: rect.width,
      flip,
    });
  }, [open]);

  // Закрытие по click-outside / Esc / scroll / resize / blur.
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent | globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        // Esc внутри открытого dropdown'а закрывает именно dropdown, а не
        // модалку-родителя; останавливаем всплытие чтобы <Modal> не поймал.
        e.stopPropagation();
        close();
        triggerRef.current?.focus();
      }
    };
    const onScroll = () => close();
    const onResize = () => close();
    const onBlur = () => close();
    document.addEventListener("mousedown", onDocDown, true);
    document.addEventListener("keydown", onKey as EventListener, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("mousedown", onDocDown, true);
      document.removeEventListener("keydown", onKey as EventListener, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("blur", onBlur);
    };
  }, [open, close]);

  // При открытии — фокус на фильтр.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      const picked = filtered[effectiveActive];
      if (picked) {
        e.preventDefault();
        toggleRole(picked.RoleId);
      }
    }
  };

  const triggerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: t.space[2],
    minHeight: t.component.input.height,
    padding: `${t.space[1]} ${t.space[2]}`,
    background: t.color.bg.editor,
    border: `1px solid ${invalid ? t.color.danger : t.color.border.default}`,
    borderRadius: t.radius.md,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.6 : 1,
    width: "100%",
    color: t.color.text.primary,
    fontSize: t.font.size.sm,
    textAlign: "left",
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel ?? "Roles"}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { if (!disabled) setOpen((v) => !v); }}
        style={triggerStyle}
        disabled={disabled}
      >
        {selected.length === 0 ? (
          <span style={{ color: t.color.text.muted, flex: 1 }}>{placeholder}</span>
        ) : (
          selected.map((r) => (
            <span
              key={r.RoleId}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: t.space[1],
                background: t.color.bg.accentSoft,
                color: t.color.text.primary,
                borderRadius: t.radius.sm,
                padding: "1px 4px 1px 6px",
                fontSize: t.font.size.xs,
              }}
            >
              {r.Name}
              <button
                type="button"
                aria-label={`Remove ${r.Name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeRole(r.RoleId);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  color: t.color.text.muted,
                  cursor: "pointer",
                  padding: 0,
                  width: 14,
                  height: 14,
                }}
              >
                <X size={10} />
              </button>
            </span>
          ))
        )}
        <ChevronDown
          size={14}
          style={{
            marginLeft: "auto",
            color: t.color.text.muted,
            transition: `transform ${t.duration.fast} ease`,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-multiselectable="true"
            style={{
              position: "fixed",
              left: pos.left,
              // flip ? выравниваем низ меню к верху триггера
              top: pos.flip ? undefined : pos.top,
              bottom: pos.flip ? window.innerHeight - pos.top : undefined,
              width: pos.width,
              maxHeight: 280,
              display: "flex",
              flexDirection: "column",
              // --z-context-menu (6000) — выше --z-modal (5001), чтобы
              // dropdown корректно отображался над backdrop'ом модалки.
              // Обычный --z-dropdown (1000) ниже модалки и визуально прятал
              // список за Modal overlay.
              zIndex: t.z.contextMenu,
              background: t.color.bg.panel,
              border: `1px solid ${t.color.border.default}`,
              borderRadius: t.radius.md,
              boxShadow: t.shadow.elev2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: t.space[2],
                padding: `${t.space[2]} ${t.space[3]}`,
                borderBottom: `1px solid ${t.color.border.default}`,
              }}
            >
              <Search size={12} color={`${t.color.text.muted}`} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
                onKeyDown={handleInputKeyDown}
                placeholder="Filter roles…"
                style={{
                  flex: 1,
                  height: 22,
                  border: "none",
                  background: "transparent",
                  color: t.color.text.primary,
                  fontSize: t.font.size.sm,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: `${t.space[1]} 0` }}>
              {filtered.length === 0 && (
                <div
                  style={{
                    padding: `${t.space[3]} ${t.space[4]}`,
                    color: t.color.text.muted,
                    fontSize: t.font.size.xs,
                    textAlign: "center",
                  }}
                >
                  No matching roles
                </div>
              )}
              {filtered.map((r, i) => {
                const checked = selectedSet.has(r.RoleId);
                const active = i === effectiveActive;
                return (
                  <div
                    key={r.RoleId}
                    role="option"
                    aria-selected={checked}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRole(r.RoleId);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: t.space[3],
                      padding: `${t.space[1]} ${t.space[3]}`,
                      background: active ? t.color.bg.hover : "transparent",
                      cursor: "pointer",
                      fontSize: t.font.size.xs,
                      color: t.color.text.primary,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 14,
                        height: 14,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: t.radius.sm,
                        border: `1px solid ${checked ? t.color.accent : t.color.border.strong}`,
                        background: checked ? t.color.accent : "transparent",
                        flexShrink: 0,
                      }}
                    >
                      {checked && <Check size={10} color={`${t.color.text.inverse}`} />}
                    </span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.Name}
                    </span>
                    {r.Description && (
                      <span
                        style={{
                          color: t.color.text.muted,
                          fontSize: t.font.size.xs,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "40%",
                        }}
                      >
                        {r.Description}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                padding: `${t.space[2]} ${t.space[3]}`,
                borderTop: `1px solid ${t.color.border.default}`,
                fontSize: t.font.size.xs,
                color: t.color.text.muted,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{value.length} selected</span>
              {value.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: t.color.text.link,
                    cursor: "pointer",
                    fontSize: t.font.size.xs,
                    padding: 0,
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
