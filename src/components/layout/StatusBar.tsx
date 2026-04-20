import { useWebSocket } from "@theborusik/ws-react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { useProblems } from "@/providers/ProblemsProvider";

export function StatusBar() {
  return (
    <div
      className="flex items-center w-full select-none"
      style={{
        height: 22,
        padding: "0 10px",
        background: "var(--color-statusbar)",
        color: "#ffffff",
        fontSize: 12,
        gap: 12,
      }}
    >
      <WsStatus />
      <div style={{ flex: 1 }} />
      <ProblemsStatusItem />
    </div>
  );
}

function WsStatus() {
  let status = "no ws";

  try {
    const ctx = useWebSocket();
    if (ctx.isAuthenticated) {
      status = "authenticated";
    } else if (ctx.isConnected) {
      status = "connected";
    } else if (ctx.isConnecting) {
      status = "connecting...";
    } else {
      status = "disconnected";
    }
  } catch {
    // no WebSocketProvider
  }

  return (
    <span className="flex items-center" style={{ gap: 6 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: status === "authenticated" ? "#89d185" : status === "disconnected" ? "#f48771" : "#e2c08d",
        }}
      />
      {status}
    </span>
  );
}

/**
 * Кликабельный индикатор ProblemsPanel в StatusBar: показывает суммарное
 * число error / warning и открывает/закрывает панель по клику.
 * Стилизация — как в VS Code (иконка + цифра, минимум декораций).
 */
function ProblemsStatusItem() {
  const { problems, panelOpen, togglePanel } = useProblems();
  const errorCount = problems.filter((p) => p.severity === "error").length;
  const warningCount = problems.filter((p) => p.severity === "warning").length;

  return (
    <button
      type="button"
      onClick={togglePanel}
      title={
        errorCount + warningCount === 0
          ? "No problems (Ctrl+Shift+M to toggle panel)"
          : `${errorCount} error${errorCount === 1 ? "" : "s"}, ${warningCount} warning${warningCount === 1 ? "" : "s"} (Ctrl+Shift+M)`
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: "100%",
        padding: "0 8px",
        border: "none",
        background: panelOpen ? "rgba(255,255,255,0.15)" : "transparent",
        color: "#ffffff",
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        <AlertCircle size={12} />
        <span>{errorCount}</span>
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        <AlertTriangle size={12} />
        <span>{warningCount}</span>
      </span>
    </button>
  );
}
