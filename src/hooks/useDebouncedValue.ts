import { useEffect, useState } from "react";

/**
 * Возвращает значение `value`, но с задержкой `delay` мс. Каждое новое
 * изменение value сбрасывает таймер. Дефолтно 200 мс — комфортная задержка
 * для инкрементального поиска.
 *
 * Не использовать для «debounced callback» — для этого есть привычный паттерн
 * `useMemo(() => debounce(fn, delay), [...])`; этот хук — про значение.
 */
export function useDebouncedValue<T>(value: T, delay: number = 200): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    if (delay <= 0) return;
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  // При `delay <= 0` debounce фактически выключен — возвращаем значение
  // синхронно, минуя внутренний state (чтобы не делать setState в effect).
  return delay <= 0 ? value : debounced;
}
