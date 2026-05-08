import { useMemo, type ReactNode } from "react";
import {
  WebSocketProvider,
  createBrowserSessionStore,
} from "@theborusik/ws-react";
import type { ContourConfig } from "./ContourProvider";

interface Props {
  contour: ContourConfig;
  children: ReactNode;
}

export function ContourWebSocketProvider({ contour, children }: Props) {
  const session = useMemo(
    () => createBrowserSessionStore({ prefix: `hub_${contour.id}` }),
    [contour.id],
  );

  const wsOptions = useMemo(
    () => ({
      consoleDebug: import.meta.env.DEV,
      heartbeat: { intervalMs: 25000, timeoutMs: 10000 },
    }),
    [],
  );

  return (
    <WebSocketProvider
      url={contour.wsUrl || ""}
      session={session}
      wsOptions={wsOptions}
    >
      {children}
    </WebSocketProvider>
  );
}
