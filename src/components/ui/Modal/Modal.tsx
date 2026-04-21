import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { t } from "@/lib/design-tokens";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useReturnFocus } from "@/hooks/useReturnFocus";
import { useHotkey } from "@/hooks/useHotkey";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  /** Закрывать по клику на backdrop и Esc. default: true. */
  dismissible?: boolean;
  /** Дать фокус этому элементу после монтирования. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Возвращать фокус при размонтировании. default: true. */
  returnFocus?: boolean;
  /** Для ARIA. Обязательно, если нет <Modal.Header> c title. */
  "aria-label"?: string;
  children: ReactNode;
  /** Класс на «карточке» модалки. */
  className?: string;
  /** Стили карточки. */
  style?: CSSProperties;
}

const SIZE_MAP: Record<ModalSize, { minWidth: string | number; maxWidth: string | number; width?: string }> = {
  sm: { minWidth: 340, maxWidth: 440 },
  md: { minWidth: 480, maxWidth: 640 },
  lg: { minWidth: 640, maxWidth: 860 },
  xl: { minWidth: 820, maxWidth: 1120, width: "90vw" },
  full: { minWidth: "auto", maxWidth: "100vw", width: "96vw" },
};

interface ModalContextValue {
  onClose: () => void;
  titleId: string;
  dismissible: boolean;
}

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext(caller: string): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error(`${caller} must be used inside <Modal>`);
  }
  return ctx;
}

/**
 * Единый модальный контейнер. Все диалоги проекта должны строиться на нём:
 *  - common backdrop (`--color-bg-backdrop`)
 *  - focus-trap
 *  - return focus
 *  - Esc закрытие
 *  - role="dialog" + aria-modal
 *  - один z-index-стек из токенов
 *
 * Для стандартных «header + body + footer» используйте subcomponents
 * `Modal.Header / Modal.Body / Modal.Footer`. Для нестандартного макета —
 * передавайте детей напрямую.
 */
export function Modal({
  open,
  onClose,
  size = "md",
  dismissible = true,
  initialFocus,
  returnFocus = true,
  "aria-label": ariaLabel,
  children,
  className,
  style,
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useFocusTrap(cardRef, open);
  useReturnFocus(open && returnFocus);

  useHotkey("escape", () => {
    if (dismissible) onClose();
  }, { enabled: open, preventDefault: false });

  useEffect(() => {
    if (!open) return;
    const target = initialFocus?.current ?? cardRef.current;
    if (target && typeof target.focus === "function") {
      target.focus({ preventScroll: true });
    }
  }, [open, initialFocus]);

  // Lock body scroll while modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const sz = SIZE_MAP[size];

  const onBackdropMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!dismissible) return;
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <ModalContext.Provider value={{ onClose, titleId, dismissible }}>
      <div
        role="presentation"
        onMouseDown={onBackdropMouseDown}
        style={{
          position: "fixed",
          inset: 0,
          background: t.color.bg.backdrop,
          zIndex: t.z.modalBackdrop,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: t.space[8],
        }}
      >
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabel ? undefined : titleId}
          aria-label={ariaLabel}
          tabIndex={-1}
          className={className}
          style={{
            position: "relative",
            background: t.color.bg.sidebar,
            border: `1px solid ${t.color.border.default}`,
            borderRadius: t.radius.lg,
            boxShadow: t.shadow.elev2,
            minWidth: sz.minWidth,
            maxWidth: sz.maxWidth,
            width: sz.width,
            maxHeight: "calc(100vh - 64px)",
            display: "flex",
            flexDirection: "column",
            outline: "none",
            zIndex: t.z.modal,
            ...style,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>,
    document.body,
  );
}

/* ------------------------------------------------------------------ Header */
export interface ModalHeaderProps {
  title: ReactNode;
  icon?: ReactNode;
  /** Кнопка крестика справа. default: true. */
  showClose?: boolean;
  children?: ReactNode;
}

function ModalHeader({ title, icon, showClose = true, children }: ModalHeaderProps) {
  const { onClose, titleId, dismissible } = useModalContext("Modal.Header");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: t.space[3],
        padding: `${t.space[5]} ${t.space[6]} ${t.space[4]}`,
        borderBottom: `1px solid ${t.color.border.default}`,
      }}
    >
      {icon && <span style={{ display: "inline-flex", flexShrink: 0 }}>{icon}</span>}
      <h2
        id={titleId}
        style={{
          flex: 1,
          minWidth: 0,
          margin: 0,
          fontSize: t.font.size.lg,
          fontWeight: 600,
          color: t.color.text.primary,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </h2>
      {children}
      {showClose && dismissible && (
        <button
          type="button"
          aria-label="Close"
          title="Close"
          onClick={onClose}
          style={{
            width: 24,
            height: 24,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            color: t.color.text.muted,
            cursor: "pointer",
            borderRadius: t.radius.md,
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- Body */
export interface ModalBodyProps {
  children: ReactNode;
  /** Убрать внутренние отступы. */
  padded?: boolean;
  style?: CSSProperties;
}

function ModalBody({ children, padded = true, style }: ModalBodyProps) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        // display:flex обязателен для случаев, когда внутрь кладут компонент
        // с height:100% (например, <CodeEditor> / <EditorPanel>): без явного
        // flex-контекста дочерний элемент получает computed height=0 и виден
        // только header+footer модалки.
        display: "flex",
        flexDirection: "column",
        padding: padded ? `${t.space[5]} ${t.space[6]}` : 0,
        color: t.color.text.primary,
        fontSize: t.font.size.md,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ Footer */
export interface ModalFooterProps {
  children: ReactNode;
  /** Выравнивание. default: "end" (Cancel → Confirm справа). */
  align?: "start" | "end" | "between";
}

function ModalFooter({ children, align = "end" }: ModalFooterProps) {
  const justify = align === "start" ? "flex-start" : align === "between" ? "space-between" : "flex-end";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: t.space[3],
        justifyContent: justify,
        padding: `${t.space[4]} ${t.space[6]} ${t.space[5]}`,
        borderTop: `1px solid ${t.color.border.default}`,
        background: t.color.bg.panel,
      }}
    >
      {children}
    </div>
  );
}

/* Attach subcomponents to the main export. */
type ModalCompound = typeof Modal & {
  Header: typeof ModalHeader;
  Body: typeof ModalBody;
  Footer: typeof ModalFooter;
};

const ModalExport = Modal as ModalCompound;
ModalExport.Header = ModalHeader;
ModalExport.Body = ModalBody;
ModalExport.Footer = ModalFooter;

export default ModalExport;

/**
 * Маленький хук для детей: отдаёт onClose и titleId из контекста.
 */
export function useModal() {
  return useModalContext("useModal");
}

/** Явное закрытие модалки изнутри (например кнопкой). */
export function useCloseModal(): () => void {
  const { onClose } = useModalContext("useCloseModal");
  return useCallback(() => onClose(), [onClose]);
}
