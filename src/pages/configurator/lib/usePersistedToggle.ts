import { useCallback, useState } from "react";

/**
 * Boolean-флаг, синхронизированный с localStorage по ключу. Третий аргумент —
 * опциональный `onChange` для toast-уведомления (используется в
 * `ProcessEditor` для autosave: «Auto Save: ON / OFF»).
 *
 * Безопасен в SSR / privacy-mode: ошибки чтения/записи проглатываются.
 */
export function usePersistedToggle(
  key: string,
  initial = false,
  onChange?: (next: boolean) => void,
): readonly [boolean, () => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return initial;
    }
  });

  const toggle = useCallback(() => {
    setValue((prev) => {
      const next = !prev;
      try { localStorage.setItem(key, next ? "1" : "0"); } catch { /* ignore */ }
      onChange?.(next);
      return next;
    });
  }, [key, onChange]);

  return [value, toggle] as const;
}
