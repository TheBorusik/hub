import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell, X, Trash2, CheckCircle2, XCircle, AlertTriangle, Info, ChevronRight, ChevronDown,
} from "lucide-react";
import { useNotifications, type AppNotification, type NotificationKind } from "@/providers/NotificationsProvider";

function KindIcon({ kind }: { kind: NotificationKind }) {
  const c = KIND_COLOR[kind];
  switch (kind) {
    case "success": return <CheckCircle2 size={14} color={c} />;
    case "error":   return <XCircle size={14} color={c} />;
    case "warning": return <AlertTriangle size={14} color={c} />;
    case "info":    return <Info size={14} color={c} />;
  }
}

const KIND_COLOR: Record<NotificationKind, string> = {
  success: "#4caf50",
  error:   "#f44336",
  warning: "#ffb74d",
  info:    "#64b5f6",
};

function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/** Кнопка-колокольчик с бейджем, открывающая слайд-аут панель с историей уведомлений. */
export function NotificationsButton() {
  const { notifications, unreadCount, dismiss, clearAll, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        // Открыли — помечаем всё как прочитанное.
        markAllRead();
      }
      return !prev;
    });
  }, [markAllRead]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const hasErrors = useMemo(() => notifications.some((n) => n.kind === "error" && !n.read), [notifications]);
  const badgeColor = hasErrors ? "#f44336" : "#0e639c";

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        title="Notifications"
        className="relative flex items-center justify-center cursor-pointer transition-colors toolbar-btn"
        style={{
          width: 48,
          height: 48,
          color: open ? "#ffffff" : "rgba(255,255,255,0.5)",
          borderRadius: 0,
        }}
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread notifications`}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 8,
              background: badgeColor,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              lineHeight: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 2px var(--color-activitybar, #333)",
              pointerEvents: "none",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 10500 }}
          />
          <div
            style={{
              position: "fixed",
              left: 48, bottom: 22, top: 35,
              width: 420,
              background: "var(--color-sidebar, #252526)",
              borderRight: "1px solid var(--color-border)",
              borderTop: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              zIndex: 10600,
              display: "flex",
              flexDirection: "column",
              boxShadow: "2px 0 16px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between shrink-0"
              style={{ padding: "10px 12px", borderBottom: "1px solid var(--color-border)" }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Notifications{notifications.length > 0 ? ` (${notifications.length})` : ""}
              </div>
              <div className="flex items-center" style={{ gap: 4 }}>
                <button
                  className="toolbar-btn"
                  title="Clear all"
                  onClick={() => clearAll()}
                  disabled={notifications.length === 0}
                  style={{ opacity: notifications.length === 0 ? 0.4 : 1 }}
                >
                  <Trash2 size={14} />
                </button>
                <button className="toolbar-btn" title="Close" onClick={() => setOpen(false)}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {notifications.length === 0 ? (
                <div style={{ padding: 16, color: "var(--color-text-muted)", fontSize: 12, textAlign: "center" }}>
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <NotificationRow key={n.id} note={n} onDismiss={() => dismiss(n.id)} />
                ))
              )}
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

interface NotificationRowProps {
  note: AppNotification;
  onDismiss: () => void;
}

function NotificationRow({ note, onDismiss }: NotificationRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDiagnostics = (note.diagnostics?.length ?? 0) > 0;
  const hasBody = !!note.body;
  const canExpand = hasDiagnostics || hasBody;

  return (
    <div
      style={{
        padding: "8px 12px",
        borderBottom: "1px solid var(--color-border)",
        fontSize: 12,
      }}
    >
      <div className="flex items-start" style={{ gap: 8 }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          <KindIcon kind={note.kind} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="flex items-center justify-between"
            style={{ gap: 8 }}
          >
            <button
              onClick={() => canExpand && setExpanded((v) => !v)}
              style={{
                background: "transparent", border: "none",
                color: "inherit", textAlign: "left",
                flex: 1, minWidth: 0,
                cursor: canExpand ? "pointer" : "default",
                display: "flex", alignItems: "center", gap: 4,
                padding: 0,
              }}
              title={canExpand ? "Show details" : undefined}
            >
              {canExpand && (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {note.title}
              </span>
              {hasDiagnostics && (
                <span
                  style={{
                    marginLeft: 6, padding: "0 6px",
                    background: "#f44336", color: "#fff",
                    fontSize: 10, fontWeight: 700, borderRadius: 8,
                  }}
                  title="Compilation errors"
                >
                  {note.diagnostics!.length}
                </span>
              )}
            </button>
            <button
              className="toolbar-btn"
              title="Dismiss"
              onClick={onDismiss}
              style={{ flexShrink: 0 }}
            >
              <X size={12} />
            </button>
          </div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 10, marginTop: 2, marginLeft: canExpand ? 16 : 0 }}>
            {note.source ? `${note.source} · ` : ""}{relativeTime(note.createdAt)}
          </div>
          {expanded && (
            <div style={{ marginTop: 6, marginLeft: 16 }}>
              {note.body && (
                <pre
                  style={{
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                    margin: 0, padding: 6,
                    background: "var(--color-editor, #1e1e1e)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 3,
                    fontSize: 11, fontFamily: "Consolas, monospace",
                  }}
                >
                  {note.body}
                </pre>
              )}
              {hasDiagnostics && (
                <div style={{ marginTop: note.body ? 6 : 0 }}>
                  {note.diagnostics!.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "4px 6px",
                        background: "var(--color-editor, #1e1e1e)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 3,
                        marginBottom: 4,
                        fontSize: 11, fontFamily: "Consolas, monospace",
                      }}
                    >
                      <div style={{ color: "#f48771" }}>
                        Line {d.StartLine}:{d.StartColumn}
                      </div>
                      <div style={{ marginTop: 2 }}>{d.Message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
