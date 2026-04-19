import { useCallback, useEffect, useRef, useState } from "react";

export interface UseAsyncState<T> {
  loading: boolean;
  data: T | null;
  error: string | null;
  /** Перезапустить операцию, игнорируя deps-изменения. */
  reload: () => void;
}

export interface UseAsyncOptions {
  /** Не вызывать fn автоматически при mount/deps; только reload(). */
  manual?: boolean;
  /** Отключить запуск целиком (например, пока нет нужного id). */
  enabled?: boolean;
}

/**
 * Безопасная обёртка над асинхронной функцией: отмена устаревших результатов,
 * loading/error state, ручной reload. Текст ошибки приводится к string — чтобы
 * удобно было прокидывать в ToastProvider / <EmptyState error=...>.
 *
 * При размонтировании или при следующем reload счётчик "тикает" и старые
 * результаты больше не выставляются — защита от гонок.
 */
export function useAsync<T, D extends readonly unknown[] = readonly unknown[]>(
  fn: () => Promise<T>,
  deps: D,
  options: UseAsyncOptions = {},
): UseAsyncState<T> {
  const { manual = false, enabled = true } = options;

  const [loading, setLoading] = useState<boolean>(!manual && enabled);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fnRef = useRef(fn);
  fnRef.current = fn;

  const runIdRef = useRef(0);

  const run = useCallback(() => {
    const myId = ++runIdRef.current;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((result) => {
        if (runIdRef.current !== myId) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (runIdRef.current !== myId) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (manual || !enabled) return;
    run();
    return () => {
      runIdRef.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, manual, enabled]);

  return { loading, data, error, reload: run };
}
