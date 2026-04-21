import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ConfirmDialog, type ConfirmDialogProps, type ConfirmDialogTone } from "./ConfirmDialog";

type BaseOptions = Omit<ConfirmDialogProps, "open" | "onConfirm" | "onCancel" | "busy" | "error">;

export interface ConfirmOptions extends BaseOptions {
  /**
   * Async-обработчик, который запустится после клика на confirm. Пока он в
   * работе — диалог остаётся открытым и показывает спиннер; ошибка
   * отрисовывается в диалоге, пользователь может попробовать ещё раз.
   *
   * Если onConfirm не задан — диалог закрывается сразу после клика с `true`.
   */
  onConfirm?: () => Promise<void> | void;
  tone?: ConfirmDialogTone;
}

export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const Ctx = createContext<ConfirmFn | null>(null);

interface QueueItem {
  opts: ConfirmOptions;
  resolve: (v: boolean) => void;
}

/**
 * Провайдер для декларативного confirm: монтируется в корне приложения. Пока
 * хотя бы один `confirm()` pending, рендерится <ConfirmDialog/>. Очередь
 * гарантирует, что диалоги не перекрывают друг друга.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const current = queue[0] ?? null;

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setQueue((q) => [...q, { opts, resolve }]);
    });
  }, []);

  const closeCurrent = (value: boolean) => {
    if (!current) return;
    current.resolve(value);
    setError(null);
    setBusy(false);
    busyRef.current = false;
    setQueue((q) => q.slice(1));
  };

  const onCancel = () => {
    if (busyRef.current) return;
    closeCurrent(false);
  };

  const onConfirmClick = async () => {
    if (!current) return;
    if (busyRef.current) return;
    const cb = current.opts.onConfirm;
    if (!cb) {
      closeCurrent(true);
      return;
    }
    try {
      setBusy(true);
      busyRef.current = true;
      setError(null);
      await cb();
      closeCurrent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
      busyRef.current = false;
    }
  };

  const value = useMemo(() => confirm, [confirm]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {current && (
        // ВАЖНО: {...current.opts} идёт ПЕРВЫМ. В opts от consumer'а лежит
        // свой `onConfirm: () => Promise<void>` (ConfirmOptions), который
        // по типу должен быть скрыт через Omit, но рантайм этого не знает —
        // spread пропускает его как обычный prop. Если поставить spread
        // ПОСЛЕ наших overrides, он перебивает `onConfirm={onConfirmClick}`,
        // и тогда кнопка зовёт async-handler напрямую, минуя busy/close
        // логику провайдера (→ окно не закрывается, кнопка активна).
        <ConfirmDialog
          {...current.opts}
          open
          onConfirm={onConfirmClick}
          onCancel={onCancel}
          busy={busy}
          error={error}
        />
      )}
    </Ctx.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback: если провайдер не смонтирован — используем window.confirm
    // (обычный случай в изолированных сторибуках/тестах).
    return (opts: ConfirmOptions) => {
      const text = typeof opts.message === "string" ? opts.message : String(opts.title ?? "Confirm?");
      const ok = typeof window !== "undefined" ? window.confirm(text) : false;
      if (ok) return Promise.resolve(true).then(async () => {
        if (opts.onConfirm) await opts.onConfirm();
        return true;
      });
      return Promise.resolve(false);
    };
  }
  return ctx;
}
