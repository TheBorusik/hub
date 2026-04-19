import { useEffect, type RefObject } from "react";

/**
 * Вызывает `handler`, если mousedown/touchstart произошёл вне элемента `ref`.
 * Часто используется для закрытия dropdown/popover/menu.
 *
 * @param ref        ref-элемент, клик внутри которого считается "внутри".
 * @param handler    колбэк, вызывается при клике снаружи.
 * @param enabled    выключатель — позволяет не снимать ref, но временно отключать
 *                   слушатель (например, пока меню закрыто).
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true,
): void {
  useEffect(() => {
    if (!enabled) return;

    const onDown = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el) return;
      const target = event.target as Node | null;
      if (target && el.contains(target)) return;
      handler(event);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [ref, handler, enabled]);
}
