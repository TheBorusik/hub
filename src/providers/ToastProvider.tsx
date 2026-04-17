import {
  createContext, useCallback, useContext, useRef, useState, type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastKind = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** Если задан — показываем как подпись/второй строкой. */
  detail?: string;
  /** Автоскрытие в мс; 0/undefined — оставить до ручного закрытия. */
  duration?: number;
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string, opts?: { detail?: string; duration?: number }) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 2500,
  info: 3500,
  warning: 5000,
  error: 0, // ошибки не закрываем автоматически
};

const KIND_STYLES: Record<ToastKind, { bg: string; border: string; fg: string }> = {
  success: { bg: "rgba(30, 70, 40, 0.95)",  border: "#2e7d32", fg: "#a5d6a7" },
  error:   { bg: "rgba(80, 25, 25, 0.95)",  border: "#c62828", fg: "#ef9a9a" },
  warning: { bg: "rgba(90, 70, 20, 0.95)",  border: "#ef6c00", fg: "#ffcc80" },
  info:    { bg: "rgba(25, 45, 80, 0.95)",  border: "#1565c0", fg: "#90caf9" },
};

function ToastIcon({ kind }: { kind: ToastKind }) {
  switch (kind) {
    case "success": return <CheckCircle2 size={16} />;
    case "error":   return <XCircle size={16} />;
    case "warning": return <AlertTriangle size={16} />;
    case "info":    return <Info size={16} />;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback<ToastContextValue["push"]>(
    (kind, message, opts) => {
      const id = ++idRef.current;
      const duration = opts?.duration ?? DEFAULT_DURATION[kind];
      const toast: Toast = { id, kind, message, detail: opts?.detail, duration };
      setToasts((prev) => [...prev, toast]);
      if (duration > 0) {
        const timer = window.setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      {createPortal(
        <div
          style={{
            position: "fixed",
            right: 16, bottom: 16,
            zIndex: 11000,
            display: "flex", flexDirection: "column-reverse", gap: 8,
            pointerEvents: "none",
            maxWidth: 420,
          }}
        >
          {toasts.map((t) => {
            const s = KIND_STYLES[t.kind];
            return (
              <div
                key={t.id}
                style={{
                  pointerEvents: "auto",
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  color: "var(--color-text-primary)",
                  borderRadius: 6,
                  padding: "8px 10px",
                  fontSize: 12,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
                  display: "flex", alignItems: "flex-start", gap: 8,
                  minWidth: 240,
                  animation: "wfm-toast-in 160ms ease-out",
                }}
              >
                <span style={{ color: s.fg, flexShrink: 0, marginTop: 1 }}>
                  <ToastIcon kind={t.kind} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{t.message}</div>
                  {t.detail && (
                    <div style={{ marginTop: 4, fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {t.detail}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  title="Dismiss"
                  style={{
                    background: "transparent", border: "none",
                    color: "var(--color-text-muted)", cursor: "pointer",
                    padding: 2, lineHeight: 0, flexShrink: 0,
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback-noop, чтобы не падать вне провайдера.
    return {
      push: () => 0,
      dismiss: () => {},
    };
  }
  return ctx;
}
