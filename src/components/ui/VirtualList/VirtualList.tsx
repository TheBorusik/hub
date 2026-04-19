import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type UIEvent,
} from "react";

export interface VirtualListProps<T> {
  items: T[];
  /** Высота одного элемента в пикселях (фиксированная). */
  itemHeight: number;
  /** Полная высота контейнера (required — нам нужен ограниченный бокс). */
  height: number | string;
  /** Рендер одного элемента. */
  children: (item: T, index: number) => ReactNode;
  /** Ключ для key=. default: index. */
  getKey?: (item: T, index: number) => string | number;
  /** Сколько элементов рендерить за пределами viewport сверху/снизу. default: 6. */
  overscan?: number;
  /** Внешний класс / стили контейнера. */
  className?: string;
  style?: CSSProperties;
  /** Onscroll для внешних индикаторов (sticky header, загрузка). */
  onScroll?: (scrollTop: number) => void;
  /** Для ARIA. */
  role?: string;
  "aria-label"?: string;
}

/**
 * Минимальный виртуализатор для фиксированной высоты строк. Достаточен для
 * ProcessListPanel / GlobalModelsPanel / PermissionsPanel при N > 500. Для
 * динамических высот — отдельный хук/компонент, он не часть Block A.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  height,
  children,
  getKey,
  overscan = 6,
  className,
  style,
  onScroll,
  role,
  "aria-label": ariaLabel,
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number>(() =>
    typeof height === "number" ? height : 0,
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setViewportHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScrollInternal = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const st = e.currentTarget.scrollTop;
      setScrollTop(st);
      onScroll?.(st);
    },
    [onScroll],
  );

  const { startIndex, endIndex, offsetY, totalHeight } = useMemo(() => {
    const total = items.length * itemHeight;
    if (viewportHeight === 0) {
      return { startIndex: 0, endIndex: Math.min(items.length, overscan * 2), offsetY: 0, totalHeight: total };
    }
    const first = Math.floor(scrollTop / itemHeight);
    const visible = Math.ceil(viewportHeight / itemHeight);
    const start = Math.max(0, first - overscan);
    const end = Math.min(items.length, first + visible + overscan);
    return { startIndex: start, endIndex: end, offsetY: start * itemHeight, totalHeight: total };
  }, [items.length, itemHeight, scrollTop, viewportHeight, overscan]);

  return (
    <div
      ref={scrollRef}
      onScroll={onScrollInternal}
      role={role}
      aria-label={ariaLabel}
      className={className}
      style={{
        height,
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        ...style,
      }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {items.slice(startIndex, endIndex).map((item, i) => {
            const index = startIndex + i;
            const key = getKey ? getKey(item, index) : index;
            return (
              <div key={key} style={{ height: itemHeight }}>
                {children(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
