import { useEffect, useRef, useState, type ReactNode, type FormEvent } from "react";
import { useWebSocket } from "@theborusik/ws-react";
import { useContours, saveSystemUrl } from "@/providers/ContourProvider";
import { useContourAuth } from "@/lib/ws-api";
import { WebSocketOverlays } from "./WebSocketOverlays";

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Gate для каждого контура:
 *   - пока пользователь ни разу не залогинился — показывает форму логина;
 *   - после первой успешной аутентификации children монтируются И НЕ
 *     размонтируются при потере соединения / reauth. Вместо этого
 *     показывается overlay поверх через `<WebSocketOverlays/>` (connecting,
 *     authenticating, connection error).
 *
 * Именно такой подход использует `sportmax`: overlay сверху, children
 * живут своей жизнью — открытые вкладки, редакторы, позиции скролла не
 * сбрасываются при коротком обрыве сети.
 */
export function AuthGate({ children }: AuthGateProps) {
  const { getActiveContour } = useContours();
  const contour = getActiveContour();

  if (!contour?.wsUrl) {
    return <SystemUrlSetup />;
  }

  return <LoginGate>{children}</LoginGate>;
}

function LoginGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useWebSocket();

  /**
   * Флаг «хоть раз была валидная аутентификация». Как только он стал true —
   * children мaунтятся и остаются в DOM; дальнейшие потери соединения и
   * reauth перекрываются оверлеями, но не размонтируют приложение.
   *
   * Используем derived-state паттерн (setState в теле рендера под guard-ом
   * на prev): так избегаем setState-in-effect, и флаг апдейтится
   * синхронно — на том же рендере, когда пришёл isAuthenticated=true.
   */
  const [hasAuthed, setHasAuthed] = useState(isAuthenticated);
  if (isAuthenticated && !hasAuthed) {
    setHasAuthed(true);
  }

  // Если ни разу не логинились — показываем login form.
  // WebSocketOverlays рисуем поверх и тут (на случай connection error
  // ещё до login).
  if (!hasAuthed) {
    return (
      <>
        <LoginForm />
        <WebSocketOverlays />
      </>
    );
  }

  // Один раз залогинились — children не размонтируем. Все последующие
  // connecting/authenticating/connection-error просто наложит оверлей.
  return (
    <>
      {children}
      <WebSocketOverlays />
    </>
  );
}

function LoginForm() {
  const api = useContourAuth();
  const ws = useWebSocket();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Сценарий «уже авторизован после F5»: сервер хранит сессию и при
   * попытке login возвращает ошибку «user already authenticated».
   * В этом случае пытаемся сделать reauth — обычно срабатывает без
   * повторного ввода пароля, если tokenId сохранён в localStorage.
   */
  const triedReauthRef = useRef(false);
  useEffect(() => {
    if (triedReauthRef.current) return;
    if (!ws.isConnected || ws.isAuthenticated || ws.isAuthenticating) return;
    // Проверяем, есть ли сохранённый токен — reauth имеет смысл только тогда.
    const rawWs = ws.ws as unknown as { reauth?: () => Promise<unknown> } | undefined;
    if (!rawWs?.reauth) return;
    triedReauthRef.current = true;
    rawWs.reauth().catch(() => {
      // reauth упал — пускай юзер вводит пароль, ничего не делаем
    });
  }, [ws]);

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
          autoComplete="username"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
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
