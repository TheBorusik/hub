import { useWebSocket } from "@theborusik/ws-react";

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
