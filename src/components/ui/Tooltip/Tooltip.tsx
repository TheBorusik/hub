import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { t } from "@/lib/design-tokens";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  content: ReactNode;
  placement?: TooltipPlacement;
  /** Задержка перед показом, мс. default: 300. */
  delay?: number;
  /** Отключить тултип (например на touch-устройствах). */
  disabled?: boolean;
  /** Максимальная ширина поп-апа. default: 240. */
  maxWidth?: number;
  /** Единственный child: элемент-триггер. Получит aria-describedby. */
  children: ReactElement<Record<string, unknown>>;
}

const OFFSET = 8;

function computePosition(
  anchor: DOMRect,
  tip: { width: number; height: number },
  placement: TooltipPlacement,
): { top: number; left: number } {
  switch (placement) {
    case "top":
      return {
        top: anchor.top - tip.height - OFFSET,
        left: anchor.left + anchor.width / 2 - tip.width / 2,
      };
    case "bottom":
      return {
        top: anchor.bottom + OFFSET,
        left: anchor.left + anchor.width / 2 - tip.width / 2,
      };
    case "left":
      return {
        top: anchor.top + anchor.height / 2 - tip.height / 2,
        left: anchor.left - tip.width - OFFSET,
      };
    case "right":
      return {
        top: anchor.top + anchor.height / 2 - tip.height / 2,
        left: anchor.right + OFFSET,
      };
  }
}

/**
 * Текстовая подсказка. Минимальная, без радикс-уровня позиционирования —
 * хватает для чипов, иконочных кнопок, элементов бокового меню. Для более
 * сложных кейсов (богатый контент, интерактив) — использовать Popover.
 */
export function Tooltip({
  content,
  placement = "top",
  delay = 300,
  disabled = false,
  maxWidth = 240,
  children,
}: TooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const anchor = triggerRef.current;
    const tip = tipRef.current;
    if (!anchor || !tip) return;
    const rect = anchor.getBoundingClientRect();
    const size = { width: tip.offsetWidth, height: tip.offsetHeight };
    const pos = computePosition(rect, size, placement);
    setCoords(pos);
  }, [open, placement, content]);

  useEffect(() => () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
  }, []);

  const show = () => {
    if (disabled) return;
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    setOpen(false);
  };

  // Паттерн cloneElement с callback-ref используется намеренно: Tooltip
  // оборачивает произвольный элемент-триггер без введения лишней обёртки.
  // Написать иначе без forwardRef у всех возможных children невозможно.
  // eslint-disable-next-line react-hooks/refs
  const trigger = cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
    },
    "aria-describedby": open ? id : undefined,
    onMouseEnter: (e: React.MouseEvent) => {
      show();
      (children.props.onMouseEnter as ((e: React.MouseEvent) => void) | undefined)?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide();
      (children.props.onMouseLeave as ((e: React.MouseEvent) => void) | undefined)?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      show();
      (children.props.onFocus as ((e: React.FocusEvent) => void) | undefined)?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hide();
      (children.props.onBlur as ((e: React.FocusEvent) => void) | undefined)?.(e);
    },
  });

  const tipStyle: CSSProperties = {
    position: "fixed",
    top: coords?.top ?? -9999,
    left: coords?.left ?? -9999,
    zIndex: t.z.tooltip,
    background: t.color.bg.panel,
    color: t.color.text.primary,
    border: `1px solid ${t.color.border.default}`,
    borderRadius: t.radius.md,
    boxShadow: t.shadow.elev1,
    padding: `${t.space[2]} ${t.space[4]}`,
    fontSize: t.font.size.xs,
    lineHeight: 1.4,
    maxWidth,
    pointerEvents: "none",
    opacity: coords ? 1 : 0,
    transition: `opacity ${t.duration.fast}`,
  };

  return (
    <>
      {trigger}
      {open &&
        !disabled &&
        createPortal(
          <div ref={tipRef} id={id} role="tooltip" style={tipStyle}>
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
