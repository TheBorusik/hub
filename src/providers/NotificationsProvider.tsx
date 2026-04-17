import {
  createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode,
} from "react";
import type { DiagnosticModel } from "@/lib/ws-api-models";
import { useToast, type ToastKind } from "@/providers/ToastProvider";

export type NotificationKind = ToastKind; // success | error | warning | info

export interface AppNotification {
  id: number;
  kind: NotificationKind;
  /** Короткий заголовок, как и сообщение в toast. */
  title: string;
  /** Расширенное описание (опционально). */
  body?: string;
  /** Источник события — для группировки/фильтра. */
  source?: string;
  /** Компиляционные диагностики (если уведомление связано с кодом). */
  diagnostics?: DiagnosticModel[];
  /** Миллисекунды Unix. */
  createdAt: number;
  /** Пользователь прочитал / открывал панель. */
  read: boolean;
}

interface PushNotificationOptions {
  body?: string;
  source?: string;
  diagnostics?: DiagnosticModel[];
  /**
   * Показывать ли toast (короткое всплывающее сообщение) одновременно с добавлением в историю.
   * По умолчанию — true.
   */
  toast?: boolean;
  /** Длительность toast в мс; если не задано — дефолт по kind. */
  toastDuration?: number;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  push: (kind: NotificationKind, title: string, opts?: PushNotificationOptions) => number;
  dismiss: (id: number) => void;
  clearAll: () => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const HISTORY_LIMIT = 200;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const idRef = useRef(0);
  const toast = useToast();

  const push = useCallback<NotificationsContextValue["push"]>(
    (kind, title, opts) => {
      const id = ++idRef.current;
      const note: AppNotification = {
        id,
        kind,
        title,
        body: opts?.body,
        source: opts?.source,
        diagnostics: opts?.diagnostics,
        createdAt: Date.now(),
        read: false,
      };
      setNotifications((prev) => {
        const next = [note, ...prev];
        return next.length > HISTORY_LIMIT ? next.slice(0, HISTORY_LIMIT) : next;
      });
      if (opts?.toast !== false) {
        toast.push(kind, title, { detail: opts?.body, duration: opts?.toastDuration });
      }
      return id;
    },
    [toast],
  );

  const dismiss = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, push, dismiss, clearAll, markAllRead }),
    [notifications, unreadCount, push, dismiss, clearAll, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    // Fallback-noop
    return {
      notifications: [],
      unreadCount: 0,
      push: () => 0,
      dismiss: () => {},
      clearAll: () => {},
      markAllRead: () => {},
    };
  }
  return ctx;
}
