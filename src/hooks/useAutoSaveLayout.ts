import { useCallback, useMemo } from "react";
import type { Layout } from "react-resizable-panels";

/**
 * Восстановление и персистинг layout `react-resizable-panels v4+` по id.
 *
 * В v4 из API ушёл `autoSaveId` у `Group` — взамен предложено самому хранить
 * layout в `defaultLayout` + `onLayoutChanged`. Этот хук делает это над
 * `localStorage`: читает сохранённый layout один раз (через `useMemo`) и
 * возвращает стабильный `onLayoutChanged`, который пишет новое состояние.
 *
 * Значение в localStorage — сырой JSON `{ [panelId]: percentage }`, без
 * envelope'а с версией: совместимость не критична (если формат изменится,
 * достаточно поменять `key`).
 *
 * Возвращает то, что можно прямо разложить в `<Group>`:
 *
 * ```tsx
 * const layoutProps = useAutoSaveLayout("configurator-side-v4");
 * <Group orientation="vertical" id="configurator-side-v4" {...layoutProps}>
 * ```
 *
 * Если localStorage недоступен (privacy mode / quota) — просто возвращается
 * no-op: UI не должен падать из-за этого.
 */
export function useAutoSaveLayout(
  id: string,
): {
  defaultLayout: Layout | undefined;
  onLayoutChanged: (layout: Layout) => void;
} {
  const storageKey = `rrp:layout:${id}`;

  const defaultLayout = useMemo<Layout | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return undefined;
      const out: Layout = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === "number" && isFinite(v)) out[k] = v;
      }
      return Object.keys(out).length > 0 ? out : undefined;
    } catch {
      return undefined;
    }
    // storageKey меняется только при смене id — так что это фактически "read once per id".
  }, [storageKey]);

  const onLayoutChanged = useCallback(
    (layout: Layout) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(layout));
      } catch {
        /* privacy mode / quota — молча */
      }
    },
    [storageKey],
  );

  return { defaultLayout, onLayoutChanged };
}
