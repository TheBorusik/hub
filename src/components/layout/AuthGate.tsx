import { useState, type ReactNode, type FormEvent } from "react";
import { useWebSocket } from "@theborusik/ws-react";
import { useContours, saveSystemUrl } from "@/providers/ContourProvider";
import { useContourAuth } from "@/lib/ws-api";

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { getActiveContour } = useContours();
  const contour = getActiveContour();

  if (!contour?.wsUrl) {
    return <SystemUrlSetup />;
  }

  return <LoginGate>{children}</LoginGate>;
}

function LoginGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isConnected, isConnecting, hasConnectionError, retryConnection } =
    useWebSocket();

  if (hasConnectionError) {
    return (
      <CenteredMessage>
        <p style={{ color: "var(--color-danger)", marginBottom: 12 }}>Connection failed</p>
        <button
          onClick={() => retryConnection()}
          className="cursor-pointer"
          style={{
            padding: "4px 14px",
            fontSize: 13,
            background: "var(--color-surface-400)",
            border: "1px solid var(--color-border)",
            color: "inherit",
          }}
        >
          Retry
        </button>
      </CenteredMessage>
    );
  }

  if (isConnecting) {
    return <CenteredMessage>Connecting...</CenteredMessage>;
  }

  if (!isConnected) {
    return <CenteredMessage>Disconnected</CenteredMessage>;
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <>{children}</>;
}

function LoginForm() {
  const api = useContourAuth();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!api || !login || !password) return;
    setError("");
    setLoading(true);
    try {
      await api.login(login, password);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "Payload" in err
          ? String((err as { Payload?: { Message?: string } }).Payload?.Message ?? "Auth failed")
          : "Auth failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenteredMessage>
      <form onSubmit={handleSubmit} className="flex flex-col" style={{ width: 260, gap: 10 }}>
        <span style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 4 }}>Login</span>
        <input
          type="text"
          placeholder="Login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <span style={{ color: "var(--color-danger)", fontSize: 12 }}>{error}</span>}
        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer disabled:opacity-50"
          style={{
            marginTop: 4,
            height: 28,
            fontSize: 13,
            background: "var(--color-accent)",
            color: "#ffffff",
            border: "none",
          }}
        >
          {loading ? "..." : "Sign in"}
        </button>
      </form>
    </CenteredMessage>
  );
}

function SystemUrlSetup() {
  const { getActiveContour } = useContours();
  const contour = getActiveContour();
  const [url, setUrl] = useState("");

  if (!contour?.isSystem) {
    return <CenteredMessage>No WS URL configured for this contour</CenteredMessage>;
  }

  const handleSave = () => {
    if (!url.trim()) return;
    saveSystemUrl(url.trim());
    window.location.reload();
  };

  return (
    <CenteredMessage>
      <div className="flex flex-col" style={{ width: 360, gap: 10 }}>
        <span style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          Configure Management Contour WS URL
        </span>
        <input
          type="text"
          placeholder="wss://hub.example.com/ws"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          autoFocus
        />
        <button
          onClick={handleSave}
          className="cursor-pointer"
          style={{
            height: 28,
            fontSize: 13,
            background: "var(--color-accent)",
            color: "#ffffff",
            border: "none",
          }}
        >
          Save & Connect
        </button>
      </div>
    </CenteredMessage>
  );
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
      {children}
    </div>
  );
}
