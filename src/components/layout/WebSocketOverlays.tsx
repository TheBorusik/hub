import { useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import {
  WebSocketStatusOverlays,
  type WebSocketStatusOverlaysComponents,
} from "@theborusik/ws-react";
import { t } from "@/lib/design-tokens";

/**
 * Глобальные оверлеи состояния WebSocket.
 *
 * Рендерятся ПОВЕРХ всего приложения — children внутри `WebSocketProvider`
 * остаются смонтированными и сохраняют свой state (открытые процессы,
 * содержимое редакторов, позицию скролла). Когда соединение/сессия
 * восстанавливается — оверлей гаснет, и приложение продолжает работать
 * с тем же state'ом, что и до обрыва.
 *
 * Аналог sportmax `websocket-overlays.tsx` — тот же подход, но визуально
 * в нашей dark-теме (Modal-like card поверх backdrop).
 */

interface CardProps {
  title: string;
  description: string;
  icon: "spinner" | "error";
  /** Action-кнопка (опциональна, только для ConnectionError). */
  action?: { label: string; loading?: boolean; onClick: () => void };
}

function OverlayCard({ title, description, icon, action }: CardProps) {
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: t.z.system,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: t.color.bg.backdrop,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          width: "min(560px, calc(100vw - 32px))",
          padding: `${t.space[8]} ${t.space[10]}`,
          background: t.color.bg.sidebar,
          border: `1px solid ${t.color.border.default}`,
          borderRadius: t.radius.lg,
          boxShadow: t.shadow.elev2,
          display: "flex",
          gap: t.space[6],
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: 40,
            height: 40,
            borderRadius: t.radius.md,
            background: icon === "error" ? t.color.bg.dangerSoft : t.color.bg.accentSoft,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: icon === "error" ? t.color.danger : t.color.accent,
          }}
        >
          {icon === "spinner"
            ? <Loader2 size={20} className="animate-spin" />
            : <AlertCircle size={20} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: t.font.size.lg,
              fontWeight: 600,
              color: t.color.text.primary,
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: t.space[2],
              fontSize: t.font.size.sm,
              color: t.color.text.muted,
              lineHeight: 1.5,
            }}
          >
            {description}
          </div>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              disabled={action.loading}
              style={{
                marginTop: t.space[5],
                display: "inline-flex",
                alignItems: "center",
                gap: t.space[2],
                height: t.component.button.height,
                padding: `0 ${t.space[5]}`,
                borderRadius: t.radius.md,
                background: t.color.accent,
                border: "none",
                color: "#ffffff",
                fontSize: t.font.size.sm,
                fontWeight: 500,
                cursor: action.loading ? "default" : "pointer",
                opacity: action.loading ? 0.6 : 1,
              }}
            >
              <RefreshCw size={13} className={action.loading ? "animate-spin" : ""} />
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConnectingOverlay({ isConnecting }: { isConnecting: boolean }) {
  if (!isConnecting) return null;
  return (
    <OverlayCard
      icon="spinner"
      title="Connecting…"
      description="Establishing connection to the server."
    />
  );
}

function AuthenticatingOverlay({ isAuthenticating }: { isAuthenticating: boolean }) {
  if (!isAuthenticating) return null;
  return (
    <OverlayCard
      icon="spinner"
      title="Authorizing…"
      description="Restoring your session."
    />
  );
}

function ConnectionErrorOverlay({
  hasConnectionError,
  onRetry,
}: {
  hasConnectionError: boolean;
  onRetry: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (!hasConnectionError) setIsRetrying(false);
  }, [hasConnectionError]);

  if (!hasConnectionError) return null;

  return (
    <OverlayCard
      icon="error"
      title="Connection lost"
      description="Can't reach the server. Check your network and retry."
      action={{
        label: isRetrying ? "Reconnecting…" : "Retry",
        loading: isRetrying,
        onClick: () => {
          setIsRetrying(true);
          try {
            onRetry();
          } finally {
            // лёгкая задержка, чтобы UX не мигал при мгновенном реконнекте
            setTimeout(() => setIsRetrying(false), 700);
          }
        },
      }}
    />
  );
}

const overlayComponents: WebSocketStatusOverlaysComponents = {
  Connecting: ConnectingOverlay,
  Authenticating: AuthenticatingOverlay,
  ConnectionError: ConnectionErrorOverlay,
};

export function WebSocketOverlays() {
  return <WebSocketStatusOverlays components={overlayComponents} />;
}
