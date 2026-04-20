import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export interface VirtualListProps<T> {
  /** Полный список элементов. */
  items: T[];
  /** Высота одного ряда в px. Фиксированная. */
  itemHeight: number;
  /** Рендер одной строки. absolutely-positioned, занимает всю ширину и `itemHeight`. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Ключ строки — для React reconciliation. */
  getKey?: (item: T, index: number) => string | number;
  /** Сколько лишних элементов рендерить сверху/снизу viewport. default 6. */
  overscan?: number;
  /** Порог включения виртуализации. Если `items.length < threshold` — рендерится
   *  обычный плоский список (без расчётов). default 60. */
  threshold?: number;
  /** Дополнительный класс контейнера. */
  className?: string;
  /** Инлайн-стиль контейнера. */
  style?: CSSProperties;
  /** aria-label для контейнера. */
  "aria-label"?: string;
  /** Контент, рендерящийся в конце списка (`load more`, пустой хвост). Скроллится
   *  вместе с элементами, не виртуализируется. */
  footer?: ReactNode;
}

/**
 * Fixed-row-height virtual list. Минимальная реализация без сторонних зависимостей.
 *
 * Rationale: три наших списка-кандидата (`ProcessListPanel`, `GlobalModelsPanel`,
 * `PermissionsPanel`) используют однородные строки одинаковой высоты — variable-size
 * виртуализация не нужна. Внешние пакеты (`react-window`, `@tanstack/react-virtual`)
 * добавили бы ~30–60 KB gzipped ради этого простого кейса.
 *
 * Контейнер получает `overflow-y: auto` и полную высоту от родителя (`flex: 1` или
 * `height: 100%`). Контент рендерится абсолютно внутри «spacer»-а высотой
 * `items.length * itemHeight`.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  getKey,
  overscan = 6,
  threshold = 60,
  className,
  style,
  "aria-label": ariaLabel,
  footer,
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewportHeight(el.clientHeight);
    const ro = new ResizeObserver(() => {
      setViewportHeight(el.clientHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const shouldVirtualize = items.length >= threshold && viewportHeight > 0;

  const { startIndex, endIndex } = useMemo(() => {
    if (!shouldVirtualize) {
      return { startIndex: 0, endIndex: items.length };
    }
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);
    return { startIndex: start, endIndex: end };
  }, [shouldVirtualize, scrollTop, itemHeight, viewportHeight, overscan, items.length]);

  const totalHeight = items.length * itemHeight;

  return (
    <div
      ref={scrollRef}
      className={className}
      style={{ overflowY: "auto", position: "relative", ...style }}
      aria-label={ariaLabel}
    >
      {shouldVirtualize ? (
        <>
          <div style={{ height: totalHeight, position: "relative" }}>
            {items.slice(startIndex, endIndex).map((it, i) => {
              const realIndex = startIndex + i;
              const key = getKey ? getKey(it, realIndex) : realIndex;
              return (
                <div
                  key={key}
                  style={{
                    position: "absolute",
                    top: realIndex * itemHeight,
                    left: 0,
                    right: 0,
                    height: itemHeight,
                  }}
                >
                  {renderItem(it, realIndex)}
                </div>
              );
            })}
          </div>
          {footer}
        </>
      ) : (
        <div>
          {items.map((it, i) => {
            const key = getKey ? getKey(it, i) : i;
            return (
              <div key={key} style={{ height: itemHeight }}>
                {renderItem(it, i)}
              </div>
            );
          })}
          {footer}
        </div>
      )}
    </div>
  );
}
